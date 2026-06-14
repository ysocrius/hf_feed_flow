import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { connectInstagram, disconnectInstagram, getConnectionStatus, InstagramConnection } from '../lib/api';

export function useInstagramConnection() {
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const fetchConnection = useCallback(async () => {
    try {
      setError(null);
      const data = await getConnectionStatus();
      setConnection(data);
    } catch (err) {
      // Friendly error mapping (Rule #21)
      const message = err instanceof Error ? err.message : 'Failed to load connection status';
      setError(message);
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnection();

    let channel: any;
    let cancelled = false;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setError('No authenticated user');
        setLoading(false);
        return;
      }

      const channelName = `instagram_connections_changes_${Math.random().toString(36).substring(7)}`;

      const newChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'instagram_connections',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (cancelled) return;
            if (payload.eventType === 'DELETE') {
              setConnection(null);
            } else {
              setConnection(payload.new as InstagramConnection);
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
  }, [fetchConnection]);

  const handleConnect = async (mode: 'sim' | 'live' | 'browser', credentials?: { username: string; password: string }) => {
    setConnecting(true);
    setError(null);
    try {
      const newConnection = await connectInstagram(mode, credentials);
      setConnection(newConnection);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await disconnectInstagram();
      setConnection(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect';
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  };

  return {
    connection,
    loading,
    error,
    connecting,
    connect: handleConnect,
    disconnect: handleDisconnect,
    refetch: fetchConnection,
  };
}
