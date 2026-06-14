import { supabaseAdmin } from '../lib/supabaseAdmin';
import { getInstagramService, PrivateApiAdapter, BrowserAdapter } from '../services/instagram';
import { decryptToken } from '../lib/crypto';

interface AutomationJob {
  id: string;
  user_id: string;
  status: string;
  progress_score: number;
  actions_count: number;
}

// In-memory backoff tracking: userId -> nextAllowedTime
const backoffMap = new Map<string, number>();
const BACKOFF_BASE_MS = 2000; // 2s base
const BACKOFF_MAX_EXPONENT = 5; // max 2^5 = 32s

/**
 * runJob — executes one automation cycle for a single user
 * Returns true on success, false on error (for backoff tracking)
 */
export async function runJob(job: AutomationJob): Promise<boolean> {
  const userId = job.user_id;

  // Check backoff window
  const blockedUntil = backoffMap.get(userId);
  if (blockedUntil && Date.now() < blockedUntil) {
    console.log(`[Runner] User ${userId} in backoff window, skipping`);
    return false;
  }

  try {
    // 1. Guard: load instagram_connections, check if connected
    const { data: connection, error: connError } = await supabaseAdmin
      .from('instagram_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connError || !connection || connection.status !== 'connected') {
      await supabaseAdmin
        .from('automation_jobs')
        .update({
          status: 'error',
          error_message: 'Instagram disconnected',
        })
        .eq('user_id', userId);

      await supabaseAdmin.from('activity_log').insert({
        user_id: userId,
        action_type: 'system',
        result: 'failed',
        topic: 'connection check failed',
      });

      return false;
    }

    // 2. Load amplify preferences
    const { data: prefs, error: prefError } = await supabaseAdmin
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('direction', 'amplify');

    if (prefError || !prefs || prefs.length === 0) {
      // No amplify prefs → pause job silently
      await supabaseAdmin
        .from('automation_jobs')
        .update({ status: 'paused' })
        .eq('user_id', userId);
      return true; // Not an error, just nothing to do
    }

    // 3. Wrap execution in 60s timeout with AbortController to cancel live API calls
    const controller = new AbortController();
    const runPromise = executeActions(userId, connection, prefs, job.progress_score, controller.signal);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        controller.abort();
        reject(new Error('Job execution timeout'));
      }, 60000)
    );

    const result = await Promise.race([runPromise, timeoutPromise]);

    // 7. Update job with results
    const newScore = Math.min(100, job.progress_score + result.progressDelta);
    await supabaseAdmin
      .from('automation_jobs')
      .update({
        actions_count: job.actions_count + result.totalActions,
        progress_score: newScore,
        last_run_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Record progress snapshot for trend chart
    await supabaseAdmin
      .from('progress_history')
      .insert({
        user_id: userId,
        score: newScore,
        recorded_at: new Date().toISOString(),
      });

    // Also update instagram_connections.last_sync_at
    await supabaseAdmin
      .from('instagram_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    // Clear backoff on success
    backoffMap.delete(userId);
    return true;
  } catch (error: any) {
    console.error(`[Runner] Job failed for user ${userId}:`, error);

    // Mark job as error
    await supabaseAdmin
      .from('automation_jobs')
      .update({
        status: 'error',
        error_message: error.message || 'Unknown error',
      })
      .eq('user_id', userId);

    // Log system error
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'system',
      result: 'failed',
      topic: `error: ${error.message}`,
    });

    // 9. Exponential backoff (in-memory)
    const currentExponent = Math.min(
      (backoffMap.get(userId + '_exp') as number) || 0,
      BACKOFF_MAX_EXPONENT
    );
    const backoffMs = BACKOFF_BASE_MS * Math.pow(2, currentExponent);
    backoffMap.set(userId, Date.now() + backoffMs);
    backoffMap.set(userId + '_exp', currentExponent + 1);

    return false;
  }
}

/**
 * executeActions — runs SimAdapter actions for amplify topics
 * 4-6: Get service, connect, run actions, log everything
 */
async function executeActions(
  userId: string,
  connection: any,
  prefs: any[],
  currentProgress: number,
  signal: AbortSignal
): Promise<{ totalActions: number; progressDelta: number }> {
  // 4. Get service
  const svc = getInstagramService(connection.mode);

  // 5. Connect: restore session based on mode
  if (connection.mode === 'live') {
    if (!connection.token_encrypted) {
      throw new Error('No session token found. Please reconnect Instagram.');
    }
    const privateAdapter = svc as PrivateApiAdapter;
    const sessionJson = decryptToken(connection.token_encrypted);
    await privateAdapter.restoreSession(sessionJson);
  } else if (connection.mode === 'browser') {
    if (!connection.token_encrypted) {
      throw new Error('No browser session found. Please reconnect Instagram in Browser mode.');
    }
    const browserAdapter = svc as BrowserAdapter;
    const cookiesJson = decryptToken(connection.token_encrypted);
    await browserAdapter.restoreSession(cookiesJson);
  } else {
    // sim mode
    await svc.connect(connection.username || 'demo_user', 'sim');
  }

  let totalActions = 0;
  let successCount = 0;

  // 6. For each amplify topic (cap at 3 for human-like behavior)
  const topics = prefs.slice(0, 3).map((p) => p.topic);

  for (const topic of topics) {
    // Bail out if the 60s timeout fired (prevents ghost actions in live mode)
    if (signal.aborted) break;

    // Like 2 posts
    const likeResults = await svc.likeByTopic(topic, 2);
    for (const result of likeResults) {
      totalActions++;
      if (result.success) successCount++;

      // Log to activity_log (Rule #5)
      await supabaseAdmin.from('activity_log').insert({
        user_id: userId,
        action_type: result.actionType,
        topic: result.topic,
        result: result.success ? 'success' : 'failed',
        performed_at: result.timestamp,
      });
    }

    // Follow 1 account
    const followResults = await svc.followByTopic(topic, 1);
    for (const result of followResults) {
      totalActions++;
      if (result.success) successCount++;

      await supabaseAdmin.from('activity_log').insert({
        user_id: userId,
        action_type: result.actionType,
        topic: result.topic,
        result: result.success ? 'success' : 'failed',
        performed_at: result.timestamp,
      });
    }
  }

  // Calculate progress delta with diminishing returns
  // Mirrors SimAdapter's 0.02/0.03 increments scaled by (1 - current/100)
  const step = 0.5; // Each success nudges ~0.5% (diminishes as progress → 100)
  const progressDelta = successCount * step * (1 - currentProgress / 100);

  return { totalActions, progressDelta };
}
