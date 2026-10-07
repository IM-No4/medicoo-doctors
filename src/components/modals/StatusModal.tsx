import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export type StatusType =
  | 'idle'
  | 'loading'
  | 'success'
  | 'date_error'
  | 'error'
  | 'warning'
  | 'info';

interface StatusModalProps {
  visible: boolean;
  status: StatusType;
  title?: string;
  message?: string;
  onClose: () => void;
  autoCloseDelay?: number; // Optional: Auto close success messages
  primaryAction?: () => void;
  primaryActionText?: string;
  secondaryActionText?: string;
}

const DEFAULT_TITLES: Partial<Record<StatusType, string>> = {
  success: 'Success',
  error: 'Error',
  date_error: 'Error',
  warning: 'Warning',
  info: 'Information',
};

const PRIMARY_COLORS: Partial<Record<StatusType, string>> = {
  success: '#0FBBA1',
  error: '#EF4444',
  date_error: '#EF4444',
  warning: '#0FBBA1',
  info: '#3B82F6',
};

const GLOW_COLORS: Record<StatusType, string> = {
  idle: '#0FBBA1',
  loading: '#0FBBA1',
  success: '#0FBBA1',
  error: '#EF4444',
  date_error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// The same bright hex that reads fine on a white card renders far more
// intense/neon against this modal's near-black dark card - error was
// reported as outright hard to look at there, so it gets a deeper, less
// saturated shade for both the button and the border glow in dark mode
// specifically. Light mode is untouched.
const DARK_MODE_ACCENT_OVERRIDES: Partial<Record<StatusType, string>> = {
  error: '#B91C1C',
  date_error: '#B91C1C',
};

const CONFIRM_COLOR = '#EF4444';
const DARK_CONFIRM_COLOR = '#B91C1C';

export default function StatusModal({
  visible,
  status,
  title,
  message,
  onClose,
  autoCloseDelay,
  primaryAction,
  primaryActionText,
  secondaryActionText,
}: StatusModalProps) {
  const { isDark } = useTheme();

  useEffect(() => {
    if (status === 'success' && autoCloseDelay && visible) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [status, visible, autoCloseDelay, onClose]);

  // Ensure Android system navigation bar strictly follows the active theme
  useEffect(() => {
    if (Platform.OS === 'android' && visible && status !== 'idle') {
      if (isDark) {
        NavigationBar.setBackgroundColorAsync('#080E17');
        NavigationBar.setButtonStyleAsync('light');
      } else {
        NavigationBar.setBackgroundColorAsync('#FFFFFF');
        NavigationBar.setButtonStyleAsync('dark');
      }
    }
  }, [visible, status, isDark]);

  if (!visible || status === 'idle') return null;

  const glowColor = (isDark && DARK_MODE_ACCENT_OVERRIDES[status]) || GLOW_COLORS[status];
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1E2D3D' : '#E2E8F0';
  const titleColor = isDark ? '#F8FAFC' : '#0F172A';
  const messageColor = isDark ? '#94A3B8' : '#64748B';
  const secondaryBg = isDark ? '#1E2D3D' : '#F1F5F9';
  const secondaryTextColor = isDark ? '#CBD5E1' : '#334155';

  const glowStyle = Platform.select({
    ios: {
      shadowColor: glowColor,
      shadowOpacity: isDark ? 0.3 : 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      borderWidth: 1.5,
      // Dark mode gets a noticeably gentler tint (25% vs 27%) on top of
      // the already-deeper override color above - the combination of a
      // bright hex at high alpha against a near-black card is what made
      // this look like a glowing neon ring.
      borderColor: isDark ? `${glowColor}40` : `${glowColor}44`,
    },
    default: {},
  });

  if (status === 'loading') {
    return (
      <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
        <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(15,23,42,0.5)' }]}>
          <View style={[styles.card, styles.loadingCard, { backgroundColor: cardBg }, glowStyle]}>
            <ActivityIndicator size="large" color="#0FBBA1" />
            <Text style={[styles.loadingText, { color: titleColor }]}>
              {message || 'Processing...'}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  const isConfirmable = status === 'warning' || status === 'info';
  const showCancel = isConfirmable && !!primaryAction;
  const primaryColor = showCancel
    ? (isDark ? DARK_CONFIRM_COLOR : CONFIRM_COLOR)
    : (isDark && DARK_MODE_ACCENT_OVERRIDES[status]) || PRIMARY_COLORS[status] || '#0FBBA1';
  const primaryLabel = primaryActionText || (showCancel ? 'Yes' : 'OK');

  const renderIcon = () => {
    switch (status) {
      case 'success':
        return (
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isDark ? '#064E3B' : '#E6FAF6' },
            ]}
          >
            <CheckCircle2 size={32} color="#0FBBA1" strokeWidth={2.3} />
          </View>
        );
      case 'error':
      case 'date_error':
        return (
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isDark ? '#451A1A' : '#FEF2F2' },
            ]}
          >
            <XCircle size={32} color="#EF4444" strokeWidth={2.3} />
          </View>
        );
      case 'warning':
        return (
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isDark ? '#452A0A' : '#FFFBEB' },
            ]}
          >
            <AlertTriangle size={32} color="#F59E0B" strokeWidth={2.3} />
          </View>
        );
      case 'info':
        return (
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' },
            ]}
          >
            <Info size={32} color="#3B82F6" strokeWidth={2.3} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View
        style={[
          styles.overlay,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(15,23,42,0.5)' },
        ]}
      >
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, glowStyle]}>
          {renderIcon()}

          <Text style={[styles.title, { color: titleColor }]}>
            {title || DEFAULT_TITLES[status]}
          </Text>

          {!!message && (
            <Text style={[styles.message, { color: messageColor }]}>
              {message}
            </Text>
          )}

          <View style={styles.buttonRow}>
            {showCancel && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.flexButton,
                  { backgroundColor: secondaryBg },
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: secondaryTextColor }]}>
                  {secondaryActionText || 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.flexButton,
                { backgroundColor: primaryColor },
              ]}
              onPress={primaryAction || onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{primaryLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    borderWidth: 1,
  },
  loadingCard: {
    alignItems: 'center',
    maxWidth: 280,
    paddingVertical: 28,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 22,
    gap: 10,
    width: '100%',
  },
  button: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexButton: {
    flex: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  secondaryButtonText: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
