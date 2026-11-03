import { AlertTriangle, Phone, ShieldAlert, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    // Logs the event on the backend and notifies Medicoo's clinical safety
    // team - never rejects (errors are swallowed internally, since the
    // doctor should get a calm confirmation either way; the direct-dial
    // numbers below are what actually gets help, not this).
    onNotifySafetyTeam: () => Promise<void>;
}

// Real version of what the support FAQ/policy copy calls "Emergency
// Protocol" - deliberately honest about what it does: quick access to
// real emergency numbers (India), plus a best-effort notification to
// Medicoo's own clinical safety team for follow-up. It does NOT claim to
// dispatch an ambulance or connect to EMS directly - this app has no real
// integration with any emergency-services system, and implying otherwise
// would be more dangerous than having no button at all.
export default function EmergencyActionSheet({ visible, onClose, onNotifySafetyTeam }: Props) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const [notifying, setNotifying] = useState(false);
    const [notified, setNotified] = useState(false);

    const handleCall = (number: string) => {
        Linking.openURL(`tel:${number}`).catch(() => {});
    };

    const handleNotify = async () => {
        setNotifying(true);
        try {
            await onNotifySafetyTeam();
            setNotified(true);
        } finally {
            setNotifying(false);
        }
    };

    const handleClose = () => {
        setNotified(false);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
                <View
                    style={[
                        styles.content,
                        {
                            backgroundColor: isDark ? theme.card : '#FFFFFF',
                            paddingBottom: Math.max(insets.bottom, 16) + 12,
                        },
                    ]}
                >
                    <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1' }]} />

                    <View style={styles.header}>
                        <View style={[styles.headerIcon, { backgroundColor: theme.errorBg }]}>
                            <AlertTriangle size={22} color="#EF4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: isDark ? theme.text : '#012233' }]}>Emergency Assistance</Text>
                            <Text style={[styles.subtitle, { color: isDark ? theme.textSecondary : '#64748B' }]}>
                                For a suspected patient medical emergency
                            </Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: isDark ? theme.cardSecondary : '#F1F5F9' }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={18} color={isDark ? theme.textSecondary : '#64748B'} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.callCard, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}
                        onPress={() => handleCall('112')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.callIconBox, { backgroundColor: '#EF4444' }]}>
                            <Phone size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.callTitle, { color: theme.error }]}>National Emergency - 112</Text>
                            <Text style={[styles.callSub, { color: theme.error }]}>Tap to call</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.callCard, { backgroundColor: theme.errorBg, borderColor: theme.errorBorder }]}
                        onPress={() => handleCall('108')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.callIconBox, { backgroundColor: '#EF4444' }]}>
                            <Phone size={18} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.callTitle, { color: theme.error }]}>Ambulance - 108</Text>
                            <Text style={[styles.callSub, { color: theme.error }]}>Tap to call</Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.sectionLabel, { color: isDark ? theme.textSecondary : '#64748B' }]}>
                        Also notify Medicoo
                    </Text>
                    <TouchableOpacity
                        style={[
                            styles.notifyCard,
                            {
                                backgroundColor: notified ? (theme.successBg) : (isDark ? theme.cardSecondary : '#F8FAFC'),
                                borderColor: notified ? '#0FBBA1' : (isDark ? theme.border : '#E2E8F0'),
                            },
                        ]}
                        onPress={handleNotify}
                        disabled={notifying || notified}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.callIconBox, { backgroundColor: notified ? '#0FBBA1' : (theme.border) }]}>
                            <ShieldAlert size={18} color={notified ? '#FFFFFF' : (isDark ? theme.textSecondary : '#64748B')} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.callTitle, { color: isDark ? theme.text : '#012233' }]}>
                                {notified ? 'Safety team notified' : notifying ? 'Notifying...' : 'Notify Clinical Safety Team'}
                            </Text>
                            <Text style={[styles.callSub, { color: isDark ? theme.textSecondary : '#64748B' }]}>
                                {notified
                                    ? 'This consultation has been flagged for follow-up'
                                    : 'Logs this consultation for our team to follow up - this does not call emergency services'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    content: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 10,
    },
    handle: { width: 38, height: 4.5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
    headerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '700' },
    subtitle: { fontSize: 12.5, marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    callCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
    callIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    callTitle: { fontSize: 14.5, fontWeight: '700' },
    callSub: { fontSize: 12, marginTop: 2 },
    sectionLabel: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
    notifyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
});
