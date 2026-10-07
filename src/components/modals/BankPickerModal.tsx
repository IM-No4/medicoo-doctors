import { Check, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BankPickerModalProps {
  visible: boolean;
  banks: string[];
  loading?: boolean;
  selectedBank: string;
  onSelect: (bank: string) => void;
  onClose: () => void;
  isDark: boolean;
}

export default function BankPickerModal({
  visible,
  banks,
  loading,
  selectedBank,
  onSelect,
  onClose,
  isDark,
}: BankPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const dividerColor = isDark ? '#1A2636' : '#F1F5F9';
  const inputBg = isDark ? '#080E17' : '#F8FAFC';
  const chipBg = isDark ? '#172230' : '#F1F5F9';

  const filteredBanks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.toLowerCase().includes(q));
  }, [search, banks]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: cardBg, paddingBottom: insets.bottom + 16, maxHeight: '80%' },
              ]}
            >
              <View style={styles.dragHandleWrap}>
                <View style={[styles.dragHandle, { backgroundColor: dividerColor }]} />
              </View>

              <View style={styles.header}>
                <Text style={[styles.title, { color: textColor }]}>Select Bank</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeButton, { backgroundColor: chipBg }]}
                  activeOpacity={0.7}
                >
                  <X size={18} color={subTextColor} />
                </TouchableOpacity>
              </View>

              <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor: dividerColor }]}>
                <Search size={18} color={subTextColor} />
                <TextInput
                  style={[styles.searchInput, { color: textColor }]}
                  placeholder="Search bank name"
                  placeholderTextColor={subTextColor}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                    <X size={16} color={subTextColor} />
                  </TouchableOpacity>
                )}
              </View>

              {loading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color="#0FBBA1" />
                </View>
              ) : (
                <FlatList
                  data={filteredBanks}
                  keyExtractor={(item) => item}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isSelected = item === selectedBank;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.bankRow,
                          {
                            borderBottomColor: dividerColor,
                            backgroundColor: isSelected ? (isDark ? '#0E2924' : '#E6FAF6') : 'transparent',
                          },
                        ]}
                        onPress={() => {
                          onSelect(item);
                          onClose();
                          setSearch('');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.bankName,
                            { color: isSelected ? '#0FBBA1' : textColor, fontWeight: isSelected ? '700' : '500' },
                          ]}
                          numberOfLines={1}
                        >
                          {item}
                        </Text>
                        {isSelected && <Check size={18} color="#0FBBA1" />}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.centerState}>
                      <Text style={[styles.emptyText, { color: subTextColor }]}>No banks found</Text>
                    </View>
                  }
                />
              )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bankName: {
    fontSize: 15,
    flex: 1,
    marginRight: 10,
  },
  centerState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
