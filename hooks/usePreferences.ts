import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Topic, Direction, Preference } from '../lib/types';

export function usePreferences() {
  const [amplifyTopics, setAmplifyTopics] = useState<Set<Topic>>(new Set());
  const [reduceTopics, setReduceTopics] = useState<Set<Topic>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('preferences')
        .select('topic, direction')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const amplify = new Set<Topic>();
      const reduce = new Set<Topic>();

      data?.forEach((pref: Pick<Preference, 'topic' | 'direction'>) => {
        if (pref.direction === 'amplify') {
          amplify.add(pref.topic);
        } else {
          reduce.add(pref.topic);
        }
      });

      setAmplifyTopics(amplify);
      setReduceTopics(reduce);
    } catch (e) {
      setError('Failed to load preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch saved preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Enforce mutual exclusivity (Rule #16)
  const toggleTopic = (topic: Topic, direction: Direction) => {
    if (direction === 'amplify') {
      const newAmplify = new Set(amplifyTopics);
      if (newAmplify.has(topic)) {
        newAmplify.delete(topic);
      } else {
        newAmplify.add(topic);
        // Remove from reduce if present (mutual exclusivity)
        if (reduceTopics.has(topic)) {
          const newReduce = new Set(reduceTopics);
          newReduce.delete(topic);
          setReduceTopics(newReduce);
        }
      }
      setAmplifyTopics(newAmplify);
    } else {
      const newReduce = new Set(reduceTopics);
      if (newReduce.has(topic)) {
        newReduce.delete(topic);
      } else {
        newReduce.add(topic);
        // Remove from amplify if present (mutual exclusivity)
        if (amplifyTopics.has(topic)) {
          const newAmplify = new Set(amplifyTopics);
          newAmplify.delete(topic);
          setAmplifyTopics(newAmplify);
        }
      }
      setReduceTopics(newReduce);
    }
  };

  const isAmplified = (topic: Topic) => amplifyTopics.has(topic);
  const isReduced = (topic: Topic) => reduceTopics.has(topic);

  // Save with validation (Rule #17, Rule #21)
  const save = async (): Promise<{ success: boolean; error?: string }> => {
    // Rule #17: block save if no amplify topics
    if (amplifyTopics.size === 0) {
      return { success: false, error: 'Please select at least one topic to amplify.' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'You must be logged in to save preferences.' };
      }

      const preferences = [
        ...Array.from(amplifyTopics).map(topic => ({
          user_id: user.id,
          topic,
          direction: 'amplify' as Direction,
        })),
        ...Array.from(reduceTopics).map(topic => ({
          user_id: user.id,
          topic,
          direction: 'reduce' as Direction,
        })),
      ];

      const { error: upsertError } = await supabase
        .from('preferences')
        .upsert(preferences, { onConflict: 'user_id,topic' });

      if (upsertError) {
        return { success: false, error: 'Failed to save preferences. Please try again.' };
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: 'Something went wrong. Please try again.' };
    }
  };

  const clear = () => {
    setAmplifyTopics(new Set());
    setReduceTopics(new Set());
  };

  return {
    amplifyTopics,
    reduceTopics,
    loading,
    error,
    toggleTopic,
    save,
    isAmplified,
    isReduced,
    refetch: fetchPreferences,
    clear,
  };
}
