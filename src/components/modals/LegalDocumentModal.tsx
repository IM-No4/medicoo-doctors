import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ErrorState from '../layout/ErrorState';
import { getLegalDocument, LegalDocumentType, LegalSectionDto } from '../../services/api/legal.api';

interface Props {
    visible: boolean;
    documentType: LegalDocumentType | null;
    onClose: () => void;
}

const FALLBACK_TITLES: Record<LegalDocumentType, string> = {
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    security: 'Security Standards',
    'community-guidelines': 'Community Guidelines',
};

// A plain Modal so it can be opened from LegalAcceptanceModal and actually
// render on top of it - navigating to a screen "underneath" an already-open
// Modal never becomes visible until that Modal closes.
export default function LegalDocumentModal({ visible, documentType, onClose }: Props) {
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [title, setTitle] = useState('');
    const [sections, setSections] = useState<LegalSectionDto[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);

    const load = async (type: LegalDocumentType) => {
        setLoading(true);
        setError(false);
        try {
            const doc = await getLegalDocument(type);
            setTitle(doc.title);
            setSections(doc.sections);
            setLastUpdated(doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : undefined);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible && documentType) {
            load(documentType);
        }
    }, [visible, documentType]);

    if (!documentType) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{title || FALLBACK_TITLES[documentType]}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#0FBBA1" />
                    </View>
                ) : error ? (
                    <View style={styles.center}>
                        <ErrorState
                            message={`Couldn't load ${FALLBACK_TITLES[documentType]}.`}
                            onRetry={() => load(documentType)}
                        />
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={[
                            styles.contentContainer,
                            { paddingBottom: insets.bottom + 24 },
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        {lastUpdated && (
                            <Text style={styles.lastUpdated}>Last Updated: {lastUpdated}</Text>
                        )}

                        {sections.map((section, index) => (
                            <View key={index} style={styles.section}>
                                {section.heading && (
                                    <Text style={styles.sectionHeading}>{section.heading}</Text>
                                )}
                                <Text style={styles.sectionBody}>{section.body}</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        backgroundColor: '#0FBBA1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        minHeight: 60,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        padding: 24,
    },
    lastUpdated: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 24,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    sectionBody: {
        fontSize: 14,
        lineHeight: 24,
        color: '#4B5563',
        textAlign: 'justify',
    },
});
