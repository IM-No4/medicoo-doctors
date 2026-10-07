import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useNetwork } from '../../services/network/NetworkContext';
import { useTheme } from '../../theme/ThemeContext';
import { useSlowLoadDetector } from './useSlowLoadDetector';

interface SlowInternetLoaderProps {
  isLoading?: boolean;
  message?: string;
  slowMessage?: string;
  verySlowMessage?: string;
  slowThresholdMs?: number;
  verySlowThresholdMs?: number;
  onRetry?: () => void;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export default function SlowInternetLoader({
  isLoading = true,
  message = 'Loading...',
  slowMessage = 'Your connection seems a bit slow. Still loading...',
  verySlowMessage = 'Taking longer than expected. Check your Wi-Fi or mobile data.',
  slowThresholdMs = 3500,
  verySlowThresholdMs = 10000,
  onRetry,
  fullScreen = false,
  style,
}: SlowInternetLoaderProps) {
  const { isDark } = useTheme();
  const { isOffline, checkConnection, isChecking } = useNetwork();
  const { isSlow, isVerySlow } = useSlowLoadDetector(isLoading, {
    slowThresholdMs,
    verySlowThresholdMs,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSlow) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isSlow, fadeAnim]);

  if (!isLoading && !isOffline) return null;

  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.inlineContainer;

  return (
    <View
      style={[
        containerStyle,
        { backgroundColor: fullScreen ? (isDark ? '#080E17' : '#FFFFFF') : 'transparent' },
        style,
      ]}
    >
      {isOffline ? (
        <View style={styles.offlineBox}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isDark ? '#2A1417' : '#FEF2F2' },
            ]}
          >
            <WifiOff size={22} color="#EF4444" />
          </View>
          <Text style={[styles.titleText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            No Internet Connection
          </Text>
          <Text style={[styles.subText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Please check your network and try again.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: '#0FBBA1' }]}
            onPress={() => {
              checkConnection();
              if (onRetry) onRetry();
            }}
            disabled={isChecking}
            activeOpacity={0.8}
          >
            {isChecking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <RefreshCw size={13} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.loadingBox}>
          <ActivityIndicator size={fullScreen ? 'large' : 'small'} color="#0FBBA1" />

          <Text
            style={[
              styles.loadingMessage,
              {
                color: isDark ? '#94A3B8' : '#64748B',
                fontSize: fullScreen ? 14 : 12.5,
              },
            ]}
          >
            {message}
          </Text>

          {isSlow && (
            <Animated.View
              style={[
                styles.slowNoticePill,
                {
                  opacity: fadeAnim,
                  backgroundColor: isVerySlow
                    ? isDark
                      ? '#23180D'
                      : '#FFFBEB'
                    : isDark
                    ? '#0D201D'
                    : '#F0FDF9',
                  borderColor: isVerySlow
                    ? isDark
                      ? '#4D2800'
                      : '#FDE68A'
                    : isDark
                    ? '#134E48'
                    : '#CCFBF1',
                },
              ]}
            >
              <View style={styles.slowNoticeHeader}>
                {isVerySlow ? (
                  <AlertCircle size={13} color="#D97706" />
                ) : (
                  <Wifi size={13} color="#0FBBA1" />
                )}
                <Text
                  style={[
                    styles.slowNoticeTitle,
                    { color: isVerySlow ? '#D97706' : '#0FBBA1' },
                  ]}
                >
                  {isVerySlow ? 'High Network Latency' : 'Slow Connection'}
                </Text>
              </View>

              <Text
                style={[
                  styles.slowNoticeBody,
                  { color: isDark ? '#CBD5E1' : '#475569' },
                ]}
              >
                {isVerySlow ? verySlowMessage : slowMessage}
              </Text>

              {isVerySlow && onRetry && (
                <TouchableOpacity
                  style={[
                    styles.smallRetryBtn,
                    {
                      backgroundColor: isDark ? '#1E2D3D' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  onPress={onRetry}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={11} color={isDark ? '#E2E8F0' : '#1E293B'} />
                  <Text
                    style={[
                      styles.smallRetryBtnText,
                      { color: isDark ? '#E2E8F0' : '#1E293B' },
                    ]}
                  >
                    Refresh
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  inlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 320,
  },
  loadingMessage: {
    fontWeight: '600',
    textAlign: 'center',
  },
  slowNoticePill: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 3,
    width: '100%',
  },
  slowNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  slowNoticeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  slowNoticeBody: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },
  smallRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  smallRetryBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  offlineBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 280,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  titleText: {
    fontSize: 14.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  subText: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
