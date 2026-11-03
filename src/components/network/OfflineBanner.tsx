import { palette } from '../../theme/palette';
import { Check, RefreshCw, WifiOff } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../../services/network/NetworkContext';
import { useTheme } from '../../theme/ThemeContext';

export default function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { isOffline, isChecking, checkConnection, showOnlineRecoveryBanner } = useNetwork();

  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const isVisible = isOffline || showOnlineRecoveryBanner;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 5,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateY, opacity]);

  if (!isVisible) {
    return null;
  }

  const isRecovery = showOnlineRecoveryBanner && !isOffline;

  // Modern sleek capsule theme
  const pillBg = isRecovery
    ? isDark
      ? palette.emerald900
      : palette.emerald800
    : isDark
    ? palette.navyText
    : palette.navy;

  const pillBorder = isRecovery
    ? isDark
      ? palette.emerald600
      : palette.emerald500
    : isDark
    ? palette.navyMuted
    : palette.navyText;

  const dotColor = isRecovery ? palette.emerald400 : palette.red500;
  const iconColor = isRecovery ? palette.emerald400 : palette.red400;

  return (
    <Animated.View
      pointerEvents={isVisible ? 'box-none' : 'none'}
      style={[
        styles.wrapper,
        {
          top: Math.max(insets.top + (Platform.OS === 'ios' ? 4 : 8), 12),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.capsule,
          {
            backgroundColor: pillBg,
            borderColor: pillBorder,
          },
        ]}
        onPress={checkConnection}
        disabled={isChecking || isRecovery}
        activeOpacity={0.85}
      >
        {/* Status Dot / Icon Wrap */}
        <View style={styles.leftGroup}>
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
          {isRecovery ? (
            <Check size={13} color={iconColor} strokeWidth={3} />
          ) : (
            <WifiOff size={13} color={iconColor} strokeWidth={2.5} />
          )}
          <Text style={styles.titleText}>
            {isRecovery
              ? 'Back Online'
              : isChecking
              ? 'Connecting...'
              : 'You are offline'}
          </Text>
        </View>

        {/* Action Button / Helper tag */}
        {!isRecovery && (
          <View style={styles.actionGroup}>
            <View style={styles.divider} />
            {isChecking ? (
              <ActivityIndicator size="small" color={palette.white} style={{ transform: [{ scale: 0.7 }] }} />
            ) : (
              <View style={styles.retryWrap}>
                <RefreshCw size={11} color={palette.slate400} />
                <Text style={styles.retryText}>Retry</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.white,
    letterSpacing: -0.1,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: palette.whiteA20,
  },
  retryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retryText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: palette.slate300,
  },
});
