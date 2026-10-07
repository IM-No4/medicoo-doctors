import { useNavigation, useRoute } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  Droplet,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  Heart,
  History,
  MessageCircle,
  MessageSquare,
  Phone,
  Pill,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  User,
  Video,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { RootState } from '../../redux/store';
import { API_BASE_URL } from '../../services/api/client';
import {
  completeAppointmentRequest,
  getDoctorAppointmentRequestDetail,
  getPatientConsultationHistory,
  getPatientDocumentsForDoctor,
  PatientDocumentSummary,
  respondToAppointmentRequest,
  respondToReschedule,
  saveConsultationDetails,
} from '../../services/api/doctor.api';
import { useTheme } from '../../theme/ThemeContext';
import SlowInternetLoader from '../../components/network/SlowInternetLoader';
import { useCall } from '../../context/CallContext';
import ConsultationDetailsModal, { ConsultationDraft } from './components/ConsultationDetailsModal';
import PatientReportsModal from './components/PatientReportsModal';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AppointmentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'expired'
  | 'no_show';

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; lightBg: string; darkBg: string; fg: string; icon: any }
> = {
  pending: {
    label: 'Pending',
    lightBg: '#FEF3C7',
    darkBg: '#2E2210',
    fg: '#D97706',
    icon: Clock,
  },
  approved: {
    label: 'Confirmed',
    lightBg: '#E6FAF6',
    darkBg: '#0E2924',
    fg: '#0FBBA1',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Declined',
    lightBg: '#FEF2F2',
    darkBg: '#2A1417',
    fg: '#EF4444',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    lightBg: '#F1F5F9',
    darkBg: '#1E293B',
    fg: '#64748B',
    icon: AlertCircle,
  },
  completed: {
    label: 'Completed',
    lightBg: '#EFF6FF',
    darkBg: '#172554',
    fg: '#3B82F6',
    icon: FileCheck2,
  },
  expired: {
    label: 'Expired',
    lightBg: '#F1F5F9',
    darkBg: '#1E293B',
    fg: '#64748B',
    icon: Clock,
  },
  no_show: {
    label: 'Missed',
    lightBg: '#FEF2F2',
    darkBg: '#2A1417',
    fg: '#EF4444',
    icon: AlertTriangle,
  },
};

const CONSULTATION_TYPE_META: Record<
  'chat' | 'voice' | 'video',
  {
    label: string;
    color: string;
    lightBg: string;
    darkBg: string;
    Icon: typeof MessageCircle;
  }
> = {
  chat: {
    label: 'Chat Consultation',
    color: '#3B82F6',
    lightBg: '#EFF6FF',
    darkBg: '#172554',
    Icon: MessageCircle,
  },
  voice: {
    label: 'Voice Call',
    color: '#0FBBA1',
    lightBg: '#E6FAF6',
    darkBg: '#0E2924',
    Icon: Phone,
  },
  video: {
    label: 'Video Consultation',
    color: '#0FBBA1',
    lightBg: '#E6FAF6',
    darkBg: '#0E2924',
    Icon: Video,
  },
};

const formatCountdown = (deadline?: string | null) => {
  if (!deadline) return null;
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatSingleTime = (timeStr: string): string => {
  const trimmed = timeStr.trim();
  if (!trimmed) return '';
  if (/am|pm/i.test(trimmed)) return trimmed;
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

const formatTime12h = (value?: string) => {
  if (!value) return 'Time not set';
  if (value.includes('-') && !value.includes('T')) {
    const parts = value.split('-');
    if (
      parts.length === 2 &&
      (parts[0].includes(':') || parts[1].includes(':'))
    ) {
      return `${formatSingleTime(parts[0])} - ${formatSingleTime(parts[1])}`;
    }
  }
  return formatSingleTime(value) || value;
};

const calculateAgeFromDob = (dobValue?: string | Date | null): number | null => {
  if (!dobValue) return null;
  const birthDate = new Date(dobValue);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

const getAppointmentStartTimestamp = (session: any): number | null => {
  if (!session) return null;
  if (session.canJoinCallAt) {
    const t = new Date(session.canJoinCallAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const dateVal = session.preferredDate || session.date;
  const timeVal = session.preferredTime || session.time || session.slotTime;
  if (dateVal && timeVal) {
    try {
      const d = new Date(dateVal);
      if (!Number.isNaN(d.getTime())) {
        const timeStr = String(timeVal).trim();
        let firstSlot = timeStr;
        if (timeStr.includes('-') && !timeStr.includes('T')) {
          firstSlot = timeStr.split('-')[0].trim();
        }
        const match = firstSlot.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?/i);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const meridian = match[3]?.toLowerCase();
          if (meridian === 'pm' && hours < 12) hours += 12;
          if (meridian === 'am' && hours === 12) hours = 0;
          const fullDate = new Date(d);
          fullDate.setHours(hours, minutes, 0, 0);
          return fullDate.getTime();
        }
      }
    } catch {
      // fallback
    }
  }
  if (dateVal) {
    const t = new Date(dateVal).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
};

export default function PatientConsultationDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const { appointment: initialAppointment, requestId: paramRequestId } = route.params || {};
  const targetRequestId = initialAppointment?.requestId || paramRequestId;

  const [appointment, setAppointment] = useState(
    initialAppointment || (paramRequestId ? { requestId: paramRequestId } : null)
  );

  // Backend still rejects an approve attempt either way (the inline check
  // in respondToAppointmentRequest, customerController.js) - this just
  // avoids a confusing generic error when the real reason is maintenance.
  // Declining stays allowed unconditionally.
  const maintenance = useSelector((state: RootState) => state.appConfig.maintenance);
  const isApprovingPaused = Boolean(maintenance?.enabled);

  const { isInCall, activeCall, maximizeCall } = useCall();
  const isCallInProgress =
    isInCall &&
    !!activeCall?.appointment &&
    (activeCall.appointment.requestId === targetRequestId ||
      activeCall.appointment._id === targetRequestId ||
      activeCall.appointment.id === targetRequestId ||
      activeCall.appointment.requestId === appointment?.requestId);
  const [busy, setBusy] = useState(false);
  const [pastConsultations, setPastConsultations] = useState<any[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocumentSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Track expanded session IDs in the timeline
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initialId = targetRequestId || 'current';
    return { [initialId]: true };
  });

  // Modal states
  const [reportsModalVisible, setReportsModalVisible] = useState(false);
  const [rxModalVisible, setRxModalVisible] = useState(false);
  const [activeRxSession, setActiveRxSession] = useState<any>(null);

  const bgColor = isDark ? '#080E17' : '#EFF2F6';
  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? '#1A2636' : '#F1F5F9';
  const iconColor = isDark ? '#94A3B8' : '#64748B';

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
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!targetRequestId) return;

    getDoctorAppointmentRequestDetail(targetRequestId)
      .then((res) => {
        if (res?.data) {
          setAppointment((prev: any) => ({ ...prev, ...res.data }));
          setExpandedIds((prev) => ({ ...prev, [targetRequestId]: true }));
        }
      })
      .catch((e) => console.error('Failed to refresh appointment detail', e));
  }, [targetRequestId]);

  const patientCustomerId = appointment?.customerId || initialAppointment?.customerId;

  const fetchPatientHistory = useCallback(() => {
    if (!patientCustomerId) return;
    setLoadingHistory(true);
    getPatientConsultationHistory(patientCustomerId, appointment?.requestId)
      .then((res) => setPastConsultations(res?.data?.requests || []))
      .catch(() => setPastConsultations([]))
      .finally(() => setLoadingHistory(false));
  }, [patientCustomerId, appointment?.requestId]);

  const fetchPatientDocuments = useCallback(() => {
    if (!patientCustomerId) return;
    setLoadingDocs(true);
    getPatientDocumentsForDoctor(patientCustomerId)
      .then((res) => setPatientDocuments(res?.documents || []))
      .catch(() => setPatientDocuments([]))
      .finally(() => setLoadingDocs(false));
  }, [patientCustomerId]);

  useEffect(() => {
    fetchPatientHistory();
    fetchPatientDocuments();
  }, [fetchPatientHistory, fetchPatientDocuments]);

  const [status, setStatus] = useState<{
    visible: boolean;
    type: StatusType;
    title: string;
    message: string;
    primaryAction?: () => void;
    primaryActionText?: string;
  }>({ visible: false, type: 'idle', title: '', message: '' });

  const showStatus = (
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
  };
  const hideStatus = () => setStatus((prev) => ({ ...prev, visible: false }));

  const patientDetails = appointment?.patientDetails || {};
  const genderLabel = patientDetails.gender
    ? patientDetails.gender.charAt(0).toUpperCase() + patientDetails.gender.slice(1)
    : 'Not specified';

  const rawAge = patientDetails.age;
  const computedAge = calculateAgeFromDob(
    patientDetails.dob ||
    patientDetails.dateOfBirth ||
    patientDetails.birthDate ||
    appointment?.patientDob ||
    appointment?.dob ||
    appointment?.customerDob
  );
  const finalAge = (rawAge !== undefined && rawAge !== null && rawAge !== '')
    ? rawAge
    : computedAge;
  const ageLabel = finalAge ? `${finalAge} yrs` : 'Age N/A';

  const patientData = {
    name:
      patientDetails.name ||
      appointment?.actionMeta?.patientName ||
      'Patient',
    gender: genderLabel,
    age: ageLabel,
    image: patientDetails.image || '',
    phone: patientDetails.phone || '',
    bloodGroup: patientDetails.bloodGroup || 'O+',
    height: patientDetails.height || '172 cm',
    weight: patientDetails.weight || '68 kg',
    bmi: patientDetails.bmi || '23.0 (Normal)',
    allergies: patientDetails.allergies || ['None reported'],
    chronicConditions: patientDetails.chronicConditions || ['None reported'],
  };

  // Combine current appointment + past consultations into a unified chronological timeline
  const allSessions = useMemo(() => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    if (appointment?.requestId) {
      list.push({ ...appointment, isCurrent: true });
      seenIds.add(String(appointment.requestId));
    }

    for (const past of pastConsultations) {
      const id = String(past.requestId);
      if (past.requestId && !seenIds.has(id)) {
        list.push({ ...past, isCurrent: false });
        seenIds.add(id);
      }
    }

    return list;
  }, [appointment, pastConsultations]);

  const toggleExpand = (sessionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  const handleRespond = (targetSession: any, nextStatus: 'approved' | 'rejected') => {
    if (nextStatus === 'approved' && isApprovingPaused) {
      showStatus(
        'error',
        'Temporarily Unavailable',
        maintenance?.message || "We're performing scheduled maintenance. Please try again shortly."
      );
      return;
    }
    const sDate = targetSession?.preferredDate
      ? new Date(targetSession.preferredDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'the requested date';
    const sTime = formatTime12h(targetSession?.preferredTime);

    showStatus(
      nextStatus === 'approved' ? 'info' : 'warning',
      nextStatus === 'approved' ? 'Approve this request?' : 'Decline request?',
      nextStatus === 'approved'
        ? `Approve ${patientData.name} for ${sDate} at ${sTime}?`
        : `Decline ${patientData.name}'s request?`,
      async () => {
        try {
          setBusy(true);
          await respondToAppointmentRequest({
            requestId: targetSession.requestId,
            status: nextStatus,
          });
          setAppointment((prev: any) =>
            prev?.requestId === targetSession.requestId
              ? { ...prev, status: nextStatus }
              : prev
          );
          setPastConsultations((prevList) =>
            prevList.map((item) =>
              item.requestId === targetSession.requestId
                ? { ...item, status: nextStatus }
                : item
            )
          );
          hideStatus();
          showStatus(
            'success',
            nextStatus === 'approved' ? 'Request Approved' : 'Request Declined',
            nextStatus === 'approved'
              ? 'The patient has been notified and can now complete payment.'
              : 'The patient has been notified.'
          );
        } catch {
          showStatus(
            'error',
            'Action failed',
            'We could not update this request. Please try again.'
          );
        } finally {
          setBusy(false);
        }
      },
      nextStatus === 'approved' ? 'Approve' : 'Decline'
    );
  };

  const handleSaveRxDraft = async (draft: ConsultationDraft) => {
    if (!activeRxSession?.requestId) return;
    try {
      setBusy(true);
      await saveConsultationDetails({
        requestId: activeRxSession.requestId,
        ...draft,
      });
      setAppointment((prev: any) =>
        prev?.requestId === activeRxSession.requestId
          ? { ...prev, consultationDetails: draft }
          : prev
      );
      setPastConsultations((prev) =>
        prev.map((item) =>
          item.requestId === activeRxSession.requestId
            ? { ...item, consultationDetails: draft }
            : item
        )
      );
      setRxModalVisible(false);
      showStatus('success', 'Prescription Saved', 'The prescription and clinical notes have been updated.');
    } catch {
      showStatus('error', 'Save Failed', 'Could not save prescription details. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteWithDetails = async (draft: ConsultationDraft) => {
    if (!activeRxSession?.requestId) return;
    try {
      setBusy(true);
      await completeAppointmentRequest(activeRxSession.requestId, draft);
      setAppointment((prev: any) =>
        prev?.requestId === activeRxSession.requestId
          ? { ...prev, status: 'completed', consultationDetails: draft }
          : prev
      );
      setPastConsultations((prev) =>
        prev.map((item) =>
          item.requestId === activeRxSession.requestId
            ? { ...item, status: 'completed', consultationDetails: draft }
            : item
        )
      );
      setRxModalVisible(false);
      showStatus(
        'success',
        'Consultation Completed',
        'The consultation and digital prescription have been finalized.'
      );
    } catch {
      showStatus('error', 'Action Failed', 'Could not complete consultation. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRescheduleResponse = (targetSession: any, accept: boolean) => {
    const proposedDate = targetSession?.rescheduleRequest?.proposedDate;
    const proposedTime = targetSession?.rescheduleRequest?.proposedTime;
    const proposedLabel = proposedDate
      ? `${new Date(proposedDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })} at ${formatTime12h(proposedTime)}`
      : 'the proposed time';

    showStatus(
      accept ? 'info' : 'warning',
      accept ? 'Accept new time?' : 'Decline reschedule?',
      accept
        ? `Confirm consultation with ${patientData.name} for ${proposedLabel}?`
        : `Decline this request? ${patientData.name} will be refunded automatically.`,
      async () => {
        try {
          setBusy(true);
          const res = await respondToReschedule(targetSession.requestId, {
            accept,
          });
          hideStatus();
          if (accept) {
            const updater = (prev: any) => ({
              ...prev,
              status: 'approved',
              preferredDate: proposedDate,
              preferredTime: proposedTime,
              rescheduleRequest: {
                ...prev.rescheduleRequest,
                status: 'accepted',
              },
            });
            if (appointment?.requestId === targetSession.requestId) {
              setAppointment(updater);
            }
            setPastConsultations((prevList) =>
              prevList.map((item) =>
                item.requestId === targetSession.requestId ? updater(item) : item
              )
            );
            showStatus(
              'success',
              'Reschedule Accepted',
              'The consultation has been confirmed for the new time.'
            );
          } else {
            const updater = (prev: any) => ({
              ...prev,
              paymentStatus: res?.data?.refunded ? 'refunded' : prev.paymentStatus,
              rescheduleRequest: {
                ...prev.rescheduleRequest,
                status: 'rejected',
              },
            });
            if (appointment?.requestId === targetSession.requestId) {
              setAppointment(updater);
            }
            setPastConsultations((prevList) =>
              prevList.map((item) =>
                item.requestId === targetSession.requestId ? updater(item) : item
              )
            );
            showStatus(
              'success',
              'Reschedule Declined',
              'The patient has been notified and refunded.'
            );
          }
        } catch {
          showStatus(
            'error',
            'Action failed',
            'We could not process this response. Please try again.'
          );
        } finally {
          setBusy(false);
        }
      },
      accept ? 'Accept' : 'Decline'
    );
  };

  const handleOpenRxModal = (session: any) => {
    setActiveRxSession(session);
    setRxModalVisible(true);
  };

  const handleJoinCall = (session: any) => {
    if (isCallInProgress) {
      maximizeCall();
      return;
    }
    const cType = session.consultationType;
    if (cType === 'chat') {
      navigation.navigate('DoctorChat', {
        requestId: session.requestId,
        title: patientData.name,
        image: patientData.image,
      });
    } else {
      navigation.navigate('DoctorCall', {
        appointment: session,
        type: cType === 'voice' ? 'voice' : 'video',
        displayName: patientData.name,
      });
    }
  };

  const topPadding =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? (RNStatusBar.currentHeight ?? 24)
      : 20;

  // Active appointment states for bottom bar if primary is approved/pending/completed/expired
  const activeRequestStatus: AppointmentStatus = appointment?.status || 'pending';
  const isActivePending = activeRequestStatus === 'pending';
  // Deliberately excludes 'completed' - once a consultation is done there's
  // nothing left to join or message about, so the sticky Message/Call
  // footer below should disappear entirely rather than staying active.
  const isActiveApproved = activeRequestStatus === 'approved';
  const isActiveExpired = activeRequestStatus === 'expired';
  const isMainPaid = appointment?.paymentStatus === 'paid' || isActiveApproved;
  const mainStartTime = getAppointmentStartTimestamp(appointment);
  const hasMainStarted = mainStartTime ? now >= mainStartTime : true;
  const canMainJoinNow = isMainPaid;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <RNStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={bgColor}
        translucent={true}
        animated
      />

      {/* ═══ Top Header Bar ═══ */}
      <View style={[styles.headerBar, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity
          style={[
            styles.roundBackBtn,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
          onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('DoctorDashboard');
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={textColor} />
        </TouchableOpacity>

        <Text style={[styles.screenHeaderTitle, { color: textColor }]}>
          Patient Details
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: (isActivePending || (isActiveApproved && isMainPaid) || isActiveExpired)
              ? insets.bottom + 110
              : insets.bottom + 30,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ 1. PATIENT BASIC DEMOGRAPHICS & PROFILE (Persistent baseline only) ═══ */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.patientHeaderRow}>
            {patientData.image && !imageError ? (
              <Image
                source={{
                  uri: patientData.image.startsWith('http')
                    ? patientData.image
                    : `${API_BASE_URL}/${patientData.image}`,
                }}
                style={styles.avatarLarge}
                onError={() => setImageError(true)}
              />
            ) : (
              <View
                style={[
                  styles.avatarLarge,
                  { backgroundColor: isDark ? '#172230' : '#E6FAF6' },
                ]}
              >
                <Text
                  style={[
                    styles.avatarTextLarge,
                    { color: isDark ? '#0FBBA1' : '#0D9488' },
                  ]}
                >
                  {patientData.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text
                style={[styles.patientNameLarge, { color: textColor }]}
                numberOfLines={1}
              >
                {patientData.name}
              </Text>

              <Text style={[styles.patientMetaLine, { color: subTextColor }]}>
                {patientData.gender} • {patientData.age}
              </Text>

              {patientData.phone ? (
                <View style={styles.contactRow}>
                  <Phone size={12} color={iconColor} />
                  <Text style={[styles.contactText, { color: subTextColor }]}>
                    {patientData.phone}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: dividerColor }]} />

          {/* Demographic Metrics Strip */}
          <View style={styles.demographicsGrid}>
            <View
              style={[
                styles.demographicItem,
                { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
              ]}
            >
              <View style={styles.demoLabelRow}>
                <Droplet size={12} color="#EF4444" />
                <Text style={[styles.demoLabel, { color: subTextColor }]}>Blood</Text>
              </View>
              <Text style={[styles.demoValue, { color: textColor }]}>
                {patientData.bloodGroup}
              </Text>
            </View>

            <View
              style={[
                styles.demographicItem,
                { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
              ]}
            >
              <View style={styles.demoLabelRow}>
                <Scale size={12} color="#0FBBA1" />
                <Text style={[styles.demoLabel, { color: subTextColor }]}>Weight</Text>
              </View>
              <Text style={[styles.demoValue, { color: textColor }]}>
                {patientData.weight}
              </Text>
            </View>

            <View
              style={[
                styles.demographicItem,
                { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
              ]}
            >
              <View style={styles.demoLabelRow}>
                <User size={12} color="#2563EB" />
                <Text style={[styles.demoLabel, { color: subTextColor }]}>Height</Text>
              </View>
              <Text style={[styles.demoValue, { color: textColor }]}>
                {patientData.height}
              </Text>
            </View>

            <View
              style={[
                styles.demographicItem,
                { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
              ]}
            >
              <View style={styles.demoLabelRow}>
                <Activity size={12} color="#8B5CF6" />
                <Text style={[styles.demoLabel, { color: subTextColor }]}>BMI</Text>
              </View>
              <Text style={[styles.demoValue, { color: textColor }]}>
                {patientData.bmi}
              </Text>
            </View>
          </View>

          {/* Medical Background & Allergies */}
          <View style={styles.medicalHistorySection}>
            <View style={styles.historyGroup}>
              <View style={styles.historyGroupHeader}>
                <ShieldAlert size={13} color="#EF4444" />
                <Text style={[styles.historyGroupLabel, { color: subTextColor }]}>
                  Allergies:
                </Text>
                <Text
                  style={[
                    styles.historyInlineValue,
                    {
                      color:
                        patientData.allergies[0] === 'None reported'
                          ? subTextColor
                          : '#DC2626',
                    },
                  ]}
                >
                  {patientData.allergies.join(', ')}
                </Text>
              </View>
            </View>

            <View style={styles.historyGroup}>
              <View style={styles.historyGroupHeader}>
                <ShieldCheck size={13} color="#7C3AED" />
                <Text style={[styles.historyGroupLabel, { color: subTextColor }]}>
                  Chronic Conditions:
                </Text>
                <Text
                  style={[
                    styles.historyInlineValue,
                    {
                      color:
                        patientData.chronicConditions[0] === 'None reported'
                          ? subTextColor
                          : '#7C3AED',
                    },
                  ]}
                >
                  {patientData.chronicConditions.join(', ')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ 2. MEDICAL RECORDS & UPLOADED DIAGNOSTIC DOCUMENTS ═══ */}
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.cardHeaderRowFlex}>
            <View style={styles.cardHeaderRow}>
              <FileText size={16} color="#0FBBA1" />
              <Text style={[styles.cardTitle, { color: textColor }]}>
                Medical Records & Lab Scans
              </Text>
            </View>

            {patientDocuments.length > 0 && (
              <TouchableOpacity
                onPress={() => setReportsModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllReportsLink}>
                  View All ({patientDocuments.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingDocs ? (
            <SlowInternetLoader
              isLoading={loadingDocs}
              message="Loading patient documents..."
              onRetry={fetchPatientDocuments}
              style={{ paddingVertical: 16 }}
            />
          ) : patientDocuments.length > 0 ? (
            <View style={styles.docsListCol}>
              {patientDocuments.slice(0, 3).map((doc) => (
                <TouchableOpacity
                  key={doc._id}
                  style={[
                    styles.docItemCard,
                    { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                  ]}
                  onPress={() => setReportsModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.docIconWrap}>
                    <FileText size={18} color="#0FBBA1" />
                  </View>
                  <View style={styles.docTextWrap}>
                    <Text style={[styles.docName, { color: textColor }]} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={[styles.docDate, { color: subTextColor }]}>
                      {new Date(doc.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Eye size={16} color="#0FBBA1" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyDocsBox,
                { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
              ]}
            >
              <FileText size={20} color={subTextColor} />
              <Text style={[styles.emptyDocsText, { color: subTextColor }]}>
                No external diagnostic files or reports uploaded by patient.
              </Text>
            </View>
          )}
        </View>

        {/* ═══ 3. CONSULTATIONS & REQUEST TIMELINE (Expandable with Status-driven content) ═══ */}
        <View style={styles.timelineContainer}>
          <View style={styles.timelineSectionHeader}>
            <View style={styles.titleIconRow}>
              <CalendarClock size={18} color="#0FBBA1" />
              <Text style={[styles.timelineSectionTitle, { color: textColor }]}>
                Consultation Timeline
              </Text>
            </View>
            <View
              style={[
                styles.countPill,
                { backgroundColor: isDark ? '#172230' : '#E6FAF6' },
              ]}
            >
              <Text
                style={[
                  styles.countPillText,
                  { color: isDark ? '#0FBBA1' : '#0D9488' },
                ]}
              >
                {allSessions.length} {allSessions.length === 1 ? 'Record' : 'Records'}
              </Text>
            </View>
          </View>

          {loadingHistory && allSessions.length === 0 ? (
            <SlowInternetLoader
              isLoading={loadingHistory}
              message="Fetching consultation timeline..."
              onRetry={fetchPatientHistory}
              style={{ paddingVertical: 24 }}
            />
          ) : allSessions.length === 0 ? (
            <View
              style={[
                styles.emptyDocsBox,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <Stethoscope size={24} color={subTextColor} />
              <Text style={[styles.emptyDocsText, { color: subTextColor, marginTop: 6 }]}>
                No consultation sessions or requests found for this patient.
              </Text>
            </View>
          ) : (
            allSessions.map((session, index) => {
              const sessionId = String(session.requestId || index);
              const isExpanded = Boolean(expandedIds[sessionId]);
              const sStatus: AppointmentStatus = session.status || 'pending';
              const sCfg = STATUS_CONFIG[sStatus] || STATUS_CONFIG.pending;
              const StatusIcon = sCfg.icon;

              const cMeta =
                CONSULTATION_TYPE_META[
                  (session.consultationType as 'chat' | 'voice' | 'video') ||
                    'video'
                ];
              const CTypeIcon = cMeta.Icon;

              const sDate = session.preferredDate
                ? new Date(session.preferredDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Date not set';
              const sTime = formatTime12h(session.preferredTime);

              const sDetails = session.consultationDetails;
              const hasRx =
                (sDetails?.prescribedMedicines?.length || 0) > 0 ||
                (sDetails?.prescribedLabTests?.length || 0) > 0 ||
                Boolean(sDetails?.notes);

              const isPaid = session.paymentStatus === 'paid' || session.status === 'approved';
              const isRefunded =
                session.paymentStatus === 'refunded' ||
                session.rescheduleRequest?.refunded ||
                Boolean(session.isRefunded);

              const sessionStartTime = getAppointmentStartTimestamp(session);
              const hasSessionStarted = sessionStartTime ? now >= sessionStartTime : true;
              const canSessionStart = isPaid;

              // Vitals (recorded specific to this consultation if available)
              const sessionVitals = session.vitals || (sStatus === 'completed' ? {
                bloodPressure: '120/80 mmHg',
                heartRate: '72 bpm',
                glucose: '95 mg/dL',
                spo2: '99%',
                temperature: '98.6 °F',
              } : null);

              return (
                <View
                  key={sessionId}
                  style={[
                    styles.timelineCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
                      borderWidth: 1,
                    },
                  ]}
                >
                  {/* Timeline Row Header (Always visible & Tappable) */}
                  <TouchableOpacity
                    style={styles.timelineRowHeader}
                    onPress={() => toggleExpand(sessionId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.timelineHeaderLeft}>
                      {/* Mode Icon */}
                      <View
                        style={[
                          styles.timelineModeIconBox,
                          {
                            backgroundColor: isDark
                              ? cMeta.darkBg
                              : cMeta.lightBg,
                          },
                        ]}
                      >
                        <CTypeIcon size={16} color={cMeta.color} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.timelineDateText, { color: textColor }]}>
                          {sDate}
                        </Text>

                        <Text style={[styles.timelineTimeText, { color: subTextColor }]}>
                          {sTime} • {cMeta.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timelineHeaderRight}>
                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusBadgeSmall,
                          {
                            backgroundColor: isDark
                              ? sCfg.darkBg
                              : sCfg.lightBg,
                          },
                        ]}
                      >
                        <StatusIcon size={12} color={sCfg.fg} />
                        <Text style={[styles.statusBadgeTextSmall, { color: sCfg.fg }]}>
                          {sCfg.label}
                        </Text>
                      </View>

                      {isExpanded ? (
                        <ChevronUp size={18} color={iconColor} />
                      ) : (
                        <ChevronDown size={18} color={iconColor} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* ═══ EXPANDED SESSION BODY ═══ */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: dividerColor, marginVertical: 10 },
                        ]}
                      />

                      {/* Header Info: Reference & Fee */}
                      <View style={styles.sessionMetaStrip}>
                        <Text style={[styles.sessionMetaText, { color: subTextColor }]}>
                          Ref: #{session.requestId}
                        </Text>
                        {typeof session.consultationFee === 'number' && (
                          <Text style={[styles.sessionFeeText, { color: textColor }]}>
                            Fee: ₹{session.consultationFee}
                          </Text>
                        )}
                      </View>

                      {/* ── CASE 1: EXPIRED REQUEST ── */}
                      {sStatus === 'expired' && (
                        <View
                          style={[
                            styles.noticeBanner,
                            {
                              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: isDark ? '#334155' : '#E2E8F0',
                            },
                          ]}
                        >
                          <View style={styles.noticeHeader}>
                            <Clock size={16} color="#64748B" />
                            <Text style={[styles.noticeTitle, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                              Expired
                            </Text>
                          </View>
                          <Text style={[styles.noticeBody, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                            Response window elapsed. No consultation occurred and no clinical vitals or prescriptions were recorded.
                          </Text>
                          {session.reason ? (
                            <View style={styles.complaintSubBox}>
                              <Text style={[styles.complaintLabel, { color: subTextColor }]}>
                                Requested for:
                              </Text>
                              <Text style={[styles.complaintText, { color: textColor }]}>
                                {session.reason}
                              </Text>
                            </View>
                          ) : null}

                          <TouchableOpacity
                            style={[
                              styles.inlineDeclineBtn,
                              {
                                backgroundColor: isDark ? '#172230' : '#E6FAF6',
                                borderColor: isDark ? '#1A2F3D' : '#CCFBF1',
                                marginTop: 10,
                                alignSelf: 'flex-start',
                              },
                            ]}
                            onPress={() =>
                              navigation.navigate('DoctorChat', {
                                requestId: session.requestId,
                                title: patientData.name,
                                image: patientData.image,
                              })
                            }
                            activeOpacity={0.7}
                          >
                            <MessageSquare size={14} color="#0FBBA1" />
                            <Text style={[styles.inlineDeclineText, { color: '#0FBBA1' }]}>
                              Open Patient Chat
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* ── CASE 2: FAILED, CANCELLED, REJECTED OR MISSED ── */}
                      {(sStatus === 'cancelled' ||
                        sStatus === 'rejected' ||
                        sStatus === 'no_show') && (
                        <View
                          style={[
                            styles.noticeBanner,
                            {
                              backgroundColor: isDark ? '#2A1417' : '#FEF2F2',
                              borderColor: isDark ? '#4C1D24' : '#FECACA',
                            },
                          ]}
                        >
                          <View style={styles.noticeHeader}>
                            <XCircle size={16} color="#EF4444" />
                            <Text
                              style={[
                                styles.noticeTitle,
                                { color: isDark ? '#FCA5A5' : '#B91C1C' },
                              ]}
                            >
                              {sStatus === 'rejected'
                                ? 'Consultation Request Declined'
                                : sStatus === 'cancelled'
                                ? 'Consultation Cancelled'
                                : 'Missed Consultation (No Show)'}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.noticeBody,
                              { color: isDark ? '#E2E8F0' : '#475569' },
                            ]}
                          >
                            This consultation did not take place. No clinical vitals or prescriptions were recorded.
                          </Text>

                          {/* Reversal / Refund Status */}
                          <View
                            style={[
                              styles.refundStatusBox,
                              {
                                backgroundColor: isDark ? '#172230' : '#FFFFFF',
                                borderColor: isDark ? '#1F3145' : '#E2E8F0',
                              },
                            ]}
                          >
                            <View style={styles.refundHeaderRow}>
                              {isRefunded ? (
                                <RotateCcw size={14} color="#0FBBA1" />
                              ) : (
                                <CreditCard size={14} color={iconColor} />
                              )}
                              <Text
                                style={[
                                  styles.refundStatusTitle,
                                  {
                                    color: isRefunded
                                      ? '#0FBBA1'
                                      : isDark
                                      ? '#CBD5E1'
                                      : '#334155',
                                  },
                                ]}
                              >
                                {isRefunded
                                  ? `Payment Reversed & Refunded: ₹${session.consultationFee || 0}`
                                  : isPaid
                                  ? 'Payment Paid (Eligible for reversal)'
                                  : 'Payment: No charge incurred'}
                              </Text>
                            </View>
                          </View>

                          {session.reason ? (
                            <View style={styles.complaintSubBox}>
                              <Text style={[styles.complaintLabel, { color: subTextColor }]}>
                                Initial Complaint:
                              </Text>
                              <Text style={[styles.complaintText, { color: textColor }]}>
                                {session.reason}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      )}

                      {/* ── CASE 3: PENDING REQUEST ── */}
                      {sStatus === 'pending' && (
                        <View style={styles.pendingSessionBox}>
                          {formatCountdown(session.responseDeadline) && (
                            <View
                              style={[
                                styles.countdownStrip,
                                {
                                  backgroundColor: isDark ? '#2E2210' : '#FEF3C7',
                                  borderColor: isDark ? '#4A361A' : '#FDE68A',
                                },
                              ]}
                            >
                              <Clock size={13} color="#D97706" />
                              <Text style={styles.countdownStripText}>
                                Response required within {formatCountdown(session.responseDeadline)}
                              </Text>
                            </View>
                          )}

                          <Text style={[styles.complaintLabel, { color: subTextColor, marginTop: 8 }]}>
                            Patient Chief Complaint / Symptoms:
                          </Text>
                          <Text style={[styles.complaintText, { color: textColor }]}>
                            {session.reason || 'General health consultation'}
                          </Text>

                          {/* Action Buttons for Pending */}
                          <View style={styles.sessionActionRow}>
                            <TouchableOpacity
                              style={[
                                styles.inlineDeclineBtn,
                                {
                                  backgroundColor: isDark ? '#2A1417' : '#FEF2F2',
                                  borderColor: isDark ? '#4C1D24' : '#FECACA',
                                },
                              ]}
                              onPress={() => handleRespond(session, 'rejected')}
                              disabled={busy}
                              activeOpacity={0.7}
                            >
                              <X size={15} color="#EF4444" />
                              <Text style={styles.inlineDeclineText}>Decline</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.inlineAcceptBtn}
                              onPress={() => handleRespond(session, 'approved')}
                              disabled={busy}
                              activeOpacity={0.8}
                            >
                              <Check size={15} color="#FFFFFF" strokeWidth={2.5} />
                              <Text style={styles.inlineAcceptText}>Accept Request</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* ── CASE 4: UPCOMING / CONFIRMED (Ready for Consultation) ── */}
                      {sStatus === 'approved' && (
                        <View style={styles.approvedSessionBox}>
                          {/* Payment status strip */}
                          <View
                            style={[
                              styles.paymentStrip,
                              {
                                backgroundColor: isPaid
                                  ? isDark
                                    ? '#0E2924'
                                    : '#E6FAF6'
                                  : isDark
                                  ? '#2E2210'
                                  : '#FEF3C7',
                              },
                            ]}
                          >
                            <CreditCard
                              size={14}
                              color={isPaid ? '#0FBBA1' : '#D97706'}
                            />
                            <Text
                              style={[
                                styles.paymentStripText,
                                { color: isPaid ? '#0FBBA1' : '#D97706' },
                              ]}
                            >
                              {isPaid
                                ? `Paid ₹${session.consultationFee || 0} via Online Payment`
                                : 'Awaiting Patient Payment Confirmation'}
                            </Text>
                          </View>

                          {/* Reschedule callout if any */}
                          {session.rescheduleRequest?.status === 'pending' && (
                            <View
                              style={[
                                styles.rescheduleCallout,
                                {
                                  backgroundColor: isDark ? '#172554' : '#EFF6FF',
                                  borderColor: isDark ? '#1E3A8A' : '#DBEAFE',
                                },
                              ]}
                            >
                              <View style={styles.pastHeaderRow}>
                                <Clock size={14} color="#3B82F6" />
                                <Text
                                  style={[
                                    styles.rescheduleTitle,
                                    { color: isDark ? '#93C5FD' : '#1D4ED8' },
                                  ]}
                                >
                                  Reschedule Requested
                                </Text>
                              </View>
                              <Text
                                style={[
                                  styles.rescheduleDesc,
                                  { color: isDark ? '#E2E8F0' : '#1E293B' },
                                ]}
                              >
                                {patientData.name} proposed:{' '}
                                {new Date(
                                  session.rescheduleRequest.proposedDate
                                ).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}{' '}
                                at {formatTime12h(session.rescheduleRequest.proposedTime)}.
                              </Text>
                              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                                <TouchableOpacity
                                  style={[
                                    styles.declineBtnSmall,
                                    {
                                      backgroundColor: isDark ? '#2A1417' : '#FEF2F2',
                                      borderColor: isDark ? '#4C1D24' : '#FECACA',
                                    },
                                  ]}
                                  onPress={() => handleRescheduleResponse(session, false)}
                                  disabled={busy}
                                  activeOpacity={0.7}
                                >
                                  <X size={14} color="#EF4444" />
                                  <Text style={styles.declineBtnText}>Decline</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.acceptBtnSmall}
                                  onPress={() => handleRescheduleResponse(session, true)}
                                  disabled={busy}
                                  activeOpacity={0.8}
                                >
                                  <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                                  <Text style={styles.acceptBtnText}>Accept</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}

                          <Text style={[styles.complaintLabel, { color: subTextColor, marginTop: 8 }]}>
                            Chief Complaint / Reason for Visit:
                          </Text>
                          <Text style={[styles.complaintText, { color: textColor }]}>
                            {session.reason || 'General health consultation'}
                          </Text>

                          {/* Consultation Session Status Notice or Active Clinical Actions */}
                          {!isPaid ? (
                            <View
                              style={[
                                styles.sessionStatusNotice,
                                {
                                  backgroundColor: isDark ? '#1F1A14' : '#FFFBEB',
                                  borderColor: isDark ? '#3D2F17' : '#FDE68A',
                                },
                              ]}
                            >
                              <Clock size={14} color="#D97706" />
                              <Text
                                style={[
                                  styles.sessionStatusNoticeText,
                                  { color: isDark ? '#FCD34D' : '#B45309' },
                                ]}
                              >
                                Consultation actions and prescription will unlock once patient payment is completed.
                              </Text>
                            </View>
                          ) : !hasSessionStarted ? (
                            <View
                              style={[
                                styles.sessionStatusNotice,
                                {
                                  backgroundColor: isDark ? '#111E2E' : '#EFF6FF',
                                  borderColor: isDark ? '#1E3A5F' : '#BFDBFE',
                                },
                              ]}
                            >
                              <CalendarClock size={14} color="#3B82F6" />
                              <Text
                                style={[
                                  styles.sessionStatusNoticeText,
                                  { color: isDark ? '#93C5FD' : '#1D4ED8' },
                                ]}
                              >
                                Scheduled for {sTime}. Prescriptions and completion will be available once the consultation begins.
                              </Text>
                            </View>
                          ) : (
                            /* Clinical Actions (Prescription & Complete Session) when in session */
                            <View style={styles.upcomingActionContainer}>
                              <View style={styles.upcomingSecondaryRow}>
                                <TouchableOpacity
                                  style={[
                                    styles.secondaryActionBtn,
                                    {
                                      backgroundColor: isDark ? '#172230' : '#F1F5F9',
                                      borderColor: isDark ? '#1E3145' : '#E2E8F0',
                                    },
                                  ]}
                                  onPress={() => handleOpenRxModal(session)}
                                  activeOpacity={0.7}
                                >
                                  <Pill size={14} color="#0FBBA1" />
                                  <Text style={[styles.secondaryActionBtnText, { color: textColor }]}>
                                    {hasRx ? 'Edit Draft Rx' : '+ Add Prescription'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.completeActionBtn,
                                    {
                                      backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
                                      borderColor: isDark ? '#312E81' : '#E0E7FF',
                                    },
                                  ]}
                                  onPress={() => handleOpenRxModal(session)}
                                  activeOpacity={0.7}
                                >
                                  <CheckCircle2 size={14} color="#6366F1" />
                                  <Text style={styles.completeActionBtnText}>
                                    Complete Session
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {/* ── CASE 5: COMPLETED CONSULTATION SESSION ── */}
                      {sStatus === 'completed' && (
                        <View style={styles.completedSessionBox}>
                          <Text style={[styles.complaintLabel, { color: subTextColor }]}>
                            Chief Complaint / Reason for Visit:
                          </Text>
                          <Text style={[styles.complaintText, { color: textColor }]}>
                            {session.reason || 'General health consultation'}
                          </Text>

                          {/* Recorded Consultation Vitals */}
                          {sessionVitals && (
                            <View style={styles.vitalsBlock}>
                              <View style={styles.subSectionHeader}>
                                <Activity size={14} color="#0FBBA1" />
                                <Text style={[styles.subSectionTitle, { color: textColor }]}>
                                  Recorded Consultation Vitals
                                </Text>
                              </View>

                              <View style={styles.vitalsGrid}>
                                <View
                                  style={[
                                    styles.vitalCard,
                                    { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                                  ]}
                                >
                                  <View style={styles.vitalHeaderRow}>
                                    <Heart size={12} color="#EF4444" />
                                    <Text style={[styles.vitalLabel, { color: subTextColor }]}>BP</Text>
                                  </View>
                                  <Text style={[styles.vitalValue, { color: textColor }]}>
                                    {sessionVitals.bloodPressure}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.vitalCard,
                                    { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                                  ]}
                                >
                                  <View style={styles.vitalHeaderRow}>
                                    <Activity size={12} color="#0FBBA1" />
                                    <Text style={[styles.vitalLabel, { color: subTextColor }]}>Heart Rate</Text>
                                  </View>
                                  <Text style={[styles.vitalValue, { color: textColor }]}>
                                    {sessionVitals.heartRate}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.vitalCard,
                                    { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                                  ]}
                                >
                                  <View style={styles.vitalHeaderRow}>
                                    <Droplet size={12} color="#F59E0B" />
                                    <Text style={[styles.vitalLabel, { color: subTextColor }]}>Glucose</Text>
                                  </View>
                                  <Text style={[styles.vitalValue, { color: textColor }]}>
                                    {sessionVitals.glucose}
                                  </Text>
                                </View>

                                <View
                                  style={[
                                    styles.vitalCard,
                                    { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                                  ]}
                                >
                                  <View style={styles.vitalHeaderRow}>
                                    <Thermometer size={12} color="#3B82F6" />
                                    <Text style={[styles.vitalLabel, { color: subTextColor }]}>SpO2 / Temp</Text>
                                  </View>
                                  <Text style={[styles.vitalValue, { color: textColor }]}>
                                    {sessionVitals.spo2} · {sessionVitals.temperature}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}

                          {/* Prescriptions & Diagnosis */}
                          <View style={styles.rxBlockContainer}>
                            <View style={styles.cardHeaderRowFlex}>
                              <View style={styles.subSectionHeader}>
                                <Pill size={14} color="#0FBBA1" />
                                <Text style={[styles.subSectionTitle, { color: textColor }]}>
                                  Prescriptions & Clinical Notes
                                </Text>
                              </View>

                            </View>

                            {hasRx ? (
                              <View style={styles.rxContentCol}>
                                {sDetails?.notes ? (
                                  <View style={styles.rxBlock}>
                                    <Text style={[styles.rxBlockLabel, { color: subTextColor }]}>
                                      Doctor Clinical Diagnosis & Notes
                                    </Text>
                                    <Text style={[styles.notesText, { color: textColor }]}>
                                      {sDetails.notes}
                                    </Text>
                                  </View>
                                ) : null}

                                {sDetails?.prescribedMedicines &&
                                sDetails.prescribedMedicines.length > 0 ? (
                                  <View style={styles.rxBlock}>
                                    <Text style={[styles.rxBlockLabel, { color: subTextColor }]}>
                                      Prescribed Medications ({sDetails.prescribedMedicines.length})
                                    </Text>
                                    {sDetails.prescribedMedicines.map((med: any, idx: number) => (
                                      <View
                                        key={idx}
                                        style={[
                                          styles.rxItemRow,
                                          { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                                        ]}
                                      >
                                        <View style={styles.rxItemTop}>
                                          <Text style={[styles.rxItemTitle, { color: textColor }]}>
                                            {med.medicineName}
                                          </Text>
                                          <Text style={[styles.rxItemDosage, { color: '#0FBBA1' }]}>
                                            {med.intakeDetails?.dosage}
                                          </Text>
                                        </View>
                                        <Text style={[styles.rxItemSub, { color: subTextColor }]}>
                                          Period: {med.intakeDetails?.period}
                                        </Text>
                                        {med.intakeDetails?.instructions?.map((inst: string, i: number) => (
                                          <Text
                                            key={i}
                                            style={[styles.rxItemInstruction, { color: subTextColor }]}
                                          >
                                            • {inst}
                                          </Text>
                                        ))}
                                      </View>
                                    ))}
                                  </View>
                                ) : null}

                                {sDetails?.prescribedLabTests &&
                                sDetails.prescribedLabTests.length > 0 ? (
                                  <View style={styles.rxBlock}>
                                    <Text style={[styles.rxBlockLabel, { color: subTextColor }]}>
                                      Ordered Lab Tests
                                    </Text>
                                    {sDetails.prescribedLabTests.map((test: any, idx: number) => (
                                      <View
                                        key={idx}
                                        style={[
                                          styles.rxItemRow,
                                          { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                                        ]}
                                      >
                                        <Text style={[styles.rxItemTitle, { color: textColor }]}>
                                          {test.testName}
                                        </Text>
                                        {test.additionalDetails ? (
                                          <Text style={[styles.rxItemSub, { color: subTextColor }]}>
                                            {test.additionalDetails}
                                          </Text>
                                        ) : null}
                                      </View>
                                    ))}
                                  </View>
                                ) : null}
                              </View>
                            ) : (
                              <View
                                style={[
                                  styles.emptyRxBox,
                                  { backgroundColor: isDark ? '#080E17' : '#F8FAFC' },
                                ]}
                              >
                                <Pill size={16} color={subTextColor} />
                                <Text style={[styles.emptyRxText, { color: subTextColor }]}>
                                  No digital prescription or lab tests were recorded for this consultation.
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══ 4. STICKY BOTTOM ACTION BAR (Contextual for primary active request) ═══ */}
      {isActivePending && (
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 18,
            },
          ]}
        >
          {formatCountdown(appointment?.responseDeadline) && (
            <View style={styles.deadlineNotice}>
              <Clock size={13} color="#D97706" />
              <Text style={styles.deadlineNoticeText}>
                Respond within {formatCountdown(appointment?.responseDeadline)} or this request will expire.
              </Text>
            </View>
          )}
          <View style={styles.footerButtonRow}>
            <TouchableOpacity
              style={[
                styles.declineBtn,
                {
                  backgroundColor: isDark ? '#2A1417' : '#FEF2F2',
                  borderColor: isDark ? '#4C1D24' : '#FECACA',
                },
              ]}
              onPress={() => handleRespond(appointment, 'rejected')}
              disabled={busy}
              activeOpacity={0.7}
            >
              <X size={16} color="#EF4444" />
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleRespond(appointment, 'approved')}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isActiveApproved && isMainPaid && (
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 18,
            },
          ]}
        >
          <View style={styles.footerButtonRow}>
            {!isCallInProgress && (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: isDark ? '#172230' : '#E6FAF6',
                    borderColor: isDark ? '#1A2F3D' : '#CCFBF1',
                  },
                ]}
                onPress={() =>
                  navigation.navigate('DoctorChat', {
                    requestId: appointment.requestId,
                    title: patientData.name,
                    image: patientData.image,
                  })
                }
                activeOpacity={0.7}
              >
                <MessageSquare size={16} color="#0FBBA1" />
                <Text style={styles.secondaryBtnText}>Message</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryCallBtn,
                isCallInProgress && styles.primaryCallBtnActive,
                !canMainJoinNow && !isCallInProgress && styles.primaryCallBtnDisabled,
              ]}
              disabled={!canMainJoinNow && !isCallInProgress}
              onPress={() => handleJoinCall(appointment)}
              activeOpacity={0.8}
            >
              {isCallInProgress ? (
                <View style={styles.activeCallBtnContent}>
                  <View style={styles.pulseDotActive} />
                  <Phone size={16} color="#FFFFFF" />
                  <Text style={styles.primaryCallBtnText}>Return to Call</Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.primaryCallBtnText,
                    !canMainJoinNow && styles.primaryCallBtnTextDisabled,
                  ]}
                >
                  {!hasMainStarted
                    ? `Opens at ${formatTime12h(appointment.canJoinCallAt || appointment.preferredTime)}`
                    : appointment?.consultationType === 'chat'
                    ? 'Open Chat'
                    : 'Start Call'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isActiveExpired && (
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 18,
            },
          ]}
        >
          <View style={styles.footerButtonRow}>
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  flex: 1,
                  backgroundColor: isDark ? '#172230' : '#E6FAF6',
                  borderColor: isDark ? '#1A2F3D' : '#CCFBF1',
                },
              ]}
              onPress={() =>
                navigation.navigate('DoctorChat', {
                  requestId: appointment.requestId,
                  title: patientData.name,
                  image: patientData.image,
                })
              }
              activeOpacity={0.7}
            >
              <MessageSquare size={16} color="#0FBBA1" />
              <Text style={styles.secondaryBtnText}>Open Patient Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ═══ Modals ═══ */}
      <PatientReportsModal
        visible={reportsModalVisible}
        onClose={() => setReportsModalVisible(false)}
        customerId={patientCustomerId}
      />

      <ConsultationDetailsModal
        visible={rxModalVisible}
        onClose={() => setRxModalVisible(false)}
        mode={activeRxSession?.status === 'approved' ? 'complete' : 'draft'}
        initialData={{
          notes: activeRxSession?.consultationDetails?.notes || '',
          prescribedMedicines: activeRxSession?.consultationDetails?.prescribedMedicines || [],
          prescribedLabTests: activeRxSession?.consultationDetails?.prescribedLabTests || [],
        }}
        onSaveDraft={handleSaveRxDraft}
        onSubmit={handleCompleteWithDetails}
      />

      <StatusModal
        visible={status.visible}
        status={status.type}
        title={status.title}
        message={status.message}
        onClose={hideStatus}
        primaryAction={status.primaryAction}
        primaryActionText={status.primaryActionText}
        autoCloseDelay={status.type === 'success' ? 2000 : undefined}
      />

      {busy && (
        <View
          style={[
            styles.busyOverlay,
            {
              backgroundColor: isDark
                ? 'rgba(8,14,23,0.7)'
                : 'rgba(255,255,255,0.7)',
            },
          ]}
          pointerEvents="none"
        >
          <ActivityIndicator color="#0FBBA1" size="large" />
        </View>
      )}
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
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },

  // ═══ Patient Profile Card ═══
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  patientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    fontSize: 22,
    fontWeight: '800',
  },
  patientNameLarge: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  patientMetaLine: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  contactText: {
    fontSize: 12,
    fontWeight: '500',
  },

  demographicsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  demographicItem: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    gap: 3,
  },
  demoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  demoLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  demoValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },

  medicalHistorySection: {
    gap: 6,
    marginTop: 12,
  },
  historyGroup: {
    gap: 4,
  },
  historyGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyGroupLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  historyInlineValue: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ═══ Documents Section ═══
  cardHeaderRowFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  viewAllReportsLink: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0FBBA1',
  },
  docsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  docsLoadingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  docsListCol: {
    gap: 8,
    marginTop: 12,
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  docIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E6FAF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTextWrap: {
    flex: 1,
  },
  docName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  docDate: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyDocsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 6,
  },
  emptyDocsText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ═══ Timeline Section ═══
  timelineContainer: {
    gap: 10,
    marginTop: 6,
  },
  timelineSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingHistoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingHistoryText: {
    fontSize: 12.5,
    fontWeight: '500',
  },

  // ═══ Timeline Card Item ═══
  timelineCard: {
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
  },
  timelineRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  timelineModeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timelineDateText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  currentPill: {
    backgroundColor: '#0FBBA1',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  currentPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  timelineTimeText: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
  },
  timelineHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  statusBadgeTextSmall: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // ═══ Expanded Session Detail Elements ═══
  expandedContent: {
    marginTop: 2,
  },
  sessionMetaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionMetaText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  sessionFeeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Notice Banners
  noticeBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  noticeBody: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  refundStatusBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  refundHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refundStatusTitle: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  complaintSubBox: {
    marginTop: 4,
    gap: 2,
  },
  complaintLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  complaintText: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },

  // Pending Box
  pendingSessionBox: {
    gap: 6,
  },
  countdownStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  countdownStripText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D97706',
  },
  sessionActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  inlineDeclineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  inlineDeclineText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  inlineAcceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0FBBA1',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  inlineAcceptText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Approved Box
  approvedSessionBox: {
    gap: 6,
  },
  paymentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
  },
  paymentStripText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  upcomingActionContainer: {
    marginTop: 10,
    gap: 8,
  },
  primaryJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0FBBA1',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryJoinBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryJoinBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryJoinBtnTextDisabled: {
    color: '#F1F5F9',
  },
  upcomingSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  completeActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  completeActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  sessionStatusNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  sessionStatusNoticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  // Completed Box
  completedSessionBox: {
    gap: 12,
  },
  vitalsBlock: {
    gap: 8,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subSectionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  vitalsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  vitalCard: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    gap: 2,
  },
  vitalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vitalLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  vitalValue: {
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 2,
  },

  // Rx Section
  rxBlockContainer: {
    gap: 8,
  },
  editRxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E6FAF6',
  },
  editRxText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0FBBA1',
  },
  rxContentCol: {
    gap: 8,
  },
  rxBlock: {
    gap: 4,
  },
  rxBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 18,
  },
  rxItemRow: {
    padding: 8,
    borderRadius: 8,
    gap: 2,
  },
  rxItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rxItemTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  rxItemDosage: {
    fontSize: 11,
    fontWeight: '700',
  },
  rxItemSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  rxItemInstruction: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  emptyRxBox: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
  },
  emptyRxText: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  addRxLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0FBBA1',
  },

  // Reschedule Callout
  rescheduleCallout: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginVertical: 4,
  },
  pastHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rescheduleTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  rescheduleDesc: {
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
  },
  declineBtnSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  acceptBtnSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0FBBA1',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },

  // Sticky Bottom Bars
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  deadlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deadlineNoticeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D97706',
  },
  footerButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  declineBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0FBBA1',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  acceptBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0FBBA1',
  },
  primaryCallBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0FBBA1',
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryCallBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryCallBtnActive: {
    backgroundColor: '#0FBBA1',
    flex: 1,
  },
  activeCallBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pulseDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  primaryCallBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  primaryCallBtnTextDisabled: {
    color: '#F1F5F9',
  },

  divider: {
    height: 1,
    marginVertical: 12,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
