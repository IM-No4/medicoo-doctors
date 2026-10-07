import { RefreshCw, ShieldAlert, WifiOff } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../../services/network/NetworkContext';
import { useTheme } from '../../theme/ThemeContext';

interface NoInternetScreenProps {
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export default function NoInternetScreen({
  onRetry,
  title = 'No Internet Connection',
  description = 'Please check your Wi-Fi or mobile network connection and try again. Your offline consultation records are saved safely.',
}: NoInternetScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { isChecking, checkConnection } = useNetwork();

  const handleRetry = async () => {
    const isOnline = await checkConnection();
    if (isOnline && onRetry) {
      onRetry();
    } else if (onRetry) {
      onRetry();
    }
  };

  const bgColor = isDark ? '#080E17' : '#FFFFFF';
  const textColor = isDark ? '#F8FAFC' : '#0F172A';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconOuterCircle,
            { backgroundColor: isDark ? '#1C1620' : '#FEF2F2' },
          ]}
        >
          <View
            style={[
              styles.iconInnerCircle,
              { backgroundColor: isDark ? '#2E1519' : '#FEE2E2' },
            ]}
          >
            <WifiOff size={42} color="#EF4444" strokeWidth={2.2} />
          </View>
        </View>

        <Text style={[styles.title, { color: textColor }]}>{title}</Text>

        <Text style={[styles.description, { color: subTextColor }]}>
          {description}
        </Text>

        <View
          style={[
            styles.tipBox,
            {
              backgroundColor: isDark ? '#111B27' : '#F8FAFC',
              borderColor: isDark ? '#1E2D3D' : '#E2E8F0',
            },
          ]}
        >
          <ShieldAlert size={16} color="#0FBBA1" />
          <Text style={[styles.tipText, { color: subTextColor }]}>
            Tip: Turn Airplane mode on and off, or connect to a reliable Wi-Fi network.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: '#0FBBA1' }]}
          onPress={handleRetry}
          disabled={isChecking}
          activeOpacity={0.8}
        >
          {isChecking ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconOuterCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconInnerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    paddingHorizontal: 8,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    flex: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#0FBBA1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
