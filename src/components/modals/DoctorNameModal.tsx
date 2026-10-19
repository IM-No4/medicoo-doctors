import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { updateDoctorEmail, updateDoctorName } from '../../services/api/user.api';
import type { ThemeColors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
    visible: boolean;
    /** Which details are missing from the doctor's account. */
    needName: boolean;
    needEmail: boolean;
    onSaved: (saved: { name?: string; email?: string }) => void;
    onLater: () => void;
}

const EMAIL_RE = /^[^s@]+@[^s@]+.[^s@]{2,}$/;

// For doctors onboarded before the app asked for a name / contact email: patients
// would otherwise see them without a name, and new-request alerts could not reach
// them by email while logged out. Saves straight to the account, no re-review.
export default function DoctorNameModal({ visible, needName, needEmail, onSaved, onLater }: Props) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const cleaned = name.replace(/^dr\.?\s+/i, '').trim();
    const cleanedEmail = email.trim();

    const save = async () => {
        if (needName && (cleaned.length < 2 || /\d/.test(cleaned))) {
            setError('Please enter your full name using letters only.');
            return;
        }
        if (needEmail && !EMAIL_RE.test(cleanedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const saved: { name?: string; email?: string } = {};
            if (needName) saved.name = (await updateDoctorName(cleaned))?.name || cleaned;
            if (needEmail) saved.email = (await updateDoctorEmail(cleanedEmail))?.email || cleanedEmail;
            onSaved(saved);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Could not save your details. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onLater}>
            <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.card}>
                    <Text style={styles.title}>{needName ? 'Complete your details' : 'Add your email'}</Text>
                    <Text style={styles.subtitle}>
                        {needName
                            ? 'Patients see your name when they browse doctors and book consultations. '
                            : ''}
                        {needEmail
                            ? 'We also email you every new appointment request, so you never miss one when the app is logged out.'
                            : ''}
                    </Text>

                    {needName && (
                        <>
                            <Text style={styles.label}>Full name</Text>
                            <TextInput
                                style={[styles.input, !!error && styles.inputError]}
                                placeholder="e.g. Priya Sharma"
                                placeholderTextColor={theme.textMuted}
                                value={name}
                                onChangeText={(t) => { setName(t); if (error) setError(''); }}
                                autoCapitalize="words"
                                autoCorrect={false}
                                maxLength={80}
                                editable={!saving}
                            />
                            <Text style={styles.preview}>Patients will see: Dr. {cleaned || 'Your Name'}</Text>
                        </>
                    )}

                    {needEmail && (
                        <>
                            <Text style={[styles.label, needName && { marginTop: 14 }]}>Email</Text>
                            <TextInput
                                style={[styles.input, !!error && styles.inputError]}
                                placeholder="you@example.com"
                                placeholderTextColor={theme.textMuted}
                                value={email}
                                onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                maxLength={120}
                                editable={!saving}
                            />
                        </>
                    )}
                    {!!error && <Text style={styles.error}>{error}</Text>}

                    <TouchableOpacity style={[styles.primary, saving && { opacity: 0.7 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onLater} disabled={saving} style={styles.later}>
                        <Text style={styles.laterText}>Not now</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const createStyles = (c: ThemeColors) => StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 420, backgroundColor: c.card, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: c.border },
    title: { fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 6 },
    subtitle: { fontSize: 13.5, lineHeight: 20, color: c.textSecondary, marginBottom: 18 },
    label: { fontSize: 13, fontWeight: '700', color: c.text, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: c.inputBorder, backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, height: 48, fontSize: 15, color: c.text },
    inputError: { borderColor: c.error },
    preview: { fontSize: 12, color: c.textMuted, marginTop: 8 },
    error: { fontSize: 12.5, color: c.error, marginTop: 8 },
    primary: { marginTop: 18, height: 50, borderRadius: 14, backgroundColor: '#0FBBA1', alignItems: 'center', justifyContent: 'center' },
    primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    later: { marginTop: 8, alignItems: 'center', paddingVertical: 10 },
    laterText: { fontSize: 13.5, fontWeight: '600', color: c.textSecondary },
});
