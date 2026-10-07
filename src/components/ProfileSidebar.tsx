import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
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
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Gift,
  Globe,
  Headphones,
  HelpCircle,
  LogOut,
  Moon,
  Shield,
  ShieldCheck,
  Smartphone,
  Star,
  Sun,
  UserCog,
  UserPlus,
  Wallet,
} from 'lucide-react-native';

import StatusModal, { StatusType } from './modals/StatusModal';
import { useLanguage } from '../i18n/LanguageContext';
import { ThemeMode } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  doctorName: string;
  specialization?: string;
  avatarUri?: string | null;
  rating?: string | number;
  isOnline: boolean;
  onToggleOnline?: (val: boolean) => void;
  onLogout: () => void;
}

export default function ProfileSidebar({
  visible,
  onClose,
  doctorName,
  specialization,
  avatarUri,
  rating = '5.0',
  isOnline,
  onToggleOnline,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark, themeMode, setThemeMode } = useTheme();
  const { t } = useLanguage();

  const [rendered, setRendered] = useState(visible);
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type: StatusType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'idle',
    title: '',
    message: '',
  });

  const showStatus = (type: StatusType, title: string, message: string) => {
    setStatusModal({ visible: true, type, title, message });
  };

  const bgColor = isDark ? '#080E17' : '#EFF2F6';
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? '#1A2636' : '#F1F5F9';
  const iconColor = isDark ? '#94A3B8' : '#475569';

  useEffect(() => {
    if (visible) {
      setRendered(true);
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

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 24,
        stiffness: 240,
        mass: 0.8,
      }).start();
    } else if (rendered) {
      RNStatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        RNStatusBar.setBackgroundColor('transparent', true);
        RNStatusBar.setTranslucent(true);
      }

      Animated.timing(translateX, {
        toValue: SCREEN_W,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setRendered(false);
      });
    }
  }, [visible, rendered, isDark, bgColor]);

  const handleClose = () => {
    RNStatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('transparent', true);
      RNStatusBar.setTranslucent(true);
    }
    Animated.timing(translateX, {
      toValue: SCREEN_W,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setRendered(false);
      onClose();
    });
  };

  // Intercept Android hardware back button to dismiss ProfileSidebar
  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      handleClose();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [visible]);

  const navigateTo = (screen: string, params?: any) => {
    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.navigate(screen, params);
    } else {
      navigation.navigate(screen, params);
    }
  };

  const themeOptions: { mode: ThemeMode; label: string; Icon: any }[] = [
    { mode: 'light', label: 'Light', Icon: Sun },
    { mode: 'dark', label: 'Dark', Icon: Moon },
    { mode: 'system', label: 'Auto', Icon: Smartphone },
  ];

  if (!rendered && !visible) return null;

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  return (
    <Animated.View
      style={[
        styles.fullScreenContainer,
        {
          backgroundColor: bgColor,
          transform: [{ translateX }],
        },
      ]}
    >
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Header Bar (Floating Round Back Button) ═══ */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: topPadding + 6,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.roundBackBtn,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
      </View>

      {/* ═══ 1. Sticky Luxury Doctor Profile Card ═══ */}
      <View style={styles.stickyCardContainer}>
        <TouchableOpacity
          onPress={() => {
            navigateTo('DoctorDetail');
          }}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isDark ? ['#062420', '#0A3830', '#0D4A40'] : ['#064E3B', '#0A6B56', '#0FBBA1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topProfileCard}
          >
            <View style={styles.topProfileHeader}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarCircle}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                  ) : (
                    <Text style={[styles.avatarLetter, { color: isDark ? '#E2E8F0' : '#FFFFFF' }]}>
                      {doctorName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.onlineDot,
                    {
                      backgroundColor: isOnline ? '#22C55E' : '#94A3B8',
                      borderColor: isDark ? '#062420' : '#064E3B',
                    },
                  ]}
                />
              </View>

              <View style={styles.doctorInfoCol}>
                <Text style={[styles.doctorNameText, { color: isDark ? '#E2E8F0' : '#FFFFFF' }]} numberOfLines={1}>
                  {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
                </Text>
                <View style={styles.editProfileRow}>
                  <Text style={[styles.editProfileText, { color: isDark ? '#94A3B8' : 'rgba(255,255,255,0.85)' }]}>
                    {specialization || 'Edit profile'}
                  </Text>
                  <ChevronRight size={14} color={isDark ? '#94A3B8' : 'rgba(255,255,255,0.85)'} />
                </View>
              </View>
            </View>

            {/* Bottom Status Banner Strip */}
            <View style={styles.bottomBannerStrip}>
              <View style={styles.verifiedRow}>
                <ShieldCheck size={17} color="#4ADE80" strokeWidth={2.2} />
                <Text style={[styles.verifiedText, { color: isDark ? '#E2E8F0' : '#FFFFFF' }]}>Medicoo Certified Doctor</Text>
              </View>

              <View style={styles.statusPill}>
                <ChevronRight size={13} color={isDark ? '#E2E8F0' : '#FFFFFF'} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 36 },
        ]}
      >
        {/* ═══ 2. Practice Availability Card ═══ */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.onlineStatusRow}>
            <View style={styles.onlineStatusLeft}>
              <View
                style={[
                  styles.statusIndicatorCircle,
                  {
                    backgroundColor: isOnline
                      ? isDark
                        ? '#064E3B'
                        : '#E6FAF6'
                      : isDark
                      ? '#1E293B'
                      : '#F1F5F9',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusIndicatorDot,
                    { backgroundColor: isOnline ? '#22C55E' : '#94A3B8' },
                  ]}
                />
              </View>
              <View style={styles.onlineStatusTextCol}>
                <Text style={[styles.onlineStatusTitle, { color: textColor }]}>
                  {isOnline ? 'Online for Consultations' : 'Offline'}
                </Text>
                <Text style={[styles.onlineStatusSubtitle, { color: subTextColor }]}>
                  {isOnline
                    ? 'Patients can book and request consultations'
                    : 'Consultation booking is paused'}
                </Text>
              </View>
            </View>

            {onToggleOnline && (
              <Switch
                value={isOnline}
                onValueChange={onToggleOnline}
                trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#0FBBA1' }}
                thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
              />
            )}
          </View>
        </View>

        {/* ═══ 3. Twin Soft Shortcut Cards (Earnings & Reviews) ═══ */}
        <View style={styles.twinCardsRow}>
          <TouchableOpacity
            style={[styles.twinCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => navigateTo('DoctorEarnings')}
            activeOpacity={0.7}
          >
            <View style={[styles.twinIconCircle, { backgroundColor: isDark ? '#0E2924' : '#E6FAF6' }]}>
              <Wallet size={16} color="#0FBBA1" />
            </View>
            <View style={styles.twinTextCol}>
              <Text style={[styles.twinTitle, { color: textColor }]}>Earnings</Text>
              <Text style={styles.twinSubtitleTeal}>View Payouts</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.twinCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => navigateTo('DoctorReviews')}
            activeOpacity={0.7}
          >
            <View style={[styles.twinIconCircle, { backgroundColor: isDark ? '#2E2210' : '#FEF3C7' }]}>
              <Star size={16} color="#F59E0B" />
            </View>
            <View style={styles.twinTextCol}>
              <Text style={[styles.twinTitle, { color: textColor }]}>Reviews</Text>
              <Text style={styles.twinSubtitleAmber}>5.0 ★</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ═══ 4. Card: Practice & Consultations ═══ */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Practice & Consultations
            </Text>
          </View>

          <ZomatoRow
            icon={<Clock size={19} color={iconColor} />}
            title="Weekly Schedule"
            rightText="Manage"
            textColor={textColor}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={true}
            onPress={() => navigateTo('ManageAvailability')}
          />
          <ZomatoRow
            icon={<Calendar size={19} color={iconColor} />}
            title="All Appointments"
            rightText="View All"
            textColor={textColor}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={true}
            onPress={() => navigateTo('ManageAppointments')}
          />
          <ZomatoRow
            icon={<Wallet size={19} color={iconColor} />}
            title="Earnings & Payouts"
            textColor={textColor}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={true}
            onPress={() => navigateTo('DoctorEarnings')}
          />
          <ZomatoRow
            icon={<Star size={19} color={iconColor} />}
            title="Patient Reviews"
            textColor={textColor}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={false}
            onPress={() => navigateTo('DoctorReviews')}
          />
        </View>

        {/* ═══ 4. Card: Account & Preferences ═══ */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Account & Preferences
            </Text>
          </View>

          {/* Appearance Segmented Row */}
          <View style={[styles.appearanceRow, { borderBottomColor: dividerColor }]}>
            <View style={styles.appearanceLeft}>
              <Sun size={18} color={iconColor} />
              <Text style={[styles.rowTitleText, { color: textColor, marginLeft: 12 }]}>
                Appearance
              </Text>
            </View>

            <View
              style={[
                styles.themeSegment,
                {
                  backgroundColor: isDark ? '#172230' : '#F1F5F9',
                },
              ]}
            >
              {themeOptions.map((opt) => {
                const isActive = themeMode === opt.mode;
                const IconComp = opt.Icon;
                return (
                  <TouchableOpacity
                    key={opt.mode}
                    style={[
                      styles.themeTab,
                      isActive && {
                        backgroundColor: '#0FBBA1',
                      },
                    ]}
                    onPress={() => setThemeMode(opt.mode)}
                    activeOpacity={0.7}
                  >
                    <IconComp
                      size={12}
                      color={isActive ? '#FFFFFF' : subTextColor}
                    />
                    <Text
                      style={[
                        styles.themeTabText,
                        {
                          color: isActive ? '#FFFFFF' : subTextColor,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <ZomatoRow
            icon={<UserPlus size={18} color={iconColor} />}
            title="Invite a Colleague"
            textColor={textColor}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={true}
            onPress={() => navigateTo('DoctorReferral')}
          />
          <ZomatoRow
            icon={<Headphones size={18} color={iconColor} />}
            title="Help Desk & Support"
            rightText="24/7"
            textColor={textColor}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={true}
            onPress={() => navigateTo('DoctorSupport')}
          />
          <ZomatoRow
            icon={<Shield size={18} color={iconColor} />}
            title="Terms & Privacy Policies"
            textColor={textColor}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={false}
            onPress={() => navigateTo('DoctorPolicies')}
          />
        </View>

        {/* ═══ 6. Card: Account Actions ═══ */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <TouchableOpacity
            style={styles.logoutRow}
            onPress={onLogout}
            activeOpacity={0.6}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={styles.logoutRowText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ 7. App Version & Compliance Footer ═══ */}
        <View style={styles.footerBrandingCol}>
          <Text style={[styles.appVersionText, { color: subTextColor }]}>
            Medicoo Doctor • v1.0.0 (Build 104)
          </Text>
          <Text style={[styles.appCopyrightText, { color: isDark ? '#4B5563' : '#94A3B8' }]}>
            Encrypted & Certified Telemedicine Portal
          </Text>
        </View>
      </ScrollView>

      {/* Informational / Feedback Modal */}
      <StatusModal
        visible={statusModal.visible}
        status={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      />
    </Animated.View>
  );
}

function ZomatoRow({
  icon,
  title,
  rightText,
  textColor,
  subTextColor,
  dividerColor,
  showDivider = true,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  rightText?: string;
  textColor: string;
  subTextColor: string;
  dividerColor: string;
  showDivider?: boolean;
  onPress: () => void;
}) {
  return (
    <View>
      <TouchableOpacity
        style={styles.zomatoRowContent}
        onPress={onPress}
        activeOpacity={0.6}
      >
        <View style={styles.zomatoRowLeft}>
          {icon}
          <Text style={[styles.rowTitleText, { color: textColor }]}>{title}</Text>
        </View>

        <View style={styles.zomatoRowRight}>
          {Boolean(rightText) && (
            <Text style={[styles.rowRightText, { color: subTextColor }]}>
              {rightText}
            </Text>
          )}
          <ChevronRight size={16} color={subTextColor} />
        </View>
      </TouchableOpacity>
      {showDivider && <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stickyCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },

  // ═══ 1. Luxury Doctor Profile Card ═══
  topProfileCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0,
  },
  topProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  doctorInfoCol: {
    flex: 1,
  },
  doctorNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  editProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  bottomBannerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifiedText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ═══ 2. Twin Soft Shortcut Cards ═══
  twinCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  twinCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  twinIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  twinTextCol: {
    flex: 1,
  },
  twinTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  twinSubtitleTeal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0FBBA1',
    marginTop: 1,
  },
  twinSubtitleAmber: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 1,
  },

  // ═══ Online / Practice Status Row ═══
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingBottom: 10,
  },
  onlineStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  statusIndicatorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineStatusTextCol: {
    flex: 1,
  },
  onlineStatusTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  onlineStatusSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },

  // ═══ 3. Section Soft White Cards ═══
  sectionCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionAccentBar: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#0FBBA1',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // ═══ List Rows inside Soft Cards ═══
  zomatoRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  zomatoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowTitleText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  zomatoRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowRightText: {
    fontSize: 13,
    fontWeight: '500',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },

  // ═══ Appearance Segmented Row ═══
  standaloneAppearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  appearanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeSegment: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2.5,
    gap: 2,
  },
  themeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 7,
  },
  themeTabText: {
    fontSize: 11,
  },

  // ═══ Logout Row ═══
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  logoutRowText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  // ═══ Footer Branding ═══
  footerBrandingCol: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 24,
    gap: 4,
  },
  appVersionText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  appCopyrightText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
