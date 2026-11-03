import { palette } from '../../../theme/palette';
import { AlertTriangle, ChevronRight, CheckCircle2, FileText, FlaskConical, Pill, X } from 'lucide-react-native';
import { accent } from '../../../theme/accents';
import React, { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    onOpenNotes: () => void;
    onOpenPrescription?: () => void;
    onOpenLabTests?: () => void;
    onOpenReports: () => void;
    onRequestDocs?: () => void;
    onComplete?: () => void;
    onEmergency?: () => void;
}

export default function InCallToolsSheet({
    visible,
    onClose,
    onOpenNotes,
    onOpenPrescription,
    onOpenLabTests,
    onOpenReports,
    onRequestDocs,
    onComplete,
    onEmergency,
}: Props) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();

    // Keep Android bottom system navigation bar in sync with the active theme
    useEffect(() => {
        if (Platform.OS === 'android' && visible) {
            if (isDark) {
                NavigationBar.setBackgroundColorAsync(palette.navyDeep);
                NavigationBar.setButtonStyleAsync('light');
            } else {
                NavigationBar.setBackgroundColorAsync(palette.white);
                NavigationBar.setButtonStyleAsync('dark');
            }
        }
    }, [visible, isDark]);

    const toolItems = [
        {
            key: 'prescription',
            title: 'Prescription',
            description: 'Write & edit prescribed medications & dosage',
            Icon: Pill,
            iconColor: palette.primary,
            iconBg: theme.primaryLight,
            onPress: onOpenPrescription || onOpenNotes,
        },
        {
            key: 'lab_test',
            title: 'Diagnostic Lab Tests',
            description: 'Order lab investigations, bloodwork & scans',
            Icon: FlaskConical,
            iconColor: palette.violet500,
            iconBg: accent('violet', isDark).bg,
            onPress: onOpenLabTests || onOpenNotes,
        },
        {
            key: 'notes',
            title: 'Clinical Notes & Diagnosis',
            description: 'Record symptoms, diagnosis, advice & observations',
            Icon: FileText,
            iconColor: palette.amber500,
            iconBg: theme.warningBg,
            onPress: onOpenNotes,
        },
        {
            key: 'reports',
            title: 'Patient Reports & Records',
            description: 'View uploaded test results, history & previous documents',
            Icon: FileText,
            iconColor: palette.blue500,
            iconBg: theme.infoBg,
            onPress: onOpenReports,
        },
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View
                    style={[
                        styles.content,
                        {
                            backgroundColor: isDark ? theme.card : palette.white,
                            borderTopColor: isDark ? theme.border : palette.slate200,
                            paddingBottom: Math.max(insets.bottom, 16) + 12,
                        },
                    ]}
                >
                    {/* Top drag handle */}
                    <View
                        style={[
                            styles.handle,
                            { backgroundColor: isDark ? palette.whiteA20 : palette.slate300 },
                        ]}
                    />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTextGroup}>
                            <Text style={[styles.title, { color: isDark ? theme.text : palette.navy }]}>
                                Consultation Actions
                            </Text>
                            <Text style={[styles.subtitle, { color: isDark ? theme.textSecondary : palette.slate500 }]}>
                                Clinical tools & patient records for this session
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[
                                styles.closeBtn,
                                { backgroundColor: isDark ? theme.cardSecondary : palette.slate100 },
                            ]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <X size={18} color={isDark ? theme.textSecondary : palette.slate500} />
                        </TouchableOpacity>
                    </View>

                    {/* Action Cards */}
                    <View style={styles.cardList}>
                        {onEmergency && (
                            <TouchableOpacity
                                style={[
                                    styles.actionCard,
                                    styles.emergencyCard,
                                    { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
                                ]}
                                onPress={onEmergency}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: theme.errorBg }]}>
                                    <AlertTriangle size={20} color={palette.red500} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: theme.error, fontWeight: '700' }]}>
                                        Emergency Assistance
                                    </Text>
                                    <Text
                                        style={[styles.cardDesc, { color: theme.error }]}
                                        numberOfLines={1}
                                    >
                                        Emergency numbers & alert our clinical safety team
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={palette.red500} />
                            </TouchableOpacity>
                        )}

                        {toolItems.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: isDark ? theme.cardSecondary : palette.slate50,
                                        borderColor: isDark ? theme.border : palette.slate200,
                                    },
                                ]}
                                onPress={item.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                                    <item.Icon size={20} color={item.iconColor} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: isDark ? theme.text : palette.navy }]}>
                                        {item.title}
                                    </Text>
                                    <Text
                                        style={[styles.cardDesc, { color: isDark ? theme.textSecondary : palette.slate500 }]}
                                        numberOfLines={1}
                                    >
                                        {item.description}
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={theme.textMuted} />
                            </TouchableOpacity>
                        ))}

                        {onRequestDocs && (
                            <TouchableOpacity
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: isDark ? theme.cardSecondary : palette.slate50,
                                        borderColor: isDark ? theme.border : palette.slate200,
                                    },
                                ]}
                                onPress={onRequestDocs}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: theme.infoBg }]}>
                                    <FileText size={20} color={palette.blue500} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: isDark ? theme.text : palette.navy }]}>
                                        Request Documents
                                    </Text>
                                    <Text
                                        style={[styles.cardDesc, { color: isDark ? theme.textSecondary : palette.slate500 }]}
                                        numberOfLines={1}
                                    >
                                        Ask patient to upload reports or past records
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={theme.textMuted} />
                            </TouchableOpacity>
                        )}

                        {onComplete && (
                            <TouchableOpacity
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: theme.errorBg,
                                        borderColor: theme.errorBorder,
                                        marginTop: 4,
                                    },
                                ]}
                                onPress={onComplete}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: theme.errorBg }]}>
                                    <CheckCircle2 size={20} color={palette.red500} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: theme.error, fontWeight: '700' }]}>
                                        Complete Consultation
                                    </Text>
                                    <Text
                                        style={[styles.cardDesc, { color: theme.error }]}
                                        numberOfLines={1}
                                    >
                                        Finalize notes and complete this appointment
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={theme.error} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.blackA50 },
    content: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 12,
    },
    handle: {
        width: 38,
        height: 4.5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
    },
    headerTextGroup: {
        flex: 1,
        paddingRight: 12,
    },
    title: {
        fontSize: 19,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
        fontWeight: '400',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    cardList: {
        gap: 10,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    emergencyCard: {
        marginBottom: 4,
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    cardDesc: {
        fontSize: 12,
        fontWeight: '400',
    },
});
