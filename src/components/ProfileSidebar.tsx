import { palette } from '../theme/palette';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
  Bell,
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
  Trash2,
  UserCog,
  UserPlus,
  Wallet,
} from 'lucide-react-native';

import StatusModal, { StatusType } from './modals/StatusModal';
import { useLanguage } from '../i18n/LanguageContext';
import { brand, ThemeMode } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  doctorName: string;
  specialization?: string;
  avatarUri?: string | null;
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
  isOnline,
  onToggleOnline,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { t } = useLanguage();

  const [rendered, setRendered] = useState(visible);
  const translateX = useRef(new Animated.Value(SCREEN_W)).current;
  // True from the moment an option pushes a screen on top of this sidebar
  // until Dashboard (and this sidebar along with it) regains focus - lets
  // the back-button effect below step aside while something real is
  // covering the sidebar, instead of racing React Navigation's own back
  // handling for the same press.
  const [coveredByPushedScreen, setCoveredByPushedScreen] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setCoveredByPushedScreen(false);
    }, [])
  );
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

  const bgColor = theme.inset;
  const cardBg = theme.card;
  const cardBorder = theme.card;
  const textColor = theme.text;
  const subTextColor = theme.textSecondary;
  const dividerColor = theme.cardSecondary;
  const iconColor = theme.textSecondary;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
      if (Platform.OS === 'android') {
        RNStatusBar.setBackgroundColor(bgColor, true);
        RNStatusBar.setTranslucent(false);
        if (isDark) {
          NavigationBar.setBackgroundColorAsync(palette.navyDeep);
          NavigationBar.setButtonStyleAsync('light');
        } else {
          NavigationBar.setBackgroundColorAsync(palette.hexEFF2F6);
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

  // Intercept Android hardware back button to dismiss ProfileSidebar -
  // but only while it's actually the top-most thing on screen. While a
  // pushed screen covers it (coveredByPushedScreen), step aside entirely
  // so React Navigation's own back handling pops that screen instead -
  // otherwise this listener (registered before the push, so it wins over
  // navigation's own) would silently swallow the first back press.
  useEffect(() => {
    if (!visible || coveredByPushedScreen) return;
    const onBackPress = () => {
      handleClose();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [visible, coveredByPushedScreen]);

  const navigateTo = (screen: string, params?: any) => {
    // Deliberately left open and mounted underneath - tapping an option
    // should feel like stacking a screen on top of the sidebar, not
    // closing it. Coming back via the back button/gesture should land
    // right back on the still-open sidebar, not the bare dashboard.
    setCoveredByPushedScreen(true);
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
            colors={isDark ? [palette.hex062420, palette.hex0A3830, palette.hex0D4A40] : [palette.emerald900, palette.hex0A6B56, palette.primary]}
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
                    <Text style={[styles.avatarLetter, { color: brand.white }]}>
                      {doctorName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.onlineDot,
                    {
                      backgroundColor: isOnline ? palette.green500 : palette.slate400,
                      borderColor: theme.primaryLight,
                    },
                  ]}
                />
              </View>

              <View style={styles.doctorInfoCol}>
                <Text style={[styles.doctorNameText, { color: brand.white }]} numberOfLines={1}>
                  {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
                </Text>
                <View style={styles.editProfileRow}>
                  <Text style={[styles.editProfileText, { color: isDark ? palette.slate400 : palette.whiteA85 }]}>
                    {specialization || 'Edit profile'}
                  </Text>
                  <ChevronRight size={14} color={isDark ? palette.slate400 : palette.whiteA85} />
                </View>
              </View>
            </View>

            {/* Bottom Status Banner Strip */}
            <View style={styles.bottomBannerStrip}>
              <View style={styles.verifiedRow}>
                <ShieldCheck size={17} color={palette.green400} strokeWidth={2.2} />
                <Text style={[styles.verifiedText, { color: brand.white }]}>Medicoo Certified Doctor</Text>
              </View>

              <View style={styles.statusPill}>
                <ChevronRight size={13} color={brand.white} />
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
                        ? palette.emerald900
                        : palette.primaryTint
                      : isDark
                      ? palette.navyText
                      : palette.slate100,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusIndicatorDot,
                    { backgroundColor: isOnline ? palette.green500 : palette.slate400 },
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
                trackColor={{ false: theme.border, true: palette.primary }}
                thumbColor={Platform.OS === 'android' ? palette.white : undefined}
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
            <View style={[styles.twinIconCircle, { backgroundColor: theme.primaryLight }]}>
              <Wallet size={16} color={palette.primary} />
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
            <View style={[styles.twinIconCircle, { backgroundColor: theme.warningBg }]}>
              <Star size={16} color={palette.amber500} />
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
                  backgroundColor: theme.cardSecondary,
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
                        backgroundColor: palette.primary,
                      },
                    ]}
                    onPress={() => setThemeMode(opt.mode)}
                    activeOpacity={0.7}
                  >
                    <IconComp
                      size={12}
                      color={isActive ? palette.white : subTextColor}
                    />
                    <Text
                      style={[
                        styles.themeTabText,
                        {
                          color: isActive ? palette.white : subTextColor,
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
            icon={<Bell size={18} color={iconColor} />}
            title="Notification Settings"
            textColor={textColor}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={true}
            onPress={() => navigateTo('DoctorNotificationSettings')}
          />
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
            <LogOut size={18} color={palette.red500} />
            <Text style={styles.logoutRowText}>Log Out</Text>
          </TouchableOpacity>
          <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
          <ZomatoRow
            icon={<Trash2 size={18} color={palette.red500} />}
            title="Delete Account"
            textColor={palette.red500}
            subTextColor={subTextColor}
            dividerColor={dividerColor}
            showDivider={false}
            onPress={() => navigateTo('DeleteAccount')}
          />
        </View>

        {/* ═══ 7. App Version & Compliance Footer ═══ */}
        <View style={styles.footerBrandingCol}>
          <Text style={[styles.appVersionText, { color: subTextColor }]}>
            Medicoo Doctor • v1.0.0
          </Text>
          <Text style={[styles.appCopyrightText, { color: theme.textMuted }]}>
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
    backgroundColor: palette.whiteA18,
    borderWidth: 2,
    borderColor: palette.whiteA35,
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarLetter: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.white,
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
    color: palette.white,
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
    color: palette.whiteA85,
  },
  bottomBannerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.blackA16,
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
    color: palette.white,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.whiteA18,
    borderWidth: 1,
    borderColor: palette.whiteA30,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.white,
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
    color: palette.primary,
    marginTop: 1,
  },
  twinSubtitleAmber: {
    fontSize: 11.5,
    fontWeight: '700',
    color: palette.amber500,
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
    backgroundColor: palette.primary,
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
    color: palette.red500,
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
