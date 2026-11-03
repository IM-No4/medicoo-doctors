import { palette } from '../../theme/palette';
import { useNavigation } from '@react-navigation/native';
import { AlertTriangle, ArrowLeft, CalendarClock, ShieldCheck, UserX } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { accent } from '../../theme/accents';
import {
  cancelAccountDeletion,
  getAccountDeletionStatus,
  requestAccountDeletion,
} from '../../services/api/user.api';
import { useTheme } from '../../theme/ThemeContext';

const CONFIRM_WORD = 'DELETE';

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'the scheduled date';

/**
 * Account deletion, on a screen of its own: what will happen, a typed confirmation, and, once it is scheduled, the date and a way to
 * change your mind. The server starts a 30-day grace period; logging back in before then cancels it.
 */
export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justScheduled, setJustScheduled] = useState(false);

  const bgColor = theme.inset;
  const cardBg = theme.card;
  const cardBorder = theme.card;
  const textColor = theme.text;
  const subText = theme.textSecondary;
  const divider = theme.cardSecondary;
  const redBg = theme.errorBg;
  const inputBg = theme.background;
  const inputBorder = theme.border;

  const A = {
    blue: accent('blue', isDark),
    violet: accent('violet', isDark),
    amber: accent('amber', isDark),
    green: accent('green', isDark),
    slate: accent('slate', isDark),
  };

  const load = useCallback(async () => {
    try {
      const status = await getAccountDeletionStatus();
      setPending(!!status.pending);
      setScheduledFor(status.deletionScheduledFor || null);
    } catch {
      // it simply starts from "not scheduled"
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DoctorDashboard');
  };

  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  const requestDeletion = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await requestAccountDeletion();
      setPending(true);
      setScheduledFor(res.deletionScheduledFor || null);
      setJustScheduled(true);
    } catch (e: any) {
      // a 400 names exactly what has to be settled first (upcoming appointments, earnings not yet withdrawn)
      setError(e?.response?.data?.message || 'Could not schedule the deletion. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const keepAccount = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await cancelAccountDeletion();
      setPending(false);
      setScheduledFor(null);
      setJustScheduled(false);
      setTyped('');
    } catch {
      setError('Could not cancel the deletion. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const topPadding = insets.top > 0 ? insets.top : Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 24) : 20;

  const rows = [
    { Icon: CalendarClock, tone: A.blue, title: '30 days to change your mind', body: 'The deletion is scheduled, not immediate. Logging back in before the date cancels it.' },
    { Icon: UserX, tone: A.slate, title: 'You disappear from Medicoo', body: 'Patients can no longer find or book you, and you can no longer sign in once it is done.' },
    { Icon: ShieldCheck, tone: A.violet, title: 'Records are kept', body: 'Past consultation and prescription records are retained as healthcare record-keeping rules require.' },
    { Icon: AlertTriangle, tone: A.amber, title: 'Settle these first', body: 'It cannot be scheduled while you have upcoming appointments or earnings you have not withdrawn.' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bgColor} translucent animated />

      <View style={[styles.headerBar, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={[styles.roundBackBtn, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={goBack} activeOpacity={0.7}>
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
          >
            {pending ? (
              <>
                <View style={styles.hero}>
                  <Text style={[styles.heroLead, { color: subText }]}>
                    {justScheduled ? 'Deletion scheduled. ' : ''}Your account will be deleted on{' '}
                    <Text style={{ color: textColor, fontWeight: '700' }}>{formatDate(scheduledFor)}</Text>. Log back in before then and it stays
                    exactly as it is.
                  </Text>
                </View>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: textColor }]}>Changed your mind?</Text>
                  <Text style={[styles.rowBody, { color: subText, marginTop: 6 }]}>
                    You can keep your account right now, or simply sign in again before the date above.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.hero}>
                  <Text style={[styles.heroLead, { color: subText }]}>Please read what happens before you continue.</Text>
                </View>

                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  {rows.map(({ Icon, tone, title, body }, index) => (
                    <View key={title} style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: divider }]}>
                      <View style={[styles.rowTile, { backgroundColor: tone.bg }]}>
                        <Icon size={17} color={tone.fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle, { color: textColor }]}>{title}</Text>
                        <Text style={[styles.rowBody, { color: subText }]}>{body}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: textColor }]}>Confirm</Text>
                  <Text style={[styles.rowBody, { color: subText, marginTop: 4 }]}>
                    Type <Text style={{ color: palette.red500, fontWeight: '800' }}>{CONFIRM_WORD}</Text> to continue.
                  </Text>
                  <TextInput
                    value={typed}
                    onChangeText={setTyped}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder={CONFIRM_WORD}
                    placeholderTextColor={subText}
                    style={[styles.input, { color: textColor, backgroundColor: inputBg, borderColor: confirmed ? palette.red500 : inputBorder }]}
                  />
                </View>
              </>
            )}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: redBg }]}>
                <AlertTriangle size={16} color={palette.red500} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: cardBg, borderTopColor: divider, paddingBottom: insets.bottom + 12 }]}>
            {pending ? (
              <TouchableOpacity style={[styles.primary, { backgroundColor: palette.primary }, busy && { opacity: 0.6 }]} onPress={keepAccount} disabled={busy} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color={palette.white} /> : <Text style={styles.primaryText}>Keep my account</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primary, { backgroundColor: palette.red500 }, (!confirmed || busy) && { opacity: 0.4 }]}
                onPress={requestDeletion}
                disabled={!confirmed || busy}
                activeOpacity={0.85}
              >
                {busy ? <ActivityIndicator color={palette.white} /> : <Text style={styles.primaryText}>Delete my account</Text>}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  roundBackBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  scrollContent: { paddingTop: 8, paddingHorizontal: 16 },

  hero: { alignItems: 'center', paddingTop: 6, paddingBottom: 18 },
  heroLead: { fontSize: 12.5, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },

  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  rowTile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowBody: { fontSize: 12.5, lineHeight: 19, marginTop: 2 },
  input: { marginTop: 12, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: '700', letterSpacing: 2 },

  errorBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 14, padding: 14, marginBottom: 14 },
  errorText: { flex: 1, color: palette.red500, fontSize: 13, lineHeight: 19 },

  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  primary: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryText: { color: palette.white, fontSize: 15, fontWeight: '800' },
});
