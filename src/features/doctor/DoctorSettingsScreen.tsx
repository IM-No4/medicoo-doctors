import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import {
    ArrowUpCircle,
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    FileText,
    Globe,
    Moon,
    Smartphone,
    Star,
    Sun,
    UserCog,
    Wallet
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import LanguagePickerModal from '../../components/modals/LanguagePickerModal';
import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { RootState } from '../../redux/store';
import { getDoctorProfile, updateDoctorSettings } from '../../services/api/user.api';
import { ThemeMode } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';
import { useLogout } from '../auth/useLogout';

export default function DoctorSettingsScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const handleLogout = useLogout();
    const update = useSelector((state: RootState) => state.appConfig.update);
    const { theme, isDark, themeMode, setThemeMode } = useTheme();
    const { t, currentLanguageInfo } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [languageModalVisible, setLanguageModalVisible] = useState(false);

    // State
    const [isOnline, setIsOnline] = useState(false);
    const [fees, setFees] = useState({
        chat: { fee: 0, isEnabled: false },
        voice: { fee: 0, isEnabled: false },
        video: { fee: 0, isEnabled: false },
    });
    const [currency, setCurrency] = useState('INR');
    const [initialSettings, setInitialSettings] = useState<any>(null);

    // Status Modal State
    const [status, setStatus] = useState<{
        visible: boolean;
        type: StatusType;
        title: string;
        message: string;
    }>({
        visible: false,
        type: 'idle',
        title: '',
        message: ''
    });

    const showStatus = (type: StatusType, title: string, message: string) => {
        setStatus({ visible: true, type, title, message });
    };

    const hideStatus = () => setStatus(prev => ({ ...prev, visible: false }));

    useFocusEffect(
        useCallback(() => {
            fetchSettings();
        }, [])
    );

    const hasChanges = useCallback(() => {
        if (!initialSettings) return false;

        const currentData = { isOnline, fees, currency };
        const initialData = {
            isOnline: initialSettings.isOnline,
            fees: initialSettings.fees,
            currency: initialSettings.currency
        };

        return JSON.stringify(currentData) !== JSON.stringify(initialData);
    }, [isOnline, fees, currency, initialSettings]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const profile = await getDoctorProfile();
            if (profile) {
                // Normalize data to handle Mongoose response structure
                const data = {
                    ...profile,
                    ...(profile._doc || {}), // Flatten _doc if present
                };

                // Extract Online Status
                const practiceStatus = profile.practiceStatus || data.practiceStatus || {};
                const onlineStatus = practiceStatus.isOnline ?? false;
                setIsOnline(onlineStatus);

                // Extract Fees - approvedProfile first (live data), then root/doc (draft/current)
                const profileFees = profile.approvedProfile?.consultationFees || data.consultationFees || {};

                const loadedFees = {
                    chat: profileFees.chat || { fee: 0, isEnabled: false },
                    voice: profileFees.voice || { fee: 0, isEnabled: false },
                    video: profileFees.video || { fee: 0, isEnabled: false },
                };
                setFees(loadedFees);

                const loadedCurrency = profileFees.currency || 'INR';
                setCurrency(loadedCurrency);

                setInitialSettings({
                    isOnline: onlineStatus,
                    fees: loadedFees,
                    currency: loadedCurrency
                });
            }
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                isOnline,
                consultationFees: {
                    currency,
                    ...fees
                }
            };

            await updateDoctorSettings(payload);
            showStatus('success', 'Settings Saved', 'Your practice availability and consultation fees have been updated successfully.');
            setInitialSettings({ isOnline, fees, currency });
        } catch {
            showStatus('error', 'Update Failed', 'We couldn\'t save your settings. Please check your internet connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    const toggleFeeEnabled = (type: 'chat' | 'voice' | 'video') => {
        setFees(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                isEnabled: !prev[type].isEnabled
            }
        }));
    };

    const updateFeeAmount = (type: 'chat' | 'voice' | 'video', amount: string) => {
        const num = parseInt(amount) || 0;
        setFees(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                fee: num
            }
        }));
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color="#0FBBA1" />
            </View>
        );
    }

    const themeOptions: { mode: ThemeMode; label: string; icon: any }[] = [
        { mode: 'light', label: 'Light', icon: Sun },
        { mode: 'dark', label: 'Dark', icon: Moon },
        { mode: 'system', label: 'System', icon: Smartphone },
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: theme.card,
                        borderBottomColor: theme.border,
                        paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 4),
                    },
                ]}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
                    <ChevronLeft size={22} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Doctor Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={{ paddingBottom: 100 }}>

                        {/* Status Card */}
                        <View
                            style={[
                                styles.card,
                                {
                                    backgroundColor: isOnline
                                        ? (isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5')
                                        : theme.card,
                                    borderColor: isOnline ? '#059669' : theme.border,
                                    borderWidth: 1,
                                },
                            ]}
                        >
                            <View style={styles.statusRow}>
                                <View style={styles.statusInfo}>
                                    <View style={styles.statusHeader}>
                                        {isOnline ? <Sun size={24} color="#059669" /> : <Moon size={24} color={theme.textMuted} />}
                                        <Text style={[styles.statusTitle, { color: isOnline ? '#059669' : theme.text }]}>
                                            {isOnline ? 'You are Online' : 'You are Offline'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.statusDesc, { color: theme.textSecondary }]}>
                                        {isOnline
                                            ? 'Patients can currently request appointments with you.'
                                            : 'You are not visible for new immediate appointments.'}
                                    </Text>
                                </View>
                                <Switch
                                    value={isOnline}
                                    onValueChange={setIsOnline}
                                    trackColor={{ false: theme.inputBorder, true: '#A7F3D0' }}
                                    thumbColor={isOnline ? '#0FBBA1' : theme.textMuted}
                                />
                            </View>
                        </View>

                        {/* Preferences & Appearance Section */}
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>App Preferences</Text>
                        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                            {/* Theme Selector */}
                            <View style={styles.preferenceRow}>
                                <View style={styles.preferenceInfo}>
                                    <Text style={[styles.feeLabel, { color: theme.text }]}>Appearance / Theme</Text>
                                    <Text style={[styles.feeSub, { color: theme.textSecondary }]}>Choose your preferred app theme</Text>
                                </View>
                            </View>

                            <View style={styles.themeSelectorGroup}>
                                {themeOptions.map((opt) => {
                                    const IconComponent = opt.icon;
                                    const isSelected = themeMode === opt.mode;
                                    return (
                                        <TouchableOpacity
                                            key={opt.mode}
                                            style={[
                                                styles.themeOptionBtn,
                                                {
                                                    backgroundColor: isSelected
                                                        ? '#0FBBA1'
                                                        : (isDark ? '#262626' : '#F3F4F6'),
                                                    borderColor: isSelected ? '#0FBBA1' : theme.border,
                                                },
                                            ]}
                                            onPress={() => setThemeMode(opt.mode)}
                                            activeOpacity={0.8}
                                        >
                                            <IconComponent
                                                size={16}
                                                color={isSelected ? '#FFFFFF' : theme.textSecondary}
                                            />
                                            <Text
                                                style={[
                                                    styles.themeOptionText,
                                                    {
                                                        color: isSelected ? '#FFFFFF' : theme.text,
                                                        fontWeight: isSelected ? '700' : '500',
                                                    },
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            {/* Language Selector */}
                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => setLanguageModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.actionLeft}>
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                        <Globe size={20} color={theme.textSecondary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.actionText, { color: theme.text }]}>Language</Text>
                                        <Text style={[styles.feeSub, { color: theme.textSecondary }]}>
                                            {currentLanguageInfo.flag} {currentLanguageInfo.name} ({currentLanguageInfo.nativeName})
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight size={20} color={theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Consultation Fees */}
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Consultation Fees</Text>
                        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                            {['video', 'voice', 'chat'].map((type, idx) => {
                                const t = type as 'video' | 'voice' | 'chat';
                                const item = fees[t];

                                return (
                                    <View
                                        key={type}
                                        style={[
                                            styles.feeRow,
                                            {
                                                borderBottomColor: theme.border,
                                                borderBottomWidth: idx === 2 ? 0 : 1,
                                            },
                                        ]}
                                    >
                                        <View style={styles.feeInfo}>
                                            <Text style={[styles.feeLabel, { color: theme.text }]}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)} Consultation
                                            </Text>
                                            <Text style={[styles.feeSub, { color: theme.textSecondary }]}>Set your fee for {type} calls</Text>
                                        </View>

                                        <View style={styles.feeControls}>
                                            {item.isEnabled && (
                                                <View
                                                    style={[
                                                        styles.inputWrap,
                                                        {
                                                            backgroundColor: theme.inputBg,
                                                            borderColor: theme.inputBorder,
                                                        },
                                                    ]}
                                                >
                                                    <Text style={[styles.currency, { color: theme.textSecondary }]}>₹</Text>
                                                    <TextInput
                                                        style={[styles.feeInput, { color: theme.text }]}
                                                        value={item.fee.toString()}
                                                        onChangeText={(v) => updateFeeAmount(t, v)}
                                                        keyboardType="numeric"
                                                        maxLength={5}
                                                    />
                                                </View>
                                            )}
                                            <Switch
                                                value={item.isEnabled}
                                                onValueChange={() => toggleFeeEnabled(t)}
                                                trackColor={{ false: theme.inputBorder, true: '#BBF7D0' }}
                                                thumbColor={item.isEnabled ? '#0FBBA1' : '#fff'}
                                            />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Managing Profile */}
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Profile & Practice Management</Text>
                        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => navigation.navigate('DoctorOnboarding', { isEdit: true })}
                            >
                                <View style={styles.actionLeft}>
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                        <UserCog size={20} color={theme.textSecondary} />
                                    </View>
                                    <Text style={[styles.actionText, { color: theme.text }]}>Edit Profile Details</Text>
                                </View>
                                <ChevronRight size={20} color={theme.textMuted} />
                            </TouchableOpacity>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => navigation.navigate('ManageAppointments')}
                            >
                                <View style={styles.actionLeft}>
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                        <CalendarCheck size={20} color={theme.textSecondary} />
                                    </View>
                                    <Text style={[styles.actionText, { color: theme.text }]}>Manage Appointments</Text>
                                </View>
                                <ChevronRight size={20} color={theme.textMuted} />
                            </TouchableOpacity>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => navigation.navigate('ManageAvailability')}
                            >
                                <View style={styles.actionLeft}>
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                        <FileText size={20} color={theme.textSecondary} />
                                    </View>
                                    <Text style={[styles.actionText, { color: theme.text }]}>Manage Availability</Text>
                                </View>
                                <ChevronRight size={20} color={theme.textMuted} />
                            </TouchableOpacity>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => navigation.navigate('DoctorEarnings')}
                            >
                                <View style={styles.actionLeft}>
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                        <Wallet size={20} color={theme.textSecondary} />
                                    </View>
                                    <Text style={[styles.actionText, { color: theme.text }]}>Earnings</Text>
                                </View>
                                <ChevronRight size={20} color={theme.textMuted} />
                            </TouchableOpacity>

                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            <TouchableOpacity
                                style={styles.actionRow}
                                onPress={() => navigation.navigate('DoctorReviews')}
                            >
                                <View style={styles.actionLeft}>
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#262626' : '#F3F4F6' }]}>
                                        <Star size={20} color={theme.textSecondary} />
                                    </View>
                                    <Text style={[styles.actionText, { color: theme.text }]}>Reviews & Ratings</Text>
                                </View>
                                <ChevronRight size={20} color={theme.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {/* Always visible whenever a newer version exists, independent
                            of whether the optional-update popup was dismissed - see
                            UpdateAvailableModal for that separate, version-keyed prompt. */}
                        {update?.updateAvailable && (
                            <TouchableOpacity
                                style={styles.updateCard}
                                activeOpacity={0.8}
                                onPress={() => {
                                    if (update.storeUrl) Linking.openURL(update.storeUrl).catch(() => {});
                                }}
                            >
                                <ArrowUpCircle size={22} color="#0FBBA1" />
                                <View style={styles.updateCardTextWrap}>
                                    <Text style={styles.updateCardTitle}>Update Available</Text>
                                    <Text style={styles.updateCardSubtitle}>
                                        A newer version is available{update.latestVersion ? ` (${update.latestVersion})` : ''}.
                                    </Text>
                                </View>
                                <ChevronRight size={18} color="#0FBBA1" />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[styles.logoutRow, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2' }]} onPress={handleLogout}>
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* Footer Save Button */}
                {hasChanges() && (
                    <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom + 16 }]}>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

            </KeyboardAvoidingView>

            {/* Language Picker Modal */}
            <LanguagePickerModal
                visible={languageModalVisible}
                onClose={() => setLanguageModalVisible(false)}
            />

            {/* Status Modal */}
            <StatusModal
                visible={status.visible}
                status={status.type}
                title={status.title}
                message={status.message}
                onClose={hideStatus}
                autoCloseDelay={status.type === 'success' ? 2500 : undefined}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 2 },
        }),
    },
    backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

    content: {
        padding: 20,
        paddingBottom: 100
    },

    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 6,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
        overflow: 'hidden'
    },

    // Status Card
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16
    },
    statusInfo: { flex: 1, paddingRight: 16 },
    statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    statusTitle: { fontSize: 16, fontWeight: '700' },
    statusDesc: { fontSize: 13, lineHeight: 18 },

    // Sections
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 10,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.6
    },

    // Preference
    preferenceRow: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 8,
    },
    preferenceInfo: {
        marginBottom: 4,
    },
    themeSelectorGroup: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    themeOptionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    themeOptionText: {
        fontSize: 13,
    },

    // Fees
    feeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    feeInfo: { flex: 1 },
    feeLabel: { fontSize: 15, fontWeight: '600' },
    feeSub: { fontSize: 12, marginTop: 2 },
    feeControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        height: 40,
        width: 90
    },
    currency: { fontSize: 14, marginRight: 4 },
    feeInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        paddingVertical: 0,
        height: '100%'
    },

    // Profile Actions
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16
    },
    actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    actionText: { fontSize: 15, fontWeight: '600' },
    divider: { height: 1, marginLeft: 64 },
    logoutRow: {
        marginTop: 8,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 12,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#DC2626',
    },

    updateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#ECFDF9',
        borderWidth: 1,
        borderColor: '#CBF5EB',
    },
    updateCardTextWrap: { flex: 1 },
    updateCardTitle: { fontSize: 14, fontWeight: '700', color: '#0C8E78' },
    updateCardSubtitle: { fontSize: 12, color: '#4B9A8C', marginTop: 2 },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    saveButton: {
        backgroundColor: '#0FBBA1',
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0FBBA1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4
    },
    saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' }
});
