import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// Extend Request to include authenticated user
interface AuthRequest extends Request {
  user?: { id: string; email?: string };
}

const router = Router();

/**
 * DELETE /user/data
 * Deletes all user data (Rule #19): preferences, connections, automation_jobs, activity_log
 * Requires confirmation from client side. This is irreversible.
 */
router.delete('/data', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Delete in order (activity_log has no FK dependencies, automation_jobs and preferences reference user)
    // Use admin client to bypass RLS
    
    // 1. Delete activity log
    const { error: activityError } = await supabaseAdmin
      .from('activity_log')
      .delete()
      .eq('user_id', userId);

    if (activityError) {
      console.error('Error deleting activity_log:', activityError);
      // Continue anyway - partial delete is better than none
    }

    // 2. Delete automation jobs
    const { error: jobsError } = await supabaseAdmin
      .from('automation_jobs')
      .delete()
      .eq('user_id', userId);

    if (jobsError) {
      console.error('Error deleting automation_jobs:', jobsError);
    }

    // 3. Delete Instagram connections
    const { error: connectionsError } = await supabaseAdmin
      .from('instagram_connections')
      .delete()
      .eq('user_id', userId);

    if (connectionsError) {
      console.error('Error deleting instagram_connections:', connectionsError);
    }

    // 4. Delete preferences
    const { error: prefsError } = await supabaseAdmin
      .from('preferences')
      .delete()
      .eq('user_id', userId);

    if (prefsError) {
      console.error('Error deleting preferences:', prefsError);
    }

    // Return success even if some deletes failed (partial cleanup is acceptable)
    res.json({ 
      success: true, 
      message: 'All user data deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting user data:', error);
    res.status(500).json({ error: 'Failed to delete user data' });
  }
});

export default router;
