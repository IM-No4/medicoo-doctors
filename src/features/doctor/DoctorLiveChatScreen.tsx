import { useNavigation } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  Headphones,
  Paperclip,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';

import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { useTheme } from '../../theme/ThemeContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  time: string;
  agentName?: string;
  isQuickAction?: boolean;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'agent',
    agentName: 'Medicoo Partner Concierge',
    text: 'Hello Doctor! 👋 You are connected to the Medicoo Priority Partner Desk. How can our medical operations team assist you with appointments, payouts, or clinical tools today?',
    time: 'Just now',
  },
];

const QUICK_PROMPTS = [
  '💳 Check payout settlement status',
  '📅 Reschedule consultation slot',
  '💊 Digital prescription query',
  '⚠️ Patient emergency guidance',
  '📑 Update medical registration',
];

export default function DoctorLiveChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
  const inputBg = isDark ? '#0D1520' : '#FFFFFF';
  const inputBorder = isDark ? '#1E2D3D' : '#E2E8F0';
  const agentBubbleBg = isDark ? '#111B27' : '#FFFFFF';
  const userBubbleBg = '#0FBBA1';

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
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  const handleCallSupport = () => {
    Linking.openURL('tel:18006334266').catch(() => {
      showStatus('info', 'Provider Helpline', 'Call our 24/7 Doctor Hotline at: 1800-633-4266');
    });
  };

  const getAutoReply = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('payout') || q.includes('earning') || q.includes('money') || q.includes('settlement') || q.includes('bank')) {
      return 'Doctor payouts are processed automatically every Tuesday. For immediate bank account verification or manual transfer escalation, our finance operations specialist has been notified with your profile ID.';
    }
    if (q.includes('reschedule') || q.includes('slot') || q.includes('schedule') || q.includes('availability')) {
      return 'You can adjust your weekly availability or block dates anytime in "Weekly Schedule". For urgent patient appointment shifts within 2 hours, we will notify the patient and adjust without cancellation penalty.';
    }
    if (q.includes('prescription') || q.includes('medicine') || q.includes('rx') || q.includes('lab')) {
      return 'All digital prescriptions generated inside the app are cryptographically signed with your medical registration license and pushed directly to partner pharmacies. Let us know if you need to reissue a document.';
    }
    if (q.includes('emergency') || q.includes('urgent') || q.includes('critical') || q.includes('hospital')) {
      return '⚠️ In case of life-threatening emergencies during a consultation, please activate the in-app "Emergency Protocol" immediately or call 112/911. Our clinical desk is tracking this session.';
    }
    return 'Thank you for reaching out, Doctor. A Medicoo clinical operations specialist is reviewing your inquiry and will reply shortly. (Average response time: < 2 mins)';
  };

  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: content,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate Agent typing response
    setIsTyping(true);
    setTimeout(() => {
      const replyText = getAutoReply(content);
      const agentMsg: ChatMessage = {
        id: `msg-agent-${Date.now()}`,
        sender: 'agent',
        agentName: 'Dr. Operations Desk',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, agentMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1200);
  };

  const handleAttach = () => {
    showStatus(
      'info',
      'Attach Document / Report',
      'You can attach prescription drafts, transaction receipts, or clinical query screenshots directly into the priority support log.'
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Header Bar (Consistent Back Button + Agent Status + Call Shortcut) ═══ */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: topPadding + 6,
            borderBottomColor: isDark ? '#1A2737' : '#E2E8F0',
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

        <View style={styles.headerTitleCol}>
          <View style={styles.agentTitleRow}>
            <Text style={[styles.screenHeaderTitle, { color: textColor }]}>
              Partner Support Desk
            </Text>
            <ShieldCheck size={16} color="#0FBBA1" />
          </View>
          <View style={styles.activeStatusRow}>
            <View style={styles.greenDot} />
            <Text style={styles.activeStatusText}>Active Now • &lt; 2m SLA</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.roundCallBtn,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}
          onPress={handleCallSupport}
          activeOpacity={0.7}
        >
          <PhoneCall size={18} color="#0FBBA1" />
        </TouchableOpacity>
      </View>

      {/* ═══ Chat Message Stream ═══ */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.messagesListContent,
            { paddingBottom: 16 },
          ]}
          ListHeaderComponent={
            <View style={styles.quickPromptsSection}>
              <View
                style={[
                  styles.securityNoticeCard,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
              >
                <Sparkles size={16} color="#0FBBA1" />
                <Text style={[styles.securityNoticeText, { color: subTextColor }]}>
                  Priority channel for verified medical practitioners. End-to-end encrypted.
                </Text>
              </View>

              <Text style={[styles.quickPromptLabel, { color: subTextColor }]}>
                Frequently Asked Topics:
              </Text>
              <View style={styles.promptChipsWrap}>
                {QUICK_PROMPTS.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    style={[
                      styles.promptChip,
                      {
                        backgroundColor: cardBg,
                        borderColor: cardBorder,
                      },
                    ]}
                    onPress={() => handleSendMessage(prompt.replace(/^[^\w]+/, ''))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.promptChipText, { color: textColor }]}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            return (
              <View
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowAgent,
                ]}
              >
                {!isUser && (
                  <View style={styles.agentAvatarCircle}>
                    <Headphones size={14} color="#FFFFFF" />
                  </View>
                )}

                <View style={styles.messageBubbleCol}>
                  {!isUser && Boolean(item.agentName) && (
                    <Text style={[styles.agentNameText, { color: subTextColor }]}>
                      {item.agentName}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? [styles.userBubble, { backgroundColor: userBubbleBg }]
                        : [
                            styles.agentBubble,
                            {
                              backgroundColor: agentBubbleBg,
                              borderColor: cardBorder,
                            },
                          ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        { color: isUser ? '#FFFFFF' : textColor },
                      ]}
                    >
                      {item.text}
                    </Text>

                    <View style={styles.metaRow}>
                      <Text
                        style={[
                          styles.timeText,
                          { color: isUser ? 'rgba(255, 255, 255, 0.75)' : subTextColor },
                        ]}
                      >
                        {item.time}
                      </Text>
                      {isUser && <CheckCheck size={14} color="#FFFFFF" />}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            isTyping ? (
              <View style={[styles.messageRow, styles.messageRowAgent]}>
                <View style={styles.agentAvatarCircle}>
                  <Headphones size={14} color="#FFFFFF" />
                </View>
                <View
                  style={[
                    styles.typingBubble,
                    {
                      backgroundColor: agentBubbleBg,
                      borderColor: cardBorder,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color="#0FBBA1" />
                  <Text style={[styles.typingText, { color: subTextColor }]}>
                    Support specialist is typing...
                  </Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* ═══ Bottom Input Dock ═══ */}
        <View
          style={[
            styles.inputDockContainer,
            {
              backgroundColor: cardBg,
              borderTopColor: isDark ? '#1A2737' : '#E2E8F0',
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.attachBtn,
              {
                backgroundColor: isDark ? '#172230' : '#F1F5F9',
              },
            ]}
            onPress={handleAttach}
            activeOpacity={0.7}
          >
            <Paperclip size={18} color={subTextColor} />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.chatInput,
              {
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textColor,
              },
            ]}
            placeholder="Type your question or query..."
            placeholderTextColor={subTextColor}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && { opacity: 0.5 },
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
            activeOpacity={0.8}
          >
            <Send size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  roundBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleCol: {
    flex: 1,
    gap: 2,
  },
  agentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  screenHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  activeStatusText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
  roundCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // ═══ Messages Stream ═══
  messagesListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  quickPromptsSection: {
    marginBottom: 16,
    gap: 8,
  },
  securityNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  securityNoticeText: {
    fontSize: 11.5,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  quickPromptLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 4,
  },
  promptChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  promptChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  promptChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },

  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
    maxWidth: '86%',
  },
  messageRowAgent: {
    alignSelf: 'flex-start',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  agentAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0FBBA1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  messageBubbleCol: {
    gap: 3,
  },
  agentNameText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 4,
  },
  agentBubble: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  typingText: {
    fontSize: 11.5,
    fontWeight: '500',
  },

  // ═══ Input Dock ═══
  inputDockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0FBBA1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
