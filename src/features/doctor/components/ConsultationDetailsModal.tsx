import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Clock,
    FileText,
    FlaskConical,
    Pill,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Utensils,
    X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    fetchLabTests,
    fetchMedicines,
    PrescribedLabTestInput,
    PrescribedMedicineInput,
} from '../../../services/api/doctor.api';
import { useTheme } from '../../../theme/ThemeContext';

export type ConsultationDraft = {
    notes: string;
    prescribedMedicines: PrescribedMedicineInput[];
    prescribedLabTests: PrescribedLabTestInput[];
};

interface Props {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: ConsultationDraft) => Promise<void>;
    mode?: 'complete' | 'draft' | 'chat_prescription';
    initialData?: ConsultationDraft;
    onSaveDraft?: (data: ConsultationDraft) => void;
    // Draft mode only - sends the current prescription to the patient
    // right now, while the call is still active, instead of waiting until
    // the consultation is completed. The button only appears once there's
    // at least one medicine to send.
    onSendNow?: (data: ConsultationDraft) => Promise<void>;
}

export type MedicineFormConfig = {
    formName: string;
    dosageLabel: string;
    dosageChips: string[];
    dosagePlaceholder: string;
    defaultDosage: string;
    timingChips: Array<{ label: string; short: string }>;
    defaultTiming: string;
    whenToTakeLabel: string;
    whenToTakeChips: string[];
    defaultWhenToTake: string;
    durationChips: string[];
    defaultDuration: string;
    instructionPlaceholder: string;
};

export function getMedicineFormConfig(productName: string): MedicineFormConfig {
    const name = (productName || '').toLowerCase();

    // 1. Facewash / Cleanser / Shampoo / Body Wash / Soap
    if (/\b(facewash|face\s*wash|cleanser|cleansing|shampoo|bodywash|body\s*wash|soap|face\s*foam|facial\s*wash|scrub)\b/i.test(name)) {
        return {
            formName: 'Face Wash / Cleanser',
            dosageLabel: '1. Application / Usage Amount',
            dosageChips: ['1-2 Pumps', 'Coin-sized amount', 'Pea-sized amount', 'Small amount', 'Generous amount'],
            defaultDosage: 'Coin-sized amount',
            dosagePlaceholder: 'e.g. 1-2 pumps, coin-sized amount, 1 pump',
            timingChips: [
                { label: 'Twice daily (Morning & Night)', short: 'Twice daily' },
                { label: 'Once daily at Night', short: 'Night only' },
                { label: 'Once daily (Morning)', short: 'Morning only' },
                { label: 'Alternate days', short: 'Alternate days' },
                { label: 'Twice weekly', short: 'Twice weekly' },
                { label: 'As needed', short: 'As needed' },
            ],
            defaultTiming: 'Twice daily (Morning & Night)',
            whenToTakeLabel: '3. Application Method',
            whenToTakeChips: [
                'Apply on wet face/skin, massage & rinse',
                'Leave on for 2-3 mins before rinse',
                'Gently massage on damp skin',
                'Before applying moisturiser',
            ],
            defaultWhenToTake: 'Apply on wet face/skin, massage & rinse',
            durationChips: ['2 Weeks', '1 Month', '2 Months', '3 Months', 'As directed'],
            defaultDuration: '1 Month',
            instructionPlaceholder: 'e.g. Gently massage for 60 seconds, avoid eye contact, rinse thoroughly',
        };
    }

    // 2. Topical Creams, Gels, Ointments, Lotions, Serums, Sunscreens
    if (/\b(cream|ointment|gel|emulgel|jelly|paste|liniment|topical|lotion|serum|sunscreen|moisturizer|moisturiser|derm|skin\s*cream)\b/i.test(name)) {
        return {
            formName: 'Cream / Gel / Ointment',
            dosageLabel: '1. Application Amount',
            dosageChips: ['Apply thin layer', 'Pea-sized amount', '1 Fingertip unit (FTU)', 'Dot & dab on affected area', 'Generous layer', 'Small amount'],
            defaultDosage: 'Apply thin layer',
            dosagePlaceholder: 'e.g. Thin film on affected area, 1 FTU, pea size',
            timingChips: [
                { label: 'Twice daily (Morning & Night)', short: 'Twice daily' },
                { label: 'Once daily at Night', short: 'Night only' },
                { label: 'Once daily (Morning)', short: 'Morning only' },
                { label: 'Thrice daily', short: 'Thrice daily' },
                { label: 'SOS (When itching/pain)', short: 'SOS' },
            ],
            defaultTiming: 'Twice daily (Morning & Night)',
            whenToTakeLabel: '3. Application Instructions',
            whenToTakeChips: [
                'Apply on clean, dry affected area',
                'Apply at night before sleep',
                'Apply 30 mins before sun exposure',
                'Do not rub vigorously',
                'After cleansing skin',
            ],
            defaultWhenToTake: 'Apply on clean, dry affected area',
            durationChips: ['5 Days', '7 Days', '14 Days', '1 Month', 'Until clear', 'SOS'],
            defaultDuration: '14 Days',
            instructionPlaceholder: 'e.g. Wash hands after use, avoid eye area and broken skin',
        };
    }

    // 3. Syrups, Suspensions, Oral Liquids
    if (/\b(syrup|syp|suspension|susp|liquid|oral\s*solution|elixir|mixture|drops\s*\(oral\)|pediatric\s*drops|paediatric\s*drops)\b/i.test(name)) {
        return {
            formName: 'Syrup / Suspension',
            dosageLabel: '1. Dosage Volume',
            dosageChips: ['2.5 ml (1/2 tsp)', '5 ml (1 tsp)', '7.5 ml', '10 ml (2 tsp)', '15 ml (1 tbsp)', '20 ml', '10 Drops'],
            defaultDosage: '5 ml (1 tsp)',
            dosagePlaceholder: 'e.g. 5 ml, 10 ml, 1 teaspoon',
            timingChips: [
                { label: '1 - 0 - 1 (Morning & Night)', short: '1 - 0 - 1' },
                { label: '1 - 1 - 1 (Thrice daily)', short: '1 - 1 - 1' },
                { label: '1 - 0 - 0 (Morning only)', short: '1 - 0 - 0' },
                { label: '0 - 0 - 1 (Night only)', short: '0 - 0 - 1' },
                { label: 'Every 6 hours', short: 'Every 6 hrs' },
                { label: 'SOS (When needed)', short: 'SOS' },
            ],
            defaultTiming: '1 - 0 - 1 (Morning & Night)',
            whenToTakeLabel: '3. When to Take',
            whenToTakeChips: ['After Food', 'Before Food', 'With Water', 'Bedtime'],
            defaultWhenToTake: 'After Food',
            durationChips: ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', 'SOS'],
            defaultDuration: '5 Days',
            instructionPlaceholder: 'e.g. Shake bottle well before use, use measuring cup',
        };
    }

    // 4. Drops, Inhalers, Sprays, Respules
    if (/\b(drop|drops|eye\s*drop|ear\s*drop|nasal\s*drop|spray|nasal\s*spray|inhaler|respule|respules|rotahaler|metered\s*dose|nebulizer)\b/i.test(name)) {
        return {
            formName: 'Drops / Spray / Inhaler',
            dosageLabel: '1. Dose (Drops / Puffs)',
            dosageChips: ['1-2 Drops', '1 Drop', '2 Drops', '1 Puff / Spray', '2 Puffs / Sprays', '1 Respule (Nebulization)', '3-4 Drops'],
            defaultDosage: '1-2 Drops',
            dosagePlaceholder: 'e.g. 1-2 drops, 2 puffs, 1 respule',
            timingChips: [
                { label: '1 - 0 - 1 (Morning & Night)', short: '1 - 0 - 1' },
                { label: '1 - 1 - 1 (Thrice daily)', short: '1 - 1 - 1' },
                { label: 'Once daily (Night)', short: 'Night only' },
                { label: 'Every 4-6 hours', short: 'Every 4-6 hrs' },
                { label: 'SOS (As needed for relief)', short: 'SOS' },
            ],
            defaultTiming: '1 - 0 - 1 (Morning & Night)',
            whenToTakeLabel: '3. Site & Application',
            whenToTakeChips: [
                'In affected eye / ear',
                'In both eyes / ears',
                'In each nostril',
                'Rinse mouth with water after use',
                'Before bedtime',
            ],
            defaultWhenToTake: 'In affected eye / ear',
            durationChips: ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month', 'SOS'],
            defaultDuration: '5 Days',
            instructionPlaceholder: 'e.g. Keep eyes closed 1 min after drop; rinse mouth after inhaler',
        };
    }

    // 5. Injections & Infusions
    if (/\b(inj|injection|infusion|vial|ampoule|subcutaneous|pre-filled|penfill)\b/i.test(name)) {
        return {
            formName: 'Injection / Infusion',
            dosageLabel: '1. Injection Dose',
            dosageChips: ['1 Ampoule', '1 Vial', '1 Dose (SC)', '1 Dose (IM)', '100 ml IV Infusion', '500 ml IV Infusion', '1 Pre-filled Pen'],
            defaultDosage: '1 Vial',
            dosagePlaceholder: 'e.g. 1 vial IM, 500mg IV in 100ml NS',
            timingChips: [
                { label: 'Stat (Single dose immediately)', short: 'Stat (Immediate)' },
                { label: 'Once daily (OD)', short: 'Once daily' },
                { label: 'Twice daily (BD)', short: 'Twice daily' },
                { label: 'Weekly once', short: 'Weekly' },
                { label: 'SOS / PRN', short: 'SOS' },
            ],
            defaultTiming: 'Stat (Single dose immediately)',
            whenToTakeLabel: '3. Route & Administration',
            whenToTakeChips: [
                'Under clinical supervision only',
                'Intramuscular (IM)',
                'Intravenous (IV slow)',
                'Subcutaneous (SC)',
            ],
            defaultWhenToTake: 'Under clinical supervision only',
            durationChips: ['Single Dose (Stat)', '3 Days', '5 Days', '7 Days', '14 Days'],
            defaultDuration: 'Single Dose (Stat)',
            instructionPlaceholder: 'e.g. Administer slowly IV over 30 mins, test dose recommended',
        };
    }

    // 6. Sachet / Powder / Granules
    if (/\b(sachet|powder|granules|effervescent|pwd|packet)\b/i.test(name)) {
        return {
            formName: 'Sachet / Powder',
            dosageLabel: '1. Powder / Sachet Dose',
            dosageChips: ['1 Sachet', '1/2 Sachet', '2 Sachets', '1 Scoop (30g)', '1 Teaspoon powder', '1 Effervescent Tab'],
            defaultDosage: '1 Sachet',
            dosagePlaceholder: 'e.g. 1 sachet in 200ml water',
            timingChips: [
                { label: 'Once daily', short: 'Once daily' },
                { label: 'Twice daily (Morning & Night)', short: 'Twice daily' },
                { label: 'Bedtime', short: 'Bedtime' },
                { label: 'SOS', short: 'SOS' },
            ],
            defaultTiming: 'Once daily',
            whenToTakeLabel: '3. Preparation & Timing',
            whenToTakeChips: [
                'Dissolve in glass of water',
                'Mix with warm milk',
                'After Food',
                'Before Food',
                'Drink immediately after dissolving',
            ],
            defaultWhenToTake: 'Dissolve in glass of water',
            durationChips: ['3 Days', '5 Days', '7 Days', '14 Days', '1 Month', 'SOS'],
            defaultDuration: '7 Days',
            instructionPlaceholder: 'e.g. Stir well in 200ml water and drink immediately',
        };
    }

    // 7. Capsule / Softgel
    if (/\b(cap|caps|capsule|capsules|softgel|softgels)\b/i.test(name)) {
        return {
            formName: 'Capsule',
            dosageLabel: '1. Capsule Dosage',
            dosageChips: ['1 Cap', '2 Caps', '1 Softgel', '2 Softgels'],
            defaultDosage: '1 Cap',
            dosagePlaceholder: 'e.g. 1 Cap, 2 Caps',
            timingChips: [
                { label: '1 - 0 - 1 (Morning & Night)', short: '1 - 0 - 1' },
                { label: '1 - 0 - 0 (Morning only)', short: '1 - 0 - 0' },
                { label: '0 - 0 - 1 (Night only)', short: '0 - 0 - 1' },
                { label: '1 - 1 - 1 (Thrice daily)', short: '1 - 1 - 1' },
                { label: 'Once weekly', short: 'Once weekly' },
                { label: 'SOS (As needed)', short: 'SOS' },
            ],
            defaultTiming: '1 - 0 - 1 (Morning & Night)',
            whenToTakeLabel: '3. When to Take',
            whenToTakeChips: ['After Food', 'Before Food', 'With Food', 'Bedtime', 'Empty stomach with full glass water'],
            defaultWhenToTake: 'After Food',
            durationChips: ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month', 'SOS'],
            defaultDuration: '5 Days',
            instructionPlaceholder: 'e.g. Swallow whole with water, do not crush or open',
        };
    }

    // 8. Tablet / Tab / Default
    return {
        formName: 'Tablet',
        dosageLabel: '1. Dosage Amount',
        dosageChips: ['1 Tab', '1/2 Tab', '2 Tabs', '1.5 Tabs', '1 Chewable Tab'],
        defaultDosage: '1 Tab',
        dosagePlaceholder: 'e.g. 1 Tab, 500mg, 1/2 Tab',
        timingChips: [
            { label: '1 - 0 - 1 (Morning & Night)', short: '1 - 0 - 1' },
            { label: '1 - 1 - 1 (Thrice daily)', short: '1 - 1 - 1' },
            { label: '1 - 0 - 0 (Morning only)', short: '1 - 0 - 0' },
            { label: '0 - 0 - 1 (Night only)', short: '0 - 0 - 1' },
            { label: 'Once daily', short: 'Once daily' },
            { label: 'SOS (As needed)', short: 'SOS' },
        ],
        defaultTiming: '1 - 0 - 1 (Morning & Night)',
        whenToTakeLabel: '3. When to Take',
        whenToTakeChips: ['After Food', 'Before Food', 'With Food', 'Bedtime', 'Dissolve in half glass water'],
        defaultWhenToTake: 'After Food',
        durationChips: ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month', 'SOS'],
        defaultDuration: '5 Days',
        instructionPlaceholder: 'e.g. Take with warm water, do not chew or crush',
    };
}
const DIETARY_CHIPS = [
    '❌ No spicy/fried food',
    '❌ Avoid dairy/cold drinks',
    '❌ Low salt diet',
    '❌ Avoid alcohol/smoking',
    '❌ Low sugar (Diabetic diet)',
    '💧 Drink 3L water daily',
    '🥗 High fiber / light diet',
];

const COMMON_LAB_TESTS = [
    'Complete Blood Count (CBC)',
    'Blood Sugar / HbA1c',
    'Lipid Profile',
    'Liver Function Test (LFT)',
    'Kidney Function Test (KFT)',
    'Thyroid Profile (TSH)',
    'Urine Routine & Micro',
    'Chest X-Ray',
];

export default function ConsultationDetailsModal({
    visible,
    onClose,
    onSubmit,
    mode = 'complete',
    initialData,
    onSaveDraft,
    onSendNow,
}: Props) {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();

    const [activeTab, setActiveTab] = useState<'meds' | 'labs' | 'notes'>('meds');
    const [submitting, setSubmitting] = useState(false);
    const [sendingNow, setSendingNow] = useState(false);
    const [notes, setNotes] = useState('');
    const [medicines, setMedicines] = useState<PrescribedMedicineInput[]>([]);
    const [labTests, setLabTests] = useState<PrescribedLabTestInput[]>([]);

    const [addingMedicine, setAddingMedicine] = useState(false);
    const [addingLabTest, setAddingLabTest] = useState(false);

    useEffect(() => {
        if (visible) {
            setNotes(initialData?.notes ?? '');
            setMedicines(initialData?.prescribedMedicines ?? []);
            setLabTests(initialData?.prescribedLabTests ?? []);
            setAddingMedicine(false);
            setAddingLabTest(false);
            setActiveTab('meds');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Keep Android bottom system navigation bar in sync with the active theme
    useEffect(() => {
        if (Platform.OS === 'android' && visible) {
            if (isDark) {
                NavigationBar.setBackgroundColorAsync('#080E17');
                NavigationBar.setButtonStyleAsync('light');
            } else {
                NavigationBar.setBackgroundColorAsync('#EFF2F6');
                NavigationBar.setButtonStyleAsync('dark');
            }
        }
    }, [visible, isDark]);

    const handleClose = () => {
        onSaveDraft?.({ notes, prescribedMedicines: medicines, prescribedLabTests: labTests });
        onClose();
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await onSubmit({ notes, prescribedMedicines: medicines, prescribedLabTests: labTests });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraft = () => {
        onSaveDraft?.({ notes, prescribedMedicines: medicines, prescribedLabTests: labTests });
        onClose();
    };

    // onSendNow (provided by DoctorCallScreen) is expected to handle its
    // own success/error feedback (a status toast/modal) and never reject -
    // this just drives the button's own loading state and keeps the
    // shared draft in sync, the same as a normal save, since the doctor
    // may reopen this sheet later in the same call to add more before the
    // consultation is actually completed.
    const handleSendNow = async () => {
        if (!onSendNow || medicines.length === 0) return;
        const draft = { notes, prescribedMedicines: medicines, prescribedLabTests: labTests };
        setSendingNow(true);
        await onSendNow(draft);
        setSendingNow(false);
        onSaveDraft?.(draft);
        onClose();
    };

    // Theme tokens (Clean, glowing-background flat styling matching ProfileSidebar)
    const sheetBg = isDark ? '#080E17' : '#EFF2F6';
    const cardBg = isDark ? '#111B27' : '#FFFFFF';
    const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
    const textColor = isDark ? '#E2E8F0' : '#0F172A';
    const subTextColor = isDark ? '#94A3B8' : '#64748B';
    const inputBg = isDark ? '#0D1520' : '#F1F5F9';
    const inputBorder = isDark ? '#1E2D3D' : '#E2E8F0';

    const titleText = mode === 'chat_prescription'
        ? 'Digital Prescription'
        : mode === 'draft'
        ? 'Consultation Notes'
        : 'Conclude Consultation';

    const submitButtonText = mode === 'chat_prescription'
        ? 'Send Prescription to Patient'
        : mode === 'draft'
        ? 'Save Prescription'
        : 'Finalize & Conclude Session';

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
            <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
                <View style={[styles.content, { backgroundColor: sheetBg, paddingBottom: Math.max(insets.bottom, 12) }]}>
                    {/* Top drag handle */}
                    <View style={[styles.dragHandle, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />

                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.badgeRow}>
                                <View style={styles.pillBadge}>
                                    <Pill size={13} color="#0FBBA1" />
                                    <Text style={styles.pillBadgeText}>E-Prescription & Clinical Care</Text>
                                </View>
                            </View>
                            <Text style={[styles.headerTitle, { color: textColor }]}>{titleText}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={[styles.closeBtn, { backgroundColor: cardBg, borderColor: cardBorder }]}
                            activeOpacity={0.7}
                        >
                            <X size={18} color={subTextColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Segmented Tab Bar (Scrollable & Never Clipped) */}
                    <View style={[styles.tabBarWrapper, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.tabScrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            <TouchableOpacity
                                style={[
                                    styles.tabBtn,
                                    activeTab === 'meds' && [styles.tabBtnActive, { backgroundColor: isDark ? '#1E293B' : '#E6FAF6' }],
                                ]}
                                onPress={() => setActiveTab('meds')}
                                activeOpacity={0.8}
                            >
                                <Pill size={15} color={activeTab === 'meds' ? '#0FBBA1' : subTextColor} />
                                <Text
                                    style={[
                                        styles.tabBtnText,
                                        { color: activeTab === 'meds' ? '#0FBBA1' : subTextColor },
                                        activeTab === 'meds' && { fontWeight: '800' },
                                    ]}
                                >
                                    Medicines ({medicines.length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.tabBtn,
                                    activeTab === 'labs' && [styles.tabBtnActive, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }],
                                ]}
                                onPress={() => setActiveTab('labs')}
                                activeOpacity={0.8}
                            >
                                <FlaskConical size={15} color={activeTab === 'labs' ? '#2563EB' : subTextColor} />
                                <Text
                                    style={[
                                        styles.tabBtnText,
                                        { color: activeTab === 'labs' ? '#2563EB' : subTextColor },
                                        activeTab === 'labs' && { fontWeight: '800' },
                                    ]}
                                >
                                    Lab Tests ({labTests.length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.tabBtn,
                                    activeTab === 'notes' && [styles.tabBtnActive, { backgroundColor: isDark ? '#1E293B' : '#F5F3FF' }],
                                ]}
                                onPress={() => setActiveTab('notes')}
                                activeOpacity={0.8}
                            >
                                <FileText size={15} color={activeTab === 'notes' ? '#8B5CF6' : subTextColor} />
                                <Text
                                    style={[
                                        styles.tabBtnText,
                                        { color: activeTab === 'notes' ? '#8B5CF6' : subTextColor },
                                        activeTab === 'notes' && { fontWeight: '800' },
                                    ]}
                                >
                                    Diagnosis & Notes
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Main Scroll Content */}
                    <ScrollView
                        style={styles.scrollArea}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ═══ TAB 1: MEDICINES ═══ */}
                        {activeTab === 'meds' && (
                            <View style={styles.tabSection}>
                                {!addingMedicine ? (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.addDashedCard, { backgroundColor: cardBg, borderColor: isDark ? '#0D4A40' : '#99F6E4' }]}
                                            onPress={() => setAddingMedicine(true)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.addDashedIcon}>
                                                <Plus size={18} color="#0FBBA1" strokeWidth={2.5} />
                                            </View>
                                            <Text style={styles.addDashedTitle}>+ Prescribe Medicine</Text>
                                            <Text style={[styles.addDashedSub, { color: subTextColor }]}>
                                                Search catalog or AI-assisted global database
                                            </Text>
                                        </TouchableOpacity>

                                        {medicines.length === 0 ? (
                                            <View style={[styles.emptyStateCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                                <View style={styles.emptyIconCircle}>
                                                    <Pill size={26} color="#0FBBA1" />
                                                </View>
                                                <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                                                    No Medicines Prescribed Yet
                                                </Text>
                                                <Text style={[styles.emptyStateText, { color: subTextColor }]}>
                                                    Tap the button above to search and add medications with dosage & intake instructions.
                                                </Text>
                                            </View>
                                        ) : (
                                            medicines.map((med, index) => (
                                                <View
                                                    key={`${med.medicineSku}-${index}`}
                                                    style={[
                                                        styles.medCard,
                                                        { backgroundColor: cardBg, borderColor: cardBorder },
                                                    ]}
                                                >
                                                    <View style={styles.medCardTop}>
                                                        <View style={styles.medIconBox}>
                                                            <Pill size={16} color="#0FBBA1" />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.medName, { color: textColor }]}>
                                                                {med.medicineName}
                                                            </Text>
                                                            <View style={styles.medMetaRow}>
                                                                <View style={styles.dosageBadge}>
                                                                    <Text style={styles.dosageBadgeText}>
                                                                        {med.intakeDetails.dosage}
                                                                    </Text>
                                                                </View>
                                                                <Text style={[styles.medPeriodText, { color: subTextColor }]}>
                                                                    {med.intakeDetails.period}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={styles.deleteBtn}
                                                            onPress={() => setMedicines(prev => prev.filter((_, i) => i !== index))}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Trash2 size={16} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>

                                                    {med.intakeDetails.instructions && med.intakeDetails.instructions.length > 0 && (
                                                        <View style={[styles.medInstContainer, { borderTopColor: cardBorder }]}>
                                                            {med.intakeDetails.instructions.map((inst, i) => (
                                                                <Text
                                                                    key={i}
                                                                    style={[
                                                                        styles.medInstLine,
                                                                        { color: inst.startsWith('❌') ? '#DC2626' : subTextColor },
                                                                    ]}
                                                                >
                                                                    • {inst}
                                                                </Text>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            ))
                                        )}
                                    </>
                                ) : (
                                    <AddMedicineForm
                                        isDark={isDark}
                                        onCancel={() => setAddingMedicine(false)}
                                        onAdd={(med) => {
                                            setMedicines(prev => [...prev, med]);
                                            setAddingMedicine(false);
                                        }}
                                    />
                                )}
                            </View>
                        )}

                        {/* ═══ TAB 2: LAB TESTS ═══ */}
                        {activeTab === 'labs' && (
                            <View style={styles.tabSection}>
                                {!addingLabTest ? (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.addDashedCard, { backgroundColor: cardBg, borderColor: isDark ? '#1E3A8A' : '#BFDBFE' }]}
                                            onPress={() => setAddingLabTest(true)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[styles.addDashedIcon, { backgroundColor: isDark ? '#172554' : '#EFF6FF' }]}>
                                                <Plus size={18} color="#2563EB" strokeWidth={2.5} />
                                            </View>
                                            <Text style={[styles.addDashedTitle, { color: '#2563EB' }]}>+ Order Diagnostic Lab Test</Text>
                                            <Text style={[styles.addDashedSub, { color: subTextColor }]}>
                                                Select standard blood work, imaging or diagnostic scans
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Quick Test Chips Card */}
                                        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                            <View style={styles.sectionHeaderRow}>
                                                <View style={[styles.sectionAccentBar, { backgroundColor: '#2563EB' }]} />
                                                <Text style={[styles.sectionTitle, { color: textColor }]}>
                                                    Quick Add Common Tests
                                                </Text>
                                            </View>
                                            <View style={styles.quickTestsWrap}>
                                                {COMMON_LAB_TESTS.map(testName => {
                                                    const alreadyAdded = labTests.some(t => t.testName === testName);
                                                    return (
                                                        <TouchableOpacity
                                                            key={testName}
                                                            style={[
                                                                styles.quickTestPill,
                                                                { backgroundColor: inputBg, borderColor: inputBorder },
                                                                alreadyAdded && styles.quickTestPillAdded,
                                                            ]}
                                                            onPress={() => {
                                                                if (!alreadyAdded) {
                                                                    setLabTests(prev => [...prev, { testName }]);
                                                                }
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            {alreadyAdded ? (
                                                                <Check size={13} color="#0FBBA1" />
                                                            ) : (
                                                                <Plus size={13} color="#2563EB" />
                                                            )}
                                                            <Text
                                                                style={[
                                                                    styles.quickTestPillText,
                                                                    { color: alreadyAdded ? '#0FBBA1' : textColor },
                                                                ]}
                                                            >
                                                                {testName}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </View>

                                        {labTests.length === 0 ? (
                                            <View style={[styles.emptyStateCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#172554' : '#EFF6FF' }]}>
                                                    <FlaskConical size={26} color="#2563EB" />
                                                </View>
                                                <Text style={[styles.emptyStateTitle, { color: textColor }]}>
                                                    No Lab Tests Ordered Yet
                                                </Text>
                                                <Text style={[styles.emptyStateText, { color: subTextColor }]}>
                                                    Select common lab investigations from above or search custom tests to order.
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={styles.tabSection}>
                                                {labTests.map((test, index) => (
                                                    <View
                                                        key={`${test.testName}-${index}`}
                                                        style={[
                                                            styles.testItemCard,
                                                            { backgroundColor: cardBg, borderColor: cardBorder },
                                                        ]}
                                                    >
                                                        <View style={[styles.testIconBox, { backgroundColor: isDark ? '#172554' : '#EFF6FF' }]}>
                                                            <FlaskConical size={16} color="#2563EB" />
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.testName, { color: textColor }]}>
                                                                {test.testName}
                                                            </Text>
                                                            {!!test.additionalDetails && (
                                                                <Text style={[styles.testDetails, { color: subTextColor }]}>
                                                                    {test.additionalDetails}
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <TouchableOpacity
                                                            style={styles.deleteBtn}
                                                            onPress={() => setLabTests(prev => prev.filter((_, i) => i !== index))}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Trash2 size={16} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <AddLabTestForm
                                        isDark={isDark}
                                        onCancel={() => setAddingLabTest(false)}
                                        onAdd={(test) => {
                                            setLabTests(prev => [...prev, test]);
                                            setAddingLabTest(false);
                                        }}
                                    />
                                )}
                            </View>
                        )}

                        {/* ═══ TAB 3: DIAGNOSIS & NOTES ═══ */}
                        {activeTab === 'notes' && (
                            <View style={styles.tabSection}>
                                <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    <View style={styles.sectionHeaderRow}>
                                        <View style={styles.sectionAccentBar} />
                                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                                            Dietary & Lifestyle Guidelines
                                        </Text>
                                    </View>
                                    <View style={styles.wrapChips}>
                                        {DIETARY_CHIPS.map(chip => {
                                            const isSelected = notes.includes(chip);
                                            return (
                                                <TouchableOpacity
                                                    key={chip}
                                                    style={[
                                                        styles.dietaryBadge,
                                                        { backgroundColor: inputBg, borderColor: inputBorder },
                                                        isSelected && styles.dietaryBadgeActive,
                                                    ]}
                                                    onPress={() => {
                                                        if (isSelected) {
                                                            setNotes(prev => prev.replace(chip, '').replace(/\n\s*\n/g, '\n').trim());
                                                        } else {
                                                            setNotes(prev => (prev ? `${prev.trim()}\n${chip}` : chip));
                                                        }
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.dietaryBadgeText,
                                                            { color: isDark ? '#CBD5E1' : '#475569' },
                                                            isSelected && styles.dietaryBadgeTextActive,
                                                        ]}
                                                    >
                                                        {chip}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                                    <View style={styles.sectionHeaderRow}>
                                        <View style={[styles.sectionAccentBar, { backgroundColor: '#8B5CF6' }]} />
                                        <Text style={[styles.sectionTitle, { color: textColor }]}>
                                            Clinical Diagnosis & Advice
                                        </Text>
                                    </View>
                                    <TextInput
                                        style={[
                                            styles.notesTextArea,
                                            { backgroundColor: inputBg, borderColor: inputBorder, color: textColor },
                                        ]}
                                        placeholder="Write patient diagnosis, lifestyle advice, recovery recommendations, or follow-up notes..."
                                        placeholderTextColor={subTextColor}
                                        multiline
                                        value={notes}
                                        onChangeText={setNotes}
                                    />
                                    <View style={styles.diagnosisTipBox}>
                                        <Sparkles size={15} color="#0FBBA1" />
                                        <Text style={[styles.diagnosisTipText, { color: subTextColor }]}>
                                            Clinical notes and lifestyle restrictions are saved directly in the patient&apos;s digital summary.
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* ═══ Bottom Floating Action Footer ═══ */}
                    <View style={[styles.footerBar, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <View style={styles.summaryStrip}>
                            <Text style={[styles.summaryText, { color: subTextColor }]}>
                                Summary: <Text style={{ color: '#0FBBA1', fontWeight: '700' }}>{medicines.length} Medicines</Text> ·{' '}
                                <Text style={{ color: '#3B82F6', fontWeight: '700' }}>{labTests.length} Lab Tests</Text>
                            </Text>
                        </View>

                        {mode === 'draft' ? (
                            <>
                                {onSendNow && medicines.length > 0 && (
                                    <TouchableOpacity
                                        style={[styles.primaryBtn, styles.sendNowBtn, sendingNow && { opacity: 0.7 }]}
                                        onPress={handleSendNow}
                                        disabled={sendingNow}
                                        activeOpacity={0.8}
                                    >
                                        {sendingNow ? (
                                            <ActivityIndicator color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.primaryBtnText}>Send Prescription Now</Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    style={[styles.primaryBtn, onSendNow && medicines.length > 0 && styles.saveBtnSecondary]}
                                    onPress={handleSaveDraft}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.primaryBtnText,
                                            onSendNow && medicines.length > 0 && { color: '#0FBBA1' },
                                        ]}
                                    >
                                        Save Draft (Don&apos;t Send Yet)
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={styles.primaryBtn}
                                    onPress={handleSubmit}
                                    disabled={submitting}
                                    activeOpacity={0.8}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.primaryBtnText}>{submitButtonText}</Text>
                                    )}
                                </TouchableOpacity>
                                {mode === 'complete' && (
                                    <TouchableOpacity
                                        style={styles.skipBtn}
                                        onPress={handleSubmit}
                                        disabled={submitting}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.skipBtnText, { color: subTextColor }]}>
                                            Skip & Conclude Session
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ══════════════════════════════════════════════════════════
// ── ADD MEDICINE COMPOSER (Aesthetic & Intuitive) ──
// ══════════════════════════════════════════════════════════
function AddMedicineForm({
    isDark,
    onAdd,
    onCancel,
}: {
    isDark: boolean;
    onAdd: (med: PrescribedMedicineInput) => void;
    onCancel: () => void;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Array<{ sku: number; productName: string; brand: string }>>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<{ sku: number; productName: string } | null>(null);

    const formConfig = useMemo(() => getMedicineFormConfig(selected?.productName || ''), [selected?.productName]);

    const [dosage, setDosage] = useState('1 Tab');
    const [timing, setTiming] = useState('1 - 0 - 1 (Morning & Night)');
    const [mealRelation, setMealRelation] = useState('After Food');
    const [duration, setDuration] = useState('5 Days');
    const [customInstructions, setCustomInstructions] = useState('');

    const cardBg = isDark ? '#111B27' : '#FFFFFF';
    const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
    const textColor = isDark ? '#E2E8F0' : '#0F172A';
    const subTextColor = isDark ? '#94A3B8' : '#64748B';
    const inputBg = isDark ? '#0D1520' : '#F1F5F9';
    const inputBorder = isDark ? '#1E2D3D' : '#E2E8F0';

    const handleSelectMedicine = (med: { sku: number; productName: string }) => {
        const config = getMedicineFormConfig(med.productName);
        setSelected(med);
        setDosage(config.defaultDosage);
        setTiming(config.defaultTiming);
        setMealRelation(config.defaultWhenToTake);
        setDuration(config.defaultDuration);
        setCustomInstructions('');
    };

    useEffect(() => {
        if (selected || query.trim().length < 2) {
            setResults([]);
            return;
        }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const data = await fetchMedicines(query.trim());
                setResults(data || []);
            } catch (error) {
                console.warn('Medicine search error:', error);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, selected]);

    if (!selected) {
        return (
            <View style={[styles.composerCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Search Box Header */}
                <View style={styles.composerHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.composerHeaderBadge}>
                            <Pill size={12} color="#0FBBA1" />
                            <Text style={styles.composerHeaderBadgeText}>Formulary Search</Text>
                        </View>
                        <Text style={[styles.composerTitle, { color: textColor }]}>Search Medication</Text>
                    </View>
                    <TouchableOpacity
                        onPress={onCancel}
                        style={[styles.composerClose, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                        activeOpacity={0.7}
                    >
                        <X size={16} color={subTextColor} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar Input */}
                <View style={[styles.searchBarBox, { backgroundColor: inputBg, borderColor: query.length > 0 ? '#0FBBA1' : inputBorder }]}>
                    <Search size={18} color={query.length > 0 ? '#0FBBA1' : subTextColor} />
                    <TextInput
                        style={[styles.searchTextInput, { color: textColor }]}
                        placeholder="Type medicine name (e.g. Paracetamol, Augmentin, Facewash)..."
                        placeholderTextColor={subTextColor}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {searching ? (
                        <ActivityIndicator size="small" color="#0FBBA1" />
                    ) : query.length > 0 ? (
                        <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={16} color={subTextColor} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Suggestions List */}
                <View style={styles.resultsContainer}>
                    {results.map(r => (
                        <TouchableOpacity
                            key={r.sku}
                            style={[styles.resultItemRow, { borderBottomColor: isDark ? '#1E2D3D' : '#F1F5F9' }]}
                            onPress={() => handleSelectMedicine({ sku: r.sku, productName: r.productName })}
                            activeOpacity={0.7}
                        >
                            <View style={styles.resultItemIcon}>
                                <Pill size={16} color="#0FBBA1" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.resultItemTitle, { color: textColor }]}>{r.productName}</Text>
                                <Text style={[styles.resultItemSub, { color: subTextColor }]}>
                                    {r.brand || 'Verified Clinical Drug'}
                                </Text>
                            </View>
                            <View style={styles.selectArrowBadge}>
                                <Text style={styles.selectArrowText}>+ Select</Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {query.trim().length >= 2 && !searching && results.length === 0 && (
                        <TouchableOpacity
                            style={[styles.customAddPrompt, { backgroundColor: isDark ? '#062E28' : '#F0FDFA', borderColor: '#99F6E4' }]}
                            onPress={() => handleSelectMedicine({ sku: Math.floor(Math.random() * 900000) + 100000, productName: query.trim() })}
                            activeOpacity={0.7}
                        >
                            <View style={styles.customAddIconCircle}>
                                <Sparkles size={16} color="#0FBBA1" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.customAddPromptTitle, { color: textColor }]}>
                                    Prescribe &quot;{query.trim()}&quot;
                                </Text>
                                <Text style={styles.customAddPromptSub}>
                                    Not found in local list? Tap to prescribe via AI Formulary
                                </Text>
                            </View>
                            <Plus size={18} color="#0FBBA1" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.composerCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* Selected Medicine Pill Header */}
            <View style={styles.selectedMedHeader}>
                <View style={styles.selectedMedIcon}>
                    <Pill size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.selectedMedName}>{selected.productName}</Text>
                    <Text style={styles.selectedMedSub}>{formConfig.formName} · Verified Clinical Drug</Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} style={styles.changeMedBtn} activeOpacity={0.8}>
                    <Text style={styles.changeMedText}>Change</Text>
                </TouchableOpacity>
            </View>

            {/* 1. Dosage / Application Amount */}
            <Text style={[styles.sectionMicroLabel, { color: subTextColor }]}>{formConfig.dosageLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                {formConfig.dosageChips.map(chip => (
                    <TouchableOpacity
                        key={chip}
                        style={[
                            styles.chipPill,
                            { backgroundColor: inputBg, borderColor: inputBorder },
                            dosage === chip && styles.chipPillActive,
                        ]}
                        onPress={() => setDosage(chip)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipPillText, { color: textColor }, dosage === chip && styles.chipPillTextActive]}>
                            {chip}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            <TextInput
                style={[styles.customMiniInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder={formConfig.dosagePlaceholder}
                placeholderTextColor={subTextColor}
                value={dosage}
                onChangeText={setDosage}
            />

            {/* 2. Frequency & Timing */}
            <Text style={[styles.sectionMicroLabel, { color: subTextColor }]}>2. Frequency & Timing</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                {formConfig.timingChips.map(chip => (
                    <TouchableOpacity
                        key={chip.label}
                        style={[
                            styles.chipPill,
                            { backgroundColor: inputBg, borderColor: inputBorder },
                            timing === chip.label && styles.chipPillActive,
                        ]}
                        onPress={() => setTiming(chip.label)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipPillText, { color: textColor }, timing === chip.label && styles.chipPillTextActive]}>
                            {chip.short}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* 3. When to Take / Application Method */}
            <Text style={[styles.sectionMicroLabel, { color: subTextColor }]}>{formConfig.whenToTakeLabel}</Text>
            <View style={styles.wrapChips}>
                {formConfig.whenToTakeChips.map(chip => (
                    <TouchableOpacity
                        key={chip}
                        style={[
                            styles.chipPill,
                            { backgroundColor: inputBg, borderColor: inputBorder },
                            mealRelation === chip && styles.chipPillActive,
                        ]}
                        onPress={() => setMealRelation(chip)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipPillText, { color: textColor }, mealRelation === chip && styles.chipPillTextActive]}>
                            {chip}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* 4. Duration */}
            <Text style={[styles.sectionMicroLabel, { color: subTextColor }]}>4. Duration</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                {formConfig.durationChips.map(chip => (
                    <TouchableOpacity
                        key={chip}
                        style={[
                            styles.chipPill,
                            { backgroundColor: inputBg, borderColor: inputBorder },
                            duration === chip && styles.chipPillActive,
                        ]}
                        onPress={() => setDuration(chip)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipPillText, { color: textColor }, duration === chip && styles.chipPillTextActive]}>
                            {chip}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* 5. Special Clinical Advice */}
            <Text style={[styles.sectionMicroLabel, { color: subTextColor }]}>5. Medicine Instructions (Optional)</Text>
            <TextInput
                style={[styles.customMiniInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder={formConfig.instructionPlaceholder}
                placeholderTextColor={subTextColor}
                value={customInstructions}
                onChangeText={setCustomInstructions}
            />

            {/* Action Buttons */}
            <View style={styles.composerActionRow}>
                <TouchableOpacity style={styles.composerCancelBtn} onPress={onCancel} activeOpacity={0.7}>
                    <Text style={[styles.composerCancelText, { color: subTextColor }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.composerAddBtn, !dosage.trim() && styles.composerAddBtnDisabled]}
                    disabled={!dosage.trim()}
                    onPress={() => {
                        const instructionsList: string[] = [];
                        if (mealRelation) instructionsList.push(mealRelation);
                        if (customInstructions.trim()) instructionsList.push(customInstructions.trim());

                        onAdd({
                            medicineSku: selected.sku,
                            medicineName: selected.productName,
                            intakeDetails: {
                                dosage: dosage.trim(),
                                period: `${timing} · ${duration}`,
                                instructions: instructionsList,
                            },
                        });
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.composerAddBtnText}>+ Add to Prescription</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ══════════════════════════════════════════════════════════
// ── ADD LAB TEST COMPOSER ──
// ══════════════════════════════════════════════════════════
function AddLabTestForm({
    isDark,
    onAdd,
    onCancel,
}: {
    isDark: boolean;
    onAdd: (test: PrescribedLabTestInput) => void;
    onCancel: () => void;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Array<{ testName: string }>>([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    const cardBg = isDark ? '#111B27' : '#FFFFFF';
    const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
    const textColor = isDark ? '#E2E8F0' : '#0F172A';
    const subTextColor = isDark ? '#94A3B8' : '#64748B';
    const inputBg = isDark ? '#0D1520' : '#F1F5F9';
    const inputBorder = isDark ? '#1E2D3D' : '#E2E8F0';

    useEffect(() => {
        if (selected || query.trim().length < 2) {
            setResults([]);
            return;
        }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const data = await fetchLabTests(query.trim());
                setResults(data || []);
            } catch (error) {
                console.warn('Lab search error:', error);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, selected]);

    if (!selected) {
        return (
            <View style={[styles.composerCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Search Box Header */}
                <View style={styles.composerHeader}>
                    <View style={{ flex: 1 }}>
                        <View style={[styles.composerHeaderBadge, { backgroundColor: '#EFF6FF' }]}>
                            <FlaskConical size={12} color="#2563EB" />
                            <Text style={[styles.composerHeaderBadgeText, { color: '#2563EB' }]}>Diagnostics & Scans</Text>
                        </View>
                        <Text style={[styles.composerTitle, { color: textColor }]}>Search Diagnostic Lab Test</Text>
                        <Text style={[styles.composerSubtitle, { color: subTextColor }]}>
                            Search pathology, radiology, or blood profiles
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={onCancel}
                        style={[styles.composerClose, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                        activeOpacity={0.7}
                    >
                        <X size={16} color={subTextColor} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar Input */}
                <View style={[styles.searchBarBox, { backgroundColor: inputBg, borderColor: query.length > 0 ? '#3B82F6' : inputBorder }]}>
                    <Search size={18} color={query.length > 0 ? '#3B82F6' : subTextColor} />
                    <TextInput
                        style={[styles.searchTextInput, { color: textColor }]}
                        placeholder="Search diagnostic scan or blood test..."
                        placeholderTextColor={subTextColor}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {searching ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                    ) : query.length > 0 ? (
                        <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <X size={16} color={subTextColor} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Results List */}
                <View style={styles.resultsContainer}>
                    {results.map(r => (
                        <TouchableOpacity
                            key={r.testName}
                            style={[styles.resultItemRow, { borderBottomColor: isDark ? '#1E2D3D' : '#F1F5F9' }]}
                            onPress={() => setSelected(r.testName)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.resultItemIcon, { backgroundColor: '#EFF6FF' }]}>
                                <FlaskConical size={16} color="#2563EB" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.resultItemTitle, { color: textColor }]}>{r.testName}</Text>
                                <Text style={[styles.resultItemSub, { color: subTextColor }]}>
                                    Diagnostic Investigation
                                </Text>
                            </View>
                            <View style={[styles.selectArrowBadge, { backgroundColor: '#EFF6FF', borderColor: '#BAE6FD' }]}>
                                <Text style={[styles.selectArrowText, { color: '#2563EB' }]}>+ Select</Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {query.trim().length >= 2 && !searching && results.length === 0 && (
                        <TouchableOpacity
                            style={[styles.customAddPrompt, { backgroundColor: isDark ? '#172554' : '#EFF6FF', borderColor: '#BFDBFE' }]}
                            onPress={() => setSelected(query.trim())}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.customAddIconCircle, { backgroundColor: '#DBEAFE' }]}>
                                <Plus size={16} color="#2563EB" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.customAddPromptTitle, { color: textColor }]}>
                                    Order &quot;{query.trim()}&quot;
                                </Text>
                                <Text style={[styles.customAddPromptSub, { color: '#3B82F6' }]}>
                                    Tap to add custom investigation
                                </Text>
                            </View>
                            <Plus size={18} color="#2563EB" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.composerCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={[styles.selectedMedHeader, { backgroundColor: '#2563EB' }]}>
                <View style={styles.selectedMedIcon}>
                    <FlaskConical size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.selectedMedName}>{selected}</Text>
                    <Text style={styles.selectedMedSub}>Diagnostic Investigation</Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)} style={styles.changeMedBtn} activeOpacity={0.8}>
                    <Text style={[styles.changeMedText, { color: '#2563EB' }]}>Change</Text>
                </TouchableOpacity>
            </View>

            <Text style={[styles.sectionMicroLabel, { color: subTextColor }]}>
                Specific Test Instructions (Optional)
            </Text>
            <TextInput
                style={[styles.customMiniInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="e.g. 12-hour fasting required, early morning sample"
                placeholderTextColor={subTextColor}
                value={notes}
                onChangeText={setNotes}
            />

            <View style={styles.composerActionRow}>
                <TouchableOpacity style={styles.composerCancelBtn} onPress={onCancel} activeOpacity={0.7}>
                    <Text style={[styles.composerCancelText, { color: subTextColor }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.composerAddBtn, { backgroundColor: '#2563EB' }]}
                    onPress={() => onAdd({ testName: selected, additionalDetails: notes.trim() })}
                    activeOpacity={0.8}
                >
                    <Text style={styles.composerAddBtnText}>+ Order Lab Test</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    content: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 10,
        paddingHorizontal: 16,
        height: '92%',
        maxHeight: '94%',
    },
    dragHandle: {
        width: 38,
        height: 4.5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginBottom: 14,
    },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    pillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#E6FAF6',
        borderRadius: 14,
        paddingHorizontal: 9,
        paddingVertical: 3,
    },
    pillBadgeText: { color: '#0FBBA1', fontSize: 11, fontWeight: '800' },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Tab Bar (Scrollable & Never Clipped)
    tabBarWrapper: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 4,
        marginBottom: 12,
    },
    tabScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 2,
    },
    tabBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
    },
    tabBtnActive: {
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    tabBtnText: { fontSize: 13, fontWeight: '700' },

    // Scroll
    scrollArea: { flex: 1 },
    scrollContent: { paddingBottom: 20 },
    tabSection: { gap: 12 },

    // Section Soft Cards (Matching ProfileSidebar)
    sectionCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        gap: 12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    sectionAccentBar: {
        width: 3.5,
        height: 16,
        borderRadius: 2,
        backgroundColor: '#0FBBA1',
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.2,
    },

    // Dashed Add Button
    addDashedCard: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 187, 161, 0.04)',
        gap: 3,
    },
    addDashedIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    addDashedTitle: { fontSize: 14, fontWeight: '800', color: '#0FBBA1' },
    addDashedSub: { fontSize: 11.5, fontWeight: '500' },

    // Empty State Card (Matching ProfileSidebar)
    emptyStateCard: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    emptyStateTitle: { fontSize: 15, fontWeight: '800', marginTop: 2, letterSpacing: -0.2 },
    emptyStateText: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },

    // Prescribed Medicine Card
    medCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        gap: 10,
    },
    medCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    medIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    medName: { fontSize: 14.5, fontWeight: '700' },
    medMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    dosageBadge: {
        backgroundColor: '#0FBBA1',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    dosageBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
    medPeriodText: { fontSize: 12, fontWeight: '600' },
    deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    medInstContainer: {
        paddingTop: 8,
        borderTopWidth: 1,
        gap: 3,
    },
    medInstLine: { fontSize: 12, lineHeight: 17 },

    // Quick Lab Test Pills
    subHeading: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    quickTestsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    quickTestPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 14,
        borderWidth: 1,
    },
    quickTestPillAdded: {
        backgroundColor: '#E6FAF6',
        borderColor: '#CCFBF1',
    },
    quickTestPillText: { fontSize: 12, fontWeight: '600' },

    // Lab Test Item Card
    testItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 12,
    },
    testIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    testName: { fontSize: 14, fontWeight: '700' },
    testDetails: { fontSize: 11.5, marginTop: 2 },

    // Notes
    notesTextArea: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        fontSize: 14,
        minHeight: 110,
        textAlignVertical: 'top',
        marginTop: 4,
    },
    diagnosisTipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 6,
        marginTop: 4,
    },
    diagnosisTipText: { fontSize: 11.5, flex: 1, lineHeight: 16 },

    // Composer Form Box (Flat clean design, no shadow)
    composerCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },
    composerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 8,
    },
    composerHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#E6FAF6',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    composerHeaderBadgeText: { color: '#0FBBA1', fontSize: 11, fontWeight: '800' },
    composerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    composerSubtitle: { fontSize: 12, marginTop: 2 },
    composerClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Search Bar Box
    searchBarBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 46,
    },
    searchTextInput: {
        flex: 1,
        fontSize: 13.5,
        fontWeight: '500',
        padding: 0,
    },

    // Results Container
    resultsContainer: {
        gap: 4,
        maxHeight: 220,
    },
    resultItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        gap: 10,
    },
    resultItemIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultItemTitle: { fontSize: 14.5, fontWeight: '700' },
    resultItemSub: { fontSize: 12, marginTop: 2 },
    selectArrowBadge: {
        backgroundColor: '#E6FAF6',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#99F6E4',
    },
    selectArrowText: { color: '#0FBBA1', fontSize: 11.5, fontWeight: '700' },

    // Custom AI Add Prompt
    customAddPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 4,
    },
    customAddIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    customAddPromptTitle: { fontSize: 14, fontWeight: '800' },
    customAddPromptSub: { fontSize: 11.5, color: '#0FBBA1', fontWeight: '500', marginTop: 1 },
    cancelComposerBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        marginTop: 4,
    },
    cancelComposerText: { fontSize: 13, fontWeight: '700' },

    // Selected Med Detail Box
    selectedMedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0FBBA1',
        borderRadius: 14,
        padding: 12,
    },
    selectedMedIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedMedName: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '800' },
    selectedMedSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '600' },
    changeMedBtn: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    changeMedText: { color: '#0FBBA1', fontSize: 12, fontWeight: '800' },

    sectionMicroLabel: {
        fontSize: 11.5,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        marginTop: 6,
    },
    horizontalChips: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
    wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 2 },
    chipPill: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipPillActive: {
        backgroundColor: '#0FBBA1',
        borderColor: '#0FBBA1',
    },
    chipPillText: { fontSize: 12.5, fontWeight: '700' },
    chipPillTextActive: { color: '#FFFFFF' },

    dietaryBadge: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    dietaryBadgeActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
    },
    dietaryBadgeText: { fontSize: 12, fontWeight: '600' },
    dietaryBadgeTextActive: { color: '#DC2626', fontWeight: '800' },

    customMiniInput: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 13.5,
    },

    composerActionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    composerCancelBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
    },
    composerCancelText: { fontSize: 13.5, fontWeight: '700' },
    composerAddBtn: {
        flex: 2,
        backgroundColor: '#0FBBA1',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    composerAddBtnDisabled: { backgroundColor: '#94D3C5' },
    composerAddBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

    // Footer Bar
    footerBar: {
        borderTopWidth: 1,
        paddingTop: 10,
        gap: 8,
    },
    summaryStrip: { alignItems: 'center' },
    summaryText: { fontSize: 12, fontWeight: '600' },
    primaryBtn: {
        backgroundColor: '#0FBBA1',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    skipBtn: { alignItems: 'center', paddingVertical: 6 },
    skipBtnText: { fontSize: 12.5, fontWeight: '600' },
    sendNowBtn: { marginBottom: 8 },
    saveBtnSecondary: { backgroundColor: 'transparent' },
});
