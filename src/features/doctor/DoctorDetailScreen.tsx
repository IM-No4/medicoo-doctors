import { palette } from '../../theme/palette';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  FileCheck,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Stethoscope,
  User,
  Video,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import SlowInternetLoader from '../../components/network/SlowInternetLoader';
import { RootState } from '../../redux/store';
import { getDoctorEarnings, getMyDoctorReviews } from '../../services/api/doctor.api';
import { getDoctorProfile } from '../../services/api/user.api';
import { accent } from '../../theme/accents';
import { useTheme } from '../../theme/ThemeContext';

export default function DoctorDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const reduxProfile = useSelector((state: RootState) => state.profile);

  const { theme, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [reviewsSummary, setReviewsSummary] = useState<any>(null);
  const [earningsSummary, setEarningsSummary] = useState<any>(null);

  const bgColor = theme.inset;
  const cardBg = theme.card;
  const cardBorder = theme.card;
  const textColor = theme.text;
  const subTextColor = theme.textSecondary;
  const dividerColor = theme.cardSecondary;
  const iconColor = theme.textSecondary;

  useEffect(() => {
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
  }, [isDark, bgColor]);

  const loadProfile = useCallback(async () => {
    try {
      const [profileRes, reviewsRes, earningsRes] = await Promise.allSettled([
        getDoctorProfile(),
        getMyDoctorReviews(),
        getDoctorEarnings(),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value) {
        const p = profileRes.value;
        const normalized = { ...p, ...(p._doc || {}) };
        setDoctorData(normalized);
      }

      if (reviewsRes.status === 'fulfilled' && reviewsRes.value) {
        setReviewsSummary(reviewsRes.value);
      }

      if (earningsRes.status === 'fulfilled' && earningsRes.value) {
        setEarningsSummary(earningsRes.value);
      }
    } catch (error) {
      console.error('Error loading doctor details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const approved = doctorData?.approvedProfile || doctorData || {};
  const doctorName =
    approved.displayName ||
    approved.name ||
    doctorData?.name ||
    reduxProfile.name ||
    'Doctor';
  const specialization =
    approved.specialization ||
    doctorData?.specialization ||
    'Medical Specialist';
  const avatarUri =
    doctorData?.avatarUrl ||
    doctorData?.profileImage ||
    doctorData?.photoUrl ||
    doctorData?.profilePictureUrl ||
    doctorData?.avatar ||
    approved.profileImage ||
    approved.avatarUrl ||
    null;

  const experience =
    approved.yearsOfExperience ||
    approved.experience ||
    doctorData?.yearsOfExperience ||
    '5+ Years';

  const regNumber =
    approved.medicalRegistrationNumber ||
    approved.registrationNumber ||
    doctorData?.medicalRegistrationNumber ||
    doctorData?.registrationNumber ||
    'MCI Verified';

  const councilName =
    approved.registrationCouncil ||
    approved.councilName ||
    doctorData?.registrationCouncil ||
    'Medical Council of India';

  const degrees =
    approved.qualifications ||
    approved.qualification ||
    doctorData?.qualifications ||
    doctorData?.qualification ||
    'MBBS, MD';

  const hospitalAffiliation =
    approved.hospitalAffiliation ||
    approved.hospitalName ||
    approved.clinicAddress ||
    doctorData?.hospitalAffiliation ||
    doctorData?.clinicAddress ||
    'Medicoo Virtual Healthcare Clinic';

  const bio =
    approved.bio ||
    approved.about ||
    doctorData?.bio ||
    'Dedicated medical specialist committed to evidence-based healthcare, teleconsultations, and holistic patient wellness.';

  const languages =
    approved.languages ||
    doctorData?.languages ||
    ['English', 'Hindi'];

  const fees =
    approved.consultationFees ||
    doctorData?.consultationFees ||
    { video: { fee: 800 }, voice: { fee: 500 }, chat: { fee: 300 } };

  // No hardcoded placeholder fallback here on purpose - these used to
  // fall back to a fake-looking email/number for every doctor (the
  // backend never actually sent either field), which reads as real data
  // rather than a blank. 'Not provided' is honest about there being
  // nothing to show.
  const email = doctorData?.email || 'Not provided';
  const phone = doctorData?.phone || 'Not provided';

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Header Bar (Floating Round Back Button + Title + Edit Button) ═══ */}
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

        <Text style={[styles.screenHeaderTitle, { color: textColor }]}>
          Doctor Profile
        </Text>

        <TouchableOpacity
          style={[
            styles.roundBackBtn,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}
          onPress={() => navigation.navigate('DoctorOnboarding', { isEdit: true })}
          activeOpacity={0.7}
        >
          <Edit3 size={18} color={palette.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 36 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProfile();
            }}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        {loading && !refreshing ? (
          <SlowInternetLoader
            isLoading={loading}
            message="Loading doctor details..."
            onRetry={loadProfile}
            style={{ paddingVertical: 40 }}
          />
        ) : (
          <>
            {/* ═══ 1. Clean Doctor Profile Card ═══ */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.profileHeaderRow}>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: theme.inset },
                  ]}
                >
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                  ) : (
                    <Text style={[styles.avatarLetter, { color: palette.primary }]}>
                      {doctorName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.doctorInfoCol}>
                  <Text
                    style={[styles.doctorNameText, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
                  </Text>
                  <Text style={[styles.specialtyText, { color: palette.primary }]}>
                    {specialization}
                  </Text>
                  <Text style={[styles.regNumberText, { color: subTextColor }]} numberOfLines={1}>
                    Reg: {regNumber}
                  </Text>
                </View>
              </View>
            </View>

            {/* ═══ 2. Key Clinical Metrics Row ═══ */}
            <View style={styles.metricsRow}>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
              >
                <View
                  style={[
                    styles.metricIconCircle,
                    { backgroundColor: accent('blue', isDark).bg },
                  ]}
                >
                  <Stethoscope size={16} color={accent('blue', isDark).fg} />
                </View>
                <Text style={[styles.metricValue, { color: textColor }]}>
                  {experience}
                </Text>
                <Text style={[styles.metricLabel, { color: subTextColor }]}>
                  Experience
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
              >
                <View
                  style={[
                    styles.metricIconCircle,
                    { backgroundColor: theme.infoBg },
                  ]}
                >
                  <CalendarCheck size={16} color={palette.blue600} />
                </View>
                <Text style={[styles.metricValue, { color: textColor }]}>
                  Online
                </Text>
                <Text style={[styles.metricLabel, { color: subTextColor }]}>
                  Teleconsults
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
              >
                <View
                  style={[
                    styles.metricIconCircle,
                    { backgroundColor: theme.warningBg },
                  ]}
                >
                  <Award size={16} color={palette.amber500} />
                </View>
                <Text style={[styles.metricValue, { color: textColor }]}>
                  Verified
                </Text>
                <Text style={[styles.metricLabel, { color: subTextColor }]}>
                  Council Board
                </Text>
              </View>
            </View>

            {/* ═══ 3. Medical Credentials Card ═══ */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Medical Credentials
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIconCircle,
                    { backgroundColor: accent('violet', isDark).bg },
                  ]}
                >
                  <BookOpen size={16} color={accent('violet', isDark).fg} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>
                    Degrees & Qualifications
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {degrees}
                  </Text>
                </View>
              </View>

              <View
                style={[styles.rowDivider, { backgroundColor: dividerColor }]}
              />

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIconCircle,
                    { backgroundColor: theme.infoBg },
                  ]}
                >
                  <FileCheck size={16} color={palette.blue600} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>
                    Council Registration
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {councilName} • #{regNumber}
                  </Text>
                </View>
              </View>

              <View
                style={[styles.rowDivider, { backgroundColor: dividerColor }]}
              />

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIconCircle,
                    { backgroundColor: accent('violet', isDark).bg },
                  ]}
                >
                  <Building2 size={16} color={palette.violet600} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>
                    Clinic / Affiliation
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {hospitalAffiliation}
                  </Text>
                </View>
              </View>

              <View
                style={[styles.rowDivider, { backgroundColor: dividerColor }]}
              />

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIconCircle,
                    { backgroundColor: theme.warningBg },
                  ]}
                >
                  <Globe size={16} color={palette.amber500} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>
                    Languages Spoken
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {Array.isArray(languages) ? languages.join(', ') : languages}
                  </Text>
                </View>
              </View>
            </View>

            {/* ═══ 4. Consultation Fees Card ═══ */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Consultation Fees
                </Text>
              </View>

              <View style={styles.feeGridRow}>
                <View
                  style={[
                    styles.feeCard,
                    {
                      backgroundColor: theme.infoBg,
                      borderColor: theme.infoBg,
                    },
                  ]}
                >
                  <View style={styles.feeHeader}>
                    <Video size={16} color={palette.sky600} />
                    <Text
                      style={[
                        styles.feeTypeTitle,
                        { color: theme.info },
                      ]}
                    >
                      Video
                    </Text>
                  </View>
                  <Text style={[styles.feeAmount, { color: textColor }]}>
                    ₹{fees?.video?.fee ?? 800}
                  </Text>
                  <Text style={[styles.feeSub, { color: subTextColor }]}>
                    per consult
                  </Text>
                </View>

                <View
                  style={[
                    styles.feeCard,
                    {
                      backgroundColor: theme.successBg,
                      borderColor: theme.successBg,
                    },
                  ]}
                >
                  <View style={styles.feeHeader}>
                    <Phone size={16} color={palette.emerald600} />
                    <Text
                      style={[
                        styles.feeTypeTitle,
                        { color: theme.success },
                      ]}
                    >
                      Audio
                    </Text>
                  </View>
                  <Text style={[styles.feeAmount, { color: textColor }]}>
                    ₹{fees?.voice?.fee ?? 500}
                  </Text>
                  <Text style={[styles.feeSub, { color: subTextColor }]}>
                    per consult
                  </Text>
                </View>

                <View
                  style={[
                    styles.feeCard,
                    {
                      backgroundColor: theme.infoBg,
                      borderColor: theme.infoBg,
                    },
                  ]}
                >
                  <View style={styles.feeHeader}>
                    <MessageCircle size={16} color={palette.blue600} />
                    <Text
                      style={[
                        styles.feeTypeTitle,
                        { color: theme.info },
                      ]}
                    >
                      Chat
                    </Text>
                  </View>
                  <Text style={[styles.feeAmount, { color: textColor }]}>
                    ₹{fees?.chat?.fee ?? 300}
                  </Text>
                  <Text style={[styles.feeSub, { color: subTextColor }]}>
                    per consult
                  </Text>
                </View>
              </View>
            </View>

            {/* ═══ 5. Clinical Bio Card ═══ */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Clinical Biography
                </Text>
              </View>
              <Text style={[styles.bioText, { color: textColor }]}>{bio}</Text>
            </View>

            {/* ═══ 6. Contact & Account Information Card ═══ */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Account & Contact Details
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIconCircle,
                    { backgroundColor: theme.cardSecondary },
                  ]}
                >
                  <Mail size={16} color={iconColor} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>
                    Email Address
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {email}
                  </Text>
                </View>
              </View>

              <View
                style={[styles.rowDivider, { backgroundColor: dividerColor }]}
              />

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIconCircle,
                    { backgroundColor: theme.cardSecondary },
                  ]}
                >
                  <Phone size={16} color={iconColor} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={[styles.detailLabel, { color: subTextColor }]}>
                    Phone Number
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {phone}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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

  // ═══ 1. Profile Header Card ═══
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '800',
  },
  doctorInfoCol: {
    flex: 1,
    gap: 3,
  },
  doctorNameText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  specialtyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  regNumberText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ═══ 2. Clinical Metrics Row ═══
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },

  // ═══ Section Cards (Consistent with Patient Reviews) ═══
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionAccentBar: {
    width: 3.5,
    height: 15,
    borderRadius: 2,
    backgroundColor: palette.primary,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  detailIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextCol: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  rowDivider: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },

  // Fee Grid
  feeGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  feeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feeTypeTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  feeSub: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Bio
  bioText: {
    fontSize: 13.5,
    fontWeight: '500',
    lineHeight: 20,
  },
});
