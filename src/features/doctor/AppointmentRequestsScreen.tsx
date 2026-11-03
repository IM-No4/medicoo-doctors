import { palette } from '../../theme/palette';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Inbox,
  MessageCircle,
  Phone,
  Search,
  Video,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { RootState } from '../../redux/store';
import {
  getDoctorAppointmentRequests,
  respondToAppointmentRequest,
} from '../../services/api/doctor.api';
import { accent } from '../../theme/accents';
import { useTheme } from '../../theme/ThemeContext';
import SlowInternetLoader from '../../components/network/SlowInternetLoader';

type TabKey = 'requests' | 'upcoming' | 'history';

type AppointmentRequestItem = {
  requestId: string;
  preferredDate?: string;
  preferredTime?: string;
  urgencyLevel?: string;
  reason?: string;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'cancelled'
    | 'completed'
    | 'expired'
    | 'no_show';
  expiryReason?: 'doctor_no_response' | 'patient_no_payment';
  noShowReason?: 'doctor_no_show' | 'patient_no_show' | 'mutual_no_show';
  patientDetails?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  doctorResponse?: {
    remarks?: string;
    respondedAt?: string;
  };
  consultationType?: 'chat' | 'voice' | 'video';
  consultationFee?: number;
  isUrgentSurcharge?: boolean;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  createdOn?: string;
  updatedOn?: string;
  actionMeta?: {
    patientName?: string;
  };
  // Present when it was booked by someone else for this patient (a family member)
  booking?: { bookedForSelf: boolean; bookedBy?: { name: string } | null; patientRelation?: string } | null;
  rescheduleRequest?: {
    status: 'pending' | 'accepted' | 'rejected';
    proposedDate?: string;
    proposedTime?: string;
  } | null;
};

const isAwaitingReschedule = (item: AppointmentRequestItem) =>
  item.rescheduleRequest?.status === 'pending';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'requests', label: 'Requests' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'history', label: 'History' },
];

const STATUS_CONFIG: Record<
  AppointmentRequestItem['status'],
  { label: string; lightBg: string; darkBg: string; fg: string }
> = {
  pending: {
    label: 'Pending',
    lightBg: palette.amber100,
    darkBg: palette.hex2E2210,
    fg: palette.amber600,
  },
  approved: {
    label: 'Confirmed',
    lightBg: palette.primaryTint,
    darkBg: palette.navyMint,
    fg: palette.primary,
  },
  rejected: {
    label: 'Declined',
    lightBg: palette.red50,
    darkBg: palette.hex2A1417,
    fg: palette.red500,
  },
  cancelled: {
    label: 'Cancelled',
    lightBg: palette.slate100,
    darkBg: palette.navyText,
    fg: palette.slate500,
  },
  completed: {
    label: 'Completed',
    lightBg: palette.blue50,
    darkBg: palette.navyText,
    fg: palette.blue500,
  },
  expired: {
    label: 'Expired',
    lightBg: palette.slate100,
    darkBg: palette.navyText,
    fg: palette.slate500,
  },
  no_show: {
    label: 'Missed',
    lightBg: palette.red50,
    darkBg: palette.hex2A1417,
    fg: palette.red500,
  },
};

const formatDate = (value?: string) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const formatSingleTime = (timeStr: string): string => {
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // If already contains AM or PM
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  // Check if it's HH:mm or HH:mm:ss
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    if (isNaN(hours)) return trimmed;

    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;

    return `${hours}:${minutes} ${period}`;
  }

  // Check if it's a full ISO date string
  if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.length > 10)) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  return trimmed;
};

const formatTime = (value?: string) => {
  if (!value) return 'Time not set';

  // Check if it is a range like "14:00 - 14:30" or "14:00-14:30"
  if (value.includes('-') && !value.includes('T')) {
    const parts = value.split('-');
    if (parts.length === 2 && (parts[0].includes(':') || parts[1].includes(':'))) {
      return `${formatSingleTime(parts[0])} - ${formatSingleTime(parts[1])}`;
    }
  }

  return formatSingleTime(value) || value;
};

export default function AppointmentRequestsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme, isDark } = useTheme();
  const initialTab = (route.params?.initialTab as TabKey) || 'requests';

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [requests, setRequests] = useState<AppointmentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Backend still rejects an approve attempt either way (the inline check
  // in respondToAppointmentRequest, customerController.js) - this just
  // avoids the generic "Action failed" toast when the real reason is
  // maintenance. Declining stays allowed unconditionally.
  const maintenance = useSelector((state: RootState) => state.appConfig.maintenance);
  const isApprovingPaused = Boolean(maintenance?.enabled);

  const [status, setStatus] = useState<{
    visible: boolean;
    type: StatusType;
    title: string;
    message: string;
    primaryAction?: () => void;
    primaryActionText?: string;
  }>({
    visible: false,
    type: 'idle',
    title: '',
    message: '',
  });

  const bgColor = theme.inset;
  const cardBg = theme.card;
  const cardBorder = theme.card;
  const textColor = theme.text;
  const subTextColor = theme.textSecondary;
  const dividerColor = theme.cardSecondary;
  const iconColor = theme.textSecondary;
  const neutralTileBg = theme.cardSecondary;
  const A = { green: accent('green', isDark), blue: accent('blue', isDark), violet: accent('violet', isDark), sky: accent('sky', isDark), amber: accent('amber', isDark) };

  useEffect(() => {
    RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor(bgColor, true);
      RNStatusBar.setTranslucent(false);
      if (isDark) {
        NavigationBar.setBackgroundColorAsync(palette.navyDeep);
        NavigationBar.setButtonStyleAsync('light');
      } else {
        NavigationBar.setBackgroundColorAsync(palette.hexEFF2F6);
        NavigationBar.setButtonStyleAsync('dark');
      }
    }
  }, [isDark, bgColor]);

  const showStatus = useCallback(
    (
      type: StatusType,
      title: string,
      message: string,
      primaryAction?: () => void,
      primaryActionText?: string
    ) => {
      setStatus({
        visible: true,
        type,
        title,
        message,
        primaryAction,
        primaryActionText,
      });
    },
    []
  );

  const hideStatus = useCallback(() => {
    setStatus((prev) => ({ ...prev, visible: false }));
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const response = await getDoctorAppointmentRequests({
        status: 'all',
        limit: 200,
      });
      setRequests(response?.data?.requests || []);
    } catch {
      setRequests([]);
      showStatus(
        'error',
        'Unable to load requests',
        'We could not fetch appointment requests right now.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showStatus]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadRequests();
    }, [loadRequests])
  );

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'pending' || isAwaitingReschedule(item)) {
          acc.pending += 1;
        } else if (item.status === 'approved') {
          acc.approved += 1;
        } else {
          acc.history += 1;
        }
        return acc;
      },
      {
        total: 0,
        pending: 0,
        approved: 0,
        history: 0,
      }
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const base = requests.filter((item) => {
      const awaitingReschedule = isAwaitingReschedule(item);
      const matchesTab =
        activeTab === 'requests'
          ? item.status === 'pending' || awaitingReschedule
          : activeTab === 'upcoming'
          ? item.status === 'approved'
          : [
              'rejected',
              'cancelled',
              'completed',
              'expired',
              'no_show',
            ].includes(item.status) && !awaitingReschedule;

      if (!matchesTab) return false;
      if (!query) return true;

      const patientName =
        item.patientDetails?.name || item.actionMeta?.patientName || '';
      return [patientName, item.requestId, item.reason].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      );
    });

    return base.sort((a, b) =>
      String(b.createdOn || '').localeCompare(String(a.createdOn || ''))
    );
  }, [activeTab, requests, searchText]);

  const openDetails = useCallback(
    (item: AppointmentRequestItem) => {
      navigation.navigate('PatientConsultationDetail', { appointment: item });
    },
    [navigation]
  );

  const handleRespond = useCallback(
    (item: AppointmentRequestItem, nextStatus: 'approved' | 'rejected') => {
      if (nextStatus === 'approved' && isApprovingPaused) {
        showStatus(
          'error',
          'Temporarily Unavailable',
          maintenance?.message || "We're performing scheduled maintenance. Please try again shortly."
        );
        return;
      }
      showStatus(
        nextStatus === 'approved' ? 'info' : 'warning',
        nextStatus === 'approved' ? 'Approve request?' : 'Decline request?',
        nextStatus === 'approved'
          ? `Confirm appointment with ${
              item.patientDetails?.name ||
              item.actionMeta?.patientName ||
              'this patient'
            } for ${formatDate(item.preferredDate)} at ${formatTime(
              item.preferredTime
            )}?`
          : `Decline this request from ${
              item.patientDetails?.name ||
              item.actionMeta?.patientName ||
              'this patient'
            }?`,
        async () => {
          try {
            setBusyId(item.requestId);
            await respondToAppointmentRequest({
              requestId: item.requestId,
              status: nextStatus,
            });
            await loadRequests();
            showStatus(
              'success',
              nextStatus === 'approved'
                ? 'Request Confirmed'
                : 'Request Declined',
              nextStatus === 'approved'
                ? 'Appointment scheduled and moved to your upcoming list.'
                : 'The patient has been notified.'
            );
          } catch {
            showStatus(
              'error',
              'Action failed',
              'We could not update this request. Please try again.'
            );
          } finally {
            setBusyId(null);
          }
        },
        nextStatus === 'approved' ? 'Confirm' : 'Decline'
      );
    },
    [loadRequests, showStatus, isApprovingPaused, maintenance]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadRequests();
  }, [loadRequests]);

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  const renderItem = ({ item }: { item: AppointmentRequestItem }) => {
    const awaitingReschedule = isAwaitingReschedule(item);
    const config = awaitingReschedule
      ? {
          label: 'Reschedule Requested',
          lightBg: palette.blue50,
          darkBg: palette.hex1E2D4A,
          fg: palette.blue600,
        }
      : STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

    const patientName =
      item.patientDetails?.name || item.actionMeta?.patientName || 'Patient';
    const isPending = item.status === 'pending';
    const type = item.consultationType || 'video';

    return (
      <TouchableOpacity
        style={[
          styles.appointmentCard,
          { backgroundColor: cardBg, borderColor: cardBorder },
        ]}
        activeOpacity={0.7}
        onPress={() => openDetails(item)}
      >
        {/* Top Header: Avatar + Patient Name + Status Pill */}
        <View style={styles.cardTopRow}>
          <View style={styles.avatarWrapper}>
            <View
              style={[
                styles.patientAvatarCircle,
                { backgroundColor: A.blue.bg },
              ]}
            >
              <Text
                style={[
                  styles.patientAvatarLetter,
                  { color: A.blue.fg },
                ]}
              >
                {patientName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.patientInfoCol}>
            <Text
              style={[styles.patientNameText, { color: textColor }]}
              numberOfLines={1}
            >
              {patientName}
            </Text>
            {item.booking && !item.booking.bookedForSelf ? (
              <Text style={{ fontSize: 11, fontWeight: '700', color: iconColor, marginBottom: 2 }} numberOfLines={1}>
                Booked by {item.booking.bookedBy?.name || 'a family member'}
              </Text>
            ) : null}

            <View style={styles.consultModeRow}>
              {type === 'video' && <Video size={13} color={A.sky.fg} />}
              {type === 'voice' && <Phone size={13} color={A.sky.fg} />}
              {type === 'chat' && <MessageCircle size={13} color={A.sky.fg} />}
              <Text style={[styles.consultModeLabel, { color: subTextColor }]}>
                {type === 'video'
                  ? 'Video Call'
                  : type === 'voice'
                  ? 'Voice Call'
                  : 'Chat Session'}
              </Text>
              {typeof item.consultationFee === 'number' && (
                <>
                  <Text style={[styles.dotSeparator, { color: subTextColor }]}>
                    •
                  </Text>
                  <Text style={[styles.feeText, { color: subTextColor }]}>
                    ₹{item.consultationFee}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Status Badge */}
          <View
            style={[
              styles.statusPillBadge,
              {
                backgroundColor: isDark ? config.darkBg : config.lightBg,
              },
            ]}
          >
            <Text style={[styles.statusPillBadgeText, { color: config.fg }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Schedule Strip */}
        <View
          style={[
            styles.scheduleStrip,
            { backgroundColor: theme.background },
          ]}
        >
          <View style={styles.scheduleItem}>
            <Calendar size={14} color={A.blue.fg} />
            <Text style={[styles.scheduleDateText, { color: textColor }]}>
              {formatDate(item.preferredDate)}
            </Text>
          </View>

          <View style={styles.scheduleItem}>
            <Clock size={14} color={A.blue.fg} />
            <Text style={[styles.scheduleTimeText, { color: textColor }]}>
              {formatTime(item.preferredTime)}
            </Text>
          </View>
        </View>

        {/* Reason / Symptoms (if any) */}
        {Boolean(item.reason) && (
          <Text
            style={[styles.reasonQuoteText, { color: subTextColor }]}
            numberOfLines={2}
          >
            "{item.reason}"
          </Text>
        )}

        {/* Action Buttons for Pending Requests */}
        {isPending && !awaitingReschedule && (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.declineBtn,
                {
                  backgroundColor: theme.errorBg,
                  borderColor: theme.errorBorder,
                },
              ]}
              onPress={() => handleRespond(item, 'rejected')}
              disabled={busyId === item.requestId}
              activeOpacity={0.7}
            >
              {busyId === item.requestId ? (
                <ActivityIndicator size="small" color={palette.red500} />
              ) : (
                <>
                  <X size={15} color={palette.red500} />
                  <Text style={styles.declineBtnText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, isApprovingPaused && styles.acceptBtnPaused]}
              onPress={() => handleRespond(item, 'approved')}
              disabled={busyId === item.requestId}
              activeOpacity={0.8}
            >
              {busyId === item.requestId ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <>
                  <Check size={15} color={palette.white} strokeWidth={2.5} />
                  <Text style={styles.acceptBtnText}>{isApprovingPaused ? 'Unavailable' : 'Confirm'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {awaitingReschedule && (
          <TouchableOpacity
            style={styles.rescheduleActionBtn}
            onPress={() => openDetails(item)}
            activeOpacity={0.8}
          >
            <Clock size={15} color={palette.white} />
            <Text style={styles.rescheduleActionBtnText}>
              Respond to Reschedule
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const emptyState = useMemo(() => {
    if (loading) {
      return (
        <SlowInternetLoader
          isLoading={loading}
          message="Fetching consultation appointments..."
          onRetry={loadRequests}
          style={{ paddingVertical: 48 }}
        />
      );
    }

    const activeLabel = TABS.find((t) => t.key === activeTab)?.label || '';

    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIconCircle,
            { backgroundColor: theme.card },
          ]}
        >
          <Inbox size={26} color={iconColor} />
        </View>
        <Text style={[styles.emptyTitle, { color: textColor }]}>
          No {activeLabel.toLowerCase()}
        </Text>
        <Text style={[styles.emptySubtitle, { color: subTextColor }]}>
          {activeTab === 'requests'
            ? 'New consultation requests from patients will appear here.'
            : activeTab === 'upcoming'
            ? 'Your confirmed upcoming consultations will appear here.'
            : 'Completed and past appointments will be saved here.'}
        </Text>
      </View>
    );
  }, [activeTab, loading, isDark, textColor, subTextColor]);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Clean Top Header with Integrated Search ═══ */}
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
            if (isSearchOpen) {
              setIsSearchOpen(false);
              setSearchText('');
            } else if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('DoctorDashboard');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>

        {isSearchOpen ? (
          <View
            style={[
              styles.headerSearchWrapper,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
              },
            ]}
          >
            <Search size={15} color={subTextColor} />
            <TextInput
              autoFocus
              style={[styles.headerSearchInput, { color: textColor }]}
              placeholder="Search patient or reason..."
              placeholderTextColor={subTextColor}
              value={searchText}
              onChangeText={setSearchText}
            />
            {Boolean(searchText) && (
              <TouchableOpacity
                onPress={() => setSearchText('')}
                activeOpacity={0.7}
              >
                <X size={15} color={subTextColor} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={[styles.screenHeaderTitle, { color: textColor }]}>
            Appointments
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.roundBackBtn,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
            },
          ]}
          onPress={() => {
            if (isSearchOpen) {
              setIsSearchOpen(false);
              setSearchText('');
            } else {
              setIsSearchOpen(true);
            }
          }}
          activeOpacity={0.7}
        >
          {isSearchOpen ? (
            <X size={18} color={textColor} />
          ) : (
            <Search size={18} color={iconColor} />
          )}
        </TouchableOpacity>
      </View>

      {/* ═══ Appointments List with Integrated Filter Header ═══ */}
      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.requestId}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.listHeaderRow}>
            {TABS.map(({ key, label }) => {
              const isActive = activeTab === key;
              const count =
                key === 'requests'
                  ? counts.pending
                  : key === 'upcoming'
                  ? counts.approved
                  : counts.history;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive
                        ? palette.primary
                        : cardBg,
                      borderColor: isActive
                        ? palette.primary
                        : cardBorder,
                    },
                  ]}
                  onPress={() => setActiveTab(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isActive ? palette.white : subTextColor,
                        fontWeight: isActive ? '700' : '600',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  {count > 0 && (
                    <View
                      style={[
                        styles.chipBadge,
                        {
                          backgroundColor: isActive
                            ? palette.whiteA25
                            : isDark
                            ? palette.navyCard
                            : palette.slate100,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipBadgeText,
                          {
                            color: isActive ? palette.white : subTextColor,
                          },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        }
        contentContainerStyle={
          filteredRequests.length === 0
            ? styles.emptyListContent
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
        ListEmptyComponent={emptyState}
        showsVerticalScrollIndicator={false}
      />

      <StatusModal
        visible={status.visible}
        status={status.type}
        title={status.title}
        message={status.message}
        onClose={hideStatus}
        primaryAction={status.primaryAction}
        primaryActionText={status.primaryActionText}
        autoCloseDelay={status.type === 'success' ? 2500 : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
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

  // ═══ Header Search ═══
  headerSearchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    paddingVertical: 0,
  },

  // ═══ List Header Filter Chips ═══
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    paddingBottom: 14,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // ═══ List & Cards ═══
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  emptyListContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  appointmentCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {},
  patientAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarLetter: {
    fontSize: 16,
    fontWeight: '800',
  },
  patientInfoCol: {
    flex: 1,
  },
  patientNameText: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  consultModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  consultModeLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  dotSeparator: {
    fontSize: 12,
  },
  feeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusPillBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // ═══ Schedule Strip ═══
  scheduleStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleDateText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  scheduleTimeText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  reasonQuoteText: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 10,
    fontStyle: 'italic',
  },

  // ═══ Action Buttons ═══
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  declineBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.red500,
  },
  acceptBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptBtnPaused: {
    backgroundColor: palette.gray400,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.white,
  },
  rescheduleActionBtn: {
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.blue600,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  rescheduleActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.white,
  },

  // ═══ Empty State ═══
  centerLoadingState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
});
