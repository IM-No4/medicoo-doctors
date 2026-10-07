import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock,
  Info,
  Sparkles,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  getDoctorProfile,
  updateDoctorSettings,
} from '../../services/api/user.api';
import { useTheme } from '../../theme/ThemeContext';
import SlowInternetLoader from '../../components/network/SlowInternetLoader';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const MAX_SURCHARGE_PERCENT = 50;

type DaySchedule = { enabled: boolean; start: string; end: string };
type Schedule = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: Schedule = DAYS.reduce((acc, day) => {
  acc[day] = { enabled: false, start: '09:00', end: '17:00' };
  return acc;
}, {} as Schedule);

// "HH:MM" (24h) <-> Date
const timeStringToDate = (time: string) => {
  const [h, m] = (time || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

const dateToTimeString = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;

const formatDisplayTime = (time: string): string => {
  if (!time) return '';
  const trimmed = time.trim();

  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  const [hStr, mStr] = trimmed.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr !== undefined ? parseInt(mStr, 10) : 0;

  if (!isNaN(h)) {
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 === 0 ? 12 : h % 12;
    const formattedMinutes = String(isNaN(m) ? 0 : m).padStart(2, '0');
    return `${hours12}:${formattedMinutes} ${period}`;
  }

  const d = timeStringToDate(time);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export default function ManageAvailabilityScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();

  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [surchargePercent, setSurchargePercent] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickerFor, setPickerFor] = useState<{
    day: string;
    field: 'start' | 'end';
  } | null>(null);
  const [status, setStatus] = useState<{
    visible: boolean;
    type: StatusType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'idle',
    title: '',
    message: '',
  });
  const scrollViewRef = useRef<ScrollView>(null);

  const bgColor = isDark ? '#080E17' : '#EFF2F6';
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? '#1A2636' : '#F1F5F9';
  const iconColor = isDark ? '#94A3B8' : '#475569';

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

  const showStatus = (type: StatusType, title: string, message: string) =>
    setStatus({ visible: true, type, title, message });
  const hideStatus = () =>
    setStatus((prev) => ({ ...prev, visible: false }));

  const loadSettings = useCallback(async () => {
    try {
      const profile = await getDoctorProfile();
      const savedAvailability = profile?.weeklyAvailability;
      if (savedAvailability) {
        const merged: Schedule = { ...DEFAULT_SCHEDULE };
        DAYS.forEach((day) => {
          const saved = savedAvailability[day];
          if (saved?.enabled && saved.start && saved.end) {
            merged[day] = {
              enabled: true,
              start: saved.start,
              end: saved.end,
            };
          }
        });
        setSchedule(merged);
      }
      if (typeof profile?.urgentSurchargePercent === 'number') {
        setSurchargePercent(String(profile.urgentSurchargePercent));
      }
    } catch (error) {
      console.error('Failed to load availability', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const handleTimeChange = (event: any, selected: Date | undefined) => {
    const target = pickerFor;
    if (Platform.OS === 'android') setPickerFor(null);
    if (!selected || !target) return;

    setSchedule((prev) => ({
      ...prev,
      [target.day]: {
        ...prev[target.day],
        [target.field]: dateToTimeString(selected),
      },
    }));
  };

  const handleSurchargeChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (!digitsOnly) {
      setSurchargePercent('');
      return;
    }
    const clamped = Math.min(parseInt(digitsOnly, 10), MAX_SURCHARGE_PERCENT);
    setSurchargePercent(String(clamped));
  };

  const handleSave = async () => {
    const invalidDay = DAYS.find(
      (day) =>
        schedule[day].enabled && schedule[day].start >= schedule[day].end
    );
    if (invalidDay) {
      showStatus(
        'warning',
        'Invalid Hours',
        `${invalidDay}'s end time must be after its start time.`
      );
      return;
    }

    setSaving(true);
    try {
      await updateDoctorSettings({
        availability: schedule,
        urgentSurchargePercent: Number(surchargePercent) || 0,
      });
      showStatus(
        'success',
        'Availability Saved',
        'Your weekly working hours and urgent care surcharge have been updated.'
      );
    } catch (error) {
      showStatus(
        'error',
        'Save Failed',
        'We could not save your availability. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  const enabledDaysCount = DAYS.filter((d) => schedule[d].enabled).length;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Header Bar (Floating Back Button + Title) ═══ */}
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
          Weekly Schedule
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          <SlowInternetLoader
            isLoading={loading}
            message="Loading weekly schedule..."
            onRetry={loadSettings}
            style={{ paddingVertical: 48 }}
          />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ═══ 1. Daily Schedule Cards ═══ */}
            <View
              style={[
                styles.sectionCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionAccentBar} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Available Days & Hours
              </Text>
            </View>

            {DAYS.map((day, index) => {
              const isEnabled = schedule[day].enabled;
              const showDivider = index < DAYS.length - 1;

              return (
                <View key={day}>
                  <View style={styles.dayRowContainer}>
                    <View style={styles.dayTopRow}>
                      <View style={styles.dayTitleCol}>
                        <Text
                          style={[
                            styles.dayNameText,
                            { color: isEnabled ? textColor : subTextColor },
                          ]}
                        >
                          {day}
                        </Text>
                        <Text
                          style={[
                            styles.dayStatusSubText,
                            {
                              color: isEnabled
                                ? '#0FBBA1'
                                : subTextColor,
                            },
                          ]}
                        >
                          {isEnabled
                            ? `${formatDisplayTime(
                                schedule[day].start
                              )} - ${formatDisplayTime(schedule[day].end)}`
                            : 'Unavailable'}
                        </Text>
                      </View>

                      <Switch
                        value={isEnabled}
                        onValueChange={() => toggleDay(day)}
                        trackColor={{
                          false: isDark ? '#1E293B' : '#E2E8F0',
                          true: '#0FBBA1',
                        }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    {isEnabled && (
                      <View style={styles.timeSlotsRow}>
                        <TouchableOpacity
                          style={[
                            styles.timeSlotChip,
                            {
                              backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                              borderColor: dividerColor,
                            },
                          ]}
                          onPress={() =>
                            setPickerFor({ day, field: 'start' })
                          }
                          activeOpacity={0.7}
                        >
                          <Clock size={14} color="#0FBBA1" />
                          <Text
                            style={[styles.timeSlotText, { color: textColor }]}
                          >
                            {formatDisplayTime(schedule[day].start)}
                          </Text>
                        </TouchableOpacity>

                        <Text style={[styles.toLabel, { color: subTextColor }]}>
                          to
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.timeSlotChip,
                            {
                              backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                              borderColor: dividerColor,
                            },
                          ]}
                          onPress={() => setPickerFor({ day, field: 'end' })}
                          activeOpacity={0.7}
                        >
                          <Clock size={14} color="#0FBBA1" />
                          <Text
                            style={[styles.timeSlotText, { color: textColor }]}
                          >
                            {formatDisplayTime(schedule[day].end)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {showDivider && (
                    <View
                      style={[
                        styles.rowDivider,
                        { backgroundColor: dividerColor },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* ═══ 3. Urgent Care Surcharge Card ═══ */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View
                style={[
                  styles.sectionAccentBar,
                  { backgroundColor: '#F59E0B' },
                ]}
              />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Urgent Care Surcharge
              </Text>
            </View>

            <Text style={[styles.surchargeSubDesc, { color: subTextColor }]}>
              Extra percentage added to your fee for requests outside your scheduled hours (Capped at {MAX_SURCHARGE_PERCENT}%).
            </Text>

            <View style={styles.surchargeInputRow}>
              <View
                style={[
                  styles.surchargeInputWrapper,
                  {
                    backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                    borderColor: dividerColor,
                  },
                ]}
              >
                <TextInput
                  style={[styles.surchargeTextInput, { color: textColor }]}
                  value={surchargePercent}
                  onChangeText={handleSurchargeChange}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="0"
                  placeholderTextColor={subTextColor}
                />
                <Text
                  style={[styles.percentSignLabel, { color: subTextColor }]}
                >
                  %
                </Text>
              </View>

              <View style={styles.surchargeHintCol}>
                <Text
                  style={[styles.surchargeHintTitle, { color: textColor }]}
                >
                  {Number(surchargePercent) > 0
                    ? `+${surchargePercent}% Urgent Fee`
                    : 'Standard Consultation Rates'}
                </Text>
                <Text
                  style={[styles.surchargeHintSub, { color: subTextColor }]}
                >
                  Applied automatically to off-hour bookings
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ═══ Floating Bottom Action Bar ═══ */}
        <View
          style={[
            styles.bottomActionBar,
            {
              backgroundColor: cardBg,
              borderTopColor: dividerColor,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.primarySaveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.primarySaveBtnText}>Save Schedule</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      )}

      {pickerFor && (
        <DateTimePicker
          value={timeStringToDate(
            schedule[pickerFor.day][pickerFor.field]
          )}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          minuteInterval={5}
        />
      )}

      <StatusModal
        visible={status.visible}
        status={status.type}
        title={status.title}
        message={status.message}
        onClose={hideStatus}
        autoCloseDelay={status.type === 'success' ? 2500 : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: 24,
  },

  // ═══ Bottom Action Bar ═══
  bottomActionBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primarySaveBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0FBBA1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primarySaveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ═══ 2. Section Soft Cards ═══
  sectionCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionAccentBar: {
    width: 3.5,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#0FBBA1',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // ═══ Day Row ═══
  dayRowContainer: {
    paddingVertical: 12,
  },
  dayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayTitleCol: {
    flex: 1,
  },
  dayNameText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  dayStatusSubText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  timeSlotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  timeSlotChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },

  // ═══ Surcharge Card ═══
  surchargeSubDesc: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 14,
  },
  surchargeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  surchargeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    width: 86,
  },
  surchargeTextInput: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  percentSignLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  surchargeHintCol: {
    flex: 1,
  },
  surchargeHintTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  surchargeHintSub: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
});
