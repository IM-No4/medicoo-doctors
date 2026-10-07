import { useNavigation, useRoute } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Lock,
  Scale,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react-native';

import { getLegalDocument, LegalDocumentType, LegalSectionDto } from '../../services/api/legal.api';
import { useTheme } from '../../theme/ThemeContext';

interface PolicyContent {
  title: string;
  badge: string;
  version: string;
  sections: { heading: string; body: string }[];
}

const POLICY_FALLBACKS: Record<string, PolicyContent> = {
  terms: {
    title: 'Terms of Service',
    badge: 'Core Provider Agreement',
    version: 'v2.4 • Effective Sep 2026',
    sections: [
      {
        heading: '1. Provider Engagement & Platform Scope',
        body: 'By utilizing the Medicoo Doctor portal, you represent and warrant that you hold an active, unencumbered medical registration license issued by an authorized Medical Council or regulatory body. Medicoo provides clinical communication infrastructure, appointment scheduling, and payment processing for teleconsultations.',
      },
      {
        heading: '2. Professional Independence & Duty of Care',
        body: 'You maintain full clinical autonomy in exercising your professional medical judgment. Medicoo does not influence clinical diagnoses, medical advice, or prescribed treatment courses. You have the absolute right to advise an in-person emergency consultation if a remote patient case is clinically deemed inappropriate for telemedicine.',
      },
      {
        heading: '3. Consultation Honorarium & Settlements',
        body: 'Doctors are compensated at 100% of their established consultation fees without hidden platform deductions. Earnings are reconciled immediately upon consultation completion and disbursed on a weekly automated schedule directly to your verified bank account.',
      },
      {
        heading: '4. Account Integrity & Verification',
        body: 'Practitioners agree to maintain updated accreditation credentials, certificates, and clinic identity verifications. Account sharing or allowing unverified third parties to attend consultations under your credentials is fundamentally prohibited.',
      },
    ],
  },
  privacy: {
    title: 'Privacy & HIPAA Compliance',
    badge: 'HIPAA & GDPR Certified',
    version: 'v3.1 • Effective Sep 2026',
    sections: [
      {
        heading: '1. End-to-End Clinical Data Encryption',
        body: 'All patient-doctor video streams, clinical consultation dossiers, and direct messages are encrypted in transit and at rest using AES-256 bit military-grade protocols. Video calls are peer-to-peer and never recorded without explicit dual-party consent.',
      },
      {
        heading: '2. Zero Data Selling Commitment',
        body: 'Medicoo strictly adheres to global HIPAA and GDPR data governance. We never monetize, sell, or disclose doctor or patient personal identifiable information (PII) or health records to insurance third parties or advertisers.',
      },
      {
        heading: '3. Digital Health Records Ownership',
        body: 'Patient health records, prescriptions, and consultation notes are strictly confidential and accessible only to the attending physician and patient. Doctors can export records for auditing in accordance with medical statutory requirements.',
      },
    ],
  },
  security: {
    title: 'Telemedicine Practice Standards',
    badge: 'Clinical Safety Protocol',
    version: 'v1.8 • Effective Aug 2026',
    sections: [
      {
        heading: '1. Digital E-Prescription Compliance',
        body: 'All e-prescriptions generated through Medicoo must comply with medical council tele-health guidelines. Prescriptions are cryptographically signed with your medical registration ID and QR validation mark. Certain Schedule X/controlled substances are prohibited from remote telemedicine issuance.',
      },
      {
        heading: '2. Emergency Clinical Protocol',
        body: 'If a patient presents emergent life-threatening symptoms (e.g. acute chest pain, severe dyspnea, stroke signs), you must immediately trigger the in-app "Emergency Protocol" and direct the patient to contact local emergency medical services (EMS).',
      },
      {
        heading: '3. Patient Identification & Verification',
        body: 'Doctors must confirm patient identity and age before commencing clinical recommendations or issuing treatment regimens.',
      },
    ],
  },
  'community-guidelines': {
    title: 'Doctor Code of Conduct',
    badge: 'Professional Ethics',
    version: 'v2.0 • Effective Jul 2026',
    sections: [
      {
        heading: '1. Punctuality & Respectful Care',
        body: 'Doctors agree to join scheduled appointments promptly at the agreed time slot. In the rare event of an unavoidable clinical delay, the doctor should message the patient through the consultation portal.',
      },
      {
        heading: '2. Zero Discrimination & Compassionate Service',
        body: 'Every patient is entitled to equitable, non-discriminatory, respectful healthcare regardless of race, gender, background, or socioeconomic status.',
      },
      {
        heading: '3. Dispute & Conflict Resolution',
        body: 'Any patient or provider dispute is reviewed impartially by Medicoo’s Chief Medical Officer desk to safeguard doctor integrity and professional standing.',
      },
    ],
  },
  'payout-policy': {
    title: 'Earnings & Cancellation Policy',
    badge: 'Doctor Fee Protection',
    version: 'v2.2 • Effective Sep 2026',
    sections: [
      {
        heading: '1. Guaranteed Fee on Patient No-Show',
        body: 'If a patient books an appointment but fails to join within the 10-minute grace window, marking the session as "Patient No-Show" guarantees 100% of your scheduled consultation honorarium.',
      },
      {
        heading: '2. Weekly Automated Bank Transfers',
        body: 'Accrued consultation balances are automatically processed every Tuesday via direct ACH/NEFT bank transfer without withdrawal minimums or processing charges.',
      },
      {
        heading: '3. Transparent Tax Compliance',
        body: 'Itemized earning statements and tax compliance summaries are instantly downloadable from the Earnings & Payouts dashboard for your annual accounting and taxation filing.',
      },
    ],
  },
};

export default function DoctorPolicyDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();

  const { policyType = 'terms', policyTitle = 'Terms & Policies' } = route.params || {};

  const [loading, setLoading] = useState(false);
  const fallback = POLICY_FALLBACKS[policyType] || POLICY_FALLBACKS.terms;

  const [docTitle, setDocTitle] = useState(fallback.title);
  const [docSections, setDocSections] = useState<LegalSectionDto[]>(fallback.sections);
  const [docVersion, setDocVersion] = useState(fallback.version);

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

  useEffect(() => {
    if (
      policyType === 'terms' ||
      policyType === 'privacy' ||
      policyType === 'security' ||
      policyType === 'community-guidelines'
    ) {
      getLegalDocument(policyType as LegalDocumentType)
        .then((doc) => {
          if (doc?.title && doc?.sections?.length) {
            setDocTitle(doc.title);
            setDocSections(doc.sections);
            if (doc.updatedAt) {
              setDocVersion(`Updated ${new Date(doc.updatedAt).toLocaleDateString()}`);
            }
          }
        })
        .catch(() => {
          // Use curated local fallback
        });
    }
  }, [policyType]);

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
        <Text style={[styles.screenHeaderTitle, { color: textColor }]} numberOfLines={1}>
          {docTitle}
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
        {/* ═══ Header Badge Banner Card ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.topBadgeRow}>
            <View style={styles.badgePill}>
              <ShieldCheck size={14} color="#0FBBA1" />
              <Text style={styles.badgePillText}>{fallback.badge}</Text>
            </View>
            <Text style={[styles.versionText, { color: subTextColor }]}>
              {docVersion}
            </Text>
          </View>
          <Text style={[styles.policyMainHeading, { color: textColor }]}>
            {docTitle}
          </Text>
          <Text style={[styles.policyIntroText, { color: subTextColor }]}>
            Official legal documentation governing healthcare provider rights, telemedicine clinical compliance, and platform terms.
          </Text>
        </View>

        {/* ═══ Policy Sections ═══ */}
        {docSections.map((section, index) => (
          <View
            key={index}
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            {Boolean(section.heading) && (
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  {section.heading}
                </Text>
              </View>
            )}
            <Text style={[styles.bodyText, { color: subTextColor }]}>
              {section.body}
            </Text>
          </View>
        ))}

        {/* ═══ Certification Guarantee Footer ═══ */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.certRow}>
            <CheckCircle2 size={20} color="#0FBBA1" />
            <View style={styles.certTextCol}>
              <Text style={[styles.certTitle, { color: textColor }]}>
                Legally Binding & Certified
              </Text>
              <Text style={[styles.certSub, { color: subTextColor }]}>
                Governed under Telemedicine Practice Guidelines & Health Information Privacy Acts.
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
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
    maxWidth: '70%',
    textAlign: 'center',
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
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badgePillText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  policyMainHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  policyIntroText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionAccentBar: {
    width: 3.5,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#0FBBA1',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    flex: 1,
  },
  bodyText: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '500',
  },

  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  certTextCol: {
    flex: 1,
    gap: 2,
  },
  certTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  certSub: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
});
