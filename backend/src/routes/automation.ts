import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// Extend Request to include authenticated user
interface AuthRequest extends Request {
  user?: { id: string; email?: string };
}

const router = Router();

// Helper to get per-user RLS client from request
function getUserClient(req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

/**
 * POST /automation/start
 * Validates ≥1 amplify preference (Rule #17), activates automation job.
 * Uses admin client for writes (with explicit user_id scoping), RLS client for pref reads.
 */
router.post('/start', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userClient = getUserClient(req);

    // Check amplify preferences via RLS client
    const { data: prefs, error: prefError } = await userClient
      .from('preferences')
      .select('*')
      .eq('direction', 'amplify');

    if (prefError) throw prefError;
    if (!prefs || prefs.length === 0) {
      return res.status(400).json({
        error: 'At least one Amplify preference is required to start automation.',
      });
    }

    // Upsert job via admin client with explicit user_id scoping
    const { data: job, error: jobError } = await supabaseAdmin
      .from('automation_jobs')
      .upsert(
        {
          user_id: userId,
          status: 'active',
          started_at: new Date().toISOString(),
          error_message: null,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (jobError) throw jobError;

    // Log system event via admin client
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'system',
      result: 'success',
      topic: 'automation started',
    });

    res.json(job);
  } catch (error: any) {
    console.error('Error starting automation:', error);
    res.status(500).json({ error: 'Failed to start automation' });
  }
});

/**
 * POST /automation/pause
 * Pauses the user's automation job.
 * Uses admin client with mandatory .eq('user_id') filter to prevent cross-user writes.
 */
router.post('/pause', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Update via admin with explicit user_id filter
    const { data: job, error: jobError } = await supabaseAdmin
      .from('automation_jobs')
      .update({ status: 'paused' })
      .eq('user_id', userId)
      .select()
      .single();

    if (jobError) throw jobError;

    // Log system event
    await supabaseAdmin.from('activity_log').insert({
      user_id: userId,
      action_type: 'system',
      result: 'success',
      topic: 'automation paused',
    });

    res.json(job);
  } catch (error: any) {
    console.error('Error pausing automation:', error);
    res.status(500).json({ error: 'Failed to pause automation' });
  }
});

/**
 * GET /automation/status
 * Returns the user's automation job status. Uses RLS client (SELECT policy exists).
 */
router.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userClient = getUserClient(req);

    const { data: job, error } = await userClient
      .from('automation_jobs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows, expected for new users
      throw error;
    }

    // If no job exists, return default paused state
    if (!job) {
      return res.json({
        status: 'paused',
        started_at: null,
        last_run_at: null,
        actions_count: 0,
        progress_score: 0,
        error_message: null,
      });
    }

    res.json(job);
  } catch (error: any) {
    console.error('Error fetching automation status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * GET /automation/activity?limit=50
 * Returns recent activity log entries for the user. Uses RLS client.
 */
router.get('/activity', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const userClient = getUserClient(req);

    const { data: entries, error } = await userClient
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json(entries || []);
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

/**
 * GET /automation/history?limit=100
 * Returns progress score history for trend chart. Uses RLS client.
 */
router.get('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 100;
    const userClient = getUserClient(req);

    const { data: history, error } = await userClient
      .from('progress_history')
      .select('score, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Graceful degradation: table may not exist yet or have RLS issues.
      // Return empty array so frontend shows "not enough data" instead of error.
      console.warn('Progress history unavailable:', error.message);
      return res.json([]);
    }

    res.json(history || []);
  } catch (error: any) {
    console.error('Error fetching progress history:', error);
    res.json([]); // Graceful degradation — chart shows "not enough data"
  }
});

export default router;
