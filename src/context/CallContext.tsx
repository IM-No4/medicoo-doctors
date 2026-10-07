import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    ConnectionStateType,
    IRtcEngine,
} from 'react-native-agora';
import { navigationRef } from '../navigation/navigationRef';
import { getCallToken } from '../services/api/doctor.api';
import { pipService } from '../services/pipService';

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
