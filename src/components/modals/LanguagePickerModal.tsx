import { Check, Globe, X } from 'lucide-react-native';
import React from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../i18n/LanguageContext';
import { SupportedLanguage } from '../../i18n/translations';
import { useTheme } from '../../theme/ThemeContext';

interface LanguagePickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguagePickerModal({
  visible,
  onClose,
}: LanguagePickerModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: theme.card,
                  paddingBottom: insets.bottom + 16,
                },
              ]}
            >
              {/* Top Drag Indicator */}
              <View style={styles.dragHandleWrap}>
                <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
              </View>

              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Globe size={20} color={theme.primary} />
                  <Text style={[styles.title, { color: theme.text }]}>
                    {t('select_language')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeButton, { backgroundColor: theme.cardSecondary }]}
                  activeOpacity={0.7}
                >
                  <X size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Language List */}
              <FlatList
                data={supportedLanguages}
                keyExtractor={(item) => item.code}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = item.code === language;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.langRow,
                        {
                          borderBottomColor: theme.borderLight,
                          backgroundColor: isSelected ? theme.primaryBg : 'transparent',
                        },
                      ]}
                      onPress={async () => {
                        await setLanguage(item.code as SupportedLanguage);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.flagText}>{item.flag}</Text>
                      <View style={styles.langNameGroup}>
                        <Text
                          style={[
                            styles.langNativeName,
                            {
                              color: isSelected ? theme.primary : theme.text,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {item.nativeName}
                        </Text>
                        <Text style={[styles.langEnglishName, { color: theme.textSecondary }]}>
                          {item.name}
                        </Text>
                      </View>
                      {isSelected && <Check size={20} color={theme.primary} />}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flagText: {
    fontSize: 24,
    marginRight: 14,
  },
  langNameGroup: {
    flex: 1,
  },
  langNativeName: {
    fontSize: 16,
  },
  langEnglishName: {
    fontSize: 12,
    marginTop: 2,
  },
});
