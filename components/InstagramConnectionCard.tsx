import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { InstagramConnection } from '../lib/types';

interface InstagramConnectionCardProps {
  connection: InstagramConnection | null;
  loading?: boolean;
  onConnect?: (mode: 'sim' | 'live', credentials?: { username: string; password: string }) => Promise<void>;
  onDisconnect?: () => Promise<void>;
  showModeToggle?: boolean;
  connecting?: boolean;
  disabled?: boolean;
}

export function InstagramConnectionCard({
  connection,
  loading = false,
  onConnect,
  onDisconnect,
  showModeToggle = false,
  connecting = false,
  disabled = false,
}: InstagramConnectionCardProps) {
  const [selectedMode, setSelectedMode] = useState<'sim' | 'live' | 'browser'>('sim');
  const [liveUsername, setLiveUsername] = useState('');
  const [livePassword, setLivePassword] = useState('');

  if (loading) {
    return <ConnectionCardSkeleton />;
  }

  if (!connection) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Instagram Connection</Text>
        </View>
        <View style={styles.content}>
          {/* Mode selector tabs */}
          <View style={styles.modeRow}>
            <Pressable
              style={[styles.modeTab, selectedMode === 'sim' && styles.modeTabActive]}
              onPress={() => setSelectedMode('sim')}
            >
              <Text style={[styles.modeTabText, selectedMode === 'sim' && styles.modeTabTextActive]}>Demo</Text>
            </Pressable>
            <Pressable
              style={[styles.modeTab, selectedMode === 'live' && styles.modeTabActive]}
              onPress={() => setSelectedMode('live')}
            >
              <Text style={[styles.modeTabText, selectedMode === 'live' && styles.modeTabTextActive]}>Live</Text>
            </Pressable>
            <Pressable
              style={[styles.modeTab, selectedMode === 'browser' && styles.modeTabActive]}
              onPress={() => setSelectedMode('browser')}
            >
              <Text style={[styles.modeTabText, selectedMode === 'browser' && styles.modeTabTextActive]}>Browser</Text>
            </Pressable>
          </View>

          {selectedMode === 'sim' ? (
            <Text style={styles.disconnectedText}>Demo mode — no real credentials needed. Perfect for testing.</Text>
          ) : selectedMode === 'live' ? (
            <>
              <Text style={styles.disconnectedText}>⚠️ Use a throwaway account only. Live mode uses Instagram’s private API.</Text>
              <TextInput
                style={styles.input}
                placeholder="Instagram username"
                placeholderTextColor="#666"
                value={liveUsername}
                onChangeText={setLiveUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#666"
                value={livePassword}
                onChangeText={setLivePassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          ) : (
            <>
              <Text style={styles.disconnectedText}>🌐 Browser mode — works with Facebook-linked accounts. Launches real browser.</Text>
              <TextInput
                style={styles.input}
                placeholder="Facebook email"
                placeholderTextColor="#666"
                value={liveUsername}
                onChangeText={setLiveUsername}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Facebook password"
                placeholderTextColor="#666"
                value={livePassword}
                onChangeText={setLivePassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          )}

          <View style={styles.buttonRow}>
            {onConnect && (
              <Pressable
                style={[
                  styles.buttonPrimary,
                  (disabled || connecting || (selectedMode !== 'sim' && (!liveUsername.trim() || !livePassword))) && styles.buttonDisabled,
                ]}
                onPress={() => {
                  if (selectedMode === 'browser') {
                    onConnect('browser', { username: liveUsername.trim(), password: livePassword });
                  } else if (selectedMode === 'live') {
                    onConnect('live', { username: liveUsername.trim(), password: livePassword });
                  } else {
                    onConnect('sim');
                  }
                }}
                disabled={disabled || connecting || (selectedMode !== 'sim' && (!liveUsername.trim() || !livePassword))}
              >
                <Text style={styles.buttonText}>
                  {connecting
                    ? 'Connecting...'
                    : selectedMode === 'browser'
                    ? 'Connect Browser Account'
                    : selectedMode === 'live'
                    ? 'Connect Live Account'
                    : 'Connect Demo Account'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  const isConnected = connection.status === 'connected';
  const isInProgress = connection.status === 'in_progress';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Instagram Connection</Text>
        <View style={[styles.statusBadge, isConnected && styles.statusConnected, isInProgress && styles.statusInProgress]}>
          <Text style={styles.statusText}>
            {isConnected ? 'Connected' : isInProgress ? 'In Progress' : 'Disconnected'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {isConnected && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username:</Text>
              <Text style={styles.infoValue}>@{connection.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mode:</Text>
              <Text style={styles.infoValue}>{connection.mode === 'sim' ? 'Demo' : 'Live'}</Text>
            </View>
            {connection.last_sync_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Sync:</Text>
                <Text style={styles.infoValue}>
                  {new Date(connection.last_sync_at).toLocaleString()}
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.buttonRow}>
          {isConnected && onDisconnect && (
            <Pressable
              style={[styles.buttonSecondary, disabled && styles.buttonDisabled]}
              onPress={onDisconnect}
              disabled={disabled || connecting}
            >
              <Text style={styles.buttonTextSecondary}>Disconnect</Text>
            </Pressable>
          )}
          {!isConnected && onConnect && (
            <Pressable
              style={[styles.buttonPrimary, disabled && styles.buttonDisabled]}
              onPress={() => onConnect('sim')}
              disabled={disabled || connecting}
            >
              <Text style={styles.buttonText}>
                {connecting ? 'Connecting...' : 'Connect Account (Demo)'}
              </Text>
            </Pressable>
          )}
        </View>


      </View>
    </View>
  );
}

function ConnectionCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlockSmall} />
      </View>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonBlock} />
        <View style={styles.skeletonBlock} />
      </View>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonBlockWide} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusInProgress: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    gap: 12,
  },
  disconnectedText: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    color: '#aaa',
    fontSize: 15,
  },
  infoValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#333',
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modeToggle: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modeToggleLabel: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonBlock: {
    height: 20,
    width: '45%',
    backgroundColor: '#333',
    borderRadius: 8,
  },
  skeletonBlockSmall: {
    height: 20,
    width: '30%',
    backgroundColor: '#333',
    borderRadius: 8,
  },
  skeletonBlockWide: {
    height: 44,
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 8,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 4,
    marginBottom: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: '#fff',
  },
  modeTabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: '#000',
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
});
