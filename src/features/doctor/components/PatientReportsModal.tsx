import { ChevronLeft, FileText, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../../services/api/client';
import { getPatientDocumentsForDoctor, PatientDocumentSummary } from '../../../services/api/doctor.api';
import { getToken } from '../../../utils/tokenManagement';
import { getDocumentTypeMeta } from '../../records/documentTypes';
import { useTheme } from '../../../theme/ThemeContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    customerId?: string;
}

const isImageDoc = (doc: PatientDocumentSummary) => doc.fileType === 'image' || doc.mimeType?.startsWith('image/');

export default function PatientReportsModal({ visible, onClose, customerId }: Props) {
    const insets = useSafeAreaInsets();
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [documents, setDocuments] = useState<PatientDocumentSummary[]>([]);
    const [selected, setSelected] = useState<PatientDocumentSummary | null>(null);
    const [token, setToken] = useState<string | null>(null);

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

    useEffect(() => {
        if (!visible || !customerId) return;
        setSelected(null);
        setError(null);
        setLoading(true);
        getToken('access_token').then(setToken);
        getPatientDocumentsForDoctor(customerId)
            .then((data) => setDocuments(data.documents))
            .catch(() => setError('Could not load this patient\'s reports.'))
            .finally(() => setLoading(false));
    }, [visible, customerId]);

    const renderList = () => {
        if (loading) {
            return (
                <View style={styles.centerState}>
                    <ActivityIndicator size="small" color="#0FBBA1" />
                </View>
            );
        }
        if (error) {
            return (
                <View style={styles.centerState}>
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            );
        }
        if (documents.length === 0) {
            return (
                <View style={styles.centerState}>
                    <FileText size={32} color="#D1D5DB" />
                    <Text style={styles.emptyText}>{"This patient hasn't uploaded any reports yet."}</Text>
                </View>
            );
        }
        return documents.map((doc) => (
            <TouchableOpacity key={doc._id} style={styles.docRow} onPress={() => setSelected(doc)}>
                <View style={styles.docIconBox}>
                    <FileText size={20} color="#0FBBA1" />
                </View>
                <View style={styles.docInfo}>
                    <Text style={styles.docTitle} numberOfLines={1}>{doc.name}</Text>
                    <Text style={styles.docSub}>
                        {getDocumentTypeMeta(doc.documentType).label} · {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                </View>
            </TouchableOpacity>
        ));
    };

    const renderViewer = () => {
        if (!selected) return null;
        const viewUrl = `${apiClient.defaults.baseURL}${selected.viewUrl}`;
        return (
            <View>
                <TouchableOpacity style={styles.backRow} onPress={() => setSelected(null)}>
                    <ChevronLeft size={18} color="#0FBBA1" />
                    <Text style={styles.backRowText}>All Reports</Text>
                </TouchableOpacity>
                <Text style={styles.viewerTitle}>{selected.name}</Text>
                {isImageDoc(selected) && token ? (
                    <Image
                        source={{ uri: viewUrl, headers: { Authorization: `Bearer ${token}` } }}
                        style={styles.previewImage}
                        resizeMode="contain"
                    />
                ) : (
                    <View style={styles.fallbackCard}>
                        <FileText size={40} color="#0FBBA1" />
                        <Text style={styles.fallbackText}>
                            {"This file type can't be previewed here."}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Patient Reports</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.scroll}>
                        {selected ? renderViewer() : renderList()}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    content: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
        minHeight: 260,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: '#111827' },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    scroll: { marginTop: 16 },
    centerState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24 },
    docRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    docIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    docInfo: { flex: 1 },
    docTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
    docSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    backRowText: { color: '#0FBBA1', fontSize: 14, fontWeight: '600', marginLeft: 2 },
    viewerTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
    previewImage: { width: '100%', height: 320, borderRadius: 12, backgroundColor: '#F3F4F6' },
    fallbackCard: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingVertical: 40,
        gap: 10,
    },
    fallbackText: { fontSize: 13, color: '#9CA3AF' },
});
