import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useState } from 'react';
import {
  Clipboard,
  Dimensions,
  Platform,
  ScrollView,
  Share,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Globe,
  Share2,
  Sparkles,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native';

import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { RootState } from '../../redux/store';
import { useTheme } from '../../theme/ThemeContext';

interface ConnectedDoctor {
  id: string;
  name: string;
  specialization: string;
  date: string;
  status: 'Active on Medicoo' | 'Invitation Sent';
}

const SAMPLE_COLLEAGUES: ConnectedDoctor[] = [
  {
    id: 'col-1',
    name: 'Dr. David Miller',
    specialization: 'Internal Medicine',
    date: 'Sep 24, 2026',
    status: 'Active on Medicoo',
  },
  {
    id: 'col-2',
    name: 'Dr. Aisha Patel',
    specialization: 'Pediatrics',
    date: 'Sep 18, 2026',
    status: 'Active on Medicoo',
  },
  {
    id: 'col-3',
    name: 'Dr. Robert Chen',
    specialization: 'Cardiology',
    date: 'Sep 29, 2026',
    status: 'Invitation Sent',
  },
];

export default function DoctorReferralScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const profile = useSelector((state: RootState) => state.profile);

  const [copied, setCopied] = useState(false);
  const [colleagues] = useState<ConnectedDoctor[]>(SAMPLE_COLLEAGUES);

  // Generate doctor code based on name or fallback
  const doctorName = profile.name || 'DOCTOR';
  const cleanCodeName = doctorName.replace(/^dr\.?\s*/i, '').replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const referralCode = `MED-${cleanCodeName || 'DOC'}77`;

  // Status Modal
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

  const showStatus = (status: StatusType, title: string, message: string) => {
    setStatusModal({ visible: true, status, title, message });
  };

  const bgColor = isDark ? '#080E17' : '#EFF2F6';
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? '#1A2636' : '#F1F5F9';

  useEffect(() => {
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

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  const handleCopyCode = () => {
    Clipboard.setString(referralCode);
    setCopied(true);
    showStatus('success', 'Code Copied!', `Invite code "${referralCode}" copied to clipboard.`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareInvite = async () => {
    const inviteMessage = `Hello Colleague! Join me on Medicoo, the verified telemedicine network for doctors. Register with my invitation code "${referralCode}" to start managing your teleconsultations and digital prescriptions: https://medicoo.com/doctors/join?ref=${referralCode}`;
    try {
      await Share.share({
        message: inviteMessage,
        title: 'Invite Doctor Colleague to Medicoo',
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Header Bar ═══ */}
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
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.screenHeaderTitle, { color: textColor }]}>
          Invite Colleagues
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 36 },
        ]}
      >
        {/* ═══ 1. Hero Luxury Gradient Card ═══ */}
        <LinearGradient
          colors={['#0F766E', '#0FBBA1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconCircle}>
              <UserPlus size={22} color="#FFFFFF" />
            </View>
            <View style={styles.heroBadge}>
              <Sparkles size={12} color="#5EEAD4" />
              <Text style={styles.heroBadgeText}>DOCTOR NETWORK</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Invite Fellow Doctors</Text>
          <Text style={styles.heroSubtitle}>
            Connect and collaborate with licensed physicians across specialties. Help expand Medicoo’s telemedicine community.
          </Text>

          {/* Connected Count Indicator */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>{colleagues.length}</Text>
              <Text style={styles.heroStatLabel}>Colleagues Invited</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                {colleagues.filter((r) => r.status === 'Active on Medicoo').length}
              </Text>
              <Text style={styles.heroStatLabel}>Active on Portal</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ═══ 2. Referral Code & Share Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Your Colleague Invitation Code
            </Text>
          </View>

          {/* Code Box */}
          <View
            style={[
              styles.codeBox,
              {
                backgroundColor: isDark ? '#0D1520' : '#F8FAFC',
                borderColor: isDark ? '#1E2D3D' : '#E2E8F0',
              },
            ]}
          >
            <Text style={[styles.codeText, { color: textColor }]}>{referralCode}</Text>

            <TouchableOpacity
              style={[
                styles.copyBtn,
                copied && { backgroundColor: '#059669' },
              ]}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              {copied ? (
                <>
                  <Check size={14} color="#FFFFFF" />
                  <Text style={styles.copyBtnText}>Copied</Text>
                </>
              ) : (
                <>
                  <Copy size={14} color="#FFFFFF" />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Share Invite Button */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareInvite}
            activeOpacity={0.8}
          >
            <Share2 size={16} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share Invitation Link</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ 3. Why Invite Colleagues Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Why Connect on Medicoo
            </Text>
          </View>

          <View style={styles.stepsCol}>
            {/* Item 1 */}
            <View style={styles.stepItemRow}>
              <View style={[styles.stepNumCircle, { backgroundColor: isDark ? '#172230' : '#ECFDF5' }]}>
                <Users size={16} color="#059669" />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: textColor }]}>
                  Cross-Specialty Collaboration
                </Text>
                <Text style={[styles.stepDesc, { color: subTextColor }]}>
                  Easily cross-refer complex patient cases to trusted specialist colleagues within the platform.
                </Text>
              </View>
            </View>

            <View style={[styles.stepLine, { backgroundColor: dividerColor }]} />

            {/* Item 2 */}
            <View style={styles.stepItemRow}>
              <View style={[styles.stepNumCircle, { backgroundColor: isDark ? '#172230' : '#E0F2FE' }]}>
                <Stethoscope size={16} color="#0284C7" />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: textColor }]}>
                  Integrated Clinical Workflow
                </Text>
                <Text style={[styles.stepDesc, { color: subTextColor }]}>
                  Empower colleagues with seamless video consults, digital Rx, and automated scheduling.
                </Text>
              </View>
            </View>

            <View style={[styles.stepLine, { backgroundColor: dividerColor }]} />

            {/* Item 3 */}
            <View style={styles.stepItemRow}>
              <View style={[styles.stepNumCircle, { backgroundColor: isDark ? '#172230' : '#FEF3C7' }]}>
                <Globe size={16} color="#D97706" />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: textColor }]}>
                  Expand Healthcare Reach
                </Text>
                <Text style={[styles.stepDesc, { color: subTextColor }]}>
                  Help bring quality tele-health access to patients across regional boundaries.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ 4. Invited Colleagues Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Invited Colleagues ({colleagues.length})
            </Text>
          </View>

          <View style={styles.referralsListCol}>
            {colleagues.map((item, idx) => {
              const isActive = item.status === 'Active on Medicoo';
              return (
                <View key={item.id}>
                  <View style={styles.referralRow}>
                    <View
                      style={[
                        styles.doctorAvatarBox,
                        { backgroundColor: isActive ? '#ECFDF5' : '#FFFBEB' },
                      ]}
                    >
                      <Stethoscope size={18} color={isActive ? '#059669' : '#D97706'} />
                    </View>

                    <View style={styles.referralInfoCol}>
                      <Text style={[styles.referralDoctorName, { color: textColor }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.referralSpecialty, { color: subTextColor }]}>
                        {item.specialization} • {item.date}
                      </Text>
                    </View>

                    <View style={styles.referralRightCol}>
                      <View
                        style={[
                          styles.statusBadge,
                          isActive ? styles.statusBadgeDone : styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: isActive ? '#059669' : '#D97706' },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {idx < colleagues.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Status Modal */}
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
  container: {
    flex: 1,
  },

  // ═══ Header Bar ═══
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
  },

  // ═══ Hero Luxury Card ═══
  heroCard: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#0FBBA1',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  // ═══ Section Card ═══
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionAccentBar: {
    width: 3.5,
    height: 22,
    borderRadius: 2,
    backgroundColor: '#0FBBA1',
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // ═══ Code Box & Share ═══
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0FBBA1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0FBBA1',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // ═══ Steps ═══
  stepsCol: {
    gap: 8,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepTextCol: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  stepLine: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },

  // ═══ Referral List ═══
  referralsListCol: {
    gap: 2,
  },
  referralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  doctorAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralInfoCol: {
    flex: 1,
    gap: 2,
  },
  referralDoctorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  referralSpecialty: {
    fontSize: 11,
    fontWeight: '500',
  },
  referralRightCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusBadgeDone: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgePending: {
    backgroundColor: '#FFFBEB',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  rowDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
