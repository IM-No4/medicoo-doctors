import { useNavigation } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  Headphones,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react-native';

import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { useTheme } from '../../theme/ThemeContext';
import {
  LiveChat,
  LiveChatMessage,
  closeLiveChat,
  getActiveLiveChat,
  sendLiveChatMessage,
  startLiveChat,
} from '../../services/api/liveChat.api';
import { emitLiveChatMessage, onLiveChatAgentJoined, onLiveChatClosed, onLiveChatMessage } from '../../services/socketService';

const CATEGORIES = [
  { value: 'payout', label: 'Payout & Earnings' },
  { value: 'scheduling', label: 'Appointments & Scheduling' },
  { value: 'clinical', label: 'Clinical Tools & Prescriptions' },
  { value: 'emergency', label: 'Patient Emergency Guidance' },
  { value: 'general', label: 'Something else' },
];

export default function DoctorLiveChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<LiveChat | null>(null);
  const [starting, setStarting] = useState(false);
  const [inputText, setInputText] = useState('');
  const chatRef = useRef<LiveChat | null>(null);
  chatRef.current = chat;

  // The category picker stays visible as the first thing in the chat
  // history and becomes non-interactive (not hidden) once a chat is active,
  // same convention as the patient app's LiveChatScreen.tsx.
  const pickerLocked = !!chat && chat.status !== 'closed';

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
    const showSub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => {
      showSub.remove();
    };
  }, []);

  const loadActiveChat = async () => {
    try {
      const active = await getActiveLiveChat();
      setChat(active);
    } catch (err) {
      console.error('[DoctorLiveChat] Error loading active chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveChat();
  }, []);

  useEffect(() => {
    const unsubMessage = onLiveChatMessage(({ chatId, message }) => {
      if (chatRef.current && chatRef.current._id === chatId) {
        setChat((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev));
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    const unsubAgentJoined = onLiveChatAgentJoined(({ chatId }) => {
      if (chatRef.current && chatRef.current._id === chatId) {
        setChat((prev) => (prev ? { ...prev, status: 'open' } : prev));
      }
    });
    const unsubClosed = onLiveChatClosed(({ chatId }) => {
      if (chatRef.current && chatRef.current._id === chatId) {
        setChat((prev) => (prev ? { ...prev, status: 'closed' } : prev));
      }
    });
    return () => {
      unsubMessage();
      unsubAgentJoined();
      unsubClosed();
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

  const handleSelectCategory = async (cat: { value: string; label: string }) => {
    if (starting) return;
    setStarting(true);
    try {
      const newChat = await startLiveChat(cat.label, cat.value);
      setChat(newChat);
    } catch (err) {
      console.error('[DoctorLiveChat] Error starting chat:', err);
      showStatus('error', 'Could not start chat', 'Please check your connection and try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleSendMessage = async () => {
    const content = inputText.trim();
    if (!content || !chat || chat.status === 'closed') return;

    const optimistic: LiveChatMessage = {
      _id: `local-${Date.now()}`,
      sender: 'user',
      text: content,
      timestamp: new Date().toISOString(),
    };
    setChat((prev) => (prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev));
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const sentOverSocket = emitLiveChatMessage(chat._id, content);
    if (!sentOverSocket) {
      try {
        await sendLiveChatMessage(chat._id, content);
      } catch (err) {
        console.error('[DoctorLiveChat] Error sending message:', err);
      }
    }
  };

  const handleEndChat = async () => {
    if (!chat) return;
    try {
      const closed = await closeLiveChat(chat._id);
      setChat(closed);
    } catch (err) {
      console.error('[DoctorLiveChat] Error closing chat:', err);
    }
  };

  const headerSubtitle = !pickerLocked
    ? chat?.status === 'closed'
      ? 'Start a new conversation'
      : 'What do you need help with?'
    : chat!.status === 'bot'
    ? 'Chatting with Medicoo Assistant'
    : chat!.status === 'waiting'
    ? 'Waiting for a support executive...'
    : 'Connected to support';

  if (loading) {
    return (
      <View style={[styles.container, styles.centerFill, { backgroundColor: bgColor }]}>
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

      {/* ═══ Header Bar ═══ */}
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
          style={[styles.roundBackBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
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
            <Text style={styles.activeStatusText} numberOfLines={1}>
              {headerSubtitle}
            </Text>
          </View>
        </View>

        {pickerLocked ? (
          <TouchableOpacity
            style={[styles.roundCallBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={handleEndChat}
            activeOpacity={0.7}
          >
            <Text style={styles.endChatBtnText}>End</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.roundCallBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={handleCallSupport}
            activeOpacity={0.7}
          >
            <PhoneCall size={18} color="#0FBBA1" />
          </TouchableOpacity>
        )}
      </View>

      {/* ═══ Chat Message Stream ═══ */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={chat ? chat.messages : []}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.messagesListContent, { paddingBottom: 16 }]}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={styles.quickPromptsSection}>
              <View style={[styles.securityNoticeCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Sparkles size={16} color="#0FBBA1" />
                <Text style={[styles.securityNoticeText, { color: subTextColor }]}>
                  Priority channel for verified medical practitioners. End-to-end encrypted.
                </Text>
              </View>

              <Text style={[styles.quickPromptLabel, { color: subTextColor }]}>
                What do you need help with?
              </Text>
              <View style={styles.categoryList}>
                {CATEGORIES.map((cat) => {
                  const isSelected = pickerLocked && chat?.category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryCard,
                        { backgroundColor: cardBg, borderColor: cardBorder },
                        pickerLocked && styles.categoryCardLocked,
                        isSelected && styles.categoryCardSelected,
                      ]}
                      onPress={() => handleSelectCategory(cat)}
                      disabled={pickerLocked || starting}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.categoryCardText, { color: textColor }, isSelected && styles.categoryCardTextSelected]}>
                        {cat.label}
                      </Text>
                      {isSelected ? (
                        <Check size={16} color="#0FBBA1" />
                      ) : (
                        <ChevronRight size={16} color={pickerLocked ? subTextColor : subTextColor} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {starting && <ActivityIndicator color="#0FBBA1" style={{ marginTop: 12 }} />}

              {chat?.status === 'closed' && (
                <View style={[styles.closedNotice, { backgroundColor: isDark ? '#0F2A20' : '#F0FDF4' }]}>
                  <Text style={styles.closedNoticeText}>This chat was closed. Start a new one above.</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isUser = item.sender === 'user';
            const isBot = item.sender === 'bot';
            return (
              <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAgent]}>
                {!isUser && (
                  <View style={styles.agentAvatarCircle}>
                    {isBot ? <Sparkles size={14} color="#FFFFFF" /> : <Headphones size={14} color="#FFFFFF" />}
                  </View>
                )}

                <View style={styles.messageBubbleCol}>
                  {!isUser && (
                    <Text style={[styles.agentNameText, { color: subTextColor }]}>
                      {isBot ? 'Medicoo Assistant' : 'Support Executive'}
                    </Text>
                  )}

                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? [styles.userBubble, { backgroundColor: userBubbleBg }]
                        : [styles.agentBubble, { backgroundColor: agentBubbleBg, borderColor: cardBorder }],
                    ]}
                  >
                    <Text style={[styles.messageText, { color: isUser ? '#FFFFFF' : textColor }]}>
                      {item.text}
                    </Text>

                    <View style={styles.metaRow}>
                      <Text style={[styles.timeText, { color: isUser ? 'rgba(255, 255, 255, 0.75)' : subTextColor }]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {isUser && <CheckCheck size={14} color="#FFFFFF" />}
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            chat?.status === 'waiting' ? (
              <Text style={[styles.waitingText, { color: subTextColor }]}>
                A support executive will join shortly.
              </Text>
            ) : null
          }
        />

        {/* ═══ Bottom Input Dock ═══ */}
        {pickerLocked && (
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
            <TextInput
              style={[styles.chatInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
              placeholder="Type your question or query..."
              placeholderTextColor={subTextColor}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
              multiline
              maxLength={500}
              editable={chat?.status !== 'closed'}
            />

            <TouchableOpacity
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
              activeOpacity={0.8}
            >
              <Send size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
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
  centerFill: {
    alignItems: 'center',
    justifyContent: 'center',
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
    flexShrink: 1,
  },
  roundCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  endChatBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
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
  categoryList: {
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryCardLocked: {
    opacity: 0.5,
  },
  categoryCardSelected: {
    opacity: 1,
    borderColor: '#0FBBA1',
  },
  categoryCardText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryCardTextSelected: {
    color: '#0FBBA1',
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
  waitingText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
  closedNotice: {
    borderRadius: 12,
    padding: 12,
  },
  closedNoticeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
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
