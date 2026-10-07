import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { bootSuccess } from '../../bootstrap/boot.slice';
import { AppDispatch, RootState } from '../../redux/store';
import { logout as logoutRedux } from '../../redux/slices/authSlice';
import { clearRequired } from '../../redux/slices/legalSlice';
import { acceptLegalDocuments, LegalDocumentType } from '../../services/api/legal.api';
import { getFCMToken } from '../../utils/deviceUtils';
import { clearToken } from '../../utils/tokenManagement';
import { logoutApi } from '../../services/api/auth.api';
import { unregisterDeviceToken } from '../../services/api/pushNotification.api';
import { isSnoozed, setSnoozeUntil } from '../../services/storage/legalStorage';
import LegalDocumentModal from './LegalDocumentModal';

const SNOOZE_HOURS = 6;

// Renders unconditionally at the RootNavigator tier - decides for itself
// whether to show by reading legal.required from Redux and checking the
// local snooze timestamp, rather than being prop-controlled by a parent.
export default function LegalAcceptanceModal() {
    const dispatch = useDispatch<AppDispatch>();
    const required = useSelector((state: RootState) => state.legal.required);
    const checked = useSelector((state: RootState) => state.legal.checked);

    const [snoozed, setSnoozed] = useState(true);
    const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
    const [docModalType, setDocModalType] = useState<LegalDocumentType | null>(null);

    useEffect(() => {
        if (!required) {
            setSnoozed(true);
            return;
        }
        let cancelled = false;
        isSnoozed().then((result) => {
            if (!cancelled) setSnoozed(result);
        });
        return () => {
            cancelled = true;
        };
    }, [required]);

    const visible = checked && required && !snoozed && !busy;

    const handleAccept = async () => {
        setBusy('accept');
        try {
            await acceptLegalDocuments();
            dispatch(clearRequired());
        } catch {
            // Leave `required` as-is - the modal simply stays up and the
            // user can try again, rather than silently pretending it worked.
        } finally {
            setBusy(null);
        }
    };

    const handleRemindLater = async () => {
        await setSnoozeUntil(SNOOZE_HOURS);
        setSnoozed(true);
    };

    const handleDecline = async () => {
        setBusy('decline');
        try {
            await logoutApi();
            const fcmToken = await getFCMToken();
            if (fcmToken) {
                await unregisterDeviceToken(fcmToken).catch(() => {});
            }
        } catch {
            // Fall through - still clear local state so the user isn't stuck logged in.
        } finally {
            await clearToken('access_token');
            dispatch(logoutRedux());
            dispatch(bootSuccess({ isAuthenticated: false }));
            setBusy(null);
        }
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.title}>Terms & Privacy Updated</Text>
                    <Text style={styles.message}>
                        We've updated our Terms of Service and Privacy Policy. Please review and accept to keep using Medicoo Doctors.
                    </Text>

                    <View style={styles.linksRow}>
                        <TouchableOpacity onPress={() => setDocModalType('terms')}>
                            <Text style={styles.linkText}>Read Terms of Service</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDocModalType('privacy')}>
                            <Text style={styles.linkText}>Read Privacy Policy</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, styles.acceptButton]}
                        onPress={handleAccept}
                        disabled={!!busy}
                    >
                        {busy === 'accept' ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.acceptButtonText}>Accept & Continue</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.laterButton]}
                        onPress={handleRemindLater}
                        disabled={!!busy}
                    >
                        <Text style={styles.laterButtonText}>Remind Me Later</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.declineButton]}
                        onPress={handleDecline}
                        disabled={!!busy}
                    >
                        {busy === 'decline' ? (
                            <ActivityIndicator color="#EF4444" />
                        ) : (
                            <Text style={styles.declineButtonText}>Decline & Log Out</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <LegalDocumentModal
                visible={!!docModalType}
                documentType={docModalType}
                onClose={() => setDocModalType(null)}
            />
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
    linksRow: {
        marginTop: 16,
        gap: 8,
    },
    linkText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#2563EB',
    },
    button: {
        marginTop: 12,
        paddingVertical: 13,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: '#0FBBA1',
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    laterButton: {
        backgroundColor: '#F3F4F6',
    },
    laterButtonText: {
        color: '#374151',
        fontSize: 15,
        fontWeight: '700',
    },
    declineButton: {
        backgroundColor: '#FEF2F2',
    },
    declineButtonText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '700',
    },
});
