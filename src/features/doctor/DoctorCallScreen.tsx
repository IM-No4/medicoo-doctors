import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import {
    ChevronLeft,
    Mic, MicOff,
    MoreHorizontal,
    PhoneOff,
    SwitchCamera,
    Video as VideoIcon, VideoOff, Volume2, VolumeX
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Dimensions,
    PanResponder,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { RenderModeType, RtcSurfaceView, RtcTextureView } from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VideoRender = Platform.OS === 'android' ? RtcTextureView : RtcSurfaceView;
import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { useCall } from '../../context/CallContext';
import {
    completeAppointmentRequest,
    ConsultationDetailsInput,
    flagConsultationEmergency,
    saveConsultationDetails,
} from '../../services/api/doctor.api';
import { useTheme } from '../../theme/ThemeContext';
import ConsultationDetailsModal from './components/ConsultationDetailsModal';
import EmergencyActionSheet from './components/EmergencyActionSheet';
import InCallToolsSheet from './components/InCallToolsSheet';
import PatientReportsModal from './components/PatientReportsModal';

const { width, height } = Dimensions.get('window');

// Doctor-only version - connected to CallContext for background persistence & in-app PiP
export default function DoctorCallScreen() {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { appointment: routeAppointment, type: routeType = 'video', displayName: displayNameParam } = route.params || {};

    const {
        activeCall,
        isInCall,
        isMinimized,
        isJoined,
        isSystemPip,
        remoteUid,
        duration,
        isMicOn,
        isVideoOn,
        isSpeakerOn,
        isEngineReady,
        joinError,
        isReconnecting,
        connectionFailed,
        consultationDraft,
        startCall,
        minimizeCall,
        endCall,
        toggleMic,
        toggleVideo,
        toggleSpeaker,
        toggleCameraSwitch,
        retryConnection,
        setConsultationDraft,
        formatDuration,
    } = useCall();

    const appointment = routeAppointment || activeCall?.appointment;
    const type = routeType || activeCall?.type || 'video';
    const isVoiceMode = type === 'voice';

    const displayName = displayNameParam || activeCall?.displayName || appointment?.patientDetails?.name
        || appointment?.actionMeta?.patientName || 'Consultation';

    const [isControlsVisible] = useState(true);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showToolsSheet, setShowToolsSheet] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [showReportsModal, setShowReportsModal] = useState(false);
    const [showEmergencySheet, setShowEmergencySheet] = useState(false);

    // Status Modal State
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
        message: ''
    });

    const showStatus = (type: StatusType, title: string, message: string, primaryAction?: () => void, primaryActionText?: string) => {
        setStatus({ visible: true, type, title, message, primaryAction, primaryActionText });
    };

    const hideStatus = () => setStatus(prev => ({ ...prev, visible: false }));

    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 15000);
        return () => clearInterval(interval);
    }, []);

    const noShowMinutesLeft = appointment?.noShowCutoffAt
        ? Math.max(0, Math.ceil((new Date(appointment.noShowCutoffAt).getTime() - now) / 60000))
        : null;

    // Draggable Logic for Self View

    const SELF_VIEW_WIDTH = 100;
    const SELF_VIEW_HEIGHT = 140;
    const ACTION_BAR_HEIGHT = 80 + insets.bottom;
    const TOP_BAR_LIMIT = insets.top;

    const lastPosition = useRef({ x: width - SELF_VIEW_WIDTH - 16, y: height - ACTION_BAR_HEIGHT - SELF_VIEW_HEIGHT }).current;
    const pan = useRef(new Animated.ValueXY({ x: lastPosition.x, y: lastPosition.y })).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => { },
            onPanResponderMove: (e, gesture) => {
                let newX = lastPosition.x + gesture.dx;
                let newY = lastPosition.y + gesture.dy;
                newX = Math.max(0, Math.min(newX, width - SELF_VIEW_WIDTH));
                newY = Math.max(TOP_BAR_LIMIT, Math.min(newY, height - ACTION_BAR_HEIGHT - SELF_VIEW_HEIGHT));
                pan.setValue({ x: newX, y: newY });
            },
            onPanResponderRelease: (e, gesture) => {
                lastPosition.x += gesture.dx;
                lastPosition.y += gesture.dy;
                lastPosition.x = Math.max(0, Math.min(lastPosition.x, width - SELF_VIEW_WIDTH));
                lastPosition.y = Math.max(TOP_BAR_LIMIT, Math.min(lastPosition.y, height - ACTION_BAR_HEIGHT - SELF_VIEW_HEIGHT));
                pan.setValue({ x: lastPosition.x, y: lastPosition.y });
            },
        })
    ).current;

    // Initialize call if not already active
    useEffect(() => {
        if (!isInCall && appointment) {
            startCall({
                appointment,
                type,
                displayName,
            });
        }
    }, [isInCall, appointment]);

    // Handle Android hardware back press -> minimize to PiP instead of dropping call
    useEffect(() => {
        const onBackPress = () => {
            minimizeCall();
            return true;
        };
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const handleEndCall = () => {
        showStatus(
            'warning',
            'End Consultation?',
            'Are you sure you want to hang up?',
            () => {
                hideStatus();
                endCall();
                if (appointment?.requestId) {
                    setShowCompleteModal(true);
                } else {
                    navigation.goBack();
                }
            },
            'End Call'
        );
    };

    const handleCompleteConsultation = async (details: ConsultationDetailsInput) => {
        setShowCompleteModal(false);
        if (!appointment?.requestId) {
            navigation.goBack();
        } else {
            try {
                await completeAppointmentRequest(appointment.requestId, details);
                navigation.goBack();
            } catch (error: any) {
                showStatus(
                    'error',
                    'Could Not Complete',
                    error?.response?.data?.message || 'The call ended, but we could not save this yet. You can complete it from the appointment details screen.',
                    () => { hideStatus(); navigation.goBack(); },
                    'OK'
                );
            }
        }
    };

    // "Send Prescription Now" from the in-call draft modal - unlike
    // completing the consultation, the call keeps running; this only
    // notifies the patient and files an interim Medical Records entry for
    // whatever's in the draft right now. Never rejects (the modal's
    // onSendNow contract expects that) - failures are surfaced here via
    // the status modal instead.
    const handleSendPrescriptionNow = async (details: ConsultationDetailsInput) => {
        if (!appointment?.requestId) return;
        try {
            await saveConsultationDetails({ requestId: appointment.requestId, ...details, notifyPatient: true });
            showStatus('success', 'Prescription Sent', 'The patient has been notified and can view it under Medical Records.');
        } catch (error: any) {
            showStatus(
                'error',
                'Could Not Send',
                error?.response?.data?.message || 'Could not send the prescription right now. It\'s still saved as a draft - please try again.'
            );
        }
    };

    // Never rejects - EmergencyActionSheet expects that (the doctor gets a
    // calm "notified" confirmation regardless; the direct-dial numbers in
    // that sheet are what actually gets help, not this network call).
    const handleNotifySafetyTeam = async () => {
        if (!appointment?.requestId) return;
        try {
            await flagConsultationEmergency(appointment.requestId);
        } catch (error) {
            console.warn('Failed to notify clinical safety team', error);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Remote Feed */}
            <View style={styles.fullScreenVideo}>
                {remoteUid ? (
                    <VideoRender
                        key={`remote-${remoteUid}`}
                        canvas={{ uid: remoteUid, renderMode: RenderModeType.RenderModeHidden }}
                        style={styles.videoStream}
                    />
                ) : (
                    <View style={[styles.placeholderStream, { paddingBottom: isSystemPip ? 0 : ACTION_BAR_HEIGHT }]}>
                        <View style={styles.avatarLarge}><Text style={styles.avatarTextLarge}>{displayName.charAt(0)}</Text></View>
                        <Text style={styles.connectingText}>
                            {joinError || (isJoined ? `Waiting for ${displayName} to join...` : 'Connecting...')}
                        </Text>
                        {!isSystemPip && isJoined && !joinError && noShowMinutesLeft !== null && (
                            <Text style={styles.noShowNotice}>
                                {noShowMinutesLeft > 0
                                    ? `If ${displayName} doesn't join within ${noShowMinutesLeft} min, the consultation fee will be retained.`
                                    : 'The check-in window is closing - this consultation will be resolved automatically shortly.'}
                            </Text>
                        )}
                    </View>
                )}
            </View>

            {/* Connection Lost Overlay (Hidden in system PiP) */}
            {!isSystemPip && connectionFailed && (
                <View style={styles.connectionLostOverlay}>
                    <View style={styles.avatarLarge}><Text style={styles.avatarTextLarge}>{displayName.charAt(0)}</Text></View>
                    <Text style={styles.connectionLostTitle}>Connection Lost</Text>
                    <Text style={styles.connectionLostText}>We couldn't reconnect you to the call. Check your network and try again.</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={retryConnection}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Reconnecting Banner (Hidden in system PiP) */}
            {!isSystemPip && isReconnecting && !connectionFailed && (
                <View style={[styles.reconnectingBanner, { top: insets.top + 70 }]}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.reconnectingText}>Reconnecting...</Text>
                </View>
            )}

            {/* System PiP Header Pill */}
            {isSystemPip && (
                <View style={styles.timerBadgePipTop}>
                    <View style={styles.greenPulseDot} />
                    <Text style={styles.timerBadgePipText}>{formatDuration(duration)}</Text>
                </View>
            )}

            {/* Top Bar (Hidden in system PiP) */}
            {!isSystemPip && isControlsVisible && (
                <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                    <View style={styles.topBarContent}>
                        <TouchableOpacity style={styles.backButton} onPress={minimizeCall}>
                            <ChevronLeft size={28} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.topDoctorName}>{displayName}</Text>
                        <View style={styles.topBarRight}>
                            <BlurView intensity={20} tint="light" style={styles.timerPill}>
                                <Text style={styles.timerTextMain}>{formatDuration(duration)}</Text>
                            </BlurView>
                            <TouchableOpacity style={styles.toolsButton} onPress={() => setShowToolsSheet(true)}>
                                <MoreHorizontal size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Doctor Self View */}
            {!isVoiceMode && (
                isSystemPip ? (
                    // In Android System PiP, position neatly in top-right corner
                    <View style={styles.selfViewContainerPip}>
                        {isVideoOn && isEngineReady ? (
                            <VideoRender
                                key={`local-feed-pip-${isJoined}`}
                                canvas={{ uid: 0, renderMode: RenderModeType.RenderModeHidden }}
                                style={styles.videoStream}
                            />
                        ) : (
                            <View style={styles.selfViewCameraOff}>
                                <VideoOff size={16} color="#94A3B8" />
                            </View>
                        )}
                    </View>
                ) : (
                    // In Normal Fullscreen Mode, movable draggable preview
                    <Animated.View style={[styles.selfViewContainer, { transform: pan.getTranslateTransform() }]} {...panResponder.panHandlers}>
                        <View style={[styles.liveBadge, !isVideoOn && styles.offBadge]}>
                            <Text style={styles.liveBadgeText}>{isVideoOn ? 'YOU' : 'OFF'}</Text>
                        </View>

                        {isVideoOn && (
                            <TouchableOpacity
                                style={styles.floatingSwitchCamBtn}
                                onPress={toggleCameraSwitch}
                                activeOpacity={0.8}
                            >
                                <SwitchCamera size={13} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}

                        {isVideoOn && isEngineReady ? (
                            <VideoRender
                                key={`local-feed-${isJoined}`}
                                canvas={{ uid: 0, renderMode: RenderModeType.RenderModeHidden }}
                                style={styles.videoStream}
                            />
                        ) : (
                            <View style={styles.selfViewCameraOff}>
                                <View style={styles.cameraOffCircle}>
                                    <VideoOff size={22} color="#94A3B8" />
                                </View>
                                <Text style={styles.cameraOffText}>Camera Off</Text>
                            </View>
                        )}
                    </Animated.View>
                )
            )}

            {/* Action Bar (Hidden in system PiP) */}
            {!isSystemPip && isControlsVisible && (
                <View
                    style={[
                        styles.actionRowBackground,
                        {
                            backgroundColor: isDark ? '#16222F' : '#FFFFFF',
                            borderTopColor: isDark ? '#27384A' : '#E2E8F0',
                            paddingBottom: Math.max(insets.bottom, 16),
                        },
                    ]}
                >
                    {/* Mic Button */}
                    <TouchableOpacity
                        style={[
                            styles.iconCircle,
                            { backgroundColor: !isMicOn ? (isDark ? '#451A1A' : '#FEE2E2') : (isDark ? '#1E2D3D' : '#F1F5F9') },
                        ]}
                        onPress={toggleMic}
                    >
                        {isMicOn ? <Mic size={22} color={isDark ? '#F8FAFC' : '#0F172A'} /> : <MicOff size={22} color="#EF4444" />}
                    </TouchableOpacity>

                    {/* Video Button */}
                    {!isVoiceMode && (
                        <TouchableOpacity
                            style={[
                                styles.iconCircle,
                                { backgroundColor: !isVideoOn ? (isDark ? '#451A1A' : '#FEE2E2') : (isDark ? '#1E2D3D' : '#F1F5F9') },
                            ]}
                            onPress={toggleVideo}
                        >
                            {isVideoOn ? <VideoIcon size={22} color={isDark ? '#F8FAFC' : '#0F172A'} /> : <VideoOff size={22} color="#EF4444" />}
                        </TouchableOpacity>
                    )}

                    {/* End Call Button (Center) */}
                    <TouchableOpacity
                        style={styles.endCallButton}
                        onPress={handleEndCall}
                        activeOpacity={0.8}
                    >
                        <PhoneOff size={26} color="#fff" />
                    </TouchableOpacity>

                    {/* Switch Camera Button */}
                    {!isVoiceMode && (
                        <TouchableOpacity
                            style={[
                                styles.iconCircle,
                                { backgroundColor: isDark ? '#1E2D3D' : '#F1F5F9' },
                                !isVideoOn && { opacity: 0.35 },
                            ]}
                            onPress={toggleCameraSwitch}
                            disabled={!isVideoOn}
                        >
                            <SwitchCamera size={22} color={isVideoOn ? (isDark ? '#F8FAFC' : '#0F172A') : (isDark ? '#64748B' : '#94A3B8')} />
                        </TouchableOpacity>
                    )}

                    {/* Speaker Button */}
                    <TouchableOpacity
                        style={[
                            styles.iconCircle,
                            { backgroundColor: isSpeakerOn ? (isDark ? '#0F2F2C' : '#E6FAF6') : (isDark ? '#1E2D3D' : '#F1F5F9') },
                        ]}
                        onPress={toggleSpeaker}
                    >
                        {isSpeakerOn ? <Volume2 size={22} color="#0FBBA1" /> : <VolumeX size={22} color={isDark ? '#94A3B8' : '#64748B'} />}
                    </TouchableOpacity>
                </View>
            )}

            {/* Modals (Only in normal mode) */}
            {!isSystemPip && (
                <>
                    <StatusModal
                        visible={status.visible}
                        status={status.type}
                        title={status.title}
                        message={status.message}
                        onClose={hideStatus}
                        primaryAction={status.primaryAction}
                        primaryActionText={status.primaryActionText}
                    />

                    <ConsultationDetailsModal
                        visible={showCompleteModal}
                        onClose={() => { setShowCompleteModal(false); navigation.goBack(); }}
                        onSubmit={handleCompleteConsultation}
                        initialData={consultationDraft}
                    />

                    <InCallToolsSheet
                        visible={showToolsSheet}
                        onClose={() => setShowToolsSheet(false)}
                        onOpenNotes={() => { setShowToolsSheet(false); setShowNotesModal(true); }}
                        onOpenReports={() => { setShowToolsSheet(false); setShowReportsModal(true); }}
                        onComplete={() => { setShowToolsSheet(false); handleEndCall(); }}
                        onEmergency={() => { setShowToolsSheet(false); setShowEmergencySheet(true); }}
                    />

                    <EmergencyActionSheet
                        visible={showEmergencySheet}
                        onClose={() => setShowEmergencySheet(false)}
                        onNotifySafetyTeam={handleNotifySafetyTeam}
                    />

                    <ConsultationDetailsModal
                        visible={showNotesModal}
                        mode="draft"
                        onClose={() => setShowNotesModal(false)}
                        onSubmit={async () => { }}
                        initialData={consultationDraft}
                        onSaveDraft={setConsultationDraft}
                        onSendNow={handleSendPrescriptionNow}
                    />

                    <PatientReportsModal
                        visible={showReportsModal}
                        onClose={() => setShowReportsModal(false)}
                        customerId={appointment?.customerId}
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    fullScreenVideo: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    videoStream: { width: '100%', height: '100%' },
    placeholderStream: { width: '100%', height: '100%', backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
    avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    avatarTextLarge: { fontSize: 40, color: '#9CA3AF', fontWeight: '700' },
    connectingText: { color: '#9CA3AF', fontSize: 16, fontWeight: '500', paddingHorizontal: 32, textAlign: 'center' },
    noShowNotice: { color: '#6B7280', fontSize: 13, fontWeight: '500', paddingHorizontal: 40, textAlign: 'center', marginTop: 12, lineHeight: 18 },
    connectionLostOverlay: {
        position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 40,
        backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
    },
    connectionLostTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
    connectionLostText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    retryButton: { backgroundColor: '#0FBBA1', borderRadius: 24, paddingHorizontal: 28, paddingVertical: 12, marginTop: 20 },
    retryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    reconnectingBanner: {
        position: 'absolute', alignSelf: 'center', zIndex: 45,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    },
    reconnectingText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    topBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    topDoctorName: { color: '#fff', fontSize: 18, fontWeight: '700' },
    timerPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, overflow: 'hidden' },
    timerTextMain: { color: '#fff', fontSize: 14, fontWeight: '600' },
    topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    toolsButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    timerBadgePipTop: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        zIndex: 50,
    },
    greenPulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    timerBadgePipText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    selfViewContainerPip: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 50,
        height: 70,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.7)',
        backgroundColor: '#1E293B',
        zIndex: 50,
        elevation: 6,
    },
    selfViewContainer: {
        position: 'absolute',
        width: 100,
        height: 140,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)',
        backgroundColor: '#1E293B',
        zIndex: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    selfViewCameraOff: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    cameraOffCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    cameraOffText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '600',
        textAlign: 'center',
    },
    liveBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(47, 165, 97, 0.9)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        zIndex: 60,
    },
    offBadge: {
        backgroundColor: 'rgba(100, 116, 139, 0.9)',
    },
    liveBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
    floatingSwitchCamBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
    },

    actionRowBackground: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        paddingTop: 16,
        paddingHorizontal: 8,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    endCallButton: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
