import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { TOPICS } from '../../constants/topics';
import { Topic, Direction } from '../../lib/types';
import { usePreferences } from '../../hooks/usePreferences';
import { InstagramConnectionCard } from '@/components/InstagramConnectionCard';
import { useInstagramConnection } from '@/hooks/useInstagramConnection';
import { deleteAllData } from '../../lib/api';

export default function SettingsScreen() {
  const {
    amplifyTopics,
    reduceTopics,
    loading,
    error,
    toggleTopic,
    save,
    isAmplified,
    isReduced,
    clear: clearPrefs,
  } = usePreferences();

  const {
    connection: igConnection,
    loading: igLoading,
    connecting: igConnecting,
    connect: handleIgConnect,
    disconnect: handleIgDisconnect,
    refetch: refetchIg,
  } = useInstagramConnection();

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (amplifyTopics.size === 0) {
      Alert.alert('Selection Required', 'Please select at least one topic to amplify.');
      return;
    }

    setSaving(true);
    setSuccess(false);

    const result = await save();

    setSaving(false);

    if (result.success) {
      setSuccess(true);
      // Reset success indicator after delay
      setTimeout(() => setSuccess(false), 2000);
    } else {
      Alert.alert('Error', result.error || 'Failed to save preferences.');
    }
  };

  const confirmDisconnect = () => {
    return new Promise<void>((resolve) => {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(
          'Disconnect Instagram?\n\nYour feed curation will stop until you reconnect.'
        );
        if (confirmed) {
          handleIgDisconnect().then(() => resolve());
        } else {
          resolve();
        }
      } else {
        Alert.alert(
          'Disconnect Instagram?',
          'Your feed curation will stop until you reconnect.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
            {
              text: 'Disconnect',
              style: 'destructive',
              onPress: async () => {
                await handleIgDisconnect();
                resolve();
              },
            },
          ]
        );
      }
    });
  };

  const handleDeleteAllData = () => {
    const message = 'Delete all your data?\n\nThis will permanently delete:\n• All preferences\n• Instagram connection\n• Automation history\n• Activity logs\n\nThis action cannot be undone.';
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete All Data?',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Everything',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  const performDelete = async () => {
    try {
      setDeleting(true);
      await deleteAllData();
      // Reset local state to reflect deletion
      clearPrefs();
      await refetchIg();
      // Success - data deleted
      if (Platform.OS === 'web') {
        window.alert('All data deleted successfully.\n\nYou will need to set up your preferences again.');
      } else {
        Alert.alert(
          'Data Deleted',
          'All your data has been deleted successfully. You will need to set up your preferences again.'
        );
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to delete data. Please try again.';
      if (Platform.OS === 'web') {
        window.alert('Delete Failed\n\n' + errorMsg);
      } else {
        Alert.alert('Delete Failed', errorMsg);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Edit your content preferences</Text>
      
      {success && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>Preferences saved!</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>See More (Amplify)</Text>
      <View style={styles.chipContainer}>
        {TOPICS.map((topic) => (
          <Pressable
            key={`amp-${topic}`}
            style={[styles.chip, isAmplified(topic) && styles.chipActive]}
            onPress={() => toggleTopic(topic, 'amplify')}
          >
            <Text style={[styles.chipText, isAmplified(topic) && styles.chipTextActive]}>
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
            style={[styles.chip, isReduced(topic) && styles.chipReduceActive]}
            onPress={() => toggleTopic(topic, 'reduce')}
          >
            <Text style={[styles.chipText, isReduced(topic) && styles.chipTextActive]}>
              {topic}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable 
        style={[styles.button, (amplifyTopics.size === 0 || saving) && styles.buttonDisabled]} 
        onPress={handleSave}
        disabled={saving || amplifyTopics.size === 0}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instagram Connection</Text>
        <Text style={styles.sectionDescription}>
          Manage your Instagram account connection for feed curation.
        </Text>
        <InstagramConnectionCard
          connection={igConnection}
          loading={igLoading}
          connecting={igConnecting}
          onConnect={handleIgConnect}
          onDisconnect={confirmDisconnect}
        />
      </View>

      {/* Delete All Data Section (Rule #19) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <Text style={styles.sectionDescription}>
          Permanently delete all your data from FeedFlow. This action cannot be undone.
        </Text>
        <Pressable
          style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
          onPress={handleDeleteAllData}
          disabled={deleting}
        >
          <Text style={styles.deleteButtonText}>
            {deleting ? 'Deleting...' : 'Delete All Data'}
          </Text>
        </Pressable>
      </View>
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
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
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
  loadingText: {
    color: '#888',
    marginTop: 20,
  },
  successBanner: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginTop: 40,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
