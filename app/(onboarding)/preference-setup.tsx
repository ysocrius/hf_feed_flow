import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { TOPICS } from '../../constants/topics';
import { Topic, Direction } from '../../lib/types';
import { supabase } from '../../lib/supabase';

export default function PreferenceSetupScreen() {
  const router = useRouter();
  const [amplifyTopics, setAmplifyTopics] = useState<Set<Topic>>(new Set());
  const [reduceTopics, setReduceTopics] = useState<Set<Topic>>(new Set());

  const toggleTopic = (topic: Topic, direction: Direction) => {
    // Haptic feedback on topic selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (direction === 'amplify') {
      const newAmplify = new Set(amplifyTopics);
      if (newAmplify.has(topic)) {
        newAmplify.delete(topic);
      } else {
        newAmplify.add(topic);
        // Enforce mutual exclusivity
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
        // Enforce mutual exclusivity
        if (amplifyTopics.has(topic)) {
          const newAmplify = new Set(amplifyTopics);
          newAmplify.delete(topic);
          setAmplifyTopics(newAmplify);
        }
      }
      setReduceTopics(newReduce);
    }
  };

  const handleContinue = async () => {
    if (amplifyTopics.size === 0) {
      Alert.alert('Selection Required', 'Please select at least one topic to amplify.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save preferences.');
        return;
      }

      // Build preference rows
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

      // Atomic upsert — no delete needed; onConflict handles updates in place
      const { error } = await supabase
        .from('preferences')
        .upsert(preferences, { onConflict: 'user_id,topic' });

      if (error) {
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
        return;
      }
    } catch (e) {
      // Surface unexpected errors (network, etc.) — never silently swallow
      Alert.alert('Error', 'Something went wrong. Please try again.');
      return; // Do NOT navigate on failure
    }

    // Only navigate on success
    router.push('/(onboarding)/connect-instagram');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>What do you want to see?</Text>
      
      <Text style={styles.sectionTitle}>See More (Amplify)</Text>
      <View style={styles.chipContainer}>
        {TOPICS.map((topic) => (
          <Pressable
            key={`amp-${topic}`}
            style={[styles.chip, amplifyTopics.has(topic) && styles.chipActive]}
            onPress={() => toggleTopic(topic, 'amplify')}
          >
            <Text style={[styles.chipText, amplifyTopics.has(topic) && styles.chipTextActive]}>
              {topic}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>See Less (Reduce)</Text>
      <View style={styles.chipContainer}>
        {TOPICS.map((topic) => (
          <Pressable
            key={`red-${topic}`}
            style={[styles.chip, reduceTopics.has(topic) && styles.chipReduceActive]}
            onPress={() => toggleTopic(topic, 'reduce')}
          >
            <Text style={[styles.chipText, reduceTopics.has(topic) && styles.chipTextActive]}>
              {topic}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable 
        style={[styles.button, amplifyTopics.size === 0 && styles.buttonDisabled]} 
        onPress={handleContinue}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentContainer: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    marginTop: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  chipReduceActive: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  chipText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000',
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 40,
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
