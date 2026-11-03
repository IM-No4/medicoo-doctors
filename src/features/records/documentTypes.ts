import { palette } from '../../theme/palette';
import {
  Activity,
  Bone,
  File,
  FileText,
  FlaskConical,
  Image as ImageIcon,
} from 'lucide-react-native';

// Single source of truth for document categories - must match the backend's
// documentType enum exactly (models/userDocument.js in the backend repo).
export type DocumentTypeValue =
  | 'prescription'
  | 'lab_report'
  | 'scan'
  | 'xray'
  | 'diagnostic_report'
  | 'other';

export interface DocumentTypeMeta {
  value: DocumentTypeValue;
  label: string;
  folderLabel: string;
  icon: typeof FileText;
  color: string;
  bg: string;
}

export const DOCUMENT_TYPES: DocumentTypeMeta[] = [
  { value: 'prescription', label: 'Prescription', folderLabel: 'Prescriptions', icon: FileText, color: palette.emerald600, bg: palette.emerald100 },
  { value: 'lab_report', label: 'Lab Report', folderLabel: 'Lab Reports', icon: FlaskConical, color: palette.violet500, bg: palette.hexEDE4FF },
  { value: 'scan', label: 'Scan', folderLabel: 'Scans', icon: ImageIcon, color: palette.blue600, bg: palette.blue100 },
  { value: 'xray', label: 'X-Ray', folderLabel: 'X-Rays', icon: Bone, color: palette.hexDB2777, bg: palette.hexFCE7F3 },
  { value: 'diagnostic_report', label: 'Diagnostic Report', folderLabel: 'Diagnostic Reports', icon: Activity, color: palette.orange600, bg: palette.orange100 },
  { value: 'other', label: 'Other', folderLabel: 'Other', icon: File, color: palette.amber600, bg: palette.amber100 },
];

const OTHER_TYPE = DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];

export const getDocumentTypeMeta = (type: string): DocumentTypeMeta => {
  return DOCUMENT_TYPES.find(t => t.value === type?.toLowerCase()) || OTHER_TYPE;
};
