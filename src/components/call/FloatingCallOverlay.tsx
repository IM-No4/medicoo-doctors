import { VideoOff } from 'lucide-react-native';
import React, { useRef } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { RenderModeType, RtcSurfaceView, RtcTextureView } from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCall } from '../../context/CallContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VIDEO_CARD_WIDTH = 130;
const VIDEO_CARD_HEIGHT = 180;
const AUDIO_CARD_WIDTH = 185;
const AUDIO_CARD_HEIGHT = 80;

const VideoRender = Platform.OS === 'android' ? RtcTextureView : RtcSurfaceView;

export default function FloatingCallOverlay() {
    const insets = useSafeAreaInsets();
    const {
        isInCall,
        isMinimized,
        isSystemPip,
        activeCall,
        isJoined,
        remoteUid,
        duration,
        isVideoOn,
        isEngineReady,
        maximizeCall,
        formatDuration,
    } = useCall();

    const isVideoMode = activeCall?.type === 'video';
    const cardWidth = isVideoMode ? VIDEO_CARD_WIDTH : AUDIO_CARD_WIDTH;
    const cardHeight = isVideoMode ? VIDEO_CARD_HEIGHT : AUDIO_CARD_HEIGHT;

    const topLimit = insets.top + 10;
    const bottomLimit = SCREEN_HEIGHT - insets.bottom - cardHeight - 20;
    const rightLimit = SCREEN_WIDTH - cardWidth - 16;

    const lastPosition = useRef({ x: rightLimit, y: topLimit + 60 }).current;
    const pan = useRef(new Animated.ValueXY({ x: lastPosition.x, y: lastPosition.y })).current;
    const isDragging = useRef(false);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
            },
            onPanResponderGrant: () => {
                isDragging.current = false;
            },
            onPanResponderMove: (_, gestureState) => {
                if (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6) {
                    isDragging.current = true;
                }
                let nextX = lastPosition.x + gestureState.dx;
                let nextY = lastPosition.y + gestureState.dy;
                nextX = Math.max(12, Math.min(nextX, rightLimit));
                nextY = Math.max(topLimit, Math.min(nextY, bottomLimit));
                pan.setValue({ x: nextX, y: nextY });
            },
            onPanResponderRelease: (_, gestureState) => {
                if (isDragging.current && (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10)) {
                    lastPosition.x = Math.max(12, Math.min(lastPosition.x + gestureState.dx, rightLimit));
                    lastPosition.y = Math.max(topLimit, Math.min(lastPosition.y + gestureState.dy, bottomLimit));
                    // Snap to closest horizontal edge
                    const snapToX = lastPosition.x > SCREEN_WIDTH / 2 - cardWidth / 2 ? rightLimit : 12;
                    lastPosition.x = snapToX;
                    Animated.spring(pan, {
                        toValue: { x: snapToX, y: lastPosition.y },
                        useNativeDriver: false,
                        friction: 7,
                    }).start();
                } else {
                    // Tap anywhere on card -> redirect back to call screen immediately
                    maximizeCall();
                }
                isDragging.current = false;
            },
        })
    ).current;

    if (!isInCall || !activeCall) {
        return null;
    }

    const displayName = activeCall.displayName || 'Patient';

    // When in Android System PiP mode, expand to fill the entire PiP window cleanly with full video + thumbnail + timer
    if (isSystemPip) {
        return (
            <View style={styles.systemPipFullScreen}>
                {isVideoMode && remoteUid ? (
                    <VideoRender
                        key={`sys-pip-remote-${remoteUid}`}
                        canvas={{ uid: remoteUid, renderMode: RenderModeType.RenderModeHidden }}
                        style={styles.fullVideo}
                    />
                ) : (
                    <View style={styles.waitingRemoteBox}>
                        <View style={styles.waitingAvatarCircle}>
                            <Text style={styles.avatarLetter}>{displayName.charAt(0)}</Text>
                        </View>
                        <Text style={styles.waitingText} numberOfLines={1}>
                            {displayName}
                        </Text>
                    </View>
                )}

                {/* Top-Left Duration Timer Pill */}
                <View style={styles.timerBadgeTop}>
                    <View style={styles.greenPulseDot} />
                    <Text style={styles.timerBadgeText}>{formatDuration(duration)}</Text>
                </View>

                {/* Doctor's Self-View Inset Thumbnail */}
                {isVideoMode && (
                    <View style={styles.miniSelfViewContainer}>
                        {isVideoOn && isEngineReady ? (
                            <VideoRender
                                key="sys-pip-local-feed"
                                canvas={{ uid: 0, renderMode: RenderModeType.RenderModeHidden }}
                                style={styles.miniSelfVideo}
                            />
                        ) : (
                            <View style={styles.miniCameraOff}>
                                <VideoOff size={13} color="#94A3B8" />
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    }

    // When in normal app foreground, only render if minimized inside the app
    if (!isMinimized) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.floatingContainer,
                {
                    width: cardWidth,
                    height: cardHeight,
                    transform: pan.getTranslateTransform(),
                },
            ]}
            {...panResponder.panHandlers}
        >
            {isVideoMode ? (
                // Dual-Video PiP View (Remote Patient in Full Card + Doctor Self-View Inset)
                <View style={styles.videoCardInner}>
                    {/* Remote Patient Video Stream */}
                    {remoteUid ? (
                        <VideoRender
                            key={`pip-remote-${remoteUid}`}
                            canvas={{ uid: remoteUid, renderMode: RenderModeType.RenderModeHidden }}
                            style={styles.fullVideo}
                        />
                    ) : (
                        <View style={styles.waitingRemoteBox}>
                            <View style={styles.waitingAvatarCircle}>
                                <Text style={styles.avatarLetter}>{displayName.charAt(0)}</Text>
                            </View>
                            <Text style={styles.waitingText} numberOfLines={1}>
                                {displayName}
                            </Text>
                            <Text style={styles.waitingSubText}>Connecting...</Text>
                        </View>
                    )}

                    {/* Top-Left Duration Timer Pill */}
                    <View style={styles.timerBadgeTop}>
                        <View style={styles.greenPulseDot} />
                        <Text style={styles.timerBadgeText}>{formatDuration(duration)}</Text>
                    </View>

                    {/* Doctor's Self-View Inset Thumbnail (Top-Right) */}
                    <View style={styles.miniSelfViewContainer}>
                        {isVideoOn && isEngineReady ? (
                            <VideoRender
                                key="pip-local-feed"
                                canvas={{ uid: 0, renderMode: RenderModeType.RenderModeHidden }}
                                style={styles.miniSelfVideo}
                            />
                        ) : (
                            <View style={styles.miniCameraOff}>
                                <VideoOff size={13} color="#94A3B8" />
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                // Audio / Voice Call Card
                <View style={styles.audioCardInner}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarLetter}>{displayName.charAt(0)}</Text>
                        <View style={styles.activeDot} />
                    </View>
                    <View style={styles.audioCardInfo}>
                        <Text style={styles.patientNameText} numberOfLines={1}>
                            {displayName}
                        </Text>
                        <Text style={styles.timerTextMain}>
                            {isJoined ? formatDuration(duration) : 'Connecting...'}
                        </Text>
                    </View>
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    systemPipFullScreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        backgroundColor: '#0F172A',
    },
    floatingContainer: {
        position: 'absolute',
        zIndex: 9999,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.35)',
        backgroundColor: '#0F172A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 14,
    },
    videoCardInner: {
        width: '100%',
        height: '100%',
        backgroundColor: '#0F172A',
    },
    fullVideo: {
        width: '100%',
        height: '100%',
    },
    waitingRemoteBox: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    waitingAvatarCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    waitingText: {
        color: '#F8FAFC',
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    waitingSubText: {
        color: '#0FBBA1',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    timerBadgeTop: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: 'rgba(0,0,0,0.75)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        zIndex: 30,
    },
    greenPulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    timerBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    miniSelfViewContainer: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 44,
        height: 60,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.7)',
        backgroundColor: '#1E293B',
        zIndex: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    miniSelfVideo: {
        width: '100%',
        height: '100%',
    },
    miniCameraOff: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioCardInner: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1E293B',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    avatarCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    avatarLetter: {
        color: '#F8FAFC',
        fontSize: 18,
        fontWeight: '700',
    },
    activeDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 11,
        height: 11,
        borderRadius: 5.5,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#1E293B',
    },
    audioCardInfo: {
        flex: 1,
    },
    patientNameText: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2,
    },
    timerTextMain: {
        color: '#0FBBA1',
        fontSize: 12,
        fontWeight: '600',
    },
});
