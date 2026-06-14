import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useInstagramConnection } from '../../hooks/useInstagramConnection';
import { InstagramConnectionCard } from '../../components/InstagramConnectionCard';
import { SuccessAnimation } from '../../components/SuccessAnimation';

export default function ConnectInstagramScreen() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const {
    connection,
    loading,
    error,
    connecting,
    connect,
    disconnect,
  } = useInstagramConnection();

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(tabs)');
  };

  const handleConnect = async (mode: 'sim' | 'live', credentials?: { username: string; password: string }) => {
    try {
      await connect(mode, credentials);
      // Show success animation
      setShowSuccess(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await AsyncStorage.setItem('onboarding_complete', 'true');
      router.replace('/(tabs)');
    } catch {
      // Error surfaced via hook's error state
    }
  };

  const handleDisconnect = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Disconnect Instagram?\n\nThis will disconnect your Instagram account. You can reconnect later.'
      );
      if (confirmed) {
        try {
          await disconnect();
        } catch {
          // Error handled by hook
        }
      }
    } else {
      Alert.alert(
        'Disconnect Instagram?',
        'This will disconnect your Instagram account. You can reconnect later.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await disconnect();
              } catch {
                // Error handled by hook
              }
            },
          },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Connect Instagram</Text>
          <Text style={styles.subtitle}>
            Securely connect your account so FeedFlow can start curating your feed.
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <InstagramConnectionCard
          connection={connection}
          loading={loading}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          connecting={connecting}
          showModeToggle={true}
        />

        <Pressable style={styles.buttonSecondary} onPress={handleSkip}>
          <Text style={styles.buttonTextSecondary}>Skip for now</Text>
        </Pressable>
      </View>
      <SuccessAnimation visible={showSuccess} message="Instagram Connected!" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 24,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 26,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    maxWidth: 320,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    width: '100%',
    maxWidth: 320,
  },
  buttonTextSecondary: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
