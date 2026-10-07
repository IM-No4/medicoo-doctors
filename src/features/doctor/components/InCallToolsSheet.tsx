import { ChevronRight, CheckCircle2, FileText, FlaskConical, Pill, X } from 'lucide-react-native';
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
}: Props) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();

    // Keep Android bottom system navigation bar in sync with the active theme
    useEffect(() => {
        if (Platform.OS === 'android' && visible) {
            if (isDark) {
                NavigationBar.setBackgroundColorAsync('#080E17');
                NavigationBar.setButtonStyleAsync('light');
            } else {
                NavigationBar.setBackgroundColorAsync('#FFFFFF');
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
            iconColor: '#0FBBA1',
            iconBg: isDark ? '#0F2F2C' : '#E6FAF6',
            onPress: onOpenPrescription || onOpenNotes,
        },
        {
            key: 'lab_test',
            title: 'Diagnostic Lab Tests',
            description: 'Order lab investigations, bloodwork & scans',
            Icon: FlaskConical,
            iconColor: '#8B5CF6',
            iconBg: isDark ? '#2E1065' : '#F3E8FF',
            onPress: onOpenLabTests || onOpenNotes,
        },
        {
            key: 'notes',
            title: 'Clinical Notes & Diagnosis',
            description: 'Record symptoms, diagnosis, advice & observations',
            Icon: FileText,
            iconColor: '#F59E0B',
            iconBg: isDark ? '#451A03' : '#FEF3C7',
            onPress: onOpenNotes,
        },
        {
            key: 'reports',
            title: 'Patient Reports & Records',
            description: 'View uploaded test results, history & previous documents',
            Icon: FileText,
            iconColor: '#3B82F6',
            iconBg: isDark ? '#1E3A8A' : '#EFF6FF',
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
                            backgroundColor: isDark ? theme.card : '#FFFFFF',
                            borderTopColor: isDark ? theme.border : '#E2E8F0',
                            paddingBottom: Math.max(insets.bottom, 16) + 12,
                        },
                    ]}
                >
                    {/* Top drag handle */}
                    <View
                        style={[
                            styles.handle,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1' },
                        ]}
                    />

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTextGroup}>
                            <Text style={[styles.title, { color: isDark ? theme.text : '#0F172A' }]}>
                                Consultation Actions
                            </Text>
                            <Text style={[styles.subtitle, { color: isDark ? theme.textSecondary : '#64748B' }]}>
                                Clinical tools & patient records for this session
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[
                                styles.closeBtn,
                                { backgroundColor: isDark ? theme.cardSecondary : '#F1F5F9' },
                            ]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <X size={18} color={isDark ? theme.textSecondary : '#64748B'} />
                        </TouchableOpacity>
                    </View>

                    {/* Action Cards */}
                    <View style={styles.cardList}>
                        {toolItems.map((item) => (
                            <TouchableOpacity
                                key={item.key}
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: isDark ? theme.cardSecondary : '#F8FAFC',
                                        borderColor: isDark ? theme.border : '#E2E8F0',
                                    },
                                ]}
                                onPress={item.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                                    <item.Icon size={20} color={item.iconColor} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: isDark ? theme.text : '#0F172A' }]}>
                                        {item.title}
                                    </Text>
                                    <Text
                                        style={[styles.cardDesc, { color: isDark ? theme.textSecondary : '#64748B' }]}
                                        numberOfLines={1}
                                    >
                                        {item.description}
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={isDark ? '#64748B' : '#94A3B8'} />
                            </TouchableOpacity>
                        ))}

                        {onRequestDocs && (
                            <TouchableOpacity
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: isDark ? theme.cardSecondary : '#F8FAFC',
                                        borderColor: isDark ? theme.border : '#E2E8F0',
                                    },
                                ]}
                                onPress={onRequestDocs}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
                                    <FileText size={20} color="#3B82F6" />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: isDark ? theme.text : '#0F172A' }]}>
                                        Request Documents
                                    </Text>
                                    <Text
                                        style={[styles.cardDesc, { color: isDark ? theme.textSecondary : '#64748B' }]}
                                        numberOfLines={1}
                                    >
                                        Ask patient to upload reports or past records
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={isDark ? '#64748B' : '#94A3B8'} />
                            </TouchableOpacity>
                        )}

                        {onComplete && (
                            <TouchableOpacity
                                style={[
                                    styles.actionCard,
                                    {
                                        backgroundColor: isDark ? '#451A1A' : '#FEF2F2',
                                        borderColor: isDark ? '#7F1D1D' : '#FECACA',
                                        marginTop: 4,
                                    },
                                ]}
                                onPress={onComplete}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
                                    <CheckCircle2 size={20} color="#EF4444" />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={[styles.cardTitle, { color: isDark ? '#FCA5A5' : '#DC2626', fontWeight: '700' }]}>
                                        Complete Consultation
                                    </Text>
                                    <Text
                                        style={[styles.cardDesc, { color: isDark ? '#F87171' : '#B91C1C' }]}
                                        numberOfLines={1}
                                    >
                                        Finalize notes and complete this appointment
                                    </Text>
                                </View>
                                <ChevronRight size={18} color={isDark ? '#F87171' : '#EF4444'} />
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
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    content: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
        shadowColor: '#000',
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
