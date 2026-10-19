import { Bell } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';

import { RootState } from '../../redux/store';
import {
    getNotificationPermissionStatus,
    requestNotificationPermission,
} from '../../utils/deviceUtils';
import {
    hasShownNotificationPrompt,
    markNotificationPromptShown,
} from '../../services/storage/notificationPromptStorage';

// Renders unconditionally at the RootNavigator tier, same convention as
// LegalAcceptanceModal - decides for itself whether to show. Only ever
// shows once per install: if the OS permission is already
// granted/provisional, or already denied (nagging would be pointless -
// the system dialog won't reappear; DoctorSettingsScreen's status row is
// where a denied doctor goes to fix it), or the doctor already saw this
// prompt before, it stays hidden. Also waits out the (rare) terms/privacy
// re-acceptance gate so the two modals never stack.
export default function NotificationPermissionModal() {
    const legalRequired = useSelector((state: RootState) => state.legal.required && state.legal.checked);
    const [visible, setVisible] = useState(false);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        if (legalRequired) return;
        let cancelled = false;
        (async () => {
            const [alreadyShown, status] = await Promise.all([
                hasShownNotificationPrompt(),
                getNotificationPermissionStatus(),
            ]);
            if (!cancelled && !alreadyShown && status === 'not-determined') {
                setVisible(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [legalRequired]);

    const dismiss = async () => {
        setVisible(false);
        await markNotificationPromptShown();
    };

    const handleEnable = async () => {
        setRequesting(true);
        try {
            await requestNotificationPermission();
        } finally {
            setRequesting(false);
            await dismiss();
        }
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <View style={styles.iconBadge}>
                        <Bell size={24} color="#0FBBA1" />
                    </View>
                    <Text style={styles.title}>Stay on Top of Your Practice</Text>
                    <Text style={styles.message}>
                        Turn on notifications to get notified instantly about new appointment requests, patient messages, and payout confirmations.
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, styles.enableButton, requesting && { opacity: 0.7 }]}
                        onPress={handleEnable}
                        disabled={requesting}
                    >
                        <Text style={styles.enableButtonText}>Enable Notifications</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.laterButton]} onPress={dismiss} disabled={requesting}>
                        <Text style={styles.laterButtonText}>Not Now</Text>
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
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    iconBadge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#ECFDF9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
    },
    message: {
        marginTop: 8,
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
        textAlign: 'center',
    },
    button: {
        marginTop: 16,
        width: '100%',
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    enableButton: {
        backgroundColor: '#0FBBA1',
    },
    enableButtonText: {
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
