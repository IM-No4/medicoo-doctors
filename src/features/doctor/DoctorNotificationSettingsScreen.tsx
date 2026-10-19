import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { ArrowLeft, BellOff, Calendar, MessageCircle, Wallet } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import {
  getNotificationPermissionStatus,
  NotificationPermissionStatus,
  requestNotificationPermission,
} from '../../utils/deviceUtils';
import { DoctorNotificationSettings, getDoctorProfile, updateDoctorSettings } from '../../services/api/user.api';
import { useTheme } from '../../theme/ThemeContext';

const DEFAULT_NOTIFICATION_SETTINGS: DoctorNotificationSettings = {
  newAppointmentRequests: true,
  chatMessages: true,
  paymentConfirmations: true,
};

const NOTIFICATION_ITEMS: {
  key: keyof DoctorNotificationSettings;
  icon: React.ComponentType<any>;
  title: string;
  sub: string;
}[] = [
  { key: 'newAppointmentRequests', icon: Calendar, title: 'New Appointment Requests', sub: 'When a patient requests a consultation' },
  { key: 'chatMessages', icon: MessageCircle, title: 'Chat Messages', sub: 'New messages during consultations' },
  { key: 'paymentConfirmations', icon: Wallet, title: 'Payment Confirmations', sub: 'Payout and earnings updates' },
];

export default function DoctorNotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState<DoctorNotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionStatus>('not-determined');
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    status: StatusType;
    title: string;
    message: string;
  }>({ visible: false, status: 'idle', title: '', message: '' });

  const showStatus = (status: StatusType, title: string, message: string) => {
    setStatusModal({ visible: true, status, title, message });
  };

  const bgColor = isDark ? '#080E17' : '#EFF2F6';
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? '#1A2636' : '#F1F5F9';
  const iconColor = isDark ? '#94A3B8' : '#475569';

  React.useEffect(() => {
    RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(bgColor, true);
      RNStatusBar.setTranslucent(false);
      if (isDark) {
        NavigationBar.setBackgroundColorAsync('#080E17');
        NavigationBar.setButtonStyleAsync('light');
      } else {
        NavigationBar.setBackgroundColorAsync('#EFF2F6');
        NavigationBar.setButtonStyleAsync('dark');
      }
    }
  }, [isDark, bgColor]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profile, permission] = await Promise.all([
        getDoctorProfile().catch(() => null),
        getNotificationPermissionStatus(),
      ]);
      if (profile?.notificationSettings) {
        setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...profile.notificationSettings });
      }
      setNotificationPermission(permission);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const toggleNotificationSetting = async (key: keyof DoctorNotificationSettings) => {
    const next = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(next);
    setSavingKey(key);
    try {
      await updateDoctorSettings({ notificationSettings: next });
    } catch {
      setNotificationSettings(notificationSettings);
      showStatus('error', 'Update Failed', "Couldn't save your notification preference. Please check your connection and try again.");
    } finally {
      setSavingKey(null);
    }
  };

  const handleEnableNotifications = async () => {
    if (notificationPermission === 'denied') {
      Linking.openSettings();
      return;
    }
    setRequestingPermission(true);
    try {
      await requestNotificationPermission();
    } finally {
      setRequestingPermission(false);
      setNotificationPermission(await getNotificationPermissionStatus());
    }
  };

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color="#0FBBA1" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Header Bar (Floating Round Back Button + Title) ═══ */}
      <View style={[styles.headerBar, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity
          style={[styles.roundBackBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('DoctorDashboard');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.screenHeaderTitle, { color: textColor }]}>Notification Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 36 }]}
      >
        {notificationPermission !== 'granted' && notificationPermission !== 'provisional' && (
          <View
            style={[
              styles.permissionBanner,
              { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.12)' : '#FEF2F2' },
            ]}
          >
            <BellOff size={18} color="#DC2626" />
            <View style={styles.permissionBannerTextCol}>
              <Text style={styles.permissionBannerTitle}>Notifications are turned off</Text>
              <Text style={[styles.permissionBannerSub, { color: subTextColor }]}>
                {notificationPermission === 'denied'
                  ? "You won't be notified about new requests or messages until you enable this in phone settings."
                  : "You won't be notified about new requests or messages until you enable this."}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.permissionBannerButton, requestingPermission && { opacity: 0.7 }]}
              onPress={handleEnableNotifications}
              disabled={requestingPermission}
            >
              {requestingPermission ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.permissionBannerButtonText}>
                  {notificationPermission === 'denied' ? 'Open Settings' : 'Enable'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {NOTIFICATION_ITEMS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <View
                key={item.key}
                style={[
                  styles.itemRow,
                  { borderBottomColor: dividerColor, borderBottomWidth: idx === NOTIFICATION_ITEMS.length - 1 ? 0 : 1 },
                ]}
              >
                <View style={styles.itemLeft}>
                  <Icon size={18} color={iconColor} />
                  <View style={styles.itemTextCol}>
                    <Text style={[styles.itemTitle, { color: textColor }]}>{item.title}</Text>
                    <Text style={[styles.itemSub, { color: subTextColor }]}>{item.sub}</Text>
                  </View>
                </View>
                <Switch
                  value={notificationSettings[item.key]}
                  onValueChange={() => toggleNotificationSetting(item.key)}
                  disabled={savingKey === item.key}
                  trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#0FBBA1' }}
                  thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      <StatusModal
        visible={statusModal.visible}
        status={statusModal.status}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  screenHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },

  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  permissionBannerTextCol: { flex: 1 },
  permissionBannerTitle: { fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 2 },
  permissionBannerSub: { fontSize: 12, lineHeight: 16 },
  permissionBannerButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 76,
    alignItems: 'center',
  },
  permissionBannerButtonText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemTextCol: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 11.5, marginTop: 2 },
});
