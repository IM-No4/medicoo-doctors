import { CalendarClock } from 'lucide-react-native';
import { themeFor } from '../../../theme/colors';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  AutoPayoutSettings,
  getAutoPayoutSettings,
  saveAutoPayoutSettings,
} from '../../../services/api/doctor.api';

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];
const MONTH_DAYS = [1, 5, 10, 15, 20, 25, 28];

type Props = {
  hasPayoutMethod: boolean;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  subTextColor: string;
  onMessage: (type: 'success' | 'error', title: string, message: string) => void;
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

/**
 * Lets the doctor have a payout requested for them on a chosen day. It only raises the same request the Withdraw button would:
 * Medicoo still reviews and pays each one, so the card says so.
 */
export default function AutoPayoutCard({
  hasPayoutMethod,
  isDark,
  cardBg,
  cardBorder,
  textColor,
  subTextColor,
  onMessage,
}: Props) {
  const [loaded, setLoaded] = useState<AutoPayoutSettings | null>(null);
  const [draft, setDraft] = useState<AutoPayoutSettings | null>(null);
  const [minText, setMinText] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setFailed(false);
      const settings = await getAutoPayoutSettings();
      setLoaded(settings);
      setDraft(settings);
      setMinText(String(settings.minAmount));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const accent = '#0FBBA1';
  const chipBg = themeFor(isDark).cardSecondary;
  const border = themeFor(isDark).border;

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }
  if (failed || !draft || !loaded) {
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.title, { color: textColor }]}>Automatic payout request</Text>
        <Text style={[styles.note, { color: subTextColor }]}>Could not load these settings.</Text>
        <TouchableOpacity onPress={load} style={styles.retry} activeOpacity={0.7}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const minValue = Number(minText);
  const minimumAllowed = loaded.minimumAllowed || 100;
  const minValid = Number.isFinite(minValue) && minValue >= minimumAllowed;
  const dirty =
    draft.enabled !== loaded.enabled ||
    draft.frequency !== loaded.frequency ||
    draft.dayOfWeek !== loaded.dayOfWeek ||
    draft.dayOfMonth !== loaded.dayOfMonth ||
    (minValid && minValue !== loaded.minAmount);

  const save = async () => {
    if (!minValid) {
      onMessage('error', 'Minimum amount', `The minimum amount must be at least ₹${minimumAllowed}.`);
      return;
    }
    try {
      setSaving(true);
      const saved = await saveAutoPayoutSettings({ ...draft, minAmount: minValue });
      setLoaded(saved);
      setDraft(saved);
      setMinText(String(saved.minAmount));
      onMessage(
        'success',
        saved.enabled ? 'Automatic requests on' : 'Automatic requests off',
        saved.enabled
          ? `Your next payout request will be raised on ${formatDate(saved.nextRunAt)}, if your balance is at least ₹${saved.minAmount}.`
          : 'You can still withdraw yourself at any time.'
      );
    } catch (error: any) {
      onMessage('error', 'Could not save', error?.response?.data?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const chip = (selected: boolean) => [
    styles.chip,
    { backgroundColor: selected ? accent : chipBg, borderColor: selected ? accent : border },
  ];
  const chipText = (selected: boolean) => [styles.chipText, { color: selected ? '#FFFFFF' : textColor }];

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <CalendarClock size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />
          <Text style={[styles.title, { color: textColor }]}>Automatic payout request</Text>
        </View>
        <Switch
          value={draft.enabled}
          onValueChange={(enabled) => setDraft({ ...draft, enabled })}
          disabled={!hasPayoutMethod || saving}
          trackColor={{ false: themeFor(isDark).border, true: accent }}
          thumbColor="#FFFFFF"
        />
      </View>

      <Text style={[styles.note, { color: subTextColor }]}>
        {hasPayoutMethod
          ? 'Have your payout requested for you on a day you choose. Medicoo still reviews each request and pays it within 2 working days.'
          : 'Add a payout method above to turn this on.'}
      </Text>

      {draft.enabled && hasPayoutMethod ? (
        <View style={styles.body}>
          <Text style={[styles.label, { color: subTextColor }]}>How often</Text>
          <View style={styles.chipRow}>
            {(['weekly', 'monthly'] as const).map((frequency) => (
              <TouchableOpacity
                key={frequency}
                style={[chip(draft.frequency === frequency), styles.chipWide]}
                onPress={() => setDraft({ ...draft, frequency })}
                activeOpacity={0.8}
              >
                <Text style={chipText(draft.frequency === frequency)}>
                  {frequency === 'weekly' ? 'Every week' : 'Every month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: subTextColor }]}>
            {draft.frequency === 'weekly' ? 'On' : 'On day'}
          </Text>
          <View style={styles.chipRow}>
            {draft.frequency === 'weekly'
              ? WEEKDAYS.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={chip(draft.dayOfWeek === day.value)}
                    onPress={() => setDraft({ ...draft, dayOfWeek: day.value })}
                    activeOpacity={0.8}
                  >
                    <Text style={chipText(draft.dayOfWeek === day.value)}>{day.label}</Text>
                  </TouchableOpacity>
                ))
              : MONTH_DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={chip(draft.dayOfMonth === day)}
                    onPress={() => setDraft({ ...draft, dayOfMonth: day })}
                    activeOpacity={0.8}
                  >
                    <Text style={chipText(draft.dayOfMonth === day)}>{day}</Text>
                  </TouchableOpacity>
                ))}
          </View>

          <Text style={[styles.label, { color: subTextColor }]}>Only if my balance is at least</Text>
          <View style={[styles.inputBox, { backgroundColor: chipBg, borderColor: minValid ? border : '#EF4444' }]}>
            <Text style={[styles.rupee, { color: textColor }]}>₹</Text>
            <TextInput
              value={minText}
              onChangeText={(value) => setMinText(value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={7}
              style={[styles.input, { color: textColor }]}
              placeholderTextColor={subTextColor}
            />
          </View>
          {!minValid ? (
            <Text style={styles.error}>The minimum is ₹{minimumAllowed}.</Text>
          ) : null}
        </View>
      ) : null}

      {loaded.enabled && loaded.nextRunAt ? (
        <Text style={[styles.status, { color: textColor }]}>Next request: {formatDate(loaded.nextRunAt)}</Text>
      ) : null}
      {loaded.lastStatus ? (
        <Text style={[styles.statusSub, { color: subTextColor }]}>
          Last run{loaded.lastRunAt ? ` (${formatDate(loaded.lastRunAt)})` : ''}: {loaded.lastMessage}
        </Text>
      ) : null}

      {dirty ? (
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12.5, lineHeight: 18, marginTop: 8 },
  body: { marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: 46, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  chipWide: { flex: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  rupee: { fontSize: 16, fontWeight: '700', marginRight: 6 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', paddingVertical: 10 },
  error: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  status: { fontSize: 13, fontWeight: '700', marginTop: 14 },
  statusSub: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  saveBtn: { marginTop: 16, backgroundColor: '#0FBBA1', borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14.5 },
  retry: { marginTop: 10 },
  retryText: { color: '#0FBBA1', fontWeight: '700', fontSize: 13 },
});
