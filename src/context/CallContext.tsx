import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    ConnectionStateType,
    IRtcEngine,
} from 'react-native-agora';
import { navigationRef } from '../navigation/navigationRef';
import { getCallToken, getDoctorAppointmentRequestDetail, saveConsultationDetails } from '../services/api/doctor.api';
import { pipService } from '../services/pipService';

// How long to wait after the last edit before autosaving the draft to the
// backend - long enough that a doctor typing continuously doesn't fire a
// request per keystroke, short enough that a dropped call/crash loses at
// most a few seconds of work instead of the whole draft.
const DRAFT_AUTOSAVE_DEBOUNCE_MS = 3000;

export interface ConsultationDraft {
    notes: string;
    prescribedMedicines: any[];
    prescribedLabTests: any[];
}

const EMPTY_DRAFT: ConsultationDraft = { notes: '', prescribedMedicines: [], prescribedLabTests: [] };

export interface ActiveCallData {
    appointment: any;
    type: 'video' | 'voice';
    displayName: string;
}

interface CallContextType {
    activeCall: ActiveCallData | null;
    isInCall: boolean;
    isMinimized: boolean;
    isJoined: boolean;
    isSystemPip: boolean;
    remoteUid: number | null;
    duration: number;
    isMicOn: boolean;
    isVideoOn: boolean;
    isSpeakerOn: boolean;
    isEngineReady: boolean;
    joinError: string | null;
    isReconnecting: boolean;
    connectionFailed: boolean;
    consultationDraft: ConsultationDraft;
    engine: React.MutableRefObject<IRtcEngine | null>;
    startCall: (data: ActiveCallData) => Promise<void>;
    minimizeCall: () => void;
    maximizeCall: () => void;
    endCall: () => void;
    toggleMic: () => void;
    toggleVideo: () => void;
    toggleSpeaker: () => void;
    toggleCameraSwitch: () => void;
    retryConnection: () => Promise<void>;
    setConsultationDraft: (draft: ConsultationDraft) => void;
    formatDuration: (seconds: number) => string;
}

const CallContext = createContext<CallContextType | null>(null);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeCall, setActiveCall] = useState<ActiveCallData | null>(null);
    const [isInCall, setIsInCall] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isSystemPip, setIsSystemPip] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [duration, setDuration] = useState(0);

    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [connectionFailed, setConnectionFailed] = useState(false);
    const [consultationDraft, setConsultationDraft] = useState<ConsultationDraft>(EMPTY_DRAFT);

    const engine = useRef<IRtcEngine | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const activeCallRef = useRef<ActiveCallData | null>(null);
    const isInCallRef = useRef<boolean>(false);

    activeCallRef.current = activeCall;
    isInCallRef.current = isInCall;

    // Call duration timer
    useEffect(() => {
        if (isInCall && isJoined) {
            timerRef.current = setInterval(() => {
                setDuration((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isInCall, isJoined]);

    // Autosave the consultation draft during an active call - the only
    // other place it's persisted is the final "Complete Consultation"/
    // "Send Prescription Now" submit, which could be many minutes away
    // from when the doctor actually wrote it. Silent by design: no
    // notification, no PDF, just enough that a dropped call or a crashed
    // app doesn't lose the draft (DoctorCallScreen fetches it back on
    // mount for the same requestId).
    const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }

        const requestId = activeCall?.appointment?.requestId;
        if (!isInCall || !requestId) return;

        const hasContent =
            consultationDraft.notes.trim().length > 0 ||
            consultationDraft.prescribedMedicines.length > 0 ||
            consultationDraft.prescribedLabTests.length > 0;
        if (!hasContent) return;

        autosaveTimerRef.current = setTimeout(() => {
            saveConsultationDetails({
                requestId,
                notes: consultationDraft.notes,
                prescribedMedicines: consultationDraft.prescribedMedicines,
                prescribedLabTests: consultationDraft.prescribedLabTests,
            }).catch((error) => {
                // Non-blocking - the call itself must never be interrupted
                // by an autosave failure. The next edit's autosave tick (or
                // the final complete/send-now submit) will catch up.
                console.warn('Consultation draft autosave failed', error);
            });
        }, DRAFT_AUTOSAVE_DEBOUNCE_MS);

        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
                autosaveTimerRef.current = null;
            }
        };
    }, [consultationDraft, isInCall, activeCall]);

    // Listen to native Android PiP events
    useEffect(() => {
        const pipSub = pipService.addPipModeListener((inPip) => {
            if (isInCallRef.current) {
                setIsSystemPip(inPip);
                if (inPip) {
                    setIsMinimized(false);
                } else {
                    // Restoring from system PiP -> maximize call screen
                    const call = activeCallRef.current;
                    if (call && navigationRef.isReady()) {
                        navigationRef.navigate('DoctorCall', {
                            appointment: call.appointment,
                            type: call.type,
                            displayName: call.displayName,
                        });
                    }
                }
            } else {
                setIsSystemPip(false);
            }
        });

        const leaveSub = pipService.addUserLeaveListener(() => {
            // User pressed Home/swiped away ONLY if there is an active ongoing call
            if (isInCallRef.current && activeCallRef.current && navigationRef.isReady()) {
                setIsMinimized(false);
                navigationRef.navigate('DoctorCall', {
                    appointment: activeCallRef.current.appointment,
                    type: activeCallRef.current.type,
                    displayName: activeCallRef.current.displayName,
                });
            }
        });

        return () => {
            pipSub.remove();
            leaveSub.remove();
        };
    }, []);

    const requestPermissions = async (isVoiceMode: boolean): Promise<boolean> => {
        if (Platform.OS !== 'android') return true;
        const permissions = isVoiceMode
            ? [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
            : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, PermissionsAndroid.PERMISSIONS.CAMERA];

        const results = await PermissionsAndroid.requestMultiple(permissions);
        return permissions.every((permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED);
    };

    const startCall = async (data: ActiveCallData) => {
        try {
            const isVoice = data.type === 'voice';
            // A genuinely new call (different appointment) must never
            // inherit the previous patient's draft. Cleared immediately
            // (not left showing stale content while the fetch below is in
            // flight), then replaced with whatever was actually
            // autosaved for this specific requestId, if anything - that's
            // what makes autosave actually useful for recovery: a crashed
            // app or a force-closed call screen loses nothing once the
            // doctor reopens this same appointment's call.
            // retryConnection calls startCall again for the SAME
            // appointment (after a dropped connection), so the requestId
            // comparison is what tells the two cases apart - a retry must
            // keep whatever the doctor already typed this session, not
            // reset or refetch over it.
            const requestId = data.appointment?.requestId;
            const isSameAppointment = activeCallRef.current?.appointment?.requestId === requestId;
            if (!isSameAppointment) {
                setConsultationDraft(EMPTY_DRAFT);
                if (requestId) {
                    getDoctorAppointmentRequestDetail(requestId)
                        .then((res) => {
                            const recovered = res?.data?.consultationDetails;
                            if (!recovered) return;
                            const hasRecoveredContent =
                                (recovered.notes && recovered.notes.trim().length > 0) ||
                                (recovered.prescribedMedicines || []).length > 0 ||
                                (recovered.prescribedLabTests || []).length > 0;
                            // Only overwrite if this is still the same call by
                            // the time the fetch resolves (the doctor could
                            // have already ended it, or started a different
                            // one, while this was in flight).
                            if (hasRecoveredContent && activeCallRef.current?.appointment?.requestId === requestId) {
                                setConsultationDraft({
                                    notes: recovered.notes || '',
                                    prescribedMedicines: recovered.prescribedMedicines || [],
                                    prescribedLabTests: recovered.prescribedLabTests || [],
                                });
                            }
                        })
                        .catch((error) => {
                            // Non-blocking - worst case, the doctor starts
                            // this call with a blank draft, same as before
                            // autosave/recovery existed.
                            console.warn('Failed to recover consultation draft', error);
                        });
                }
            }
            setActiveCall(data);
            activeCallRef.current = data;
            setIsInCall(true);
            isInCallRef.current = true;
            setIsMinimized(false);
            setDuration(0);
            setIsMicOn(true);
            setIsVideoOn(!isVoice);
            setIsSpeakerOn(true);
            setJoinError(null);
            setConnectionFailed(false);
            setIsReconnecting(false);

            // Inform native layer that call is active so Android PiP is enabled
            pipService.setCallActive(true);

            if (!data.appointment?.requestId) {
                setJoinError('This consultation could not be identified.');
                return;
            }

            const { appId, channelName, token, uid } = await getCallToken(data.appointment.requestId);

            const permissionsGranted = await requestPermissions(isVoice);
            if (!permissionsGranted) {
                setJoinError(
                    isVoice
                        ? 'Microphone access is required for this call. Please enable it in device settings.'
                        : 'Camera and microphone access are required for this call. Please enable them in device settings.'
                );
                return;
            }

            // Cleanup previous engine if any
            if (engine.current) {
                try {
                    engine.current.leaveChannel();
                    engine.current.release();
                } catch (_) {}
            }

            const rtcEngine = createAgoraRtcEngine();
            engine.current = rtcEngine;
            rtcEngine.initialize({ appId, channelProfile: ChannelProfileType.ChannelProfileCommunication });

            rtcEngine.registerEventHandler({
                onJoinChannelSuccess: () => {
                    setIsJoined(true);
                    setConnectionFailed(false);
                },
                onUserJoined: (_conn, remoteJoinedUid) => {
                    setRemoteUid(remoteJoinedUid);
                },
                onUserOffline: () => {
                    setRemoteUid(null);
                },
                onConnectionStateChanged: (_conn, state) => {
                    if (state === ConnectionStateType.ConnectionStateReconnecting) {
                        setIsReconnecting(true);
                    } else if (state === ConnectionStateType.ConnectionStateConnected) {
                        setIsReconnecting(false);
                        setConnectionFailed(false);
                    } else if (state === ConnectionStateType.ConnectionStateFailed) {
                        setIsReconnecting(false);
                        setConnectionFailed(true);
                    }
                },
            });

            rtcEngine.enableAudio();
            if (!isVoice) {
                rtcEngine.enableVideo();
                rtcEngine.startPreview();
            }

            setIsEngineReady(true);

            rtcEngine.joinChannel(token, channelName, uid, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                publishCameraTrack: !isVoice,
                publishMicrophoneTrack: true,
                autoSubscribeAudio: true,
                autoSubscribeVideo: true,
            });
        } catch (e: any) {
            console.error('Agora Setup Error in CallProvider', e);
            setJoinError(e?.response?.data?.message || 'Could not connect to the call. Please try again.');
        }
    };

    const minimizeCall = () => {
        setIsMinimized(true);
        if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'DoctorCall') {
            navigationRef.goBack();
        }
    };

    const maximizeCall = () => {
        setIsMinimized(false);
        const call = activeCall || activeCallRef.current;
        if (call && navigationRef.isReady()) {
            navigationRef.navigate('DoctorCall', {
                appointment: call.appointment,
                type: call.type,
                displayName: call.displayName,
            });
        }
    };

    const endCall = () => {
        pipService.setCallActive(false);
        try {
            if (engine.current) {
                engine.current.leaveChannel();
                engine.current.release();
                engine.current = null;
            }
        } catch (e) {
            console.warn('Error during leaveChannel', e);
        }
        setIsInCall(false);
        isInCallRef.current = false;
        setActiveCall(null);
        activeCallRef.current = null;
        setIsJoined(false);
        setIsEngineReady(false);
        setIsMinimized(false);
        setIsSystemPip(false);
        setRemoteUid(null);
        setJoinError(null);
        setDuration(0);
    };

    const toggleMic = () => {
        const next = !isMicOn;
        setIsMicOn(next);
        if (engine.current) {
            engine.current.muteLocalAudioStream(!next);
            engine.current.enableLocalAudio(next);
        }
    };

    const toggleVideo = () => {
        const next = !isVideoOn;
        setIsVideoOn(next);
        if (engine.current) {
            engine.current.muteLocalVideoStream(!next);
            engine.current.enableLocalVideo(next);
            if (next) {
                engine.current.startPreview();
            } else {
                engine.current.stopPreview();
            }
        }
    };

    const toggleSpeaker = () => {
        const next = !isSpeakerOn;
        setIsSpeakerOn(next);
        if (engine.current) {
            engine.current.setEnableSpeakerphone(next);
        }
    };

    const toggleCameraSwitch = () => {
        if (isVideoOn && engine.current) {
            try {
                engine.current.switchCamera();
            } catch (e) {
                console.warn('Switch camera error', e);
            }
        }
    };

    const retryConnection = async () => {
        if (!activeCall) return;
        setConnectionFailed(false);
        setJoinError(null);
        setRemoteUid(null);
        await startCall(activeCall);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <CallContext.Provider
            value={{
                activeCall,
                isInCall,
                isMinimized,
                isSystemPip,
                isJoined,
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
                engine,
                startCall,
                minimizeCall,
                maximizeCall,
                endCall,
                toggleMic,
                toggleVideo,
                toggleSpeaker,
                toggleCameraSwitch,
                retryConnection,
                setConsultationDraft,
                formatDuration,
            }}
        >
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};
