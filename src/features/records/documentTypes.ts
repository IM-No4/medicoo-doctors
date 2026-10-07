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
  { value: 'prescription', label: 'Prescription', folderLabel: 'Prescriptions', icon: FileText, color: '#059669', bg: '#D1FAE5' },
  { value: 'lab_report', label: 'Lab Report', folderLabel: 'Lab Reports', icon: FlaskConical, color: '#8B5CF6', bg: '#EDE4FF' },
  { value: 'scan', label: 'Scan', folderLabel: 'Scans', icon: ImageIcon, color: '#2563EB', bg: '#DBEAFE' },
  { value: 'xray', label: 'X-Ray', folderLabel: 'X-Rays', icon: Bone, color: '#DB2777', bg: '#FCE7F3' },
  { value: 'diagnostic_report', label: 'Diagnostic Report', folderLabel: 'Diagnostic Reports', icon: Activity, color: '#EA580C', bg: '#FFEDD5' },
  { value: 'other', label: 'Other', folderLabel: 'Other', icon: File, color: '#D97706', bg: '#FEF3C7' },
];

const OTHER_TYPE = DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];

export const getDocumentTypeMeta = (type: string): DocumentTypeMeta => {
  return DOCUMENT_TYPES.find(t => t.value === type?.toLowerCase()) || OTHER_TYPE;
};
