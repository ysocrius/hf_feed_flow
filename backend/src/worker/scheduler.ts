import cron, { ScheduledTask } from 'node-cron';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { runJob } from './runner';

let schedulerTask: ScheduledTask | null = null;

/**
 * tick — runs one scheduler cycle
 * Queries active jobs and runs them sequentially (respecting runner's internal backoff)
 */
async function tick() {
  try {
    console.log('[Scheduler] Tick started:', new Date().toISOString());

    // Query active jobs via service-role client (bypasses RLS)
    const { data: jobs, error } = await supabaseAdmin
      .from('automation_jobs')
      .select('*')
      .eq('status', 'active');

    if (error) {
      console.error('[Scheduler] Error fetching active jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('[Scheduler] No active jobs');
      return;
    }

    console.log(`[Scheduler] Running ${jobs.length} active job(s)`);

    // Run jobs sequentially (could add small concurrency limit if needed)
    for (const job of jobs) {
      try {
        const success = await runJob(job);
        console.log(
          `[Scheduler] Job ${job.id} (user ${job.user_id}): ${success ? 'success' : 'failed/backoff'}`
        );
      } catch (jobError) {
        // Catch per-job errors so one failure doesn't kill the tick
        console.error(`[Scheduler] Uncaught error in job ${job.id}:`, jobError);
      }
    }

    console.log('[Scheduler] Tick completed');
  } catch (error) {
    console.error('[Scheduler] Fatal tick error:', error);
  }
}

/**
 * startScheduler — starts the cron job (every 2 minutes)
 * Called from index.ts on server startup
 */
export function startScheduler() {
  if (schedulerTask) {
    console.warn('[Scheduler] Already running, skipping start');
    return;
  }

  // Cron: every 2 minutes (demo-friendly, visible motion in 3-5 min video)
  schedulerTask = cron.schedule('*/2 * * * *', tick);
  console.log('[Scheduler] Started (every 2 minutes)');
}

/**
 * stopScheduler — stops the cron job
 * Used for graceful shutdown or tests
 */
export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * runTickOnce — manually trigger a tick
 * Useful for tests or manual invocation
 */
export async function runTickOnce() {
  await tick();
}
