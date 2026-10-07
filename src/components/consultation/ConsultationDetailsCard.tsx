import { ClipboardList, FlaskConical, Pill } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ConsultationDetails } from '../../services/api/doctor.api';
import { useTheme } from '../../theme/ThemeContext';

interface Props {
  details: ConsultationDetails | null | undefined;
}

export default function ConsultationDetailsCard({ details }: Props) {
  const { isDark } = useTheme();

  if (!details) return null;

  const hasNotes = !!details.notes;
  const hasMedicines = details.prescribedMedicines?.length > 0;
  const hasLabTests = details.prescribedLabTests?.length > 0;

  if (!hasNotes && !hasMedicines && !hasLabTests) return null;

  const cardBg = isDark ? '#111B27' : '#FFFFFF';
  const cardBorder = isDark ? '#1A2737' : '#FFFFFF';
  const textColor = isDark ? '#E2E8F0' : '#1E293B';
  const subTextColor = isDark ? '#94A3B8' : '#64748B';
  const itemBg = isDark ? '#080E17' : '#F8FAFC';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.sectionHeader}>
        <ClipboardList size={16} color="#0FBBA1" />
        <Text style={[styles.sectionTitle, { color: textColor }]}>Consultation Summary</Text>
      </View>

      {hasNotes && (
        <View style={styles.block}>
          <Text style={[styles.blockLabel, { color: subTextColor }]}>Diagnosis / Notes</Text>
          <Text style={[styles.notesText, { color: textColor }]}>{details.notes}</Text>
        </View>
      )}

      {hasMedicines && (
        <View style={styles.block}>
          <View style={styles.blockHeaderRow}>
            <Pill size={14} color="#0FBBA1" />
            <Text style={[styles.blockLabel, { color: subTextColor }]}>Prescribed Medicines</Text>
          </View>
          {details.prescribedMedicines.map((med, index) => (
            <View
              key={`${med.medicineSku}-${index}`}
              style={[styles.itemRow, { backgroundColor: itemBg }]}
            >
              <Text style={[styles.itemTitle, { color: textColor }]}>{med.medicineName}</Text>
              <Text style={[styles.itemSub, { color: subTextColor }]}>
                {[med.intakeDetails?.dosage, med.intakeDetails?.period].filter(Boolean).join(' · ')}
              </Text>
              {med.intakeDetails?.instructions?.map((instr, i) => (
                <Text key={i} style={[styles.itemNote, { color: subTextColor }]}>· {instr}</Text>
              ))}
            </View>
          ))}
        </View>
      )}

      {hasLabTests && (
        <View style={styles.block}>
          <View style={styles.blockHeaderRow}>
            <FlaskConical size={14} color="#3B82F6" />
            <Text style={[styles.blockLabel, { color: subTextColor }]}>Recommended Lab Tests</Text>
          </View>
          {details.prescribedLabTests.map((test, index) => (
            <View
              key={`${test.testName}-${index}`}
              style={[styles.itemRow, { backgroundColor: itemBg }]}
            >
              <Text style={[styles.itemTitle, { color: textColor }]}>{test.testName}</Text>
              {!!test.additionalDetails && (
                <Text style={[styles.itemSub, { color: subTextColor }]}>{test.additionalDetails}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  block: { marginBottom: 14 },
  blockHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  blockLabel: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  notesText: { fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  itemRow: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemTitle: { fontSize: 13.5, fontWeight: '700' },
  itemSub: { fontSize: 12, marginTop: 3 },
  itemNote: { fontSize: 11.5, marginTop: 2 },
});
