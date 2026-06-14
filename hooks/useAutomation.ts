import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AutomationJob } from '../lib/types';
import {
  getAutomationStatus,
  startAutomation as apiStartAutomation,
  pauseAutomation as apiPauseAutomation,
} from '../lib/api';

export function useAutomation() {
  const [job, setJob] = useState<AutomationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  // Fetch status on mount
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const status = await getAutomationStatus();
      setJob(status);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch automation status');
      console.error('Error fetching automation status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let channel: any;
    let pollInterval: any;

    const setupRealtime = async () => {
      // Get current user for filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Fetch initial status
      await fetchStatus();
      if (cancelled) return;

      const channelName = `automation_jobs_changes_${Math.random().toString(36).substring(7)}`;

      const newChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'automation_jobs',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (cancelled) return;
            
            // Update job state on any change
            if (payload.eventType === 'DELETE') {
              setJob(null);
            } else if (payload.new) {
              setJob(payload.new as AutomationJob);
            }
          }
        );

      if (cancelled) return;
      channel = newChannel;
      channel.subscribe();

      // 30s poll fallback (Rule #22: app must reflect backend within 2-3 min)
      pollInterval = setInterval(() => {
        if (!cancelled) {
          fetchStatus();
        }
      }, 30000);
    };

    setupRealtime();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  // Start automation
  const start = async () => {
    try {
      setToggling(true);
      setError(null);
      const updatedJob = await apiStartAutomation();
      setJob(updatedJob);
    } catch (err: any) {
      setError(err.message || 'Failed to start automation');
      throw err; // Re-throw so Dashboard can handle it
    } finally {
      setToggling(false);
    }
  };

  // Pause automation
  const pause = async () => {
    try {
      setToggling(true);
      setError(null);
      const updatedJob = await apiPauseAutomation();
      setJob(updatedJob);
    } catch (err: any) {
      setError(err.message || 'Failed to pause automation');
      throw err;
    } finally {
      setToggling(false);
    }
  };

  return {
    job,
    loading,
    error,
    toggling,
    start,
    pause,
    refresh: fetchStatus,
  };
}
