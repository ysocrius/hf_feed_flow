import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityLog } from '../lib/types';
import { getActivityLog } from '../lib/api';

const MAX_ENTRIES = 50; // Cap list to prevent unbounded growth

export function useActivity() {
  const [entries, setEntries] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch activity log on mount
  const fetchActivity = async () => {
    try {
      setLoading(true);
      const logs = await getActivityLog(MAX_ENTRIES);
      setEntries(logs);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch activity log');
      console.error('Error fetching activity log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let channel: any;

    const setupRealtime = async () => {
      // Get current user for filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Fetch initial activity
      await fetchActivity();
      if (cancelled) return;

      const channelName = `activity_log_changes_${Math.random().toString(36).substring(7)}`;

      const newChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_log',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (cancelled) return;
            
            // Prepend new entry and cap list
            if (payload.new) {
              setEntries((prev) => [payload.new as ActivityLog, ...prev].slice(0, MAX_ENTRIES));
            }
          }
        );

      if (cancelled) return;
      channel = newChannel;
      channel.subscribe();
    };

    setupRealtime();

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    entries,
    loading,
    error,
    refresh: fetchActivity,
  };
}
