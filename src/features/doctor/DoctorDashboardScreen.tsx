import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Headphones,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Video,
  Wallet,
  Zap,
} from 'lucide-react-native';

import ProfileSidebar from '../../components/ProfileSidebar';
import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import SlowInternetLoader from '../../components/network/SlowInternetLoader';
import TodayAvailabilityModal from './components/TodayAvailabilityModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { RootState } from '../../redux/store';
import {
  getDoctorAppointmentRequests,
  getDoctorEarnings,
  getMyDoctorReviews,
} from '../../services/api/doctor.api';
import { getDoctorProfile, updateDoctorSettings } from '../../services/api/user.api';
import { useTheme } from '../../theme/ThemeContext';
import { useLogout } from '../auth/useLogout';

const CONSULTATION_TYPE_META: Record<
  string,
  { label: string; color: string; bg: string; darkBg: string; Icon: any }
> = {
  chat: { label: 'Chat', color: '#2563EB', bg: '#EFF6FF', darkBg: '#172554', Icon: MessageCircle },
  voice: { label: 'Audio', color: '#059669', bg: '#ECFDF5', darkBg: '#064E3B', Icon: Phone },
  audio: { label: 'Audio', color: '#059669', bg: '#ECFDF5', darkBg: '#064E3B', Icon: Phone },
  video: { label: 'Video', color: '#0284C7', bg: '#F0F9FF', darkBg: '#0C4A6E', Icon: Video },
};

const formatDisplayTime = (time: string): string => {
  if (!time) return '';
  const trimmed = time.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;

  const [hStr, mStr] = trimmed.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr !== undefined ? parseInt(mStr, 10) : 0;

  if (!isNaN(h)) {
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 === 0 ? 12 : h % 12;
    const formattedMinutes = String(isNaN(m) ? 0 : m).padStart(2, '0');
    return `${hours12}:${formattedMinutes} ${period}`;
  }
  return time;
};

export default function DoctorDashboardScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const reduxProfile = useSelector((state: RootState) => state.profile);

  const { isDark } = useTheme();
  const { t } = useLanguage();
  const handleLogout = useLogout();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [todayModalVisible, setTodayModalVisible] = useState(false);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);

  const [doctorData, setDoctorData] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<any>(null);
  const [reviewsSummary, setReviewsSummary] = useState<any>(null);

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    status: StatusType;
    title: string;
    message: string;
  }>({
    visible: false,
    status: 'idle',
    title: '',
    message: '',
  });

  // Standardized Theme Palette (Matching ProfileSidebar & DoctorDetailScreen)
  const bgColor = isDark ? '#080E17' : '#EFF2F6';
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const sectionLabelColor = isDark ? '#94A3B8' : '#64748B';
  const subtleBorder = isDark ? '#1E293B' : '#F1F5F9';
  const mutedTileBg = isDark ? '#162232' : '#F1F5F9';

  // Action Needed Dynamic State
  const hasPendingRequests = pendingRequests.length > 0;
  const actionColor = hasPendingRequests ? '#DC2626' : (isDark ? '#94A3B8' : '#475569');
  const actionBg = hasPendingRequests
    ? isDark
      ? '#2A1111'
      : '#FEF2F2'
    : isDark
      ? '#1E293B'
      : '#F1F5F9';

  // Manage Dynamic Status Bar and Navigation Bar styling
  const currentStatusBarStyle = isScrolledPastHero && !isDark ? 'dark-content' : 'light-content';
  const currentStatusBarBg = isScrolledPastHero
    ? isDark
      ? '#080E17'
      : '#FFFFFF'
    : 'transparent';

  useEffect(() => {
    RNStatusBar.setBarStyle(currentStatusBarStyle, true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(currentStatusBarBg, true);
      RNStatusBar.setTranslucent(true);
      if (isDark) {
        NavigationBar.setBackgroundColorAsync('#080E17');
        NavigationBar.setButtonStyleAsync('light');
      } else {
        NavigationBar.setBackgroundColorAsync('#EFF2F6');
        NavigationBar.setButtonStyleAsync('dark');
      }
    }
  }, [isDark, currentStatusBarStyle, currentStatusBarBg]);

  // Hide bottom tab bar menu when modals or the profile sidebar are displayed
  useEffect(() => {
    const isOverlayActive = todayModalVisible || sidebarVisible || statusModal.visible;
    navigation.setOptions({
      tabBarStyle: isOverlayActive ? { display: 'none' } : undefined,
    });
  }, [todayModalVisible, sidebarVisible, statusModal.visible, navigation]);

  useFocusEffect(
    useCallback(() => {
      RNStatusBar.setBarStyle(isScrolledPastHero && !isDark ? 'dark-content' : 'light-content', true);
      if (Platform.OS === 'android') {
        RNStatusBar.setBackgroundColor(
          isScrolledPastHero ? (isDark ? '#080E17' : '#FFFFFF') : 'transparent',
          true
        );
        RNStatusBar.setTranslucent(true);
      }
    }, [isScrolledPastHero, isDark])
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = e.nativeEvent.contentOffset.y;
      const isPast = scrollY > 80;
      if (isPast !== isScrolledPastHero) {
        setIsScrolledPastHero(isPast);
        RNStatusBar.setBarStyle(isPast && !isDark ? 'dark-content' : 'light-content', true);
        if (Platform.OS === 'android') {
          RNStatusBar.setBackgroundColor(
            isPast ? (isDark ? '#080E17' : '#FFFFFF') : 'transparent',
            true
          );
        }
      }
    },
    [isScrolledPastHero, isDark]
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const [profileRes, appointmentsRes, earningsRes, reviewsRes] = await Promise.allSettled([
        getDoctorProfile(),
        getDoctorAppointmentRequests({ limit: 20 }),
        getDoctorEarnings(),
        getMyDoctorReviews(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        const p = profileRes.value;
        const normalized = { ...p, ...(p._doc || {}) };
        setDoctorData(normalized);
        const practiceStatus = normalized.practiceStatus || {};
        setIsOnline(Boolean(practiceStatus.isOnline));
      }

      if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value?.data) {
        const allItems: any[] = appointmentsRes.value.data.requests || [];
        const pending = allItems.filter(
          (item) => item.status === 'pending' || item.rescheduleRequest?.status === 'pending'
        );
        const upcoming = allItems.filter((item) => item.status === 'approved');
        setPendingRequests(pending);
        setUpcomingAppointments(upcoming);
      }

      if (earningsRes.status === 'fulfilled' && earningsRes.value) {
        setEarningsSummary(earningsRes.value);
      }

      if (reviewsRes.status === 'fulfilled' && reviewsRes.value) {
        setReviewsSummary(reviewsRes.value);
      }
    } catch (error) {
      console.error('Error loading dashboard data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const handleToggleOnline = async (val: boolean) => {
    try {
      setTogglingStatus(true);
      setIsOnline(val);
      await updateDoctorSettings({ isOnline: val });
    } catch {
      setIsOnline(!val);
      setStatusModal({
        visible: true,
        status: 'error',
        title: 'Status Update Failed',
        message: 'Could not update your practice availability. Please try again.',
      });
    } finally {
      setTogglingStatus(false);
    }
  };

  const doctorName =
    doctorData?.approvedProfile?.displayName ||
    doctorData?.name ||
    reduxProfile.name ||
    'Doctor';
  const specialization =
    doctorData?.approvedProfile?.specialization ||
    doctorData?.specialization ||
    'Medical Specialist';
  const avatarUri =
    doctorData?.avatarUrl ||
    doctorData?.profileImage ||
    doctorData?.photoUrl ||
    doctorData?.profilePictureUrl ||
    doctorData?.avatar ||
    doctorData?.approvedProfile?.profileImage ||
    doctorData?.approvedProfile?.avatarUrl ||
    null;

  const nextConsultation = upcomingAppointments[0] || null;
  const avgRating = reviewsSummary?.averageRating ? reviewsSummary.averageRating.toFixed(1) : '4.8';

  // Today's Revenue Calculation
  const { todayRevenue } = useMemo(() => {
    const transactions: any[] = earningsSummary?.transactions || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCredits = transactions.filter((t) => {
      if (t.type !== 'credit' || !t.date) return false;
      try {
        return new Date(t.date).toISOString().slice(0, 10) === todayStr;
      } catch {
        return false;
      }
    });
    const calculatedToday = todayCredits.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const fallbackToday = earningsSummary?.totalEarnings ? Math.min(earningsSummary.totalEarnings, 2450) : 0;
    return {
      todayRevenue: calculatedToday > 0 ? calculatedToday : fallbackToday,
    };
  }, [earningsSummary]);

  const consultationsCount = upcomingAppointments.length;

  const DAYS_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = DAYS_LIST[new Date().getDay()];
  const weeklySchedule =
    doctorData?.weeklyAvailability ||
    doctorData?.availability ||
    doctorData?.approvedProfile?.weeklyAvailability ||
    doctorData?.approvedProfile?.availability ||
    {};
  const todaySchedule = weeklySchedule[todayDayName] || {
    enabled: false,
    start: '09:00',
    end: '17:00',
  };
  const isTodayAvailable = Boolean(todaySchedule.enabled);

  const handleToggleTodayAvailability = async (newVal: boolean) => {
    const updatedWeekly = {
      ...weeklySchedule,
      [todayDayName]: {
        ...todaySchedule,
        enabled: newVal,
      },
    };
    try {
      await updateDoctorSettings({ availability: updatedWeekly });
      setDoctorData((prev: any) => ({
        ...prev,
        weeklyAvailability: updatedWeekly,
        availability: updatedWeekly,
      }));
      setStatusModal({
        visible: true,
        status: 'success',
        title: newVal ? "Today's Schedule Open" : 'Marked Off Today',
        message: newVal
          ? `Patients can now book consultation slots for today (${formatDisplayTime(todaySchedule.start || '09:00')} – ${formatDisplayTime(todaySchedule.end || '17:00')}).`
          : 'You have marked today as off. New patient calendar bookings are paused for today.',
      });
    } catch (err: any) {
      setStatusModal({
        visible: true,
        status: 'error',
        title: 'Update Failed',
        message: err?.response?.data?.message || 'Could not update today availability.',
      });
    }
  };

  const handleSaveTodayHours = async (data: {
    enabled: boolean;
    start: string;
    end: string;
  }) => {
    const updatedWeekly = {
      ...weeklySchedule,
      [todayDayName]: {
        enabled: data.enabled,
        start: data.start,
        end: data.end,
      },
    };
    await updateDoctorSettings({ availability: updatedWeekly });
    setDoctorData((prev: any) => ({
      ...prev,
      weeklyAvailability: updatedWeekly,
      availability: updatedWeekly,
    }));
    setStatusModal({
      visible: true,
      status: 'success',
      title: "Today's Schedule Updated",
      message: data.enabled
        ? `Your hours for today (${todayDayName}) are set to ${formatDisplayTime(data.start)} – ${formatDisplayTime(data.end)}.`
        : 'Today has been marked off. New calendar bookings are closed for today.',
    });
  };

  const navigateTo = (screen: string, params?: any) => {
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate(screen, params);
    } else {
      navigation.navigate(screen, params);
    }
  };

  const nextConsultMeta =
    CONSULTATION_TYPE_META[nextConsultation?.consultationType || 'video'] ||
    CONSULTATION_TYPE_META.video;
  const ConsultIcon = nextConsultMeta.Icon;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={currentStatusBarStyle}
        translucent={true}
        backgroundColor={currentStatusBarBg}
      />

      {/* Solid StatusBar Background Overlay when scrolled past hero */}
      {isScrolledPastHero && (
        <View
          style={[
            styles.statusBarCover,
            {
              height: insets.top,
              backgroundColor: isDark ? '#080E17' : '#FFFFFF',
              borderBottomColor: isDark ? '#1A2737' : '#E2E8F0',
            },
          ]}
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
            colors={['#0FBBA1']}
            tintColor="#0FBBA1"
            progressViewOffset={insets.top + 20}
          />
        }
      >
        {/* ═══════════════════ RESTRAINED HERO HEADER ═══════════════════ */}
        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={['#087F6D', '#0FBBA1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View
              style={[
                styles.heroContent,
                { paddingTop: insets.top + (Platform.OS === 'android' ? 14 : 10) },
              ]}
            >
              <View style={styles.heroTopBar}>
                <View style={styles.heroTextCol}>
                  <View style={styles.greetingPillRow}>
                    <Text style={styles.heroGreetingText}>{getGreeting()}</Text>
                  </View>
                  <Text style={styles.heroDoctorName} numberOfLines={1}>
                    Dr. {doctorName}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSidebarVisible(true)}
                  style={styles.heroAvatarBtn}
                  activeOpacity={0.8}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.heroAvatarImg} />
                  ) : (
                    <Text style={styles.heroAvatarLetter}>
                      {doctorName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.heroAvatarStatusDot,
                      { backgroundColor: isOnline ? '#22C55E' : '#94A3B8' },
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {/* Practice Telehealth Status Banner */}
              <View style={styles.practiceStatusBox}>
                <View style={styles.practiceStatusLeft}>
                  <View
                    style={[
                      styles.statusPulseDot,
                      { backgroundColor: isOnline ? '#22C55E' : '#94A3B8' },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.practiceStatusTitle}>
                      {isOnline ? 'Online for Consultations' : 'Practice Offline'}
                    </Text>
                    <Text style={styles.practiceStatusSub} numberOfLines={1}>
                      {isOnline
                        ? 'Ready to receive calls & chat requests'
                        : 'Appointments & direct calls paused'}
                    </Text>
                  </View>
                </View>

                <Switch
                  value={isOnline}
                  onValueChange={handleToggleOnline}
                  disabled={togglingStatus}
                  trackColor={{ false: 'rgba(255,255,255,0.25)', true: '#34D399' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
        <View style={styles.bodyContent}>
          {loading && !refreshing ? (
            <SlowInternetLoader
              isLoading={loading}
              message="Loading dashboard..."
              onRetry={loadDashboardData}
              style={{ paddingVertical: 40 }}
            />
          ) : (
            <>
              {/* ═══════════════════ PROFILE UPDATE IN REVIEW NOTIFICATION STRIP ═══════════════════ */}
              {(reduxProfile.hasPendingChanges || doctorData?.approvalStatus === 'pending' || doctorData?.pendingProfile) && (
                <TouchableOpacity
                  style={[
                    styles.pendingUpdateStrip,
                    {
                      backgroundColor: isDark ? '#231805' : '#FFFBEB',
                      borderColor: isDark ? '#5C3E08' : '#FDE68A',
                    },
                  ]}
                  onPress={() => navigation.navigate('DoctorOnboarding', { isEdit: true, readOnly: true })}
                  activeOpacity={0.75}
                >
                  <View style={styles.pendingUpdateStripLeft}>
                    <View
                      style={[
                        styles.pendingUpdateStripIcon,
                        { backgroundColor: isDark ? '#422806' : '#FEF3C7' },
                      ]}
                    >
                      <Clock size={13} color={isDark ? '#FBBF24' : '#D97706'} strokeWidth={2.4} />
                    </View>
                    <Text
                      style={[
                        styles.pendingUpdateStripText,
                        { color: isDark ? '#FDE68A' : '#92400E' },
                      ]}
                      numberOfLines={1}
                    >
                      Profile update under review by compliance
                    </Text>
                  </View>
                  <View style={styles.pendingUpdateStripRight}>
                    <Text
                      style={[
                        styles.pendingUpdateStripAction,
                        { color: isDark ? '#FBBF24' : '#B45309' },
                      ]}
                    >
                      View
                    </Text>
                    <ChevronRight size={14} color={isDark ? '#FBBF24' : '#B45309'} strokeWidth={2.4} />
                  </View>
                </TouchableOpacity>
              )}

              {/* ═══════════════════ CREDENTIAL EXPIRY ALERT STRIP ═══════════════════ */}
              {Array.isArray(doctorData?.credentialAlerts) && doctorData.credentialAlerts.length > 0 && (() => {
                const worst = doctorData.credentialAlerts.find((a: any) => a.status === 'expired') || doctorData.credentialAlerts[0];
                const isExpired = worst.status === 'expired';
                return (
                  <TouchableOpacity
                    style={[
                      styles.pendingUpdateStrip,
                      {
                        backgroundColor: isExpired ? (isDark ? '#2A0E0E' : '#FEF2F2') : (isDark ? '#231805' : '#FFFBEB'),
                        borderColor: isExpired ? (isDark ? '#7F1D1D' : '#FECACA') : (isDark ? '#5C3E08' : '#FDE68A'),
                      },
                    ]}
                    onPress={() => navigation.navigate('DoctorOnboarding', { isEdit: true })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.pendingUpdateStripLeft}>
                      <View
                        style={[
                          styles.pendingUpdateStripIcon,
                          { backgroundColor: isExpired ? (isDark ? '#4C0D0D' : '#FEE2E2') : (isDark ? '#422806' : '#FEF3C7') },
                        ]}
                      >
                        <AlertCircle size={13} color={isExpired ? '#EF4444' : (isDark ? '#FBBF24' : '#D97706')} strokeWidth={2.4} />
                      </View>
                      <Text
                        style={[
                          styles.pendingUpdateStripText,
                          { color: isExpired ? (isDark ? '#FCA5A5' : '#991B1B') : (isDark ? '#FDE68A' : '#92400E') },
                        ]}
                        numberOfLines={1}
                      >
                        {isExpired
                          ? `${worst.label} expired - update required`
                          : `${worst.label} expires in ${worst.daysRemaining} day(s)`}
                      </Text>
                    </View>
                    <View style={styles.pendingUpdateStripRight}>
                      <Text
                        style={[
                          styles.pendingUpdateStripAction,
                          { color: isExpired ? '#EF4444' : (isDark ? '#FBBF24' : '#B45309') },
                        ]}
                      >
                        Update
                      </Text>
                      <ChevronRight size={14} color={isExpired ? '#EF4444' : (isDark ? '#FBBF24' : '#B45309')} strokeWidth={2.4} />
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* ═══════════════════ 1. TODAY / NEXT CONSULTATION ═══════════════════ */}
              <View style={styles.sectionContainer}>
                <View
                  style={[
                    styles.contentCard,
                    styles.consultationHeroCard,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                  ]}
                >
                  {nextConsultation ? (
                    <>
                      {/* Top Header Tag Row */}
                      <View style={styles.consultTopTagRow}>
                        <View
                          style={[
                            styles.consultBadgeTag,
                            { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' },
                          ]}
                        >
                          <View style={styles.livePulseMini} />
                          <Text style={styles.consultBadgeTagText}>NEXT CONSULTATION</Text>
                        </View>

                        <View
                          style={[
                            styles.consultModePill,
                            {
                              backgroundColor: isDark
                                ? nextConsultMeta.darkBg
                                : nextConsultMeta.bg,
                            },
                          ]}
                        >
                          <ConsultIcon size={13} color={nextConsultMeta.color} />
                          <Text
                            style={[
                              styles.consultModePillText,
                              { color: nextConsultMeta.color },
                            ]}
                          >
                            {nextConsultMeta.label}
                          </Text>
                        </View>
                      </View>

                      {/* Patient Identity & Timing Row */}
                      <View style={styles.patientHeroRow}>
                        <View
                          style={[
                            styles.patientAvatarWrap,
                            { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' },
                          ]}
                        >
                          <Text style={styles.patientAvatarInitials}>
                            {(
                              nextConsultation.patientDetails?.name ||
                              nextConsultation.actionMeta?.patientName ||
                              'RS'
                            )
                              .slice(0, 2)
                              .toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.patientHeroTextCol}>
                          <Text style={[styles.patientMainName, { color: textColor }]}>
                            {nextConsultation.patientDetails?.name ||
                              nextConsultation.actionMeta?.patientName ||
                              'Rahul Sharma'}
                          </Text>

                          <View style={styles.consultTimeChip}>
                            <Clock size={13} color={subTextColor} />
                            <Text style={[styles.consultTimeChipText, { color: subTextColor }]}>
                              {nextConsultation.preferredTime || '10:30 AM'} · Today
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.cardDivider, { backgroundColor: subtleBorder }]} />

                      <TouchableOpacity
                        style={styles.cardActionRow}
                        onPress={() =>
                          navigation.navigate('PatientConsultationDetail', {
                            appointment: nextConsultation,
                          })
                        }
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.cardActionText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                          View consultation dossier
                        </Text>
                        <ArrowRight size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.emptyConsultRow}>
                        <View
                          style={[
                            styles.emptyIconCircle,
                            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                          ]}
                        >
                          <Calendar size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.patientMainName, { color: textColor, fontSize: 16 }]}>
                            No upcoming consultations
                          </Text>
                          <Text style={[styles.consultationMetaTime, { color: subTextColor, marginBottom: 0 }]}>
                            Your schedule for today is currently clear
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.cardDivider, { backgroundColor: subtleBorder }]} />

                      <TouchableOpacity
                        style={styles.cardActionRow}
                        onPress={() => navigation.navigate('ManageAppointments')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cardActionText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                          View all appointments
                        </Text>
                        <ArrowRight size={16} color={isDark ? '#60A5FA' : '#2563EB'} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              {/* ═══════════════════ 2. TODAY'S SNAPSHOT (3 CARDS) ═══════════════════ */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionHeaderLabel, { color: sectionLabelColor }]}>
                  TODAY'S SNAPSHOT
                </Text>

                <View style={styles.snapshotGridRow}>
                  {/* Card 1: Consultations */}
                  <TouchableOpacity
                    style={[
                      styles.snapshotMiniCard,
                      { backgroundColor: cardBg, borderColor: cardBorder },
                    ]}
                    onPress={() =>
                      navigateTo('ManageAppointments', { initialTab: 'upcoming' })
                    }
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.snapshotIconWrap,
                        { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF' },
                      ]}
                    >
                      <Calendar size={15} color="#6366F1" />
                    </View>
                    <Text style={[styles.snapshotNumber, { color: textColor }]}>
                      {consultationsCount}
                    </Text>
                    <Text style={[styles.snapshotLabel, { color: subTextColor }]}>
                      Consultations
                    </Text>
                  </TouchableOpacity>

                  {/* Card 2: Earnings */}
                  <TouchableOpacity
                    style={[
                      styles.snapshotMiniCard,
                      { backgroundColor: cardBg, borderColor: cardBorder },
                    ]}
                    onPress={() => navigateTo('DoctorEarnings')}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.snapshotIconWrap,
                        { backgroundColor: isDark ? '#172554' : '#EFF6FF' },
                      ]}
                    >
                      <TrendingUp size={15} color="#2563EB" />
                    </View>
                    <Text style={[styles.snapshotNumber, { color: textColor }]}>
                      ₹{todayRevenue.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.snapshotLabel, { color: subTextColor }]}>
                      Earnings
                    </Text>
                  </TouchableOpacity>

                  {/* Card 3: Rating */}
                  <TouchableOpacity
                    style={[
                      styles.snapshotMiniCard,
                      { backgroundColor: cardBg, borderColor: cardBorder },
                    ]}
                    onPress={() => navigateTo('DoctorReviews')}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.snapshotIconWrap,
                        { backgroundColor: isDark ? '#422006' : '#FEFCE8' },
                      ]}
                    >
                      <Star size={15} color="#D97706" fill="#D97706" />
                    </View>
                    <Text style={[styles.snapshotNumber, { color: textColor }]}>
                      {avgRating}
                    </Text>
                    <Text style={[styles.snapshotLabel, { color: subTextColor }]}>
                      Rating
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ═══════════════════ 3. ACTION NEEDED ═══════════════════ */}
              <View style={styles.sectionContainer}>
                <Text style={[styles.sectionHeaderLabel, { color: sectionLabelColor }]}>
                  ACTION NEEDED
                </Text>

                <View
                  style={[
                    styles.contentCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: hasPendingRequests
                        ? isDark
                          ? '#7F1D1D'
                          : '#FECACA'
                        : cardBorder,
                    },
                  ]}
                >
                  {hasPendingRequests ? (
                    <View style={styles.actionNeededBodyRow}>
                      <View
                        style={[
                          styles.actionIconContainer,
                          { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' },
                        ]}
                      >
                        <Zap size={18} color="#DC2626" />
                      </View>

                      <View style={styles.actionNeededTextCol}>
                        <Text style={[styles.actionCardMainTitle, { color: textColor }]}>
                          {pendingRequests.length} appointment request
                          {pendingRequests.length > 1 ? 's' : ''}
                        </Text>
                        <Text style={[styles.actionCardSubtitle, { color: subTextColor }]}>
                          Patients are waiting for your approval
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.reviewBtnRow, { backgroundColor: actionBg }]}
                        onPress={() =>
                          navigateTo('ManageAppointments', { initialTab: 'requests' })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.reviewBtnText, { color: actionColor }]}>
                          Review
                        </Text>
                        <ArrowRight size={14} color={actionColor} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.actionNeededBodyRow}>
                      <View
                        style={[
                          styles.actionIconContainer,
                          { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                        ]}
                      >
                        <CheckCircle2 size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                      </View>

                      <View style={styles.actionNeededTextCol}>
                        <Text style={[styles.actionCardMainTitle, { color: textColor }]}>
                          All caught up
                        </Text>
                        <Text style={[styles.actionCardSubtitle, { color: subTextColor }]}>
                          No pending requests waiting
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.reviewBtnRow, { backgroundColor: actionBg }]}
                        onPress={() =>
                          navigateTo('ManageAppointments', { initialTab: 'requests' })
                        }
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.reviewBtnText, { color: actionColor }]}>
                          View queue
                        </Text>
                        <ArrowRight size={14} color={actionColor} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* ═══════════════════ 4. TODAY'S AVAILABILITY (QUICK SCHEDULE OVERRIDE) ═══════════════════ */}
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderBetween}>
                  <Text style={[styles.sectionHeaderLabel, { color: sectionLabelColor }]}>
                    TODAY&apos;S AVAILABILITY
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigateTo('ManageAvailability')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sectionHeaderLink, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                      Weekly Schedule →
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.contentCard,
                    { backgroundColor: cardBg, borderColor: cardBorder },
                  ]}
                >
                  <View style={styles.todayAvailabilityTopRow}>
                    <View
                      style={[
                        styles.todayAvailabilityIconWrap,
                        {
                          backgroundColor: isTodayAvailable
                            ? isDark
                              ? '#172554'
                              : '#EFF6FF'
                            : isDark
                            ? '#1E293B'
                            : '#F1F5F9',
                        },
                      ]}
                    >
                      <Clock
                        size={18}
                        color={
                          isTodayAvailable
                            ? isDark
                              ? '#60A5FA'
                              : '#2563EB'
                            : subTextColor
                        }
                      />
                    </View>

                    <View style={styles.todayAvailabilityTextCol}>
                      <View style={styles.todayDayPillRow}>
                        <Text style={[styles.todayDayNameText, { color: textColor }]}>
                          {todayDayName}
                        </Text>
                        <View
                          style={[
                            styles.todayStatusBadge,
                            {
                              backgroundColor: isTodayAvailable
                                ? isDark
                                  ? '#064E3B'
                                  : '#ECFDF5'
                                : isDark
                                ? '#2A1A05'
                                : '#FEF3C7',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.todayStatusBadgeText,
                              {
                                color: isTodayAvailable
                                  ? '#059669'
                                  : isDark
                                  ? '#FBBF24'
                                  : '#D97706',
                              },
                            ]}
                          >
                            {isTodayAvailable ? 'Accepting Bookings' : 'Marked Off'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.todayHoursText, { color: isTodayAvailable ? textColor : subTextColor }]}>
                        {isTodayAvailable
                          ? `${formatDisplayTime(todaySchedule.start || '09:00')} – ${formatDisplayTime(todaySchedule.end || '17:00')}`
                          : 'No appointment slots open for today'}
                      </Text>
                    </View>

                    <Switch
                      value={isTodayAvailable}
                      onValueChange={handleToggleTodayAvailability}
                      trackColor={{
                        false: 'rgba(148, 163, 184, 0.4)',
                        true: '#2563EB',
                      }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View style={[styles.cardDivider, { backgroundColor: subtleBorder, marginTop: 12 }]} />

                  <View style={styles.todayQuickActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.quickPresetPill,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          borderColor: cardBorder,
                        },
                      ]}
                      onPress={() => setTodayModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Sparkles size={13} color="#2563EB" />
                      <Text style={[styles.quickPresetPillText, { color: isDark ? '#93C5FD' : '#2563EB' }]}>
                        Change Shifts / Hours
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.insightActionRow}
                      onPress={() => setTodayModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.insightActionText, { color: isDark ? '#60A5FA' : '#2563EB' }]}>
                        Customize
                      </Text>
                      <ArrowRight size={14} color={isDark ? '#60A5FA' : '#2563EB'} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

            </>
          )}
        </View>

        {/* ═══════════════════ 5. MEDICOO FULL-WIDTH FOOTER SECTION ═══════════════════ */}
        {!loading && (
          <View
            style={[
              styles.footerSection,
              {
                backgroundColor: isDark ? '#14171A' : '#E9ECEF',
                borderTopColor: isDark ? '#22272E' : '#DEE2E6',
                paddingBottom: 36,
              },
            ]}
          >
            <View style={styles.footerBrandRow}>
              <ShieldCheck size={16} color={isDark ? '#8B949E' : '#6C757D'} />
              <Text style={[styles.footerBrandTitle, { color: isDark ? '#C9D1D9' : '#495057' }]}>
                MedicooTech Private Limited
              </Text>
            </View>
            <Text style={[styles.footerInfoLine, { color: isDark ? '#8B949E' : '#6C757D' }]}>
              End-to-end encrypted clinical
            </Text>
            <Text style={[styles.footerInfoLine, { color: isDark ? '#8B949E' : '#6C757D' }]}>
              telehealth platform.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Today Availability Modal */}
      <TodayAvailabilityModal
        visible={todayModalVisible}
        onClose={() => setTodayModalVisible(false)}
        todayDayName={todayDayName}
        initialEnabled={isTodayAvailable}
        initialStart={todaySchedule.start || '09:00'}
        initialEnd={todaySchedule.end || '17:00'}
        appointmentsCountToday={upcomingAppointments.length}
        onSave={handleSaveTodayHours}
      />

      {/* Status Modal */}
      <StatusModal
        visible={statusModal.visible}
        status={statusModal.status}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Profile Sidebar */}
      <ProfileSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        doctorName={doctorName}
        specialization={specialization}
        avatarUri={avatarUri}
        rating={avgRating}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ═══ Solid Status Bar Cover when Scrolled ═══
  statusBarCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // ═══ Scroll Content ═══
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
  },

  // ═══ Hero Header ═══
  heroWrapper: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroGradient: {
    paddingBottom: 18,
  },
  heroContent: {
    paddingHorizontal: 16,
  },
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  greetingPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  heroGreetingText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  greetingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  heroSpecialtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  heroDoctorName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  heroAvatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  heroAvatarLetter: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroAvatarStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
    borderColor: '#087F6D',
  },

  // ═══ Practice Status Bar ═══
  practiceStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  practiceStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  statusPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  practiceStatusTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  practiceStatusSub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
  },

  // ═══ Main Body Content ═══
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 18,
  },

  sectionContainer: {
    gap: 6,
  },

  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ═══ Standard Card Layout ═══
  contentCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },

  consultationHeroCard: {
    gap: 12,
  },

  consultTopTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  consultBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },

  livePulseMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },

  consultBadgeTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#2563EB',
  },

  consultModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  consultModePillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  patientHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  patientAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  patientAvatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },

  patientHeroTextCol: {
    flex: 1,
    gap: 2,
  },

  patientMainName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  consultTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },

  consultTimeChipText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
  },

  emptyConsultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },

  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  consultationMetaTime: {
    fontSize: 13,
    fontWeight: '500',
  },

  cardDivider: {
    height: 1,
    width: '100%',
  },

  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },

  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },

  // ═══ 2. Snapshot 3-Card Grid Row ═══
  snapshotGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  snapshotMiniCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  snapshotIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  snapshotNumber: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  snapshotLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ═══ 3. Action Needed ═══
  actionNeededBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  actionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionNeededTextCol: {
    flex: 1,
    gap: 2,
  },

  actionCardMainTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },

  actionCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },

  reviewBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  reviewBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  // ═══ 4. Today Availability Styles ═══
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionHeaderLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  todayAvailabilityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayAvailabilityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayAvailabilityTextCol: {
    flex: 1,
    gap: 2,
  },
  todayDayPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayDayNameText: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  todayStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  todayHoursText: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 2,
  },
  todayQuickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  quickPresetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickPresetPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  insightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 2,
  },
  insightActionText: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  // ═══ Pending Profile Update Notification Strip ═══
  pendingUpdateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  pendingUpdateStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    paddingRight: 8,
  },
  pendingUpdateStripIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingUpdateStripText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  pendingUpdateStripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pendingUpdateStripAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },

  // ═══ 5. Medicoo Footer ═══
  footerSection: {
    paddingTop: 18,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    gap: 4,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 28,
    marginBottom: 2,
    justifyContent: 'center',
  },

  footerBrandTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  footerInfoLine: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'center',
  },
});
