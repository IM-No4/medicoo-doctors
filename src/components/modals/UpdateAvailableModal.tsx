import React, { useEffect, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';

import { RootState } from '../../redux/store';
import { getDismissedVersion, setDismissedVersion } from '../../services/storage/updateStorage';

// Renders unconditionally at the RootNavigator tier (same as
// LegalAcceptanceModal) - decides for itself whether to show by reading
// appConfig.update from Redux and checking whether this exact latest
// version was already dismissed. "Later" stores the version string, not a
// boolean, so a future, newer release makes this eligible to show again
// automatically.
export default function UpdateAvailableModal() {
    const update = useSelector((state: RootState) => state.appConfig.update);
    const [dismissedVersion, setDismissedVersionState] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        if (!update?.updateAvailable) return;
        let cancelled = false;
        getDismissedVersion().then((v) => {
            if (!cancelled) setDismissedVersionState(v);
        });
        return () => {
            cancelled = true;
        };
    }, [update?.updateAvailable, update?.latestVersion]);

    const visible = Boolean(
        update?.updateAvailable &&
        !update.updateRequired &&
        dismissedVersion !== undefined &&
        dismissedVersion !== update.latestVersion
    );

    const handleUpdateNow = () => {
        if (update?.storeUrl) {
            Linking.openURL(update.storeUrl).catch(() => {});
        }
    };

    const handleLater = async () => {
        if (update?.latestVersion) {
            await setDismissedVersion(update.latestVersion);
        }
        setDismissedVersionState(update?.latestVersion ?? null);
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Update Available</Text>
                    <Text style={styles.message}>
                        A new version of the Medicoo Doctors app is available{update?.latestVersion ? ` (${update.latestVersion})` : ''}.
                        Update now to get the latest improvements.
                    </Text>

                    <TouchableOpacity style={[styles.button, styles.updateButton]} onPress={handleUpdateNow}>
                        <Text style={styles.updateButtonText}>Update Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.laterButton]} onPress={handleLater}>
                        <Text style={styles.laterButtonText}>Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    message: {
        marginTop: 8,
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    button: {
        marginTop: 16,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    updateButton: {
        backgroundColor: '#0FBBA1',
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    laterButton: {
        backgroundColor: '#F3F4F6',
        marginTop: 10,
    },
    laterButtonText: {
        color: '#374151',
        fontSize: 15,
        fontWeight: '700',
    },
});
