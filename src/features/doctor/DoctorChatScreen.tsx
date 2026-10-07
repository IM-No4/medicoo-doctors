import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
    ActivityIndicator as RNActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    AlertCircle,
    Check,
    CheckCheck,
    CheckCircle2,
    ChevronLeft,
    Clock,
    FileText,
    FlaskConical,
    LogOut,
    MoreVertical,
    Pill,
    Send,
    Sparkles,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { API_BASE_URL } from '../../services/api/client';
import {
    ConsultationChatMessage,
    getConsultationMessages,
    sendConsultationMessage,
} from '../../services/api/consultationChat.api';
import {
    completeAppointmentRequest,
    ConsultationDetailsInput,
    getDoctorAppointmentRequestDetail,
    saveConsultationDetails,
} from '../../services/api/doctor.api';
import {
    emitConsultationTyping,
    emitConsultationChatRead,
    emitConsultationChatDelivered,
    onConsultationChatMessage,
    onConsultationTyping,
    onConsultationChatRead,
    onConsultationChatDelivered,
} from '../../services/socketService';
import ConsultationDetailsModal, { ConsultationDraft } from './components/ConsultationDetailsModal';
import PatientReportsModal from './components/PatientReportsModal';

const EMPTY_DRAFT: ConsultationDraft = { notes: '', prescribedMedicines: [], prescribedLabTests: [] };

const RX_PREFIX = '[MEDICOO_RX_V1]';
const DOC_REQ_PREFIX = '[MEDICOO_DOC_REQ]';

export default function DoctorChatScreen() {
    const insets = useSafeAreaInsets();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { requestId, title, name, image } = route.params || {};
    const displayName = (name || title || 'Patient') as string;
    const flatListRef = useRef<FlatList>(null);
    const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ConsultationChatMessage[]>([]);
    const [viewerRole, setViewerRole] = useState<'customer' | 'doctor' | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [sending, setSending] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isPatientTyping, setIsPatientTyping] = useState(false);

    // Modals
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showRxModal, setShowRxModal] = useState(false);
    const [rxModalMode, setRxModalMode] = useState<'chat_prescription' | 'draft' | 'complete'>('chat_prescription');
    const [showReportsModal, setShowReportsModal] = useState(false);
    const [consultationDraft, setConsultationDraft] = useState<ConsultationDraft>(EMPTY_DRAFT);

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
        setStatus({ visible: true, type, title, message, primaryAction, primaryActionText });
    };
    const hideStatus = () => setStatus(prev => ({ ...prev, visible: false }));

    const scrollToBottom = (delay = 100) => {
        setTimeout(() => {
            try {
                flatListRef.current?.scrollToEnd({ animated: true });
            } catch {
                // ignore
            }
        }, delay);
    };

    // Keyboard visibility & height listeners (ensures Android edge-to-edge moves up reliably)
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, (e) => {
            setKeyboardVisible(true);
            setKeyboardHeight(e?.endCoordinates?.height || 0);
            scrollToBottom(50);
            scrollToBottom(150);
            scrollToBottom(280);
            scrollToBottom(420);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardVisible(false);
            setKeyboardHeight(0);
            scrollToBottom(100);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const loadMessages = useCallback(async (showSpinner: boolean) => {
        if (!requestId) return;
        if (showSpinner) setLoading(true);
        try {
            const data = await getConsultationMessages(requestId);
            setMessages(prev => {
                const pending = prev.filter(m => m.status === 'pending' || m.status === 'failed' || m._id.startsWith('temp-'));
                const serverMessages: ConsultationChatMessage[] = data.messages.map(m => ({
                    ...m,
                    status: m.readAt ? ('read' as const) : ('delivered' as const),
                }));
                const combined: ConsultationChatMessage[] = [...serverMessages];
                for (const p of pending) {
                    if (!combined.some(m => m._id === p._id || (m.text === p.text && Math.abs(new Date(m.createdOn).getTime() - new Date(p.createdOn).getTime()) < 6000))) {
                        combined.push(p);
                    }
                }
                return combined;
            });
            setViewerRole(data.viewerRole);
            setLoadError(false);
        } catch (error) {
            console.warn('Failed to load consultation chat:', error);
            if (showSpinner) setLoadError(true);
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, [requestId]);

    useFocusEffect(
        useCallback(() => {
            loadMessages(true);
            emitConsultationChatRead(requestId);
        }, [loadMessages, requestId])
    );

    // Fetch patient customer ID & initial consultation details
    useEffect(() => {
        if (!requestId) return;
        getDoctorAppointmentRequestDetail(requestId)
            .then((res) => {
                if (res?.data?.customerId) {
                    setCustomerId(res.data.customerId);
                }
                if (res?.data?.consultationDetails) {
                    setConsultationDraft({
                        notes: res.data.consultationDetails.notes || '',
                        prescribedMedicines: res.data.consultationDetails.prescribedMedicines || [],
                        prescribedLabTests: res.data.consultationDetails.prescribedLabTests || [],
                    });
                }
            })
            .catch(() => { });
    }, [requestId]);

    // Listen for incoming messages via WebSocket
    useEffect(() => {
        const unsubscribe = onConsultationChatMessage(({ requestId: incomingRequestId, message: incoming }) => {
            if (incomingRequestId !== requestId) return;
            setMessages(prev => {
                if (prev.some(m => m._id === incoming._id)) return prev;
                return [...prev, { ...incoming, status: incoming.readAt ? 'read' : 'delivered' }];
            });
            // Acknowledge delivery and read immediately over WebSocket
            emitConsultationChatDelivered(requestId, incoming._id);
            emitConsultationChatRead(requestId);
        });
        return unsubscribe;
    }, [requestId]);

    // Listen for real-time read receipts over WebSocket
    useEffect(() => {
        const unsubscribe = onConsultationChatRead((payload) => {
            if (payload.requestId !== requestId) return;
            setMessages(prev =>
                prev.map(m => {
                    const isMine = m.senderRole === 'doctor' || m.senderRole !== 'customer';
                    if (isMine) {
                        return {
                            ...m,
                            readAt: m.readAt || payload.readAt,
                            status: 'read' as const,
                        };
                    }
                    return m;
                })
            );
        });
        return unsubscribe;
    }, [requestId]);

    // Listen for real-time delivery receipts over WebSocket
    useEffect(() => {
        const unsubscribe = onConsultationChatDelivered((payload) => {
            if (payload.requestId !== requestId) return;
            setMessages(prev =>
                prev.map(m => {
                    const isMine = m.senderRole === 'doctor' || m.senderRole !== 'customer';
                    if (isMine && (m._id === payload.messageId || (!payload.messageId && m.status === 'sent'))) {
                        return {
                            ...m,
                            status: m.status === 'read' ? 'read' : ('delivered' as const),
                        };
                    }
                    return m;
                })
            );
        });
        return unsubscribe;
    }, [requestId]);

    // Listen for real-time typing indicators over WebSocket
    useEffect(() => {
        const unsubscribe = onConsultationTyping((payload) => {
            if (payload.requestId !== requestId) return;
            if (payload.senderRole === 'customer' || payload.senderRole !== 'doctor') {
                setIsPatientTyping(payload.isTyping);
                if (payload.isTyping) {
                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                    typingTimerRef.current = setTimeout(() => {
                        setIsPatientTyping(false);
                    }, 4000);
                }
            }
        });
        return unsubscribe;
    }, [requestId]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length, isPatientTyping]);

    // Typing emitter for doctor
    const handleTextChange = (val: string) => {
        setMessage(val);
        if (requestId) {
            emitConsultationTyping(requestId, val.trim().length > 0);
        }
    };

    const handleCompleteConsultation = async (details: ConsultationDetailsInput) => {
        setShowCompleteModal(false);
        if (!requestId) return;
        try {
            await completeAppointmentRequest(requestId, details);
            showStatus(
                'success',
                'Consultation Completed',
                'This consultation has been finalized and clinical notes have been submitted.',
                () => {
                    hideStatus();
                    navigation.goBack();
                },
                'Done'
            );
        } catch (error: any) {
            showStatus('error', 'Could Not Complete', error?.response?.data?.message || 'Please try again.');
        }
    };

    const handleConcludePrompt = () => {
        setShowMenu(false);
        showStatus(
            'warning',
            'End Consultation Session?',
            'Are you sure you want to conclude this consultation? The digital prescription will be finalized for the patient.',
            () => {
                hideStatus();
                setRxModalMode('complete');
                setShowRxModal(true);
            },
            'Conclude Session'
        );
    };

    const handleSendPrescriptionToChat = async (draft: ConsultationDraft) => {
        if (!requestId) return;
        const rxPayload = {
            notes: draft.notes,
            medicines: draft.prescribedMedicines,
            labTests: draft.prescribedLabTests,
            timestamp: new Date().toISOString(),
        };
        const messageBody = `${RX_PREFIX}${JSON.stringify(rxPayload)}`;
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const optimisticMsg: ConsultationChatMessage = {
            _id: tempId,
            appointmentId: requestId,
            senderId: 'me',
            senderRole: viewerRole || 'doctor',
            text: messageBody,
            readAt: null,
            createdOn: new Date().toISOString(),
            status: 'pending',
        };

        // Immediately close modal & show optimistic prescription in chat
        setShowRxModal(false);
        setConsultationDraft(draft);
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            setSending(true);
            await saveConsultationDetails({
                requestId,
                notes: draft.notes,
                prescribedMedicines: draft.prescribedMedicines,
                prescribedLabTests: draft.prescribedLabTests,
            });
            const { message: sent } = await sendConsultationMessage(requestId, messageBody);
            setMessages(prev =>
                prev.map(m => (m._id === tempId ? { ...sent, status: 'sent' } : m))
            );
            showStatus('success', 'Prescription Sent', 'The digital prescription has been sent to the patient and saved.');
        } catch (error: any) {
            setMessages(prev =>
                prev.map(m => (m._id === tempId ? { ...m, status: 'failed' } : m))
            );
            showStatus('error', 'Failed to Send', 'Could not send prescription. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const handleRequestDocumentsFromPatient = async () => {
        if (!requestId) return;
        const reqPayload = {
            title: 'Medical Documents Requested',
            message: 'Doctor has requested your previous lab reports, prescriptions, or medical scans for review.',
            timestamp: new Date().toISOString(),
        };
        const messageBody = `${DOC_REQ_PREFIX}${JSON.stringify(reqPayload)}`;
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const optimisticMsg: ConsultationChatMessage = {
            _id: tempId,
            appointmentId: requestId,
            senderId: 'me',
            senderRole: viewerRole || 'doctor',
            text: messageBody,
            readAt: null,
            createdOn: new Date().toISOString(),
            status: 'pending',
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            setSending(true);
            const { message: sent } = await sendConsultationMessage(requestId, messageBody);
            setMessages(prev =>
                prev.map(m => (m._id === tempId ? { ...sent, status: 'sent' } : m))
            );
        } catch (error) {
            console.warn('Failed to send document request:', error);
            setMessages(prev =>
                prev.map(m => (m._id === tempId ? { ...m, status: 'failed' } : m))
            );
        } finally {
            setSending(false);
        }
    };

    const sendMessage = async () => {
        const text = message.trim();
        if (!text || !requestId) return;

        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const optimisticMsg: ConsultationChatMessage = {
            _id: tempId,
            appointmentId: requestId,
            senderId: 'me',
            senderRole: viewerRole || 'doctor',
            text,
            readAt: null,
            createdOn: new Date().toISOString(),
            status: 'pending',
        };

        // Instantly move message out of the input box and into the chat list
        setMessage('');
        emitConsultationTyping(requestId, false);
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        try {
            const { message: sent } = await sendConsultationMessage(requestId, text);
            setMessages(prev =>
                prev.map(m => (m._id === tempId ? { ...sent, status: 'sent' } : m))
            );
        } catch (error) {
            console.warn('Failed to send message:', error);
            setMessages(prev =>
                prev.map(m => (m._id === tempId ? { ...m, status: 'failed' } : m))
            );
        }
    };

    const retrySendMessage = async (failedMsg: ConsultationChatMessage) => {
        setMessages(prev =>
            prev.map(m => (m._id === failedMsg._id ? { ...m, status: 'pending' } : m))
        );
        try {
            const { message: sent } = await sendConsultationMessage(requestId, failedMsg.text);
            setMessages(prev =>
                prev.map(m => (m._id === failedMsg._id ? { ...sent, status: 'sent' } : m))
            );
        } catch (error) {
            setMessages(prev =>
                prev.map(m => (m._id === failedMsg._id ? { ...m, status: 'failed' } : m))
            );
        }
    };

    const renderStatusTick = (item: ConsultationChatMessage, isWhiteBubble = false) => {
        if (item.status === 'failed') {
            return (
                <TouchableOpacity
                    onPress={() => retrySendMessage(item)}
                    style={styles.tickContainer}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <AlertCircle size={12} color="#EF4444" />
                </TouchableOpacity>
            );
        }
        if (item.status === 'pending' || item._id.startsWith('temp-')) {
            return (
                <View style={styles.tickContainer}>
                    <Clock size={11} color={isWhiteBubble ? '#94A3B8' : 'rgba(255,255,255,0.75)'} strokeWidth={2} />
                </View>
            );
        }
        if (item.readAt) {
            // Read receipt: Double blue / cyan tick
            return (
                <View style={styles.tickContainer}>
                    <CheckCheck size={14} color={isWhiteBubble ? '#0FBBA1' : '#67E8F9'} strokeWidth={2.5} />
                </View>
            );
        }
        if (item.status === 'sent') {
            // Sent to server: Single tick
            return (
                <View style={styles.tickContainer}>
                    <Check size={13} color={isWhiteBubble ? '#94A3B8' : 'rgba(255,255,255,0.85)'} strokeWidth={2.4} />
                </View>
            );
        }
        // Delivered: Double tick
        return (
            <View style={styles.tickContainer}>
                <CheckCheck size={14} color={isWhiteBubble ? '#94A3B8' : 'rgba(255,255,255,0.8)'} strokeWidth={2.2} />
            </View>
        );
    };

    const renderMessageItem = ({ item }: { item: ConsultationChatMessage }) => {
        const isMine = viewerRole !== null && item.senderRole === viewerRole;
        const time = new Date(item.createdOn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Check for Prescription Card
        if (item.text.startsWith(RX_PREFIX)) {
            try {
                const rxData = JSON.parse(item.text.slice(RX_PREFIX.length));
                return (
                    <View style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}>
                        <View style={[styles.rxCardBubble, isMine ? styles.rxCardBubbleRight : styles.rxCardBubbleLeft]}>
                            {/* Card Header */}
                            <View style={styles.rxCardHeader}>
                                <View style={styles.rxCardBadge}>
                                    <Pill size={15} color="#0FBBA1" />
                                    <Text style={styles.rxCardBadgeText}>Digital Prescription</Text>
                                </View>
                                <Sparkles size={14} color="#0FBBA1" />
                            </View>

                            {/* Diagnosis / Clinical notes */}
                            {rxData.notes ? (
                                <View style={styles.rxNotesBox}>
                                    <Text style={styles.rxNotesLabel}>Clinical Diagnosis / Advice</Text>
                                    <Text style={styles.rxNotesText}>{rxData.notes}</Text>
                                </View>
                            ) : null}

                            {/* Prescribed Medicines */}
                            {rxData.medicines && rxData.medicines.length > 0 ? (
                                <View style={styles.rxMedsSection}>
                                    <Text style={styles.rxSectionTitle}>
                                        Prescribed Medications ({rxData.medicines.length})
                                    </Text>
                                    {rxData.medicines.map((med: any, idx: number) => (
                                        <View key={idx} style={styles.rxMedItem}>
                                            <View style={styles.rxMedTop}>
                                                <Text style={styles.rxMedName}>{med.medicineName}</Text>
                                                <View style={styles.dosagePill}>
                                                    <Text style={styles.dosagePillText}>{med.intakeDetails?.dosage}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.rxMedPeriod}>
                                                📅 {med.intakeDetails?.period}
                                            </Text>
                                            {med.intakeDetails?.instructions && med.intakeDetails.instructions.length > 0 ? (
                                                <View style={styles.rxInstructionsBox}>
                                                    {med.intakeDetails.instructions.map((inst: string, i: number) => (
                                                        <Text key={i} style={styles.rxInstLine}>
                                                            • {inst}
                                                        </Text>
                                                    ))}
                                                </View>
                                            ) : null}
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {/* Lab Tests */}
                            {rxData.labTests && rxData.labTests.length > 0 ? (
                                <View style={styles.rxMedsSection}>
                                    <Text style={styles.rxSectionTitle}>
                                        Ordered Lab Tests ({rxData.labTests.length})
                                    </Text>
                                    {rxData.labTests.map((t: any, idx: number) => (
                                        <View key={idx} style={styles.rxTestItem}>
                                            <FlaskConical size={13} color="#3B82F6" />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.rxTestName}>{t.testName}</Text>
                                                {t.additionalDetails ? (
                                                    <Text style={styles.rxTestNotes}>{t.additionalDetails}</Text>
                                                ) : null}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {/* Card Footer */}
                            <View style={styles.rxCardFooter}>
                                <View style={styles.verifiedDoctorBadge}>
                                    <CheckCircle2 size={12} color="#0FBBA1" />
                                    <Text style={styles.verifiedDoctorText}>Doctor Verified</Text>
                                </View>
                                <View style={styles.cardFooterTimeRow}>
                                    <Text style={styles.rxCardTime}>{time}</Text>
                                    {isMine && renderStatusTick(item, true)}
                                </View>
                            </View>
                        </View>
                    </View>
                );
            } catch {
                // fallback to regular bubble
            }
        }

        // Check for Document Request Card
        if (item.text.startsWith(DOC_REQ_PREFIX)) {
            try {
                const reqData = JSON.parse(item.text.slice(DOC_REQ_PREFIX.length));
                return (
                    <View style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}>
                        <View style={styles.docReqCard}>
                            <View style={styles.docReqHeader}>
                                <FileText size={16} color="#2563EB" />
                                <Text style={styles.docReqTitle}>{reqData.title || 'Documents Requested'}</Text>
                            </View>
                            <Text style={styles.docReqBody}>{reqData.message}</Text>
                            <View style={styles.docReqFooterRow}>
                                <Text style={styles.rxCardTime}>{time}</Text>
                                {isMine && renderStatusTick(item, true)}
                            </View>
                        </View>
                    </View>
                );
            } catch {
                // fallback
            }
        }

        return (
            <View style={[styles.messageRow, isMine ? styles.messageRowRight : styles.messageRowLeft]}>
                <View style={[styles.messageBubble, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
                    <Text style={[styles.messageText, isMine ? styles.textRight : styles.textLeft]}>
                        {item.text}
                    </Text>
                    <View style={styles.bubbleFooterRow}>
                        <Text style={[styles.timeText, isMine ? styles.timeRight : styles.timeLeft]}>
                            {time}
                        </Text>
                        {isMine && renderStatusTick(item, false)}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* ═══ Header Bar ═══ */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 4) }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
                    <ChevronLeft size={22} color="#111827" />
                </TouchableOpacity>

                <View style={styles.headerInfo}>
                    {image ? (
                        <Image
                            source={{ uri: image.startsWith('http') ? image : `${API_BASE_URL}/${image}` }}
                            style={styles.avatarHeader}
                        />
                    ) : (
                        <View style={styles.avatarHeader}>
                            <Text style={styles.avatarTextHeader}>{displayName.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <Text style={[styles.headerSubTitle, isPatientTyping && styles.headerSubTitleTyping]}>
                            {isPatientTyping ? 'typing...' : 'In Consultation'}
                        </Text>
                    </View>
                </View>

                {/* 3-dots actions menu */}
                <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowMenu(prev => !prev)}
                    activeOpacity={0.7}
                >
                    <MoreVertical size={22} color="#334155" />
                </TouchableOpacity>
            </View>

            {/* ═══ Anchored 3-Dots Dropdown Menu ═══ */}
            {showMenu && (
                <Modal
                    transparent
                    visible={showMenu}
                    animationType="fade"
                    onRequestClose={() => setShowMenu(false)}
                >
                    <TouchableOpacity
                        style={styles.menuBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowMenu(false)}
                    >
                        <View
                            style={[
                                styles.menuDropdown,
                                { top: insets.top + (Platform.OS === 'android' ? 52 : 44) },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleConcludePrompt}
                                activeOpacity={0.7}
                            >
                                <LogOut size={16} color="#EF4444" />
                                <Text style={styles.menuItemTextDanger}>End Session</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            <KeyboardAvoidingView
                style={styles.flexOne}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {loading ? (
                    <View style={styles.center}>
                        <RNActivityIndicator size="large" color="#0FBBA1" />
                    </View>
                ) : loadError ? (
                    <View style={styles.center}>
                        <AlertCircle size={28} color="#EF4444" style={{ marginBottom: 8 }} />
                        <Text style={styles.errorText}>Couldn&apos;t load this conversation.</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => loadMessages(true)}>
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        style={styles.flexOne}
                        data={messages}
                        renderItem={renderMessageItem}
                        keyExtractor={item => item._id}
                        contentContainerStyle={[styles.chatContent, { paddingBottom: keyboardVisible ? 52 : 20 }]}
                        onContentSizeChange={() => scrollToBottom(50)}
                        onLayout={() => scrollToBottom(50)}
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Text style={styles.errorText}>No messages yet. Say hello to start consultation!</Text>
                            </View>
                        }
                        ListFooterComponent={
                            isPatientTyping ? (
                                <View style={styles.typingIndicatorRow}>
                                    <View style={styles.typingBubble}>
                                        <View style={styles.typingDot} />
                                        <View style={[styles.typingDot, { opacity: 0.7 }]} />
                                        <View style={[styles.typingDot, { opacity: 0.4 }]} />
                                        <Text style={styles.typingText}>typing...</Text>
                                    </View>
                                </View>
                            ) : null
                        }
                    />
                )}

                {/* ═══ Unified Bottom Dock: Floating Quick Action Bar + Chat Input (Moves up dynamically with Keyboard) ═══ */}
                <View
                    style={[
                        styles.bottomDock,
                        {
                            marginBottom: Platform.OS === 'android'
                                ? (keyboardHeight > 0 ? keyboardHeight + (insets.bottom > 0 ? insets.bottom + 8 : 20) : 0)
                                : 0,
                            paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 16) + 10,
                        },
                    ]}
                >
                    {/* Background-less Quick Action Bar */}
                    <View style={styles.quickActionBar}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.quickActionScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            <TouchableOpacity
                                style={[styles.quickPill, styles.quickPillTeal]}
                                onPress={() => {
                                    setRxModalMode('chat_prescription');
                                    setShowRxModal(true);
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.pillIconBadge, styles.pillIconBadgeTeal]}>
                                    <Pill size={13} color="#0D9488" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.quickPillTealText}>Write Prescription</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickPill, styles.quickPillBlue]}
                                onPress={() => {
                                    setRxModalMode('chat_prescription');
                                    setShowRxModal(true);
                                }}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.pillIconBadge, styles.pillIconBadgeBlue]}>
                                    <FlaskConical size={13} color="#2563EB" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.quickPillBlueText}>Order Lab Tests</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickPill, styles.quickPillSlate]}
                                onPress={() => setShowReportsModal(true)}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.pillIconBadge, styles.pillIconBadgeSlate]}>
                                    <FileText size={13} color="#475569" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.quickPillSlateText}>Patient Reports</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickPill, styles.quickPillPurple]}
                                onPress={handleRequestDocumentsFromPatient}
                                activeOpacity={0.75}
                            >
                                <View style={[styles.pillIconBadge, styles.pillIconBadgePurple]}>
                                    <Sparkles size={13} color="#7E22CE" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.quickPillPurpleText}>Request Records</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Chat Message Input Box */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a clinical message or advice..."
                            placeholderTextColor="#94A3B8"
                            value={message}
                            onChangeText={handleTextChange}
                            onFocus={() => {
                                scrollToBottom(50);
                                scrollToBottom(200);
                                scrollToBottom(350);
                            }}
                            multiline
                        />

                        <TouchableOpacity
                            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                            onPress={sendMessage}
                            disabled={!message.trim() || sending}
                            activeOpacity={0.8}
                        >
                            <Send size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* ═══ Modals ═══ */}

            <ConsultationDetailsModal
                visible={showRxModal}
                mode={rxModalMode}
                onClose={() => setShowRxModal(false)}
                initialData={consultationDraft}
                onSaveDraft={setConsultationDraft}
                onSubmit={async (draft) => {
                    if (rxModalMode === 'chat_prescription') {
                        await handleSendPrescriptionToChat(draft);
                    } else if (rxModalMode === 'complete') {
                        await handleCompleteConsultation(draft);
                    } else {
                        setConsultationDraft(draft);
                        setShowRxModal(false);
                    }
                }}
            />

            <ConsultationDetailsModal
                visible={showCompleteModal}
                mode="complete"
                onClose={() => setShowCompleteModal(false)}
                onSubmit={handleCompleteConsultation}
                initialData={consultationDraft}
                onSaveDraft={setConsultationDraft}
            />

            <PatientReportsModal
                visible={showReportsModal}
                onClose={() => setShowReportsModal(false)}
                customerId={customerId || undefined}
            />

            <StatusModal
                visible={status.visible}
                status={status.type}
                title={status.title}
                message={status.message}
                onClose={hideStatus}
                primaryAction={status.primaryAction}
                primaryActionText={status.primaryActionText}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    flexOne: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    errorText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
    retryBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#0FBBA1', borderRadius: 10 },
    retryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 10,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 2 },
        }),
    },
    backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarHeader: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarTextHeader: { fontSize: 16, fontWeight: '800', color: '#0FBBA1' },
    headerTitle: { fontSize: 15.5, fontWeight: '700', color: '#0F172A' },
    headerSubTitle: { fontSize: 11.5, color: '#64748B', fontWeight: '500', marginTop: 1 },
    headerSubTitleTyping: { color: '#0FBBA1', fontWeight: '700' },
    iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },

    chatContent: { padding: 14, paddingBottom: 20, gap: 14, flexGrow: 1 },

    // Messages
    messageRow: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '85%' },
    messageRowLeft: { alignSelf: 'flex-start' },
    messageRowRight: { alignSelf: 'flex-end' },

    messageBubble: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
        maxWidth: '100%',
        ...Platform.select({
            ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
            android: { elevation: 1 },
        }),
    },
    bubbleLeft: {
        backgroundColor: '#FFFFFF',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    bubbleRight: {
        backgroundColor: '#0FBBA1',
        borderBottomRightRadius: 4,
    },
    messageText: { fontSize: 14.5, lineHeight: 21 },
    textLeft: { color: '#0F172A' },
    textRight: { color: '#FFFFFF' },

    timeText: { fontSize: 10 },
    timeLeft: { color: '#94A3B8' },
    timeRight: { color: 'rgba(255,255,255,0.85)' },

    bubbleFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 3,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    tickContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 2,
    },
    cardFooterTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    docReqFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 6,
    },

    // Rich Prescription Card in Chat
    rxCardBubble: {
        width: 300,
        borderRadius: 18,
        padding: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CCFBF1',
        ...Platform.select({
            ios: { shadowColor: '#0D9488', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
            android: { elevation: 2 },
        }),
    },
    rxCardBubbleLeft: { borderBottomLeftRadius: 4 },
    rxCardBubbleRight: { borderBottomRightRadius: 4, borderColor: '#0FBBA1' },
    rxCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    rxCardBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rxCardBadgeText: { fontSize: 13.5, fontWeight: '800', color: '#0F766E' },
    rxNotesBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 10,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    rxNotesLabel: { fontSize: 10.5, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
    rxNotesText: { fontSize: 12.5, color: '#1E293B', marginTop: 2, lineHeight: 17 },
    rxMedsSection: { marginTop: 10, gap: 8 },
    rxSectionTitle: { fontSize: 11.5, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
    rxMedItem: {
        backgroundColor: '#F0FDF4',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    rxMedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rxMedName: { fontSize: 13.5, fontWeight: '700', color: '#0F172A', flex: 1 },
    dosagePill: { backgroundColor: '#0FBBA1', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    dosagePillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    rxMedPeriod: { fontSize: 11.5, color: '#0F766E', fontWeight: '600', marginTop: 4 },
    rxInstructionsBox: { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#DCFCE7', gap: 2 },
    rxInstLine: { fontSize: 11, color: '#475569', lineHeight: 15 },
    rxTestItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        padding: 9,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    rxTestName: { fontSize: 12.5, fontWeight: '700', color: '#1E3A8A' },
    rxTestNotes: { fontSize: 11, color: '#3B82F6', marginTop: 1 },
    rxCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    verifiedDoctorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    verifiedDoctorText: { fontSize: 10.5, fontWeight: '700', color: '#0FBBA1' },
    rxCardTime: { fontSize: 10, color: '#94A3B8' },

    // Document Request Card
    docReqCard: {
        width: 280,
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        borderRadius: 16,
        padding: 12,
        gap: 6,
    },
    docReqHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    docReqTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF' },
    docReqBody: { fontSize: 12, color: '#334155', lineHeight: 16 },

    // Typing Bubble
    typingIndicatorRow: { alignSelf: 'flex-start', marginVertical: 4 },
    typingBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0FBBA1' },
    typingText: { fontSize: 11.5, color: '#64748B', fontWeight: '500', marginLeft: 4 },

    // Unified Bottom Dock (Background-less)
    bottomDock: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        paddingTop: 2,
    },
    // Quick Action Bar (Floating soft-pills)
    quickActionBar: {
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        paddingVertical: 5,
        marginBottom: 4,
    },
    quickActionScroll: { paddingHorizontal: 12, gap: 8 },
    quickPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderRadius: 20,
        paddingLeft: 5,
        paddingRight: 12,
        paddingVertical: 5,
        borderWidth: 1,
        ...Platform.select({
            ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
            android: { elevation: 1 },
        }),
    },
    pillIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillIconBadgeTeal: { backgroundColor: '#CCFBF1' },
    quickPillTeal: { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' },
    quickPillTealText: { fontSize: 12.5, fontWeight: '700', color: '#0F766E', letterSpacing: 0.1 },

    pillIconBadgeBlue: { backgroundColor: '#DBEAFE' },
    quickPillBlue: { backgroundColor: '#EFF6FF', borderColor: '#BAE6FD' },
    quickPillBlueText: { fontSize: 12.5, fontWeight: '700', color: '#0369A1', letterSpacing: 0.1 },

    pillIconBadgeSlate: { backgroundColor: '#E2E8F0' },
    quickPillSlate: { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
    quickPillSlateText: { fontSize: 12.5, fontWeight: '700', color: '#334155', letterSpacing: 0.1 },

    pillIconBadgePurple: { backgroundColor: '#F3E8FF' },
    quickPillPurple: { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' },
    quickPillPurpleText: { fontSize: 12.5, fontWeight: '700', color: '#7E22CE', letterSpacing: 0.1 },

    // Input Container
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingTop: 2,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 16,
        paddingVertical: 9,
        fontSize: 14.5,
        color: '#0F172A',
        maxHeight: 90,
    },
    sendButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#0FBBA1',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    sendButtonDisabled: { backgroundColor: '#CBD5E1' },

    // 3-Dots Anchored Dropdown Menu
    menuBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    menuDropdown: {
        position: 'absolute',
        right: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 4,
        minWidth: 155,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...Platform.select({
            ios: {
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 10,
            },
            android: { elevation: 6 },
        }),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 11,
    },
    menuItemTextDanger: {
        fontSize: 14,
        fontWeight: '700',
        color: '#EF4444',
    },
});
