import { ArrowUpCircle } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Linking, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import { runBootSequence } from '../../bootstrap/BootCoordinator';
import { AppDispatch, RootState } from '../../redux/store';

// Shown by RootNavigator instead of the normal Auth/Main stacks while
// boot.status === 'mandatoryUpdate' - see BootCoordinator.ts. No
// skip/later option by design: the installed build is below the backend's
// minimumSupportedVersion, and there's no safe way to let the doctor past
// that. Re-checks the moment the app returns to foreground (e.g. right
// after updating from the store and reopening) rather than requiring a
// manual retry.
export default function MandatoryUpdateScreen() {
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch<AppDispatch>();
    const update = useSelector((state: RootState) => state.appConfig.update);
    const [checking, setChecking] = useState(false);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && next === 'active') {
                setChecking(true);
                runBootSequence(dispatch, { showLoadingState: false }).finally(() => setChecking(false));
            }
            appState.current = next;
        });
        return () => subscription.remove();
    }, [dispatch]);

    const handleUpdateNow = () => {
        if (update?.storeUrl) {
            Linking.openURL(update.storeUrl).catch(() => {});
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={styles.iconCircle}>
                <ArrowUpCircle size={44} color="#0FBBA1" />
            </View>

            <Text style={styles.title}>Update Required</Text>
            <Text style={styles.message}>
                A new version of the Medicoo Doctors app is required to continue. Please update from the
                {update?.storeUrl ? ' store' : ' app/play store'} to keep using it.
            </Text>
            {update?.latestVersion ? (
                <Text style={styles.versionText}>Latest version: {update.latestVersion}</Text>
            ) : null}

            <TouchableOpacity
                style={[styles.primaryButton, !update?.storeUrl && styles.primaryButtonDisabled]}
                activeOpacity={0.85}
                onPress={handleUpdateNow}
                disabled={!update?.storeUrl}
            >
                <Text style={styles.primaryButtonText}>Update Now</Text>
            </TouchableOpacity>

            {checking && (
                <View style={styles.checkingRow}>
                    <ActivityIndicator size="small" color="#9CA3AF" />
                    <Text style={styles.checkingText}>Checking your version...</Text>
                </View>
            )}
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
        marginBottom: 12,
    },
    versionText: {
        fontSize: 13,
        color: '#9CA3AF',
        marginBottom: 28,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#0FBBA1',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.5,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    checkingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
    },
    checkingText: {
        fontSize: 13,
        color: '#9CA3AF',
    },
});
