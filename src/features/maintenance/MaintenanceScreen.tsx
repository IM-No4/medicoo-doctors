import { palette } from '../../theme/palette';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, ShieldCheck, Wrench } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { runBootSequence } from '../../bootstrap/BootCoordinator';
import { AppDispatch, RootState } from '../../redux/store';

// Shown by RootNavigator instead of the normal Auth/Main stacks while
// boot.status === 'maintenance' - see BootCoordinator.ts. Only ever
// reached after confirming this specific doctor has no in-progress
// consultation to protect; a doctor who does is let in restricted instead
// (see appConfigSlice's `restricted` flag), never shown this screen. No
// "continue anyway" - there's nothing to protect here.
export default function MaintenanceScreen() {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch<AppDispatch>();
    const maintenance = useSelector((state: RootState) => state.appConfig.maintenance);
    const [retrying, setRetrying] = useState(false);
    const spin = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(spin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }),
        );
        loop.start();
        return () => loop.stop();
    }, [spin]);

    const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const handleRetry = async () => {
        if (retrying) return;
        setRetrying(true);
        try {
            await runBootSequence(dispatch, { showLoadingState: false });
        } finally {
            setRetrying(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.illustration}>
                <LinearGradient
                    colors={[palette.hexE6FBF7, palette.gray50]}
                    style={styles.haloCircle}
                />
                <Animated.View style={[styles.dashRing, { transform: [{ rotate: spinDeg }] }]}>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dash,
                                { transform: [{ rotate: `${i * 30}deg` }, { translateY: -62 }] },
                            ]}
                        />
                    ))}
                </Animated.View>

                <View style={styles.iconCircle}>
                    <Wrench size={36} color={palette.primary} />
                </View>

                <View style={[styles.badge, styles.badgeClock]}>
                    <Clock size={16} color={palette.amber700} />
                </View>
                <View style={[styles.badge, styles.badgeShield]}>
                    <ShieldCheck size={16} color={palette.primary} />
                </View>
            </View>

            <Text style={styles.title}>{maintenance?.title || 'Under Maintenance'}</Text>
            <Text style={styles.message}>
                {maintenance?.message || "We're performing scheduled maintenance. Please try again shortly."}
            </Text>

            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleRetry} disabled={retrying}>
                {retrying ? (
                    <ActivityIndicator color={palette.white} size="small" />
                ) : (
                    <Text style={styles.primaryButtonText}>Try Again</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.gray50,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    illustration: {
        width: 180,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    haloCircle: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
    },
    dashRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dash: {
        position: 'absolute',
        width: 4,
        height: 10,
        borderRadius: 2,
        backgroundColor: palette.hexB9ECE3,
    },
    iconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: palette.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    badge: {
        position: 'absolute',
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: palette.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    badgeClock: {
        top: 8,
        right: 4,
    },
    badgeShield: {
        bottom: 12,
        left: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: palette.gray900,
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        lineHeight: 21,
        color: palette.gray500,
        textAlign: 'center',
        marginBottom: 36,
    },
    primaryButton: {
        width: '100%',
        flexDirection: 'row',
        gap: 8,
        backgroundColor: palette.primary,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: palette.white,
        fontSize: 16,
        fontWeight: '700',
    },
});
