import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAutomation } from '../../hooks/useAutomation';
import { useActivity } from '../../hooks/useActivity';
import { useInstagramConnection } from '../../hooks/useInstagramConnection';
import { getProgressHistory, ProgressHistory } from '../../lib/api';
import { SuccessAnimation } from '../../components/SuccessAnimation';

export default function DashboardScreen() {
  const { job, loading: jobLoading, start, pause, toggling } = useAutomation();
  const { entries, loading: activityLoading } = useActivity();
  const { connection } = useInstagramConnection();
  const [progressHistory, setProgressHistory] = useState<ProgressHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch progress history for trend chart
  useEffect(() => {
    let mounted = true;
    const fetchHistory = async () => {
      try {
        const data = await getProgressHistory(30); // Last 30 snapshots
        if (mounted) {
          setProgressHistory(data.reverse()); // Reverse to show oldest → newest
          setHistoryLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch progress history:', error);
        if (mounted) setHistoryLoading(false);
      }
    };
    fetchHistory();
    return () => { mounted = false; };
  }, []);

  const handleStartPress = async () => {
    try {
      await start();
      // Haptic feedback on successful start
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Show success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error: any) {
      // Show user-friendly error (Rule #21)
      const message = error?.message || 'Failed to start automation. Please check your preferences and try again.';
      if (Platform.OS === 'web') {
        window.alert('Start Failed\n\n' + message);
      } else {
        Alert.alert('Start Failed', message);
      }
    }
  };

  const handlePausePress = () => {
    // Rule #13: destructive action requires confirmation
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Pause automation?\n\nThis will stop feed personalization until you restart it.'
      );
      if (confirmed) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        pause().catch((err) => {
          const message = err?.message || 'Failed to pause automation. Please try again.';
          window.alert('Pause Failed\n\n' + message);
        });
      }
    } else {
      Alert.alert(
        'Pause Automation?',
        'This will stop feed personalization until you restart it.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pause',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              pause().catch((err) => {
                const message = err?.message || 'Failed to pause automation. Please try again.';
                Alert.alert('Pause Failed', message);
              });
            },
          },
        ]
      );
    }
  };

  // Format relative time (simple implementation)
  const formatRelativeTime = (isoString: string | undefined) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  // Map error messages to friendly text (Rule #21)
  const getFriendlyError = (message: string | null) => {
    if (!message) return null;
    if (message.includes('disconnected') || message.includes('connection')) {
      return 'Instagram is disconnected. Please reconnect to continue.';
    }
    if (message.includes('timeout')) {
      return 'Automation timed out. It will retry automatically.';
    }
    return 'Automation encountered an error. Check your connection and try again.';
  };

  if (jobLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading automation status...</Text>
        </View>
      </View>
    );
  }

  const status = job?.status || 'paused';
  const isActive = status === 'active';
  const isError = status === 'error';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. Status Hero Card (Rule #14: always visible) */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.heroCard}>
        <View style={[styles.statusBadge, styles[`status_${status}`]]}>
          <Text style={styles.statusBadgeText}>
            {isActive ? '● Active' : isError ? '● Error' : '○ Paused'}
          </Text>
        </View>
        {connection && connection.username && (
          <Text style={styles.usernameText}>@{connection.username}</Text>
        )}
      </Animated.View>

      {/* 6. Error Banner */}
      {isError && job?.error_message && (
        <Animated.View entering={FadeInDown.delay(100)} style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{getFriendlyError(job.error_message)}</Text>
        </Animated.View>
      )}

      {/* 2. Progress Bar */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
        <Text style={styles.sectionTitle}>Personalization Progress</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${job?.progress_score || 0}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(job?.progress_score || 0)}%</Text>
      </Animated.View>

      {/* 2.5. Progress Trend Chart */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Trend</Text>
        {historyLoading ? (
          <View style={styles.chartSkeleton}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        ) : progressHistory.length < 2 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>Not enough data yet — chart appears after 2+ automation runs</Text>
          </View>
        ) : (
          <LineChart
            data={{
              labels: progressHistory.map((_, i) => 
                i % Math.ceil(progressHistory.length / 6) === 0 ? `${i + 1}` : ''
              ),
              datasets: [{ data: progressHistory.map(h => h.score) }],
            }}
            width={Dimensions.get('window').width - 40}
            height={180}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.6})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '3',
                strokeWidth: '2',
                stroke: '#007AFF',
              },
            }}
            bezier
            style={styles.chart}
          />
        )}
      </Animated.View>

      {/* 3. Stats Row */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{job?.actions_count || 0}</Text>
          <Text style={styles.statLabel}>Actions Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatRelativeTime(job?.last_run_at)}</Text>
          <Text style={styles.statLabel}>Last Activity</Text>
        </View>
      </Animated.View>

      {/* 4. Primary Action Button */}
      <Animated.View entering={FadeInDown.delay(500)}>
        <Pressable
          style={[styles.actionButton, toggling && styles.actionButtonDisabled]}
          onPress={isActive ? handlePausePress : handleStartPress}
          disabled={toggling}
        >
          <Text style={styles.actionButtonText}>
            {toggling ? 'Working...' : isActive ? 'Pause Automation' : 'Start Automation'}
          </Text>
        </Pressable>
      </Animated.View>

      {/* 5. Activity Feed */}
      <Animated.View entering={FadeInDown.delay(600)} style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {activityLoading ? (
          <View style={styles.skeletonLoader}>
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLine} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No activity yet — start automation to begin</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {entries.slice(0, 10).map((entry) => (
              <View key={entry.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Text style={styles.activityIconText}>
                    {entry.action_type === 'like' ? '❤️' : entry.action_type === 'follow' ? '👤' : 'ℹ️'}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    {entry.action_type === 'like' && `Liked ${entry.topic ? `#${entry.topic}` : 'post'}`}
                    {entry.action_type === 'follow' && `Followed ${entry.topic ? `#${entry.topic}` : 'account'}`}
                    {entry.action_type === 'system' && (entry.topic || 'System event')}
                  </Text>
                  <Text style={styles.activityTime}>{formatRelativeTime(entry.performed_at)}</Text>
                </View>
                <View style={[styles.resultDot, styles[`result_${entry.result}`]]} />
              </View>
            ))}
          </View>
        )}
      </Animated.View>
      <SuccessAnimation visible={showSuccess} message="Automation Started!" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  status_active: {
    backgroundColor: '#E8F5E9',
  },
  status_paused: {
    backgroundColor: '#F5F5F5',
  },
  status_error: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  usernameText: {
    fontSize: 16,
    color: '#666',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorBannerText: {
    color: '#C62828',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressText: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chartSkeleton: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  emptyChart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 20,
  },
  emptyChartText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonDisabled: {
    backgroundColor: '#B0BEC5',
    shadowOpacity: 0.1,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  skeletonLoader: {
    gap: 12,
  },
  skeletonLine: {
    height: 48,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconText: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  resultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  result_success: {
    backgroundColor: '#4CAF50',
  },
  result_failed: {
    backgroundColor: '#F44336',
  },
  result_skipped: {
    backgroundColor: '#FFC107',
  },
});
