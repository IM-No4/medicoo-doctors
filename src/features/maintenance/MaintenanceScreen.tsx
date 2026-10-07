import { Wrench } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

            <View style={styles.iconCircle}>
                <Wrench size={40} color="#0FBBA1" />
            </View>

            <Text style={styles.title}>{maintenance?.title || 'Under Maintenance'}</Text>
            <Text style={styles.message}>
                {maintenance?.message || "We're performing scheduled maintenance. Please try again shortly."}
            </Text>

            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleRetry} disabled={retrying}>
                {retrying ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
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
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        lineHeight: 21,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 36,
    },
    primaryButton: {
        width: '100%',
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#0FBBA1',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
