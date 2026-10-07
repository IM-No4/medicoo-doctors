import { useNavigation } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  CreditCard,
  FileCheck,
  FileText,
  Lock,
  Mail,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeContext';

export interface PolicyMeta {
  id: string;
  type: 'terms' | 'privacy' | 'security' | 'community-guidelines' | 'payout-policy';
  title: string;
  shortDescription: string;
  badge: string;
  version: string;
  iconName: string;
}

export const POLICIES_LIST: PolicyMeta[] = [
  {
    id: 'policy-terms',
    type: 'terms',
    title: 'Terms of Service',
    shortDescription: 'Master provider agreement, platform obligations, doctor privileges, and service SLAs.',
    badge: 'Core Agreement',
    version: 'v2.4 • Updated Sep 2026',
    iconName: 'file-text',
  },
  {
    id: 'policy-privacy',
    type: 'privacy',
    title: 'Privacy & HIPAA Compliance',
    shortDescription: 'Patient data encryption protocols, zero data-selling commitment, and doctor confidentiality.',
    badge: 'HIPAA & GDPR',
    version: 'v3.1 • Updated Sep 2026',
    iconName: 'shield-check',
  },
  {
    id: 'policy-telemedicine',
    type: 'security',
    title: 'Telemedicine Practice Standards',
    shortDescription: 'Digital prescription rules, in-call emergency protocols, and medical council guidelines.',
    badge: 'Clinical Standard',
    version: 'v1.8 • Updated Aug 2026',
    iconName: 'stethoscope',
  },
  {
    id: 'policy-conduct',
    type: 'community-guidelines',
    title: 'Doctor Code of Conduct',
    shortDescription: 'Ethical medical practice, patient communication etiquette, and dispute resolution.',
    badge: 'Ethics',
    version: 'v2.0 • Updated Jul 2026',
    iconName: 'users',
  },
  {
    id: 'policy-payout',
    type: 'payout-policy',
    title: 'Earnings & Cancellation Policy',
    shortDescription: 'Doctor fee protection for patient no-shows, automated settlement schedules, and zero deductions.',
    badge: 'Financial Terms',
    version: 'v2.2 • Updated Sep 2026',
    iconName: 'credit-card',
  },
];

export default function DoctorPoliciesHubScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();

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

  const getPolicyIcon = (iconName: string) => {
    switch (iconName) {
      case 'file-text':
        return <FileText size={20} color="#0FBBA1" />;
      case 'shield-check':
        return <ShieldCheck size={20} color="#0284C7" />;
      case 'stethoscope':
        return <Stethoscope size={20} color="#059669" />;
      case 'users':
        return <Users size={20} color="#7C3AED" />;
      case 'credit-card':
        return <CreditCard size={20} color="#D97706" />;
      default:
        return <FileText size={20} color="#0FBBA1" />;
    }
  };

  const getIconBg = (iconName: string) => {
    if (isDark) return '#172230';
    switch (iconName) {
      case 'file-text':
        return '#ECFDF5';
      case 'shield-check':
        return '#E0F2FE';
      case 'stethoscope':
        return '#ECFDF5';
      case 'users':
        return '#F5F3FF';
      case 'credit-card':
        return '#FEF3C7';
      default:
        return '#F1F5F9';
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

      {/* ═══ Consistent App Header ═══ */}
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
          Terms & Policies
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
        {/* ═══ Top Summary Overview Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.topOverviewRow}>
            <View style={styles.overviewIconBox}>
              <Scale size={22} color="#0FBBA1" />
            </View>
            <View style={styles.overviewTextCol}>
              <Text style={[styles.overviewTitle, { color: textColor }]}>
                Legal & Regulatory Framework
              </Text>
              <Text style={[styles.overviewSub, { color: subTextColor }]}>
                All consultations conducted on Medicoo are governed by certified Telemedicine guidelines and HIPAA standards.
              </Text>
            </View>
          </View>
        </View>

        {/* ═══ Master Policies List Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Official Provider Policies
            </Text>
          </View>

          <View style={styles.policiesListCol}>
            {POLICIES_LIST.map((policy, index) => {
              const isLast = index === POLICIES_LIST.length - 1;
              return (
                <View key={policy.id}>
                  <TouchableOpacity
                    style={styles.policyRow}
                    onPress={() =>
                      navigation.navigate('DoctorPolicyDetail', {
                        policyType: policy.type,
                        policyTitle: policy.title,
                      })
                    }
                    activeOpacity={0.6}
                  >
                    <View
                      style={[
                        styles.policyIconCircle,
                        { backgroundColor: getIconBg(policy.iconName) },
                      ]}
                    >
                      {getPolicyIcon(policy.iconName)}
                    </View>

                    <View style={styles.policyTextCol}>
                      <View style={styles.policyTitleBadgeRow}>
                        <Text style={[styles.policyTitle, { color: textColor }]}>
                          {policy.title}
                        </Text>
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{policy.badge}</Text>
                        </View>
                      </View>

                      <Text
                        style={[styles.policyDescription, { color: subTextColor }]}
                        numberOfLines={2}
                      >
                        {policy.shortDescription}
                      </Text>

                      <Text style={[styles.policyVersionText, { color: subTextColor }]}>
                        {policy.version}
                      </Text>
                    </View>

                    <ChevronRight size={18} color={subTextColor} />
                  </TouchableOpacity>

                  {!isLast && (
                    <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ═══ Compliance & Legal Inquiries Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.legalHelpRow}>
            <ShieldCheck size={20} color="#0FBBA1" />
            <View style={styles.legalHelpTextCol}>
              <Text style={[styles.legalHelpTitle, { color: textColor }]}>
                Legal & Compliance Support
              </Text>
              <Text style={[styles.legalHelpSub, { color: subTextColor }]}>
                Questions regarding regulatory audits or contract terms? Reach out directly to legal@medicoo.com.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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

  topOverviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  overviewIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewTextCol: {
    flex: 1,
    gap: 3,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  overviewSub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },

  policiesListCol: {
    gap: 2,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  policyIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTextCol: {
    flex: 1,
    gap: 3,
  },
  policyTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  policyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  badgePill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillText: {
    color: '#0284C7',
    fontSize: 9.5,
    fontWeight: '700',
  },
  policyDescription: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  policyVersionText: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },

  rowDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },

  legalHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalHelpTextCol: {
    flex: 1,
    gap: 2,
  },
  legalHelpTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  legalHelpSub: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
});
