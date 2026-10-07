import DateTimePicker from '@react-native-community/datetimepicker';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Moon,
  Sparkles,
  Sun,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';

interface TodayAvailabilityModalProps {
  visible: boolean;
  onClose: () => void;
  todayDayName: string;
  initialEnabled: boolean;
  initialStart: string;
  initialEnd: string;
  appointmentsCountToday: number;
  onSave: (data: { enabled: boolean; start: string; end: string }) => Promise<void>;
}

const PRESETS = [
  {
    id: 'full_day',
    label: 'Full Day',
    sub: '9 AM - 8 PM',
    start: '09:00',
    end: '20:00',
    Icon: Zap,
    color: '#2563EB',
    bg: '#EFF6FF',
    darkBg: '#172554',
  },
  {
    id: 'morning',
    label: 'Morning',
    sub: '9 AM - 1 PM',
    start: '09:00',
    end: '13:00',
    Icon: Sun,
    color: '#D97706',
    bg: '#FEF3C7',
    darkBg: '#422006',
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    sub: '2 PM - 6 PM',
    start: '14:00',
    end: '18:00',
    Icon: Sparkles,
    color: '#0284C7',
    bg: '#F0F9FF',
    darkBg: '#0C4A6E',
  },
  {
    id: 'evening',
    label: 'Evening',
    sub: '5 PM - 9 PM',
    start: '17:00',
    end: '21:00',
    Icon: Moon,
    color: '#7C3AED',
    bg: '#F5F3FF',
    darkBg: '#2E1065',
  },
];

const timeStringToDate = (time: string) => {
  const [h, m] = (time || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

const dateToTimeString = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const formatDisplayTime = (time: string): string => {
  if (!time) return '';
  const trimmed = time.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;

  const [hStr, mStr] = trimmed.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr !== undefined ? parseInt(mStr, 10) : 0;

  if (!isNaN(h)) {
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 === 0 ? 12 : h % 12;
    const formattedMinutes = String(isNaN(m) ? 0 : m).padStart(2, '0');
    return `${hours12}:${formattedMinutes} ${period}`;
  }
  return time;
};

export default function TodayAvailabilityModal({
  visible,
  onClose,
  todayDayName,
  initialEnabled,
  initialStart,
  initialEnd,
  appointmentsCountToday,
  onSave,
}: TodayAvailabilityModalProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [rendered, setRendered] = useState(visible);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [start, setStart] = useState(initialStart || '09:00');
  const [end, setEnd] = useState(initialEnd || '17:00');
  const [saving, setSaving] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [pickerField, setPickerField] = useState<'start' | 'end' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(450)).current;

  // Open / Close animations
  useEffect(() => {
    if (visible) {
      setRendered(true);
      setEnabled(initialEnabled);
      setStart(initialStart || '09:00');
      setEnd(initialEnd || '17:00');
      setErrorMessage(null);

      const match = PRESETS.find(
        (p) => p.start === (initialStart || '09:00') && p.end === (initialEnd || '17:00')
      );
      setActivePreset(match ? match.id : null);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 240,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 450,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRendered(false);
      });
    }
  }, [visible, rendered, initialEnabled, initialStart, initialEnd, fadeAnim, slideAnim]);

  // Sync Android System Navigation Bar with active theme
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (rendered) {
        if (isDark) {
          NavigationBar.setBackgroundColorAsync('#111B27');
          NavigationBar.setButtonStyleAsync('light');
        } else {
          NavigationBar.setBackgroundColorAsync('#FFFFFF');
          NavigationBar.setButtonStyleAsync('dark');
        }
      } else {
        if (isDark) {
          NavigationBar.setBackgroundColorAsync('#080E17');
          NavigationBar.setButtonStyleAsync('light');
        } else {
          NavigationBar.setBackgroundColorAsync('#F8FAFC');
          NavigationBar.setButtonStyleAsync('dark');
        }
      }
    }
  }, [rendered, isDark]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 450,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRendered(false);
      onClose();
    });
  };

  // Intercept Android hardware back button
  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      handleClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible]);

  if (!rendered && !visible) {
    return null;
  }

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setActivePreset(p.id);
    setStart(p.start);
    setEnd(p.end);
    setEnabled(true);
    setErrorMessage(null);
  };

  const handleTimeChange = (event: any, selected: Date | undefined) => {
    const field = pickerField;
    if (Platform.OS === 'android') {
      setPickerField(null);
    }
    if (!selected || !field) return;

    const timeStr = dateToTimeString(selected);
    if (field === 'start') {
      setStart(timeStr);
    } else {
      setEnd(timeStr);
    }
    setActivePreset(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (enabled && start >= end) {
      setErrorMessage('End time must be after start time.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      await onSave({ enabled, start, end });
      handleClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update availability.');
    } finally {
      setSaving(false);
    }
  };

  const modalBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#E2E8F0';
  const textColor = isDark ? '#F1F5F9' : '#0F172A';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? '#1E293B' : '#F1F5F9';

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Darkened Animated Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Sliding Sheet Container */}
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: modalBg,
            borderColor: cardBorder,
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + 14,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Top Handle */}
        <View style={styles.handleWrap}>
          <View
            style={[
              styles.handleBar,
              { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
            ]}
          />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleBadgeRow}>
              <Calendar size={14} color="#2563EB" />
              <Text style={styles.titleBadgeText}>
                TODAY • {todayDayName.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.mainTitle, { color: textColor }]}>
              Today&apos;s Availability
            </Text>
            <Text style={[styles.subtitle, { color: subTextColor }]}>
              Quickly open or block slots for today without changing your weekly template.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleClose}
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
            ]}
            activeOpacity={0.7}
          >
            <X size={18} color={subTextColor} />
          </TouchableOpacity>
        </View>

        {/* Today Status Switch Row */}
        <View
          style={[
            styles.statusToggleCard,
            {
              backgroundColor: isDark ? '#080E17' : '#F8FAFC',
              borderColor: cardBorder,
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.statusToggleTitle, { color: textColor }]}>
              {enabled ? 'Accepting Bookings Today' : 'Marked Off for Today'}
            </Text>
            <Text style={[styles.statusToggleSub, { color: subTextColor }]}>
              {enabled
                ? 'Patients can book scheduled consultation slots today'
                : 'No new calendar bookings can be booked today'}
            </Text>
          </View>

          <Switch
            value={enabled}
            onValueChange={(val) => {
              setEnabled(val);
              setErrorMessage(null);
            }}
            trackColor={{ false: 'rgba(148, 163, 184, 0.4)', true: '#2563EB' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Active Bookings Notice (if disabling) */}
        {!enabled && appointmentsCountToday > 0 && (
          <View
            style={[
              styles.warningBanner,
              {
                backgroundColor: isDark ? '#2A1A05' : '#FFFBEB',
                borderColor: isDark ? '#5C3E08' : '#FDE68A',
              },
            ]}
          >
            <AlertTriangle size={15} color="#D97706" style={{ marginTop: 2 }} />
            <Text
              style={[
                styles.warningText,
                { color: isDark ? '#FDE68A' : '#92400E' },
              ]}
            >
              You have {appointmentsCountToday} confirmed appointment(s) today. Marking off blocks new bookings, but existing appointments remain active.
            </Text>
          </View>
        )}

        {/* Shift Presets (when enabled) */}
        {enabled && (
          <>
            <Text style={[styles.sectionLabel, { color: subTextColor }]}>
              QUICK PRESETS
            </Text>

            <View style={styles.presetsGrid}>
              {PRESETS.map((p) => {
                const isSelected = activePreset === p.id;
                const IconComp = p.Icon;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.presetCard,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? p.darkBg
                            : p.bg
                          : isDark
                          ? '#080E17'
                          : '#F8FAFC',
                        borderColor: isSelected ? p.color : cardBorder,
                      },
                    ]}
                    onPress={() => handleSelectPreset(p)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.presetTopRow}>
                      <View
                        style={[
                          styles.presetIconWrap,
                          {
                            backgroundColor: isDark ? p.darkBg : p.bg,
                          },
                        ]}
                      >
                        <IconComp size={14} color={p.color} />
                      </View>
                      {isSelected && (
                        <View
                          style={[
                            styles.presetCheckDot,
                            { backgroundColor: p.color },
                          ]}
                        >
                          <Check size={10} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.presetTitle,
                        { color: textColor, fontWeight: isSelected ? '700' : '600' },
                      ]}
                    >
                      {p.label}
                    </Text>
                    <Text style={[styles.presetSub, { color: subTextColor }]}>
                      {p.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Hours Pickers */}
            <Text style={[styles.sectionLabel, { color: subTextColor, marginTop: 14 }]}>
              CUSTOM WORKING HOURS
            </Text>

            <View style={styles.timePickersRow}>
              {/* Start Time */}
              <TouchableOpacity
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                    borderColor: cardBorder,
                  },
                ]}
                onPress={() => setPickerField('start')}
                activeOpacity={0.7}
              >
                <View style={styles.timeChipLeft}>
                  <Clock size={14} color="#2563EB" />
                  <View>
                    <Text style={[styles.timeChipLabel, { color: subTextColor }]}>
                      From
                    </Text>
                    <Text style={[styles.timeChipValue, { color: textColor }]}>
                      {formatDisplayTime(start)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <Text style={[styles.toSeparator, { color: subTextColor }]}>to</Text>

              {/* End Time */}
              <TouchableOpacity
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: isDark ? '#080E17' : '#F8FAFC',
                    borderColor: cardBorder,
                  },
                ]}
                onPress={() => setPickerField('end')}
                activeOpacity={0.7}
              >
                <View style={styles.timeChipLeft}>
                  <Clock size={14} color="#2563EB" />
                  <View>
                    <Text style={[styles.timeChipLabel, { color: subTextColor }]}>
                      To
                    </Text>
                    <Text style={[styles.timeChipValue, { color: textColor }]}>
                      {formatDisplayTime(end)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Error message */}
        {Boolean(errorMessage) && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        {/* Bottom Action Bar */}
        <View style={[styles.footerRow, { borderTopColor: dividerColor }]}>
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
            ]}
            onPress={handleClose}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, { color: subTextColor }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: '#2563EB', opacity: saving ? 0.7 : 1 },
            ]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.saveBtnText}>Apply for Today</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* DateTime Picker Modal / Native Element */}
        {pickerField && (
          <DateTimePicker
            value={timeStringToDate(pickerField === 'start' ? start : end)}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    zIndex: 1000,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 18,
    elevation: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  titleBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  statusToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 10,
  },
  statusToggleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  statusToggleSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  presetCard: {
    flex: 1,
    padding: 9,
    borderRadius: 12,
    borderWidth: 1.2,
    gap: 2,
  },
  presetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  presetIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetCheckDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetTitle: {
    fontSize: 11.5,
  },
  presetSub: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  timePickersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timeChip: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeChipLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  timeChipValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  toSeparator: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 11.5,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
