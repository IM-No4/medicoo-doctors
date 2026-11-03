import { useNavigation } from '@react-navigation/native';
import { AlertCircle, ArrowLeft, Send } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { createSupportRequest, TICKET_CATEGORIES } from '../../services/api/support.api';
import { useTheme } from '../../theme/ThemeContext';

/** A new support request, on a screen of its own (opened from Help & Support). The list there reloads when this closes. */
export default function DoctorNewSupportRequestScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();

  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [statusModal, setStatusModal] = useState<{ visible: boolean; status: StatusType; title: string; message: string; done: boolean }>({
    visible: false,
    status: 'idle',
    title: '',
    message: '',
    done: false,
  });
  const showStatus = (status: StatusType, title: string, body: string, done = false) =>
    setStatusModal({ visible: true, status, title, message: body, done });

  const bgColor = theme.inset;
  const cardBg = theme.card;
  const cardBorder = theme.card;
  const textColor = theme.text;
  const subTextColor = theme.textSecondary;
  const dividerColor = theme.cardSecondary;
  const inputBg = theme.background;
  const inputBorder = theme.border;

  const topPadding = insets.top > 0 ? insets.top : Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 20;

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DoctorSupport');
  };

  const submit = async () => {
    if (submitting) return;
    if (!subject.trim()) {
      showStatus('warning', 'Subject Required', 'Please enter a brief subject for your request.');
      return;
    }
    if (message.trim().length < 10) {
      showStatus('warning', 'Details Required', 'Please provide issue details (min. 10 characters).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSupportRequest({
        category: category.value,
        priority: isUrgent ? 'urgent' : 'medium',
        subject: subject.trim(),
        description: message.trim(),
      });
      showStatus('success', 'Ticket Created', `Ticket #${res.data.requestId} has been lodged. Our team will get back to you shortly.`, true);
    } catch {
      showStatus('error', 'Submission Failed', 'Could not submit your request. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bgColor} translucent animated />

      <View style={[styles.headerBar, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={[styles.roundBackBtn, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={goBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>New Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.label, { color: textColor }]}>Category</Text>
            <View style={styles.pillsRow}>
              {TICKET_CATEGORIES.map((cat) => {
                const selected = category.value === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: selected ? '#0FBBA1' : theme.cardSecondary,
                        borderColor: selected ? '#0FBBA1' : theme.border,
                      },
                    ]}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, { color: selected ? '#FFFFFF' : subTextColor, fontWeight: selected ? '700' : '500' }]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: textColor }]}>Subject</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor, fontSize: 13 }]}
              placeholder="e.g., Payout discrepancy for consultation #892"
              placeholderTextColor={subTextColor}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />

            <Text style={[styles.label, { color: textColor }]}>Details</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
              placeholder="Describe your query or provide the patient appointment ID..."
              placeholderTextColor={subTextColor}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View
            style={[
              styles.urgentRow,
              { backgroundColor: cardBg, borderColor: isUrgent ? '#EF4444' : cardBorder },
            ]}
          >
            <AlertCircle size={18} color={isUrgent ? '#EF4444' : subTextColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.urgentTitle, { color: isUrgent ? '#EF4444' : textColor }]}>Consultation Emergency</Text>
              <Text style={[styles.urgentSub, { color: subTextColor }]}>Immediate live priority routing</Text>
            </View>
            <Switch
              value={isUrgent}
              onValueChange={setIsUrgent}
              trackColor={{ false: '#CBD5E1', true: '#FCA5A5' }}
              thumbColor={isUrgent ? '#EF4444' : '#F8FAFC'}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: cardBg, borderTopColor: dividerColor, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={[styles.submit, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting} activeOpacity={0.85}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={16} color="#FFFFFF" />
                <Text style={styles.submitText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <StatusModal
        visible={statusModal.visible}
        status={statusModal.status}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => {
          const done = statusModal.done;
          setStatusModal((prev) => ({ ...prev, visible: false }));
          if (done) goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  roundBackBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  scrollContent: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 24 },

  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 12.5 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 14 },
  textArea: { minHeight: 120, marginBottom: 2 },

  urgentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 14 },
  urgentTitle: { fontSize: 14, fontWeight: '700' },
  urgentSub: { fontSize: 12, marginTop: 2 },

  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  submit: { flexDirection: 'row', gap: 8, backgroundColor: '#0FBBA1', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
