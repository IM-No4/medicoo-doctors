import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as NavigationBar from 'expo-navigation-bar';
import {
    AlertCircle,
    ArrowRight,
    Award,
    Briefcase,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileBadge,
    FileCheck,
    FileText,
    Globe,
    Hourglass,
    IdCard,
    Info,
    MessageSquare,
    Phone,
    Plus,
    RefreshCw,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Stethoscope,
    Trash2,
    Upload,
    UploadCloud,
    User,
    Video,
    X,
} from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import MediaPickerModal from '../../components/modals/image-picker/MediaPickerModal';
import StatusModal, { StatusType } from '../../components/modals/StatusModal';
import { loadProfileFromServer } from '../../redux/slices/profileSlice';
import { AppDispatch, RootState } from '../../redux/store';
import { API_BASE_URL } from '../../services/api/client';
import { applyAsDoctor, getDoctorProfile, updateDoctorDraft } from '../../services/api/user.api';
import { useLogout } from '../auth/useLogout';

const DOCTOR_TYPES = ['MBBS', 'MD', 'MS', 'BDS', 'MDS', 'BAMS', 'BHMS', 'Specialist', 'Other'];
const SPECIALIZATIONS = [
    'General Physician', 'Cardiologist', 'Dermatologist', 'Pediatrician',
    'Gynecologist', 'Orthopedic', 'Neurologist', 'Psychiatrist',
    'ENT Specialist', 'Ophthalmologist', 'Dentist', 'Other'
];
const STATE_COUNCILS = [
    'NMC', 'Andhra Pradesh Medical Council', 'Delhi Medical Council',
    'Maharashtra Medical Council', 'Karnataka Medical Council',
    'Tamil Nadu Medical Council', 'West Bengal Medical Council', 'Other'
];
const IDENTITY_PROOF_TYPES = [
    'PAN',
    'Aadhaar',
    'Drivers_License',
    'Passport'
];
const CERTIFICATE_TYPES = ['Degree', 'Diploma', 'Fellowship', 'Membership', 'Award', 'Other'];

const SPOKEN_LANGUAGES = [
    'English', 'Hindi', 'Bengali', 'Marathi', 'Telugu', 'Tamil',
    'Gujarati', 'Urdu', 'Kannada', 'Odia', 'Malayalam', 'Punjabi',
    'Assamese', 'Maithili', 'Sanskrit', 'Nepali', 'Sindhi', 'Dogri',
    'Konkani', 'Kashmiri', 'Bhojpuri', 'Marwari', 'Arabic', 'French',
    'German', 'Spanish'
];

// Steps Enum
enum OnboardingStep {
    BASIC_DETAILS = 1,
    CONSULTATION_FEES = 2,
    DOCUMENTS = 3,
    REVIEW = 4,
}

const TOTAL_STEPS = 4;

const STEPS_NAV = [
    { step: OnboardingStep.BASIC_DETAILS, title: 'Profile', icon: User },
    { step: OnboardingStep.CONSULTATION_FEES, title: 'Services', icon: Video },
    { step: OnboardingStep.DOCUMENTS, title: 'Documents', icon: FileText },
    { step: OnboardingStep.REVIEW, title: 'Review', icon: CheckCircle2 },
];

export default function DoctorOnboardingScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const dispatch = useDispatch<AppDispatch>();
    const reduxProfile = useSelector((state: RootState) => state.profile);
    const handleLogout = useLogout();
    const insets = useSafeAreaInsets();

    const scrollViewRef = useRef<ScrollView>(null);
    const fieldRefs = useRef<{ [key: string]: View | null }>({});
    const fieldPositions = useRef<{ [key: string]: number }>({});
    const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

    const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.BASIC_DETAILS);

    const handleFieldLayout = (fieldKey: string) => (event: any) => {
        fieldPositions.current[fieldKey] = event.nativeEvent.layout.y;
    };

    const scrollToField = (fieldKey: string) => {
        const targetView = fieldRefs.current[fieldKey];
        if (targetView && scrollViewRef.current) {
            try {
                targetView.measureLayout(
                    scrollViewRef.current as any,
                    (_left, top) => {
                        scrollViewRef.current?.scrollTo({
                            y: Math.max(0, top - 24),
                            animated: true,
                        });
                    },
                    () => {
                        const y = fieldPositions.current[fieldKey];
                        if (typeof y === 'number' && scrollViewRef.current) {
                            scrollViewRef.current.scrollTo({ y: Math.max(0, y - 24), animated: true });
                        }
                    }
                );
                return;
            } catch (e) {
                // fallback
            }
        }
        const y = fieldPositions.current[fieldKey];
        if (typeof y === 'number' && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: Math.max(0, y - 24), animated: true });
        }
    };

    const [approvalStatus, setApprovalStatus] = useState<string>('not-applied');
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [refreshingStatus, setRefreshingStatus] = useState(false);

    useFocusEffect(
        useCallback(() => {
            StatusBar.setBarStyle('dark-content');
            if (Platform.OS === 'android') {
                StatusBar.setBackgroundColor('#FFFFFF');
                StatusBar.setTranslucent(false);
                NavigationBar.setBackgroundColorAsync('#FFFFFF');
                NavigationBar.setButtonStyleAsync('dark');
            }

            const onBackPress = () => {
                if (approvalStatus === 'pending') {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                        return true;
                    }
                    BackHandler.exitApp();
                    return true;
                }
                if (currentStep > OnboardingStep.BASIC_DETAILS) {
                    setFieldErrors({});
                    setCurrentStep(prev => prev - 1);
                    return true;
                }
                if (navigation.canGoBack()) {
                    navigation.goBack();
                    return true;
                }
                BackHandler.exitApp();
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [currentStep, approvalStatus, navigation])
    );
    const [loading, setLoading] = useState(false);
    const [selectionModal, setSelectionModal] = useState<{ visible: boolean; title: string; options: string[]; field: string } | null>(null);
    const [languageModalVisible, setLanguageModalVisible] = useState(false);
    const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
    const [activeUploadField, setActiveUploadField] = useState<string | null>(null);

    const getSelectedLanguages = (): string[] => {
        if (!formData.languages) return [];
        return formData.languages
            .split(',')
            .map(l => l.trim())
            .filter(Boolean);
    };

    const toggleLanguage = (lang: string) => {
        if (isReadOnly) return;
        const currentList = getSelectedLanguages();
        let updated: string[];
        if (currentList.includes(lang)) {
            updated = currentList.filter(l => l !== lang);
        } else {
            updated = [...currentList, lang];
        }
        updateField('languages', updated.join(', '));
    };

    // Temp Document State
    const [tempDoc, setTempDoc] = useState({ type: '', number: '', expiry: '', file: null as any });
    const [isAddingDoc, setIsAddingDoc] = useState(false);

    // Status Modal State
    const [statusModal, setStatusModal] = useState<{
        visible: boolean;
        status: StatusType;
        title?: string;
        message?: string;
        onCloseAction?: () => void;
        primaryAction?: () => void;
        primaryActionText?: string;
    }>({
        visible: false,
        status: 'idle',
    });

    const [formData, setFormData] = useState({
        // Step 1 - Eligibility
        telemedicineConsent: false,

        // Step 2 - Professional Info
        doctorType: '',
        specialization: '',
        specializationCode: '',
        experience: '',
        languages: '',
        hospital: '',
        description: '',

        registrationNumber: '',

        // Detailed Registration & Documents
        nmcRegistrationNumber: '',

        stateMedicalCouncil: '',
        stateCouncilRegistrationNumber: '',
        stateCouncilValidTill: '', // Date string DD/MM/YYYY

        identityProofType: '',
        identityProofNumber: '',
        identityProofValidTill: '',
        identityProofDocument: null as any,

        cmeCertificate: null as any,
        cmeIssuedAt: '',
        cmeValidTill: '',

        // Malpractice
        hasMalpracticeHistory: false,
        malpracticeNotes: '',

        certificates: [] as any[],
        uniformPhoto: null as any,

        // Step 4 - Consultation Fees
        consultationFees: {
            currency: 'INR',
            chat: { fee: 0, isEnabled: false },
            voice: { fee: 0, isEnabled: false },
            video: { fee: 0, isEnabled: false },
        },
    });

    const updateField = (key: string, value: any) => {
        if (isReadOnly) return;
        setFormData(prev => ({ ...prev, [key]: value }));
        setFieldErrors(prev => {
            if (!prev[key] && !prev.consultationFees && !prev.telemedicineConsent) return prev;
            const next = { ...prev };
            delete next[key];
            if (key === 'consultationFees') {
                delete next.consultationFees;
                delete next.videoFee;
                delete next.voiceFee;
                delete next.chatFee;
            }
            if (key === 'telemedicineConsent') {
                delete next.telemedicineConsent;
            }
            return next;
        });
    };

    // Date Picker Logic
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateField, setDateField] = useState<string | null>(null);

    const openDatePicker = (field: string) => {
        if (isReadOnly) return;
        setDateField(field);
        setShowDatePicker(true);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (event.type === 'set' && selectedDate && dateField) {
            const day = selectedDate.getDate().toString().padStart(2, '0');
            const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
            const year = selectedDate.getFullYear();
            const formatted = `${day}/${month}/${year}`;

            if (dateField === 'tempDocExpiry') {
                setTempDoc(prev => ({ ...prev, expiry: formatted }));
            } else {
                updateField(dateField, formatted);
            }
        }
        setDateField(null);
    };

    const getDatePickerValue = () => {
        if (!dateField) return new Date();
        let val = '';
        if (dateField === 'tempDocExpiry') val = tempDoc.expiry;
        else val = (formData as any)[dateField];

        if (!val) return new Date();
        const parts = val.split('/');
        if (parts.length === 3) {
            const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            if (!isNaN(d.getTime())) return d;
        }
        return new Date();
    };

    // Load existing draft on mount
    useFocusEffect(
        useCallback(() => {
            loadDoctorProfile();
        }, [])
    );

    const loadDoctorProfile = async () => {
        try {
            setLoading(true);
            const profile = await getDoctorProfile();
            if (profile) {
                const source = profile.pendingProfile || profile._doc || profile;
                const isDoc = Boolean(profile.isDoctor || source.isDoctor || profile._id);
                const status = profile.approvalStatus || (isDoc && !profile.rejectionReason ? 'approved' : 'not-applied');
                setApprovalStatus(status);
                setRejectionReason(profile.rejectionReason || '');

                const approvedCheck = Boolean(
                    (profile.approvedProfile && Object.keys(profile.approvedProfile).length > 0) ||
                    profile.hasApprovedProfile ||
                    profile.lastApprovedAt ||
                    profile.approvedAt ||
                    profile.verifiedAt ||
                    profile.isApproved ||
                    profile.isOnboarded ||
                    profile.onboardingCompleted ||
                    profile.pendingProfile ||
                    (isDoc && (profile.specialization || profile.doctorType || profile.registrationNumber))
                );

                const isEdit = Boolean(route?.params?.isEdit);
                if ((status === 'approved' || approvedCheck) && !isEdit) {
                    dispatch(loadProfileFromServer());
                    navigation.replace('DoctorTabs');
                    return;
                }

                if (status === 'pending' || route?.params?.readOnly) {
                    setIsReadOnly(true);
                } else {
                    setIsReadOnly(false);
                }

                const normalizeFile = (fileData: any, defaultName: string) => {
                    if (!fileData) return null;
                    if (typeof fileData === 'string') {
                        const uri = (fileData.startsWith('http') || fileData.startsWith('data:'))
                            ? fileData
                            : `${API_BASE_URL}/${fileData}`;
                        return { uri: uri, name: defaultName, type: 'image/jpeg' };
                    }
                    return fileData;
                };

                setFormData({
                    telemedicineConsent: profile.telemedicineConsent?.accepted || source.telemedicineConsent?.accepted || false,
                    doctorType: source.doctorType || '',
                    specialization: source.specialization || '',
                    specializationCode: source.specializationCode || '',
                    experience: source.experience?.toString() || '',
                    languages: Array.isArray(source.languages) ? source.languages.join(', ') : (source.languages || ''),
                    hospital: source.hospital || '',
                    description: source.description || '',
                    registrationNumber: source.registrationNumber || '',

                    nmcRegistrationNumber: source.nmcRegistrationNumber || source.verification?.nmcRegistrationNumber || source.registrationNumber || '',
                    stateMedicalCouncil: source.stateMedicalCouncil || source.verification?.stateMedicalCouncil || '',
                    stateCouncilRegistrationNumber: source.stateCouncilRegistrationNumber || source.verification?.stateCouncilRegistrationNumber || '',
                    stateCouncilValidTill: (source.stateCouncilValidTill || source.verification?.stateCouncilValidTill)
                        ? new Date(source.stateCouncilValidTill || source.verification?.stateCouncilValidTill).toLocaleDateString('en-GB')
                        : '',

                    identityProofType: source.identityProofType || source.verification?.identityProofType || '',
                    identityProofNumber: source.identityProofNumber || source.verification?.identityProofNumber || '',
                    identityProofValidTill: (source.identityProofValidTill || source.verification?.identityProofValidTill)
                        ? new Date(source.identityProofValidTill || source.verification?.identityProofValidTill).toLocaleDateString('en-GB')
                        : '',
                    identityProofDocument: normalizeFile(source.identityProofDocument || source.verification?.identityProofDocument, 'ID Proof'),

                    cmeCertificate: normalizeFile(source.cmeCertificate || source.verification?.cmeCertificate, 'CME Certificate'),
                    cmeIssuedAt: (source.cmeIssuedAt || source.verification?.cmeIssuedAt)
                        ? new Date(source.cmeIssuedAt || source.verification?.cmeIssuedAt).toLocaleDateString('en-GB')
                        : '',
                    cmeValidTill: (source.cmeValidTill || source.verification?.cmeValidTill)
                        ? new Date(source.cmeValidTill || source.verification?.cmeValidTill).toLocaleDateString('en-GB')
                        : '',

                    hasMalpracticeHistory: source.hasMalpracticeHistory === undefined
                        ? (source.verification?.hasMalpracticeHistory || false)
                        : !!source.hasMalpracticeHistory,
                    malpracticeNotes: source.malpracticeNotes || source.verification?.malpracticeNotes || '',

                    certificates: Array.isArray(source.certificates)
                        ? source.certificates
                            .filter((cert: any) => {
                                const uri = typeof cert === 'string' ? cert : cert.file?.uri || cert.uri;
                                const mainDocs = [
                                    source.identityProofDocument || source.verification?.identityProofDocument,
                                    source.cmeCertificate || source.verification?.cmeCertificate,
                                    source.uniformPhoto
                                ].map(doc => doc?.uri || doc);
                                return !mainDocs.includes(uri);
                            })
                            .map((cert: any, index: number) => {
                                if (typeof cert === 'string') {
                                    return {
                                        type: 'Other',
                                        number: '',
                                        expiry: '',
                                        file: { uri: cert, name: `Certificate ${index + 1}`, type: 'image/jpeg' }
                                    };
                                }
                                return cert;
                            })
                        : [],
                    uniformPhoto: normalizeFile(source.uniformPhoto, 'Profile Photo'),
                    consultationFees: {
                        currency: source.consultationFees?.currency || 'INR',
                        chat: {
                            fee: typeof source.consultationFees?.chat === 'object' ? source.consultationFees.chat.fee : (Number(source.consultationFees?.chat) || 0),
                            isEnabled: typeof source.consultationFees?.chat === 'object' ? source.consultationFees.chat.isEnabled : false
                        },
                        voice: {
                            fee: typeof source.consultationFees?.voice === 'object' ? source.consultationFees.voice.fee : (Number(source.consultationFees?.voice) || 0),
                            isEnabled: typeof source.consultationFees?.voice === 'object' ? source.consultationFees.voice.isEnabled : false
                        },
                        video: {
                            fee: typeof source.consultationFees?.video === 'object' ? source.consultationFees.video.fee : (Number(source.consultationFees?.video) || 0),
                            isEnabled: typeof source.consultationFees?.video === 'object' ? source.consultationFees.video.isEnabled : false
                        },
                    },
                });
            }
        } catch (error) {
            // Silently handle
        } finally {
            setLoading(false);
        }
    };

    const prepareFormData = () => {
        const formDataToSend = new FormData();

        if (formData.doctorType) formDataToSend.append('doctorType', formData.doctorType);
        if (formData.specialization) formDataToSend.append('specialization', formData.specialization);
        if (formData.specializationCode) formDataToSend.append('specializationCode', formData.specializationCode);
        if (formData.experience) formDataToSend.append('experience', formData.experience);
        if (formData.languages) formDataToSend.append('languages', formData.languages);
        if (formData.hospital) formDataToSend.append('hospital', formData.hospital);
        if (formData.description) formDataToSend.append('description', formData.description);

        const registrationNumber = formData.nmcRegistrationNumber || formData.registrationNumber;
        if (registrationNumber) formDataToSend.append('registrationNumber', registrationNumber);

        formDataToSend.append('consultationFees', JSON.stringify(formData.consultationFees));

        if (formData.nmcRegistrationNumber) formDataToSend.append('nmcRegistrationNumber', formData.nmcRegistrationNumber);
        if (formData.stateMedicalCouncil) formDataToSend.append('stateMedicalCouncil', formData.stateMedicalCouncil);
        if (formData.stateCouncilRegistrationNumber) formDataToSend.append('stateCouncilRegistrationNumber', formData.stateCouncilRegistrationNumber);
        if (formData.stateCouncilValidTill) formDataToSend.append('stateCouncilValidTill', formData.stateCouncilValidTill);

        if (formData.identityProofType) formDataToSend.append('identityProofType', formData.identityProofType);
        if (formData.identityProofNumber) formDataToSend.append('identityProofNumber', formData.identityProofNumber);
        if (formData.identityProofValidTill) formDataToSend.append('identityProofValidTill', formData.identityProofValidTill);

        if (formData.cmeIssuedAt) formDataToSend.append('cmeIssuedAt', formData.cmeIssuedAt);
        if (formData.cmeValidTill) formDataToSend.append('cmeValidTill', formData.cmeValidTill);

        formDataToSend.append('hasMalpracticeHistory', String(formData.hasMalpracticeHistory));
        if (formData.hasMalpracticeHistory && formData.malpracticeNotes) {
            formDataToSend.append('malpracticeNotes', formData.malpracticeNotes);
        }

        formDataToSend.append('telemedicineConsent', JSON.stringify({
            accepted: formData.telemedicineConsent,
            acceptedAt: formData.telemedicineConsent ? new Date() : undefined,
        }));

        const isLocalFile = (uri: string) =>
            uri && (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('data:'));

        if (formData.uniformPhoto?.uri && isLocalFile(formData.uniformPhoto.uri)) {
            formDataToSend.append('uniformPhoto', {
                uri: formData.uniformPhoto.uri,
                type: formData.uniformPhoto.type || 'image/jpeg',
                name: formData.uniformPhoto.name || 'photo.jpg',
            } as any);
        }
        if (formData.identityProofDocument?.uri && isLocalFile(formData.identityProofDocument.uri)) {
            formDataToSend.append('identityProofDocument', {
                uri: formData.identityProofDocument.uri,
                type: formData.identityProofDocument.type || 'image/jpeg',
                name: formData.identityProofDocument.name || 'id_proof.jpg',
            } as any);
        }
        if (formData.cmeCertificate?.uri && isLocalFile(formData.cmeCertificate.uri)) {
            formDataToSend.append('cmeCertificate', {
                uri: formData.cmeCertificate.uri,
                type: formData.cmeCertificate.type || 'image/jpeg',
                name: formData.cmeCertificate.name || 'cme_cert.jpg',
            } as any);
        }

        if (formData.certificates && formData.certificates.length > 0) {
            const certMeta = formData.certificates.map(cert => ({
                type: cert.type || 'Other',
                number: cert.number || '',
                expiry: cert.expiry || ''
            }));
            formDataToSend.append('certificateDetails', JSON.stringify(certMeta));

            formData.certificates.forEach((cert, index) => {
                if (cert.file && cert.file.uri && isLocalFile(cert.file.uri)) {
                    formDataToSend.append(`certificates`, {
                        uri: cert.file.uri,
                        type: cert.file.type || 'image/jpeg',
                        name: cert.file.name || `cert_${index}.jpg`,
                    } as any);
                } else if (cert.uri && isLocalFile(cert.uri)) {
                    formDataToSend.append(`certificates`, {
                        uri: cert.uri,
                        type: cert.type || 'image/jpeg',
                        name: cert.name || `cert_${index}.jpg`,
                    } as any);
                }
            });
        }
        return formDataToSend;
    };

    const saveDraft = async (silent = true) => {
        if (isReadOnly) return;

        try {
            if (!silent) setLoading(true);
            const formDataToSend = prepareFormData();
            await updateDoctorDraft(formDataToSend);

            if (!silent) {
                setStatusModal({
                    visible: true,
                    status: 'success',
                    title: 'Draft Saved',
                    message: 'Your progress has been saved successfully.',
                });
            }
        } catch (error) {
            console.error('Failed to save draft:', error);
            if (!silent) {
                setStatusModal({
                    visible: true,
                    status: 'error',
                    title: 'Save Failed',
                    message: 'Could not save your draft. Please try again.',
                });
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleNext = async () => {
        const errors: { [key: string]: string } = {};

        if (currentStep === OnboardingStep.BASIC_DETAILS) {
            if (!formData.doctorType) {
                errors.doctorType = 'Please select your primary qualification type';
            }
            if (!formData.specialization) {
                errors.specialization = 'Please select your medical specialization';
            }

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                const firstKey = errors.doctorType ? 'doctorType' : 'specialization';
                setTimeout(() => scrollToField(firstKey), 50);
                return;
            }
        }

        if (currentStep === OnboardingStep.CONSULTATION_FEES) {
            const isAnyServiceEnabled =
                formData.consultationFees.chat.isEnabled ||
                formData.consultationFees.voice.isEnabled ||
                formData.consultationFees.video.isEnabled;

            if (!isAnyServiceEnabled) {
                errors.consultationFees = 'Please enable at least one consultation service (Video, Voice, or Chat)';
            } else {
                if (formData.consultationFees.video.isEnabled && (!formData.consultationFees.video.fee || formData.consultationFees.video.fee <= 0)) {
                    errors.videoFee = 'Please enter a valid rate for video consultation';
                }
                if (formData.consultationFees.voice.isEnabled && (!formData.consultationFees.voice.fee || formData.consultationFees.voice.fee <= 0)) {
                    errors.voiceFee = 'Please enter a valid rate for voice consultation';
                }
                if (formData.consultationFees.chat.isEnabled && (!formData.consultationFees.chat.fee || formData.consultationFees.chat.fee <= 0)) {
                    errors.chatFee = 'Please enter a valid rate for chat consultation';
                }
            }

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                const firstKey = errors.consultationFees ? 'consultationFees' : (errors.videoFee ? 'videoFee' : (errors.voiceFee ? 'voiceFee' : 'chatFee'));
                setTimeout(() => scrollToField(firstKey), 50);
                return;
            }
        }

        if (currentStep === OnboardingStep.DOCUMENTS) {
            if (!formData.nmcRegistrationNumber?.trim()) {
                errors.nmcRegistrationNumber = 'Please enter your NMC / MCI registration number';
            }
            if (!formData.identityProofType) {
                errors.identityProofType = 'Please select your ID proof type';
            }
            if (!formData.identityProofNumber?.trim()) {
                errors.identityProofNumber = 'Please enter your ID document / card number';
            }
            if (!formData.identityProofDocument) {
                errors.identityProofDocument = 'Please upload your ID proof document';
            }
            if (!formData.cmeCertificate) {
                errors.cmeCertificate = 'Please upload your CME or Training certificate';
            }
            if (formData.hasMalpracticeHistory && !formData.malpracticeNotes?.trim()) {
                errors.malpracticeNotes = 'Please provide details regarding the malpractice / legal history';
            }

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors);
                const order = [
                    'nmcRegistrationNumber',
                    'identityProofType',
                    'identityProofNumber',
                    'identityProofDocument',
                    'cmeCertificate',
                    'malpracticeNotes'
                ];
                const firstKey = order.find(k => errors[k]) || Object.keys(errors)[0];
                setTimeout(() => scrollToField(firstKey), 50);
                return;
            }
        }

        setFieldErrors({});

        if (currentStep < OnboardingStep.REVIEW) {
            await saveDraft(true);
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setFieldErrors({});
        if (currentStep > OnboardingStep.BASIC_DETAILS) {
            setCurrentStep(prev => prev - 1);
        } else if (navigation.canGoBack()) {
            navigation.goBack();
        }
    };

    const handleSubmit = async () => {
        if (!formData.telemedicineConsent) {
            setFieldErrors({ telemedicineConsent: 'You must accept the Telemedicine Practice Guidelines to submit' });
            setTimeout(() => scrollToField('telemedicineConsent'), 50);
            return;
        }

        setFieldErrors({});

        if (approvalStatus === 'pending') {
            setStatusModal({
                visible: true,
                status: 'warning',
                title: 'Under Review',
                message: 'Your profile is currently under review by our admin team.',
            });
            return;
        }

        setStatusModal({
            visible: true,
            status: 'info',
            title: 'Confirm Submission',
            message: 'Are you sure you want to submit your application for verification? You will not be able to edit details while under review.',
            primaryActionText: 'Submit Now',
            primaryAction: processSubmission,
        });
    };

    const processSubmission = async () => {
        try {
            setLoading(true);
            setStatusModal(prev => ({ ...prev, visible: false }));

            await saveDraft(true);
            await new Promise(resolve => setTimeout(resolve, 2000));

            const finalFormData = prepareFormData();
            await applyAsDoctor(finalFormData);

            setApprovalStatus('pending');
            setIsReadOnly(true);
            dispatch(loadProfileFromServer());

            setStatusModal({
                visible: true,
                status: 'success',
                title: 'Application Submitted',
                message: 'Your doctor application has been submitted successfully. Our compliance team will review your profile within 24-48 hours.',
                primaryActionText: 'View Status',
                onCloseAction: () => {
                    setApprovalStatus('pending');
                    setIsReadOnly(true);
                },
            });
        } catch (error: any) {
            console.error(error);
            setStatusModal({
                visible: true,
                status: 'error',
                title: 'Submission Failed',
                message: error?.response?.data?.message || 'Failed to submit application. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    const openSelection = (title: string, options: string[], field: string) => {
        setSelectionModal({ visible: true, title, options, field });
    };

    const closeSelection = () => setSelectionModal(null);

    const selectOption = (value: string) => {
        if (selectionModal) {
            if (selectionModal.field === 'tempDocType') {
                setTempDoc(prev => ({ ...prev, type: value }));
            } else {
                updateField(selectionModal.field, value);
            }
            closeSelection();
        }
    };

    const openMediaPicker = (field: string) => {
        setActiveUploadField(field);
        setMediaPickerVisible(true);
    };

    const handleMediaPicked = (asset: any) => {
        if (activeUploadField) {
            const fileData = {
                uri: asset.uri,
                type: asset.mimeType || 'image/jpeg',
                name: asset.fileName || `${activeUploadField}_${Date.now()}.jpg`,
            };

            if (activeUploadField === 'certificates') {
                setTempDoc(prev => ({ ...prev, file: fileData }));
            } else {
                updateField(activeUploadField, fileData);
            }
        }
        setMediaPickerVisible(false);
    };

    const launchCamera = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (!permissionResult.granted) {
            setStatusModal({
                visible: true,
                status: 'warning',
                title: 'Permission Rejected',
                message: 'Camera access is required to take photos.',
            });
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            handleMediaPicked(result.assets[0]);
        }
    };

    const launchLibrary = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
            handleMediaPicked(result.assets[0]);
        }
    };

    const addDocument = () => {
        if (!tempDoc.type || !tempDoc.file) {
            setStatusModal({
                visible: true,
                status: 'warning',
                title: 'Missing Information',
                message: 'Please select a document type and upload the file.',
            });
            return;
        }

        updateField('certificates', [...formData.certificates, { ...tempDoc }]);
        setTempDoc({ type: '', number: '', expiry: '', file: null });
        setIsAddingDoc(false);
    };

    const removeDocument = (index: number) => {
        const updated = [...formData.certificates];
        updated.splice(index, 1);
        updateField('certificates', updated);
    };

    // --- Modern Visual Stepper ---
    const renderStepper = () => {
        return (
            <View style={styles.stepperContainer}>
                <View style={styles.stepperRow}>
                    {STEPS_NAV.map((s, idx) => {
                        const isDone = currentStep > s.step;
                        const isCurrent = currentStep === s.step;
                        const IconComp = s.icon;

                        return (
                            <React.Fragment key={s.step}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        // Allow jumping back to already completed steps
                                        if (s.step < currentStep && !isReadOnly) {
                                            setCurrentStep(s.step);
                                        }
                                    }}
                                    style={styles.stepItem}
                                >
                                    <View
                                        style={[
                                            styles.stepCircle,
                                            isDone && styles.stepCircleDone,
                                            isCurrent && styles.stepCircleActive,
                                        ]}
                                    >
                                        {isDone ? (
                                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                        ) : (
                                            <IconComp
                                                size={15}
                                                color={isCurrent ? '#0FBBA1' : '#94A3B8'}
                                                strokeWidth={isCurrent ? 2.5 : 2}
                                            />
                                        )}
                                    </View>
                                    <Text
                                        style={[
                                            styles.stepLabel,
                                            isDone && styles.stepLabelDone,
                                            isCurrent && styles.stepLabelActive,
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {s.title}
                                    </Text>
                                </TouchableOpacity>

                                {idx < STEPS_NAV.length - 1 && (
                                    <View style={styles.stepLineWrapper}>
                                        <View
                                            style={[
                                                styles.stepLine,
                                                currentStep > s.step && styles.stepLineDone,
                                            ]}
                                        />
                                    </View>
                                )}
                            </React.Fragment>
                        );
                    })}
                </View>
            </View>
        );
    };

    // --- Step 1: Basic Details ---
    const renderBasicDetailsStep = () => (
        <View style={styles.stepContainer}>
            {/* Profile Photo Upload Card */}
            <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Doctor Profile Photo</Text>
                <Text style={styles.cardHeaderSub}>High quality photo in professional doctor uniform/coat</Text>

                <TouchableOpacity
                    style={[
                        styles.photoUploadBox,
                        formData.uniformPhoto && styles.photoUploadBoxActive,
                    ]}
                    onPress={() => openMediaPicker('uniformPhoto')}
                    activeOpacity={0.8}
                >
                    {formData.uniformPhoto ? (
                        <View style={styles.uploadedPhotoRow}>
                            <Image
                                source={{ uri: formData.uniformPhoto.uri }}
                                style={styles.uploadedAvatar}
                            />
                            <View style={styles.uploadedPhotoInfo}>
                                <View style={styles.verifiedPill}>
                                    <CheckCircle2 size={13} color="#0FBBA1" />
                                    <Text style={styles.verifiedPillText}>Photo Attached</Text>
                                </View>
                                <Text style={styles.uploadedFileName} numberOfLines={1}>
                                    {formData.uniformPhoto.name || 'profile_photo.jpg'}
                                </Text>
                                <Text style={styles.changeFilePrompt}>Tap to change photo</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <View style={styles.uploadIconCircle}>
                                <UploadCloud size={24} color="#0FBBA1" />
                            </View>
                            <Text style={styles.uploadPrimaryText}>Tap to Upload Photo</Text>
                            <Text style={styles.uploadSecondaryText}>PNG, JPG or JPEG • Max 10MB</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Qualifications Card */}
            <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Qualifications & Specialty</Text>

                {/* Qualification Type */}
                <View
                    ref={el => { fieldRefs.current.doctorType = el; }}
                    onLayout={handleFieldLayout('doctorType')}
                    style={styles.inputGroup}
                >
                    <Text style={styles.label}>
                        Primary Qualification <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                        style={[styles.selectInput, fieldErrors.doctorType && styles.inputError]}
                        onPress={() => openSelection('Select Qualification', DOCTOR_TYPES, 'doctorType')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.selectLeft}>
                            <Award size={18} color={fieldErrors.doctorType ? '#EF4444' : (formData.doctorType ? '#0FBBA1' : '#94A3B8')} />
                            <Text style={[styles.selectText, !formData.doctorType && styles.placeholderText]}>
                                {formData.doctorType || 'e.g. MBBS, MD, MS'}
                            </Text>
                        </View>
                        <ChevronDown size={18} color={fieldErrors.doctorType ? '#EF4444' : '#94A3B8'} />
                    </TouchableOpacity>
                    {fieldErrors.doctorType && (
                        <Text style={styles.errorText}>{fieldErrors.doctorType}</Text>
                    )}
                </View>

                {/* Specialization */}
                <View
                    ref={el => { fieldRefs.current.specialization = el; }}
                    onLayout={handleFieldLayout('specialization')}
                    style={styles.inputGroup}
                >
                    <Text style={styles.label}>
                        Medical Specialization <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                        style={[styles.selectInput, fieldErrors.specialization && styles.inputError]}
                        onPress={() => openSelection('Select Specialization', SPECIALIZATIONS, 'specialization')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.selectLeft}>
                            <Stethoscope size={18} color={fieldErrors.specialization ? '#EF4444' : (formData.specialization ? '#0FBBA1' : '#94A3B8')} />
                            <Text style={[styles.selectText, !formData.specialization && styles.placeholderText]}>
                                {formData.specialization || 'e.g. General Physician, Cardiologist'}
                            </Text>
                        </View>
                        <ChevronDown size={18} color={fieldErrors.specialization ? '#EF4444' : '#94A3B8'} />
                    </TouchableOpacity>
                    {fieldErrors.specialization && (
                        <Text style={styles.errorText}>{fieldErrors.specialization}</Text>
                    )}
                </View>

                {/* Experience */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Years of Experience</Text>
                    <View style={styles.inputWithIcon}>
                        <Briefcase size={18} color={formData.experience ? '#0FBBA1' : '#94A3B8'} />
                        <TextInput
                            style={styles.inputInside}
                            placeholder="e.g. 8"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            value={formData.experience}
                            onChangeText={t => updateField('experience', t)}
                        />
                    </View>
                </View>
            </View>

            {/* Practice Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Practice & Bio</Text>

                {/* Languages */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Languages Spoken</Text>

                    {/* Language Dropdown Trigger */}
                    <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => setLanguageModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.selectLeft}>
                            <Globe size={18} color={getSelectedLanguages().length > 0 ? '#0FBBA1' : '#94A3B8'} />
                            <Text
                                style={[
                                    styles.selectText,
                                    getSelectedLanguages().length === 0 && styles.placeholderText,
                                    { flex: 1 }
                                ]}
                                numberOfLines={1}
                            >
                                {getSelectedLanguages().length === 0
                                    ? 'Select languages spoken'
                                    : `${getSelectedLanguages().length} language${getSelectedLanguages().length > 1 ? 's' : ''} selected • Tap to edit`}
                            </Text>
                        </View>
                        <ChevronDown size={18} color="#94A3B8" />
                    </TouchableOpacity>

                    {/* Selected Language Bubbles */}
                    {getSelectedLanguages().length > 0 && (
                        <View style={styles.selectedLangChipsRow}>
                            {getSelectedLanguages().map((lang) => (
                                <View key={lang} style={styles.selectedLangChip}>
                                    <Text style={styles.selectedLangChipText}>{lang}</Text>
                                    {!isReadOnly && (
                                        <TouchableOpacity
                                            onPress={() => toggleLanguage(lang)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        >
                                            <X size={13} color="#0F766E" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Hospital / Clinic */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current Hospital / Clinic Affiliation</Text>
                    <View style={styles.inputWithIcon}>
                        <Building2 size={18} color={formData.hospital ? '#0FBBA1' : '#94A3B8'} />
                        <TextInput
                            style={styles.inputInside}
                            placeholder="e.g. Apollo Hospital, Fortis"
                            placeholderTextColor="#94A3B8"
                            value={formData.hospital}
                            onChangeText={t => updateField('hospital', t)}
                        />
                    </View>
                </View>

                {/* Description / Bio */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Professional Bio</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Brief summary of your background, areas of expertise, and care philosophy..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        value={formData.description}
                        onChangeText={t => updateField('description', t)}
                    />
                </View>
            </View>
        </View>
    );

    // --- Step 2: Consultation Fees ---
    const renderFeeInput = (
        label: string,
        type: 'chat' | 'voice' | 'video',
        subtitle: string,
        IconComponent: any,
        iconBg: string,
        iconColor: string,
        quickFees: number[]
    ) => {
        const fees = formData.consultationFees[type];
        const isEnabled = fees.isEnabled;
        const feeError = fieldErrors[`${type}Fee`];

        return (
            <View
                ref={el => { fieldRefs.current[`${type}Fee`] = el; }}
                onLayout={handleFieldLayout(`${type}Fee`)}
                style={[
                    styles.modernFeeCard,
                    isEnabled && styles.modernFeeCardActive,
                    feeError && styles.feeCardError,
                ]}
            >
                <TouchableOpacity
                    style={styles.feeHeaderRow}
                    activeOpacity={0.8}
                    onPress={() => {
                        updateField('consultationFees', {
                            ...formData.consultationFees,
                            [type]: { ...fees, isEnabled: !isEnabled }
                        });
                    }}
                >
                    <View style={[styles.feeIconCircle, { backgroundColor: iconBg }]}>
                        <IconComponent size={20} color={iconColor} />
                    </View>
                    <View style={styles.feeTitleWrapper}>
                        <Text style={styles.feeTitleText}>{label}</Text>
                        <Text style={styles.feeSubtitleText}>{subtitle}</Text>
                    </View>
                    <View style={[styles.modernToggle, isEnabled && styles.modernToggleActive]}>
                        <View style={[styles.toggleKnob, isEnabled && styles.toggleKnobActive]} />
                    </View>
                </TouchableOpacity>

                {isEnabled && (
                    <View style={styles.feeConfigArea}>
                        <View style={styles.feeInputRow}>
                            <Text style={styles.feeInputLabel}>Consultation Rate:</Text>
                            <View style={[styles.feeInputBox, feeError && styles.inputError]}>
                                <Text style={styles.currencySymbol}>₹</Text>
                                <TextInput
                                    style={styles.feeTextInput}
                                    placeholder="0"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={fees.fee ? fees.fee.toString() : ''}
                                    onChangeText={t => {
                                        updateField('consultationFees', {
                                            ...formData.consultationFees,
                                            [type]: { ...fees, fee: Number(t) || 0 }
                                        });
                                    }}
                                />
                                <Text style={styles.perSessionText}>/ session</Text>
                            </View>
                        </View>

                        {feeError && (
                            <Text style={[styles.errorText, { marginBottom: 8 }]}>
                                {feeError}
                            </Text>
                        )}

                        {/* Quick Selection Pills */}
                        <View style={styles.quickPillsRow}>
                            <Text style={styles.quickPillLabel}>Quick select:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPillsScroll}>
                                {quickFees.map((amt) => {
                                    const isSelected = fees.fee === amt;
                                    return (
                                        <TouchableOpacity
                                            key={amt}
                                            style={[styles.quickPill, isSelected && styles.quickPillActive]}
                                            onPress={() => {
                                                updateField('consultationFees', {
                                                    ...formData.consultationFees,
                                                    [type]: { ...fees, fee: amt }
                                                });
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.quickPillText, isSelected && styles.quickPillTextActive]}>
                                                ₹{amt}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderConsultationFeesStep = () => (
        <View style={styles.stepContainer}>
            {fieldErrors.consultationFees && (
                <View
                    ref={el => { fieldRefs.current.consultationFees = el; }}
                    onLayout={handleFieldLayout('consultationFees')}
                    style={styles.errorAlertBox}
                >
                    <AlertCircle size={18} color="#DC2626" />
                    <Text style={styles.errorAlertText}>{fieldErrors.consultationFees}</Text>
                </View>
            )}

            {renderFeeInput(
                'Video Consultation',
                'video',
                'HD 1-on-1 video call consultations with patients',
                Video,
                '#EFF6FF',
                '#2563EB',
                [300, 500, 750, 1000]
            )}

            {renderFeeInput(
                'Voice Call Consultation',
                'voice',
                'Direct audio call with clinical record access',
                Phone,
                '#F5F3FF',
                '#7C3AED',
                [200, 350, 500, 750]
            )}

            {renderFeeInput(
                'Chat Consultation',
                'chat',
                'Async text messaging with prescription support',
                MessageSquare,
                '#ECFDF5',
                '#059669',
                [150, 250, 400, 600]
            )}

            <View style={styles.infoBanner}>
                <Info size={16} color="#0FBBA1" />
                <Text style={styles.infoBannerText}>
                    You can modify consultation pricing and availability anytime from Doctor Settings.
                </Text>
            </View>
        </View>
    );

    // --- Step 3: Document Uploads ---
    const renderDocumentsStep = () => (
        <View style={styles.stepContainer}>
            {/* Section 1: NMC Registration */}
            <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                    <ShieldCheck size={20} color="#0FBBA1" />
                    <Text style={styles.cardHeaderTitle}>Medical Council Registration</Text>
                </View>

                <View
                    ref={el => { fieldRefs.current.nmcRegistrationNumber = el; }}
                    onLayout={handleFieldLayout('nmcRegistrationNumber')}
                    style={styles.inputGroup}
                >
                    <Text style={styles.label}>
                        NMC / MCI Registration Number <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <View style={[styles.inputWithIcon, fieldErrors.nmcRegistrationNumber && styles.inputError]}>
                        <Shield size={18} color={fieldErrors.nmcRegistrationNumber ? '#EF4444' : (formData.nmcRegistrationNumber ? '#0FBBA1' : '#94A3B8')} />
                        <TextInput
                            style={styles.inputInside}
                            placeholder="e.g. NMC-123456"
                            placeholderTextColor="#94A3B8"
                            value={formData.nmcRegistrationNumber}
                            autoCapitalize="characters"
                            onChangeText={t => updateField('nmcRegistrationNumber', t.toUpperCase())}
                        />
                    </View>
                    {fieldErrors.nmcRegistrationNumber && (
                        <Text style={styles.errorText}>{fieldErrors.nmcRegistrationNumber}</Text>
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>State Medical Council</Text>
                    <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => openSelection('Select State Council', STATE_COUNCILS, 'stateMedicalCouncil')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.selectLeft}>
                            <Building2 size={18} color={formData.stateMedicalCouncil ? '#0FBBA1' : '#94A3B8'} />
                            <Text style={[styles.selectText, !formData.stateMedicalCouncil && styles.placeholderText]}>
                                {formData.stateMedicalCouncil || 'Select State Medical Council'}
                            </Text>
                        </View>
                        <ChevronDown size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>State Reg. No.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="State Number"
                            placeholderTextColor="#94A3B8"
                            value={formData.stateCouncilRegistrationNumber}
                            autoCapitalize="characters"
                            onChangeText={t => updateField('stateCouncilRegistrationNumber', t.toUpperCase())}
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Valid Till</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDatePicker('stateCouncilValidTill')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.selectText, !formData.stateCouncilValidTill && styles.placeholderText]}>
                                {formData.stateCouncilValidTill || 'DD/MM/YYYY'}
                            </Text>
                            <Calendar size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Section 2: Identity Proof */}
            <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                    <IdCard size={20} color="#0FBBA1" />
                    <Text style={styles.cardHeaderTitle}>Government Identity Proof</Text>
                </View>

                <View
                    ref={el => { fieldRefs.current.identityProofType = el; }}
                    onLayout={handleFieldLayout('identityProofType')}
                    style={styles.inputGroup}
                >
                    <Text style={styles.label}>
                        ID Proof Type <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TouchableOpacity
                        style={[styles.selectInput, fieldErrors.identityProofType && styles.inputError]}
                        onPress={() => openSelection('Select ID Type', IDENTITY_PROOF_TYPES, 'identityProofType')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.selectLeft}>
                            <IdCard size={18} color={fieldErrors.identityProofType ? '#EF4444' : (formData.identityProofType ? '#0FBBA1' : '#94A3B8')} />
                            <Text
                                style={[
                                    styles.selectText,
                                    !formData.identityProofType && styles.placeholderText,
                                    { flex: 1 }
                                ]}
                                numberOfLines={1}
                            >
                                {formData.identityProofType || 'Select ID Type'}
                            </Text>
                        </View>
                        <ChevronDown size={18} color={fieldErrors.identityProofType ? '#EF4444' : '#94A3B8'} />
                    </TouchableOpacity>
                    {fieldErrors.identityProofType && (
                        <Text style={styles.errorText}>{fieldErrors.identityProofType}</Text>
                    )}
                </View>

                {/* ID Number - Full Width */}
                <View
                    ref={el => { fieldRefs.current.identityProofNumber = el; }}
                    onLayout={handleFieldLayout('identityProofNumber')}
                    style={styles.inputGroup}
                >
                    <Text style={styles.label}>
                        ID Number <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, fieldErrors.identityProofNumber && styles.inputError]}
                        placeholder="Enter Document / Card Number"
                        placeholderTextColor="#94A3B8"
                        value={formData.identityProofNumber}
                        autoCapitalize="characters"
                        onChangeText={t => updateField('identityProofNumber', t.toUpperCase())}
                    />
                    {fieldErrors.identityProofNumber && (
                        <Text style={styles.errorText}>{fieldErrors.identityProofNumber}</Text>
                    )}
                </View>

                {/* Valid Till */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Valid Till (Optional)</Text>
                    <TouchableOpacity
                        style={styles.selectInput}
                        onPress={() => openDatePicker('identityProofValidTill')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.selectText, !formData.identityProofValidTill && styles.placeholderText]}>
                            {formData.identityProofValidTill || 'DD/MM/YYYY'}
                        </Text>
                        <Calendar size={18} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                <View
                    ref={el => { fieldRefs.current.identityProofDocument = el; }}
                    onLayout={handleFieldLayout('identityProofDocument')}
                >
                    <TouchableOpacity
                        style={[
                            styles.uploadBox,
                            formData.identityProofDocument && styles.uploadBoxActive,
                            fieldErrors.identityProofDocument && styles.uploadBoxError,
                        ]}
                        onPress={() => openMediaPicker('identityProofDocument')}
                        activeOpacity={0.8}
                    >
                        {formData.identityProofDocument ? (
                            <View style={styles.uploadSuccessRow}>
                                <CheckCircle2 size={22} color="#0FBBA1" />
                                <View style={styles.uploadSuccessTextWrapper}>
                                    <Text style={styles.uploadSuccessTitle}>ID Proof Attached</Text>
                                    <Text style={styles.uploadSuccessFileName} numberOfLines={1}>
                                        {formData.identityProofDocument.name || 'id_document.pdf'}
                                    </Text>
                                </View>
                                <Text style={styles.changeActionText}>Change</Text>
                            </View>
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <UploadCloud size={24} color={fieldErrors.identityProofDocument ? '#EF4444' : '#0FBBA1'} />
                                <Text style={[styles.uploadPrimaryText, fieldErrors.identityProofDocument && { color: '#EF4444' }]}>
                                    Upload ID Proof Document *
                                </Text>
                                <Text style={styles.uploadSecondaryText}>PDF, JPG or PNG format</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {fieldErrors.identityProofDocument && (
                        <Text style={styles.errorText}>{fieldErrors.identityProofDocument}</Text>
                    )}
                </View>
            </View>

            {/* Section 3: CME Certificate */}
            <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                    <FileBadge size={20} color="#0FBBA1" />
                    <Text style={styles.cardHeaderTitle}>CME / Training Certificate</Text>
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Issued Date</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDatePicker('cmeIssuedAt')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.selectText, !formData.cmeIssuedAt && styles.placeholderText]}>
                                {formData.cmeIssuedAt || 'DD/MM/YYYY'}
                            </Text>
                            <Calendar size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Valid Till</Text>
                        <TouchableOpacity
                            style={styles.selectInput}
                            onPress={() => openDatePicker('cmeValidTill')}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.selectText, !formData.cmeValidTill && styles.placeholderText]}>
                                {formData.cmeValidTill || 'DD/MM/YYYY'}
                            </Text>
                            <Calendar size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View
                    ref={el => { fieldRefs.current.cmeCertificate = el; }}
                    onLayout={handleFieldLayout('cmeCertificate')}
                >
                    <TouchableOpacity
                        style={[
                            styles.uploadBox,
                            formData.cmeCertificate && styles.uploadBoxActive,
                            fieldErrors.cmeCertificate && styles.uploadBoxError,
                        ]}
                        onPress={() => openMediaPicker('cmeCertificate')}
                        activeOpacity={0.8}
                    >
                        {formData.cmeCertificate ? (
                            <View style={styles.uploadSuccessRow}>
                                <CheckCircle2 size={22} color="#0FBBA1" />
                                <View style={styles.uploadSuccessTextWrapper}>
                                    <Text style={styles.uploadSuccessTitle}>CME Certificate Attached</Text>
                                    <Text style={styles.uploadSuccessFileName} numberOfLines={1}>
                                        {formData.cmeCertificate.name || 'cme_certificate.pdf'}
                                    </Text>
                                </View>
                                <Text style={styles.changeActionText}>Change</Text>
                            </View>
                        ) : (
                            <View style={styles.uploadPlaceholder}>
                                <UploadCloud size={24} color={fieldErrors.cmeCertificate ? '#EF4444' : '#0FBBA1'} />
                                <Text style={[styles.uploadPrimaryText, fieldErrors.cmeCertificate && { color: '#EF4444' }]}>
                                    Upload CME Certificate *
                                </Text>
                                <Text style={styles.uploadSecondaryText}>PDF, JPG or PNG format</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    {fieldErrors.cmeCertificate && (
                        <Text style={styles.errorText}>{fieldErrors.cmeCertificate}</Text>
                    )}
                </View>
            </View>

            {/* Section 4: Malpractice Declaration */}
            <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                    <ShieldAlert size={20} color="#F59E0B" />
                    <Text style={styles.cardHeaderTitle}>Malpractice & Legal History</Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.malpracticeCheckboxRow,
                        formData.hasMalpracticeHistory && styles.malpracticeCheckboxRowActive
                    ]}
                    onPress={() => updateField('hasMalpracticeHistory', !formData.hasMalpracticeHistory)}
                    activeOpacity={0.8}
                >
                    <View style={[styles.checkbox, formData.hasMalpracticeHistory && styles.checkboxActive]}>
                        {formData.hasMalpracticeHistory && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text style={styles.checkboxLabel}>
                        Have you ever been involved in a medical malpractice suit or had your license suspended?
                    </Text>
                </TouchableOpacity>

                {formData.hasMalpracticeHistory && (
                    <View
                        ref={el => { fieldRefs.current.malpracticeNotes = el; }}
                        onLayout={handleFieldLayout('malpracticeNotes')}
                        style={[styles.inputGroup, { marginTop: 14 }]}
                    >
                        <Text style={styles.label}>
                            Please provide details & case status <Text style={styles.reqStar}>*</Text>
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                styles.textArea,
                                fieldErrors.malpracticeNotes && styles.inputError,
                            ]}
                            placeholder="Provide details regarding the case, dates, jurisdiction and resolution..."
                            placeholderTextColor="#94A3B8"
                            value={formData.malpracticeNotes}
                            onChangeText={t => updateField('malpracticeNotes', t)}
                            multiline
                            textAlignVertical="top"
                        />
                        {fieldErrors.malpracticeNotes && (
                            <Text style={styles.errorText}>{fieldErrors.malpracticeNotes}</Text>
                        )}
                    </View>
                )}
            </View>

            {/* Section 5: Additional Certificates */}
            <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                    <FileText size={20} color="#0FBBA1" />
                    <Text style={styles.cardHeaderTitle}>Additional Degrees & Certifications</Text>
                </View>

                {formData.certificates.map((doc, index) => (
                    <View key={index} style={styles.docItemCard}>
                        <View style={styles.docItemIconCircle}>
                            <FileCheck size={18} color="#0FBBA1" />
                        </View>
                        <View style={styles.docInfo}>
                            <Text style={styles.docType}>{doc.type || 'Certificate'}</Text>
                            <Text style={styles.docDetails}>
                                {doc.number ? `ID: ${doc.number}` : ''} {doc.expiry ? `• Exp: ${doc.expiry}` : ''}
                            </Text>
                            <Text style={styles.fileName} numberOfLines={1}>
                                {doc.file?.name || doc.name || 'Document Uploaded'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => removeDocument(index)}
                            style={styles.deleteButton}
                            activeOpacity={0.7}
                        >
                            <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ))}

                {isAddingDoc ? (
                    <View style={styles.addDocForm}>
                        <Text style={styles.formTitle}>Add New Document</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Document Type <Text style={styles.reqStar}>*</Text>
                            </Text>
                            <TouchableOpacity
                                style={styles.selectInput}
                                onPress={() => openSelection('Select Document Type', CERTIFICATE_TYPES, 'tempDocType')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.selectText, !tempDoc.type && styles.placeholderText]}>
                                    {tempDoc.type || 'Select Certificate Type'}
                                </Text>
                                <ChevronDown size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>ID / Registration Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. DEG-78901"
                                placeholderTextColor="#94A3B8"
                                value={tempDoc.number}
                                autoCapitalize="characters"
                                onChangeText={t => setTempDoc(prev => ({ ...prev, number: t.toUpperCase() }))}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Expiry Date (Optional)</Text>
                            <TouchableOpacity
                                style={styles.selectInput}
                                onPress={() => openDatePicker('tempDocExpiry')}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.selectText, !tempDoc.expiry && styles.placeholderText]}>
                                    {tempDoc.expiry || 'DD/MM/YYYY'}
                                </Text>
                                <Calendar size={18} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.uploadBox, tempDoc.file && styles.uploadBoxActive]}
                            onPress={() => openMediaPicker('certificates')}
                            activeOpacity={0.8}
                        >
                            {tempDoc.file ? (
                                <View style={styles.uploadSuccessRow}>
                                    <CheckCircle2 size={22} color="#0FBBA1" />
                                    <View style={styles.uploadSuccessTextWrapper}>
                                        <Text style={styles.uploadSuccessTitle}>File Attached</Text>
                                        <Text style={styles.uploadSuccessFileName} numberOfLines={1}>
                                            {tempDoc.file.name}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <UploadCloud size={24} color="#0FBBA1" />
                                    <Text style={styles.uploadPrimaryText}>Select Certificate File *</Text>
                                    <Text style={styles.uploadSecondaryText}>JPG, PNG or PDF</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.formActions}>
                            <TouchableOpacity
                                style={[styles.btnOutline, { flex: 1 }]}
                                onPress={() => setIsAddingDoc(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.btnOutlineText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btnPrimary, { flex: 1 }]}
                                onPress={addDocument}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnPrimaryText}>Add Document</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.addNewDocButton}
                        onPress={() => setIsAddingDoc(true)}
                        activeOpacity={0.7}
                    >
                        <Plus size={18} color="#0FBBA1" />
                        <Text style={styles.addNewDocText}>Add Additional Certificate</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    // --- Step 4: Review & Submit ---
    const renderReviewStep = () => (
        <View style={styles.stepContainer}>
            {/* Profile Overview Hero Card */}
            <View style={styles.reviewHeroCard}>
                <View style={styles.reviewAvatarSection}>
                    {formData.uniformPhoto ? (
                        <Image source={{ uri: formData.uniformPhoto.uri }} style={styles.reviewAvatarImage} />
                    ) : (
                        <View style={styles.reviewAvatarPlaceholder}>
                            <User size={32} color="#0FBBA1" />
                        </View>
                    )}
                    <View style={styles.reviewDoctorMeta}>
                        <Text style={styles.reviewDoctorBadge}>
                            {formData.doctorType || 'Doctor'}
                        </Text>
                        <Text style={styles.reviewDoctorSpecialty}>
                            {formData.specialization || 'Specialist'}
                        </Text>
                        <Text style={styles.reviewDoctorSub}>
                            {formData.experience ? `${formData.experience} yrs exp` : ''}
                            {formData.hospital ? ` • ${formData.hospital}` : ''}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Summary Details Grid Card */}
            <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Credentials Summary</Text>

                <View style={styles.reviewRow}>
                    <Text style={styles.reviewFieldLabel}>NMC / MCI Reg. No.</Text>
                    <Text style={styles.reviewFieldValue}>{formData.nmcRegistrationNumber || 'Not specified'}</Text>
                </View>

                <View style={styles.reviewDivider} />

                <View style={styles.reviewRow}>
                    <Text style={styles.reviewFieldLabel}>State Medical Council</Text>
                    <Text style={styles.reviewFieldValue}>
                        {formData.stateMedicalCouncil || 'N/A'} {formData.stateCouncilRegistrationNumber ? `(${formData.stateCouncilRegistrationNumber})` : ''}
                    </Text>
                </View>

                <View style={styles.reviewDivider} />

                <View style={styles.reviewRow}>
                    <Text style={styles.reviewFieldLabel}>Identity Document</Text>
                    <Text style={styles.reviewFieldValue}>
                        {formData.identityProofType || 'ID'} - {formData.identityProofNumber || 'N/A'}
                    </Text>
                </View>

                <View style={styles.reviewDivider} />

                <View style={styles.reviewRow}>
                    <Text style={styles.reviewFieldLabel}>Malpractice Status</Text>
                    <Text style={[styles.reviewFieldValue, { color: formData.hasMalpracticeHistory ? '#EF4444' : '#10B981' }]}>
                        {formData.hasMalpracticeHistory ? 'Declared' : 'No History'}
                    </Text>
                </View>
            </View>

            {/* Consultation Services Summary Card */}
            <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Enabled Consultation Services</Text>

                <View style={styles.reviewServicesGrid}>
                    {['video', 'voice', 'chat'].map((mode) => {
                        const m = mode as keyof typeof formData.consultationFees;
                        const details = formData.consultationFees[m];
                        if (typeof details === 'object' && details.isEnabled) {
                            return (
                                <View key={mode} style={styles.serviceRateBadge}>
                                    <Check size={14} color="#0FBBA1" strokeWidth={2.5} />
                                    <Text style={styles.serviceRateText}>
                                        {mode.toUpperCase()}: <Text style={styles.serviceRateBold}>₹{details.fee}</Text>
                                    </Text>
                                </View>
                            );
                        }
                        return null;
                    })}
                    {(!formData.consultationFees.video.isEnabled &&
                        !formData.consultationFees.voice.isEnabled &&
                        !formData.consultationFees.chat.isEnabled) && (
                            <Text style={styles.placeholderText}>No consultation services enabled yet</Text>
                        )}
                </View>
            </View>

            {/* Regulatory & Telemedicine Consent Card */}
            <View
                ref={el => { fieldRefs.current.telemedicineConsent = el; }}
                onLayout={handleFieldLayout('telemedicineConsent')}
                style={[
                    styles.consentCard,
                    fieldErrors.telemedicineConsent && styles.consentCardError,
                ]}
            >
                <TouchableOpacity
                    style={styles.consentCheckboxRow}
                    onPress={() => updateField('telemedicineConsent', !formData.telemedicineConsent)}
                    activeOpacity={0.8}
                >
                    <View style={[
                        styles.checkbox,
                        formData.telemedicineConsent && styles.checkboxActive,
                        fieldErrors.telemedicineConsent && styles.checkboxError,
                    ]}>
                        {formData.telemedicineConsent && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.consentTitle, fieldErrors.telemedicineConsent && { color: '#B91C1C' }]}>
                            Telemedicine Guidelines Compliance *
                        </Text>
                        <Text style={styles.consentDescription}>
                            I confirm that I am a registered medical practitioner in India and I agree to comply with the Telemedicine Practice Guidelines (2020) and Code of Medical Ethics.
                        </Text>
                        {fieldErrors.telemedicineConsent && (
                            <Text style={[styles.errorText, { marginTop: 6 }]}>
                                {fieldErrors.telemedicineConsent}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.securityNote}>
                <ShieldCheck size={16} color="#0FBBA1" style={{ marginTop: 2 }} />
                <Text style={styles.securityNoteText}>
                    Your credentials are encrypted & verified by the Medicoo Medical Compliance Board within 24-48 hours.
                </Text>
            </View>
        </View>
    );

    const handleRefreshStatus = async () => {
        try {
            setRefreshingStatus(true);
            await loadDoctorProfile();
            await dispatch(loadProfileFromServer());
        } finally {
            setRefreshingStatus(false);
        }
    };

    const renderPendingVerificationScreen = () => {
        return (
            <View style={styles.mainContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

                {/* Clean White Top Header */}
                <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 6) }]}>
                    {navigation.canGoBack() ? (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.headerIconButton}
                            activeOpacity={0.7}
                        >
                            <ChevronLeft size={22} color="#0F172A" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerSpacer} />
                    )}
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Verification Status</Text>
                        <Text style={styles.headerSub}>Application In Review</Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleLogout}
                        style={styles.headerLogoutButton}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.headerLogoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Verification Card */}
                    <View style={styles.pendingHeroCard}>
                        <View style={styles.pendingBadge}>
                            <View style={styles.pendingBadgeDot} />
                            <Text style={styles.pendingBadgeText}>Verification In Progress</Text>
                        </View>

                        <Text style={styles.pendingHeroTitle}>Application Under Review</Text>
                        <Text style={styles.pendingHeroSub}>
                            Thank you for applying to Medicoo. Our Medical Compliance Board is actively verifying your clinical registration and documents.
                        </Text>
                    </View>

                    {/* ETA Turnaround Card */}
                    <View style={styles.etaCard}>
                        <View style={styles.etaHeaderRow}>
                            <View style={styles.etaIconCircle}>
                                <Hourglass size={20} color="#0F766E" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.etaLabel}>Estimated Verification Turnaround</Text>
                                <Text style={styles.etaTimeText}>24 – 48 Hours</Text>
                            </View>
                        </View>
                        <View style={styles.etaDivider} />
                        <Text style={styles.etaDescription}>
                            Most applications submitted during business days are verified within 24 hours. You will receive an SMS and push notification once your profile is live.
                        </Text>
                    </View>

                    {/* Submitted Profile Details Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardHeaderTitle}>Submitted Profile Summary</Text>

                        <View style={styles.reviewRow}>
                            <Text style={styles.reviewFieldLabel}>Qualification</Text>
                            <Text style={styles.reviewFieldValue}>
                                {formData.doctorType || 'Not specified'}
                            </Text>
                        </View>
                        <View style={styles.reviewDivider} />

                        <View style={styles.reviewRow}>
                            <Text style={styles.reviewFieldLabel}>Speciality</Text>
                            <Text style={styles.reviewFieldValue}>
                                {formData.specialization || 'Not specified'}
                            </Text>
                        </View>
                        <View style={styles.reviewDivider} />

                        <View style={styles.reviewRow}>
                            <Text style={styles.reviewFieldLabel}>NMC / MCI Reg. No.</Text>
                            <Text style={styles.reviewFieldValue}>
                                {formData.nmcRegistrationNumber || 'Submitted'}
                            </Text>
                        </View>
                        <View style={styles.reviewDivider} />

                        <View style={styles.reviewRow}>
                            <Text style={styles.reviewFieldLabel}>Government ID</Text>
                            <Text style={styles.reviewFieldValue}>
                                {formData.identityProofType || 'ID Proof'} {formData.identityProofNumber ? `(${formData.identityProofNumber})` : ''}
                            </Text>
                        </View>
                    </View>

                    {/* Compliance Security Note */}
                    <View style={[styles.securityNote, { marginTop: 10 }]}>
                        <ShieldCheck size={16} color="#0FBBA1" style={{ marginTop: 2 }} />
                        <Text style={styles.securityNoteText}>
                            National Medical Commission (NMC) & Telemedicine Practice Guidelines compliant.
                        </Text>
                    </View>
                </ScrollView>

                <StatusModal
                    visible={statusModal.visible}
                    status={statusModal.status}
                    title={statusModal.title}
                    message={statusModal.message}
                    primaryAction={statusModal.primaryAction}
                    primaryActionText={statusModal.primaryActionText}
                    onClose={() => {
                        setStatusModal(prev => ({ ...prev, visible: false }));
                        if (statusModal.onCloseAction) {
                            statusModal.onCloseAction();
                        }
                    }}
                />
            </View>
        );
    };

    const isEditMode = Boolean(route?.params?.isEdit);
    const hasApprovedProfile = Boolean(
        reduxProfile.hasApprovedProfile ||
        reduxProfile.isDoctor
    );

    if (approvalStatus === 'pending' && !isEditMode && !hasApprovedProfile) {
        return renderPendingVerificationScreen();
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.mainContainer}
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Clean White Top Header */}
            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 6) }]}>
                {currentStep > OnboardingStep.BASIC_DETAILS || navigation.canGoBack() ? (
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.headerIconButton}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={22} color="#0F172A" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>
                        {isReadOnly ? 'Doctor Profile' : 'Doctor Application'}
                    </Text>
                    <Text style={styles.headerSub}>
                        {STEPS_NAV[currentStep - 1]?.title} • Step {currentStep} of {TOTAL_STEPS}
                    </Text>
                </View>

                {navigation.canGoBack() ? (
                    <View style={styles.headerSpacer} />
                ) : hasApprovedProfile ? (
                    <TouchableOpacity
                        onPress={() => navigation.replace('DoctorTabs')}
                        style={styles.headerLogoutButton}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.headerLogoutText, { color: '#0FBBA1' }]}>Dashboard</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={handleLogout}
                        style={styles.headerLogoutButton}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.headerLogoutText}>Log Out</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Status Banners if applicable */}
            {approvalStatus === 'pending' && (
                <View style={styles.bannerPending}>
                    <Clock size={16} color="#2563EB" />
                    <Text style={styles.bannerPendingText}>
                        {hasApprovedProfile
                            ? 'Your requested profile update is currently under review by compliance. Your current live profile remains active for consultations.'
                            : 'Application under review by compliance team. Editing is temporarily disabled.'}
                    </Text>
                </View>
            )}
            {approvalStatus === 'rejected' && (
                <View style={styles.bannerRejected}>
                    <AlertCircle size={16} color="#DC2626" />
                    <Text style={styles.bannerRejectedText}>
                        Application Update Required: {rejectionReason || 'Please review and update your documents.'}
                    </Text>
                </View>
            )}
            {approvalStatus === 'approved' && !isReadOnly && (
                <View style={styles.bannerWarning}>
                    <Info size={16} color="#D97706" />
                    <Text style={styles.bannerWarningText}>
                        Profile is verified. Any edited information will require re-verification.
                    </Text>
                </View>
            )}

            {/* Modern Visual Progress Stepper */}
            {renderStepper()}

            {/* Step Body Content */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollArea}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {currentStep === OnboardingStep.BASIC_DETAILS && renderBasicDetailsStep()}
                {currentStep === OnboardingStep.CONSULTATION_FEES && renderConsultationFeesStep()}
                {currentStep === OnboardingStep.DOCUMENTS && renderDocumentsStep()}
                {currentStep === OnboardingStep.REVIEW && renderReviewStep()}
            </ScrollView>

            {/* Floating Bottom Action Bar */}
            <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 16) + 6 }]}>
                {isReadOnly ? (
                    <View style={{ gap: 10, width: '100%' }}>
                        <View style={styles.readOnlyContainer}>
                            <Clock size={18} color="#0FBBA1" />
                            <Text style={styles.readOnlyText}>
                                {hasApprovedProfile
                                    ? 'Your requested profile updates are under review by compliance. Editing is disabled until review is completed.'
                                    : 'Your application is in review. You will receive an SMS & notification once approved.'}
                            </Text>
                        </View>
                        <View style={styles.actionButtonRow}>
                            {currentStep > OnboardingStep.BASIC_DETAILS ? (
                                <TouchableOpacity
                                    style={[styles.btnOutline, { flex: 1 }]}
                                    onPress={() => setCurrentStep(prev => prev - 1)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.btnOutlineText}>Previous</Text>
                                </TouchableOpacity>
                            ) : null}

                            {currentStep < OnboardingStep.REVIEW ? (
                                <TouchableOpacity
                                    style={[styles.btnPrimary, { flex: 1 }]}
                                    onPress={() => setCurrentStep(prev => prev + 1)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.btnPrimaryText}>Next Section</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.btnPrimary, { flex: 1 }]}
                                    onPress={() => {
                                        if (navigation.canGoBack()) {
                                            navigation.goBack();
                                        } else {
                                            navigation.replace('DoctorTabs');
                                        }
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.btnPrimaryText}>Back to Dashboard</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ) : currentStep === OnboardingStep.REVIEW ? (
                    <View style={styles.actionButtonRow}>
                        <TouchableOpacity
                            style={[styles.btnOutline, { flex: 1 }]}
                            onPress={() => saveDraft(false)}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.btnOutlineText}>Save Draft</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btnPrimary, { flex: 2 }]}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <View style={styles.btnRow}>
                                    <Text style={styles.btnPrimaryText}>Submit Application</Text>
                                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionButtonRow}>
                        <TouchableOpacity
                            style={[styles.btnPrimary, { flex: 1 }]}
                            onPress={handleNext}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <View style={styles.btnRow}>
                                    <Text style={styles.btnPrimaryText}>
                                        {currentStep === OnboardingStep.DOCUMENTS ? 'Proceed to Review' : 'Next Step'}
                                    </Text>
                                    <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Selection Modal */}
            <Modal
                visible={!!selectionModal}
                transparent
                animationType="slide"
                onRequestClose={closeSelection}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeSelection}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
                            <View style={styles.modalDragHandle} />
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectionModal?.title}</Text>
                                <TouchableOpacity onPress={closeSelection} style={styles.modalCloseBtn}>
                                    <X size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                                {selectionModal?.options.map((option) => {
                                    const isSelected = formData[selectionModal.field as keyof typeof formData] === option;
                                    return (
                                        <TouchableOpacity
                                            key={option}
                                            style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                            onPress={() => selectOption(option)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                                                {option}
                                            </Text>
                                            {isSelected && (
                                                <View style={styles.selectedCheckCircle}>
                                                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>

            {/* Language Selection Modal */}
            <Modal
                visible={languageModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setLanguageModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setLanguageModalVisible(false)}
                >
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 10, maxHeight: '85%' }]}>
                            <View style={styles.modalDragHandle} />
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>Languages Spoken</Text>
                                    <Text style={styles.modalSubTitle}>
                                        {getSelectedLanguages().length} selected
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setLanguageModalVisible(false)}
                                    style={styles.modalCloseBtn}
                                >
                                    <X size={20} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                                {SPOKEN_LANGUAGES.map((lang) => {
                                    const isSelected = getSelectedLanguages().includes(lang);
                                    return (
                                        <TouchableOpacity
                                            key={lang}
                                            style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                            onPress={() => toggleLanguage(lang)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                                                {lang}
                                            </Text>
                                            <View
                                                style={[
                                                    styles.langCheckbox,
                                                    isSelected && styles.langCheckboxActive
                                                ]}
                                            >
                                                {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <TouchableOpacity
                                style={[styles.btnPrimary, { marginTop: 14 }]}
                                onPress={() => setLanguageModalVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnPrimaryText}>
                                    Confirm Selection ({getSelectedLanguages().length})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            </Modal>

            <MediaPickerModal
                visible={mediaPickerVisible}
                onClose={() => setMediaPickerVisible(false)}
                onCameraSelect={launchCamera}
                onGallerySelect={launchLibrary}
                title="Upload Document"
            />

            <StatusModal
                visible={statusModal.visible}
                status={statusModal.status}
                title={statusModal.title}
                message={statusModal.message}
                primaryAction={statusModal.primaryAction}
                primaryActionText={statusModal.primaryActionText}
                onClose={() => {
                    setStatusModal(prev => ({ ...prev, visible: false }));
                    if (statusModal.onCloseAction) {
                        statusModal.onCloseAction();
                    }
                }}
            />

            {showDatePicker && (
                <DateTimePicker
                    value={getDatePickerValue()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    // --- Header ---
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingBottom: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    headerSub: {
        fontSize: 12,
        fontWeight: '500',
        color: '#64748B',
        marginTop: 1,
    },
    headerSpacer: {
        width: 38,
        height: 38,
    },
    headerLogoutButton: {
        minWidth: 38,
        height: 38,
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    headerLogoutText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EF4444',
    },

    // --- Stepper ---
    stepperContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stepItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    stepCircleActive: {
        backgroundColor: '#E6FAF6',
        borderColor: '#0FBBA1',
        borderWidth: 2,
        shadowColor: '#0FBBA1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    stepCircleDone: {
        backgroundColor: '#0FBBA1',
        borderColor: '#0FBBA1',
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
    },
    stepLabelActive: {
        color: '#0FBBA1',
        fontWeight: '700',
    },
    stepLabelDone: {
        color: '#0F172A',
        fontWeight: '600',
    },
    stepLineWrapper: {
        flex: 1,
        height: 2,
        marginHorizontal: 6,
        marginBottom: 16,
    },
    stepLine: {
        height: 2,
        backgroundColor: '#E2E8F0',
        borderRadius: 1,
    },
    stepLineDone: {
        backgroundColor: '#0FBBA1',
    },

    // --- Content Area ---
    scrollArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    stepContainer: {},

    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 8,
    },
    cardHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    cardHeaderSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
        marginBottom: 14,
    },

    // --- Inputs & Controls ---
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 7,
    },
    reqStar: {
        color: '#EF4444',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    inputInside: {
        flex: 1,
        paddingVertical: 12,
        paddingLeft: 10,
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
    },
    selectInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
    },
    selectLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    selectText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
    },
    placeholderText: {
        color: '#94A3B8',
        fontWeight: '400',
    },
    textArea: {
        height: 96,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
    },

    // --- Upload Dropzone Boxes ---
    photoUploadBox: {
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
    },
    photoUploadBoxActive: {
        borderStyle: 'solid',
        borderColor: '#0FBBA1',
        backgroundColor: '#F0FDF9',
    },
    uploadedPhotoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 14,
    },
    uploadedAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#0FBBA1',
    },
    uploadedPhotoInfo: {
        flex: 1,
    },
    verifiedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 3,
    },
    verifiedPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0FBBA1',
    },
    uploadedFileName: {
        fontSize: 13,
        fontWeight: '500',
        color: '#0F172A',
    },
    changeFilePrompt: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
    },
    uploadPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },
    uploadIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    uploadPrimaryText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 2,
    },
    uploadSecondaryText: {
        fontSize: 12,
        color: '#94A3B8',
    },

    // Document Upload Box
    uploadBox: {
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        marginTop: 6,
    },
    uploadBoxActive: {
        borderStyle: 'solid',
        borderColor: '#0FBBA1',
        backgroundColor: '#F0FDF9',
    },
    uploadSuccessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        gap: 12,
    },
    uploadSuccessTextWrapper: {
        flex: 1,
    },
    uploadSuccessTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0FBBA1',
    },
    uploadSuccessFileName: {
        fontSize: 12,
        color: '#334155',
        marginTop: 1,
    },
    changeActionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0FBBA1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: '#E6FAF6',
    },

    // --- Modality / Fees Step ---
    modernFeeCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    modernFeeCardActive: {
        borderColor: '#0FBBA1',
        backgroundColor: '#FFFFFF',
    },
    feeHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    feeIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    feeTitleWrapper: {
        flex: 1,
    },
    feeTitleText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
    },
    feeSubtitleText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    modernToggle: {
        width: 46,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E2E8F0',
        padding: 3,
        justifyContent: 'center',
    },
    modernToggleActive: {
        backgroundColor: '#0FBBA1',
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleKnobActive: {
        alignSelf: 'flex-end',
    },
    feeConfigArea: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    feeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    feeInputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    feeInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    currencySymbol: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0FBBA1',
        marginRight: 4,
    },
    feeTextInput: {
        width: 65,
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        paddingVertical: 0,
    },
    perSessionText: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
    },
    quickPillsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quickPillLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    quickPillsScroll: {
        flexDirection: 'row',
        gap: 6,
    },
    quickPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    quickPillActive: {
        backgroundColor: '#E6FAF6',
        borderColor: '#0FBBA1',
    },
    quickPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    quickPillTextActive: {
        color: '#0FBBA1',
        fontWeight: '700',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF9',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#CCFBF1',
        gap: 10,
        marginTop: 4,
    },
    infoBannerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#0F766E',
        lineHeight: 17,
    },

    // --- Malpractice & Checkboxes ---
    malpracticeCheckboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    malpracticeCheckboxRowActive: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    checkboxActive: {
        backgroundColor: '#0FBBA1',
        borderColor: '#0FBBA1',
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        color: '#334155',
        lineHeight: 18,
    },

    // --- Document List Cards ---
    docItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    docItemIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    docInfo: {
        flex: 1,
    },
    docType: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    docDetails: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 1,
    },
    fileName: {
        fontSize: 11,
        color: '#0FBBA1',
        fontWeight: '500',
        marginTop: 1,
    },
    deleteButton: {
        padding: 6,
    },
    addNewDocButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#0FBBA1',
        borderStyle: 'dashed',
        backgroundColor: '#F0FDF9',
        gap: 8,
        marginTop: 4,
    },
    addNewDocText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0FBBA1',
    },
    addDocForm: {
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginTop: 8,
    },
    formTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 14,
    },
    formActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },

    // --- Review Step Cards ---
    reviewHeroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    reviewAvatarSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reviewAvatarImage: {
        width: 68,
        height: 68,
        borderRadius: 34,
        borderWidth: 2,
        borderColor: '#0FBBA1',
    },
    reviewAvatarPlaceholder: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#0FBBA1',
    },
    reviewDoctorMeta: {
        flex: 1,
    },
    reviewDoctorBadge: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.2,
    },
    reviewDoctorSpecialty: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0FBBA1',
        marginTop: 2,
    },
    reviewDoctorSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 3,
    },
    reviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    reviewFieldLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    reviewFieldValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        maxWidth: '55%',
        textAlign: 'right',
    },
    reviewDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    reviewServicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceRateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF9',
        borderWidth: 1,
        borderColor: '#CCFBF1',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    serviceRateText: {
        fontSize: 12,
        color: '#334155',
        fontWeight: '600',
    },
    serviceRateBold: {
        color: '#0FBBA1',
        fontWeight: '800',
    },
    consentCard: {
        backgroundColor: '#F0FDF9',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1.5,
        borderColor: '#99F6E4',
        marginBottom: 16,
    },
    consentCheckboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    consentTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F766E',
        marginBottom: 3,
    },
    consentDescription: {
        fontSize: 12,
        fontWeight: '400',
        color: '#115E59',
        lineHeight: 18,
    },
    securityNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    securityNoteText: {
        fontSize: 11,
        color: '#64748B',
        lineHeight: 16,
        flex: 1,
    },

    // --- Floating Bottom Bar ---
    bottomActionBar: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 10,
    },
    actionButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    btnBackOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        gap: 2,
    },
    btnBackText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    btnPrimary: {
        backgroundColor: '#0FBBA1',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0FBBA1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    btnPrimaryText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    btnOutline: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnOutlineText: {
        color: '#334155',
        fontSize: 14,
        fontWeight: '600',
    },
    btnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    readOnlyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF9',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#CCFBF1',
        gap: 10,
    },
    readOnlyText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#0F766E',
        lineHeight: 17,
    },

    // --- Status Banners ---
    bannerPending: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#FEF3C7',
    },
    bannerPendingText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#B45309',
    },
    bannerRejected: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#FEE2E2',
    },
    bannerRejectedText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#B91C1C',
    },
    bannerWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#FEF3C7',
    },
    bannerWarningText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
        color: '#B45309',
    },

    // --- Selection Modal ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    modalDragHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E2E8F0',
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0F172A',
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginVertical: 2,
    },
    optionItemSelected: {
        backgroundColor: '#F0FDF9',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#334155',
    },
    selectedOptionText: {
        color: '#0FBBA1',
        fontWeight: '700',
    },
    selectedCheckCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#0FBBA1',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // --- Language Selection Styles ---
    selectedLangChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 8,
    },
    selectedLangChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6FAF6',
        borderWidth: 1,
        borderColor: '#99F6E4',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
    },
    selectedLangChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F766E',
    },
    modalSubTitle: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },
    langCheckbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    langCheckboxActive: {
        backgroundColor: '#0FBBA1',
        borderColor: '#0FBBA1',
    },

    // --- Validation Error Highlights ---
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    uploadBoxError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    consentCardError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    checkboxError: {
        borderColor: '#EF4444',
    },
    feeCardError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    errorText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#EF4444',
        marginTop: 5,
    },
    errorAlertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1.5,
        borderColor: '#FECACA',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        gap: 10,
    },
    errorAlertText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#DC2626',
        lineHeight: 18,
    },

    // --- Pending Verification Screen Styles ---
    pendingHeroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 22,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    pendingIconOuterCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: '#E6FAF6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    pendingIconInnerCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 6,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    pendingBadgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B',
    },
    pendingBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B45309',
    },
    pendingHeroTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    pendingHeroSub: {
        fontSize: 13,
        fontWeight: '400',
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 8,
    },
    etaCard: {
        backgroundColor: '#F0FDF9',
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#99F6E4',
    },
    etaHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    etaIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#CCFBF1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    etaLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F766E',
    },
    etaTimeText: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F766E',
        marginTop: 1,
    },
    etaDivider: {
        height: 1,
        backgroundColor: '#CCFBF1',
        marginVertical: 12,
    },
    etaDescription: {
        fontSize: 12,
        color: '#115E59',
        lineHeight: 18,
        fontWeight: '400',
    },
    timelineContainer: {
        marginTop: 14,
    },
    timelineItem: {
        flexDirection: 'row',
        minHeight: 56,
    },
    timelineLeft: {
        alignItems: 'center',
        width: 30,
        marginRight: 12,
    },
    timelineNode: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#F1F5F9',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timelineNodeDone: {
        backgroundColor: '#0FBBA1',
        borderColor: '#0FBBA1',
    },
    timelineNodeActive: {
        backgroundColor: '#E6FAF6',
        borderColor: '#0FBBA1',
        borderWidth: 2,
    },
    timelineTrack: {
        width: 2,
        flex: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 3,
    },
    timelineTrackDone: {
        backgroundColor: '#0FBBA1',
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 14,
    },
    timelineTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    timelineTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    timelineTitlePending: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
    },
    timelineStatusDone: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0FBBA1',
        backgroundColor: '#E6FAF6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    timelineStatusActive: {
        fontSize: 11,
        fontWeight: '700',
        color: '#2563EB',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    timelineStatusPending: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
    },
    timelineSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 1,
    },
    refreshStatusBtn: {
        backgroundColor: '#0FBBA1',
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    refreshStatusBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
});
