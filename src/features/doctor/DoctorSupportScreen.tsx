import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
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
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  HelpCircle,
  Mail,
  MessageSquare,
  PhoneCall,
  Shield,
  Sparkles,
} from 'lucide-react-native';

import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { accent } from '../../theme/accents';
import { useTheme } from '../../theme/ThemeContext';
import { getSupportRequests, SupportTicket, TICKET_CATEGORIES } from '../../services/api/support.api';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQS_DATA: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'Earnings',
    question: 'When and how are consultation earnings transferred?',
    answer:
      'Earnings are automatically reconciled after each completed consultation and batched every Tuesday via direct bank transfer with 0 deduction fees.',
  },
  {
    id: 'faq-2',
    category: 'Consultations',
    question: 'What should I do if a patient does not join the video call?',
    answer:
      'Wait 5 minutes in the call room. If the patient remains unreachable, tap "Mark Patient No-Show" in the dossier. You will still receive full consultation compensation according to our doctor protection policy.',
  },
  {
    id: 'faq-3',
    category: 'Prescriptions',
    question: 'What happens to a prescription after I send it?',
    answer:
      'Medicoo auto-generates a PDF of your prescription and files it directly in the patient\'s Medical Records, along with your name, registration number, and the consultation date.',
  },
  {
    id: 'faq-4',
    category: 'Safety',
    question: 'How do I handle an in-call patient medical emergency?',
    answer:
      'Tap the red "Emergency Assistance" action in the consultation tools menu for one-tap access to national emergency (112) and ambulance (108) numbers, and to alert our clinical safety team for follow-up. This does not contact emergency services on your behalf - please call them directly using the numbers provided.',
  },
  {
    id: 'faq-5',
    category: 'Verification',
    question: 'How do I update my medical degree or specialist registration?',
    answer:
      'Navigate to Profile > Edit Profile Details to upload your updated medical council certification. Our team verifies credential updates within 4 business hours.',
  },
];

interface Ticket {
  id: string;
  subject: string;
  category: string;
  date: string;
  status: 'Resolved' | 'In Review' | 'Escalated';
  replyPreview: string;
}

const formatTicketDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
};

const mapApiTicketToUi = (ticket: SupportTicket): Ticket => {
  const categoryLabel =
    TICKET_CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category;
  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
  const status: Ticket['status'] = isResolved
    ? 'Resolved'
    : ticket.priority === 'urgent'
    ? 'Escalated'
    : 'In Review';
  const replyPreview =
    ticket.resolution ||
    ticket.feedback ||
    (status === 'Escalated'
      ? 'Emergency ticket escalated to medical operations lead.'
      : 'Request received. Our team will respond shortly.');

  return {
    id: ticket.requestId,
    subject: ticket.subject,
    category: categoryLabel,
    date: formatTicketDate(ticket.createdOn),
    status,
    replyPreview,
  };
};

export default function DoctorSupportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();

  // FAQ Accordion
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const loadTickets = async () => {
    try {
      const res = await getSupportRequests({ limit: 20 });
      setTickets((res.data?.requests || []).map(mapApiTicketToUi));
    } catch {
      // Non-blocking - the form above still works even if the history
      // list fails to load.
    } finally {
      setLoadingTickets(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTickets();
    }, [])
  );

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

  const bgColor = theme.inset;
  const cardBg = theme.card;
  const cardBorder = theme.card;
  const textColor = theme.text;
  const subTextColor = theme.textSecondary;
  const dividerColor = theme.cardSecondary;
  const inputBg = theme.background;
  const inputBorder = theme.border;
  const A = { green: accent('green', isDark), blue: accent('blue', isDark), violet: accent('violet', isDark), amber: accent('amber', isDark) };

  useEffect(() => {
    RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(bgColor, true);
      RNStatusBar.setTranslucent(false);
      if (isDark) {
        NavigationBar.setBackgroundColorAsync('#011A29');
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

  const handleCallSupport = () => {
    Linking.openURL('tel:18006334266').catch(() => {
      showStatus('info', 'Provider Helpline', 'Call our 24/7 Doctor Concierge at: 1800-633-4266 (1800-MEDICOO)');
    });
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:doctor-support@medicoo.com?subject=Doctor%20Support%20Inquiry').catch(() => {
      showStatus('info', 'Support Email', 'Reach us via email at: doctor-support@medicoo.com');
    });
  };

  const handleLiveChat = () => {
    navigation.navigate('DoctorLiveChat');
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Consistent Header Bar ═══ */}
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
          Help & Support
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 36 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══ 1. Card: Direct Contact Channels ═══ */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccentBar} />
              <View style={styles.sectionTitleCol}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Instant Contact Channels
                </Text>
                <Text style={[styles.sectionSubtitle, { color: subTextColor }]}>
                  24/7 Doctor Hotline & Operations Desk
                </Text>
              </View>
            </View>

            {/* Option 1: Phone */}
            <TouchableOpacity
              style={styles.channelRow}
              onPress={handleCallSupport}
              activeOpacity={0.6}
            >
              <View style={[styles.channelIconBox, { backgroundColor: A.green.bg }]}>
                <PhoneCall size={18} color={A.green.fg} />
              </View>
              <View style={styles.channelTextCol}>
                <Text style={[styles.channelRowTitle, { color: textColor }]}>
                  24/7 Provider Hotline
                </Text>
                <Text style={[styles.channelRowSub, { color: subTextColor }]}>
                  1800-633-4266 (Toll-Free)
                </Text>
              </View>
              <ChevronRight size={16} color={subTextColor} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />

            {/* Option 2: Email */}
            <TouchableOpacity
              style={styles.channelRow}
              onPress={handleEmailSupport}
              activeOpacity={0.6}
            >
              <View style={[styles.channelIconBox, { backgroundColor: A.blue.bg }]}>
                <Mail size={18} color={A.blue.fg} />
              </View>
              <View style={styles.channelTextCol}>
                <Text style={[styles.channelRowTitle, { color: textColor }]}>
                  Medical Concierge Email
                </Text>
                <Text style={[styles.channelRowSub, { color: subTextColor }]}>
                  doctor-support@medicoo.com
                </Text>
              </View>
              <ChevronRight size={16} color={subTextColor} />
            </TouchableOpacity>

            <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />

            {/* Option 3: Live Chat */}
            <TouchableOpacity
              style={styles.channelRow}
              onPress={handleLiveChat}
              activeOpacity={0.6}
            >
              <View style={[styles.channelIconBox, { backgroundColor: A.violet.bg }]}>
                <MessageSquare size={18} color={A.violet.fg} />
              </View>
              <View style={styles.channelTextCol}>
                <Text style={[styles.channelRowTitle, { color: textColor }]}>
                  Live Operations Chat
                </Text>
                <Text style={[styles.channelRowSub, { color: subTextColor }]}>
                  Real-time support response (&lt; 2 mins)
                </Text>
              </View>
              <ChevronRight size={16} color={subTextColor} />
            </TouchableOpacity>
          </View>

          {/* ═══ 2. Card: Priority Support Ticket ═══ */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccentBar} />
              <View style={styles.sectionTitleRowFlex}>
                <View style={styles.sectionTitleCol}>
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Raise a Support Request
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.toggleFormBtn}
                  onPress={() => navigation.navigate('DoctorNewSupportRequest')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleFormBtnText}>+ New Request</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingTickets ? (
              <View style={styles.ticketsLoadingRow}>
                <ActivityIndicator size="small" color={subTextColor} />
              </View>
            ) : tickets.length === 0 ? (
              <Text style={[styles.ticketsEmptyText, { color: subTextColor }]}>
                No support requests yet. Tap &quot;+ New Request&quot; above to raise one.
              </Text>
            ) : (
              /* Recent / Active Tickets List inside the same card */
              <View style={styles.ticketsSummaryCol}>
                {tickets.map((tk, idx) => {
                  const isResolved = tk.status === 'Resolved';
                  const isEscalated = tk.status === 'Escalated';
                  return (
                    <View key={tk.id}>
                      <View style={styles.ticketItemRow}>
                        <View style={styles.ticketItemMain}>
                          <View style={styles.ticketItemMetaRow}>
                            <Text style={[styles.ticketIdText, { color: subTextColor }]}>
                              {tk.id}
                            </Text>
                            <Text style={[styles.ticketDot, { color: subTextColor }]}>•</Text>
                            <Text style={[styles.ticketCatText, { color: textColor }]}>
                              {tk.category}
                            </Text>
                            <View
                              style={[
                                styles.statusPill,
                                isResolved && styles.statusPillResolved,
                                isEscalated && styles.statusPillEscalated,
                                !isResolved && !isEscalated && styles.statusPillReview,
                                isResolved && { backgroundColor: A.green.bg },
                                isEscalated && { backgroundColor: theme.errorBg },
                                !isResolved && !isEscalated && { backgroundColor: A.amber.bg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  isResolved && { color: A.green.fg },
                                  isEscalated && { color: theme.error },
                                  !isResolved && !isEscalated && { color: A.amber.fg },
                                ]}
                              >
                                {tk.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.ticketSubjectText, { color: textColor }]}>
                            {tk.subject}
                          </Text>
                          <Text
                            style={[styles.ticketReplyPreview, { color: subTextColor }]}
                            numberOfLines={1}
                          >
                            {tk.replyPreview}
                          </Text>
                        </View>
                      </View>
                      {idx < tickets.length - 1 && (
                        <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ═══ 3. Card: Frequently Asked Questions ═══ */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccentBar} />
              <View style={styles.sectionTitleCol}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Frequently Asked Questions
                </Text>
                <Text style={[styles.sectionSubtitle, { color: subTextColor }]}>
                  Quick answers for common doctor queries
                </Text>
              </View>
            </View>

            {/* FAQ List Items */}
            <View style={styles.faqItemsCol}>
              {FAQS_DATA.map((faq, idx) => {
                const isOpen = expandedFaq === faq.id;
                return (
                  <View key={faq.id}>
                    <TouchableOpacity
                      style={styles.faqRowHeader}
                      onPress={() => setExpandedFaq(isOpen ? null : faq.id)}
                      activeOpacity={0.6}
                    >
                      <View style={styles.faqTitleCol}>
                        <Text style={[styles.faqQuestionText, { color: textColor }]}>
                          {faq.question}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.faqChevronBox,
                          isOpen && { transform: [{ rotate: '180deg' }] },
                        ]}
                      >
                        <ChevronDown size={16} color={subTextColor} />
                      </View>
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.faqAnswerBox}>
                        <Text style={[styles.faqAnswerText, { color: subTextColor }]}>
                          {faq.answer}
                        </Text>
                      </View>
                    )}

                    {idx < FAQS_DATA.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ═══ 4. Regulatory Card ═══ */}
          <TouchableOpacity
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
            onPress={() => navigation.navigate('DoctorPolicies')}
            activeOpacity={0.7}
          >
            <View style={styles.complianceRow}>
              <Shield size={18} color={A.blue.fg} />
              <View style={styles.complianceTextCol}>
                <Text style={[styles.complianceTitle, { color: textColor }]}>
                  HIPAA & Telemedicine Certified
                </Text>
                <Text style={[styles.complianceSub, { color: subTextColor }]}>
                  All clinical consultations, prescriptions, and provider records are end-to-end encrypted. Tap to view policies.
                </Text>
              </View>
              <ChevronRight size={16} color={subTextColor} />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

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
  flex1: {
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

  // ═══ Section Card (Standard Design System) ═══
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
    height: 30,
    borderRadius: 2,
    backgroundColor: '#0FBBA1',
  },
  sectionTitleCol: {
    flex: 1,
    gap: 1,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  sectionTitleRowFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  rowDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },

  // ═══ Contact Channels Row ═══
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  channelIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTextCol: {
    flex: 1,
    gap: 2,
  },
  channelRowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  channelRowSub: {
    fontSize: 11.5,
    fontWeight: '500',
  },

  // ═══ Ticket / Form Styles ═══
  toggleFormBtn: {
    backgroundColor: '#0FBBA1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  toggleFormBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  formInsideCardCol: {
    gap: 10,
    paddingTop: 4,
  },
  formInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  categoryPillsRow: {
    gap: 6,
    paddingVertical: 2,
  },
  catPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11.5,
  },
  textInput: {
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12.5,
    fontWeight: '500',
  },
  textAreaInput: {
    height: 80,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontWeight: '500',
  },
  urgentSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 9,
    borderWidth: 1,
  },
  urgentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  urgentTextCol: {
    flex: 1,
  },
  urgentTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  urgentSub: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  formActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0FBBA1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // ═══ Tickets Summary ═══
  ticketsLoadingRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  ticketsEmptyText: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 20,
  },
  ticketsSummaryCol: {
    gap: 2,
  },
  ticketItemRow: {
    paddingVertical: 10,
  },
  ticketItemMain: {
    gap: 4,
  },
  ticketItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketIdText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketDot: {
    fontSize: 11,
  },
  ticketCatText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusPillResolved: {
    backgroundColor: '#ECFDF5',
  },
  statusPillEscalated: {
    backgroundColor: '#FEF2F2',
  },
  statusPillReview: {
    backgroundColor: '#FFFBEB',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ticketSubjectText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ticketReplyPreview: {
    fontSize: 11.5,
    fontWeight: '500',
  },

  faqItemsCol: {
    gap: 2,
  },
  faqRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    gap: 8,
  },
  faqTitleCol: {
    flex: 1,
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  faqChevronBox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqAnswerBox: {
    paddingBottom: 10,
    paddingTop: 2,
  },
  faqAnswerText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },

  // ═══ Compliance Card ═══
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  complianceTextCol: {
    flex: 1,
    gap: 2,
  },
  complianceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  complianceSub: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
});
