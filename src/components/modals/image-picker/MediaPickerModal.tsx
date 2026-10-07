import { Camera, FileText, Image as ImageIcon, X } from 'lucide-react-native';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MediaPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onCameraSelect: () => void;
    onGallerySelect: () => void;
    onDocumentSelect?: () => void; // Optional: Only show if document selection is needed
    title?: string;
}

export default function MediaPickerModal({
    visible,
    onClose,
    onCameraSelect,
    onGallerySelect,
    onDocumentSelect,
    title = 'Select Media',
}: MediaPickerModalProps) {
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <TouchableWithoutFeedback>
                    <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.header}>
                            <Text style={styles.title}>{title}</Text>
                            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionsContainer}>
                            {/* Camera Option */}
                            <TouchableOpacity style={styles.option} onPress={onCameraSelect}>
                                <View style={[styles.iconBox, { backgroundColor: '#E0F2F1' }]}>
                                    <Camera size={24} color="#009688" />
                                </View>
                                <Text style={styles.optionLabel}>Camera</Text>
                            </TouchableOpacity>

                            {/* Gallery Option */}
                            <TouchableOpacity style={styles.option} onPress={onGallerySelect}>
                                <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                                    <ImageIcon size={24} color="#2196F3" />
                                </View>
                                <Text style={styles.optionLabel}>Gallery</Text>
                            </TouchableOpacity>

                            {/* Document Option (Conditional) */}
                            {onDocumentSelect && (
                                <TouchableOpacity style={styles.option} onPress={onDocumentSelect}>
                                    <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                                        <FileText size={24} color="#FF9800" />
                                    </View>
                                    <Text style={styles.optionLabel}>Document</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Distribute evenly
        alignItems: 'flex-start',
    },
    option: {
        alignItems: 'center',
        gap: 8,
    },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
});
