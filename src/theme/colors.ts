export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryBg: string;
  background: string;
  card: string;
  cardSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  inputBg: string;
  inputBorder: string;
  error: string;
  errorBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  info: string;
  infoBg: string;
  shadow: string;
  isDark: boolean;
}

export const lightTheme: ThemeColors = {
  primary: '#0FBBA1',
  primaryLight: '#E6FAF6',
  primaryDark: '#0B3D36',
  primaryBg: '#F0FDF9',
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  inputBg: '#F8FAFB',
  inputBorder: '#E2E8F0',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  shadow: '#000000',
  isDark: false,
};

export const darkTheme: ThemeColors = {
  primary: '#0FBBA1',
  primaryLight: '#134E48',
  primaryDark: '#0A2D28',
  primaryBg: '#0F2F2C',
  background: '#0B131E',
  card: '#16222F',
  cardSecondary: '#1E2D3D',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#27384A',
  borderLight: '#1E2D3D',
  inputBg: '#1E2D3D',
  inputBorder: '#27384A',
  error: '#F87171',
  errorBg: '#451A1A',
  success: '#34D399',
  successBg: '#064E3B',
  warning: '#FBBF24',
  warningBg: '#452A0A',
  info: '#60A5FA',
  infoBg: '#1E3A8A',
  shadow: '#000000',
  isDark: true,
};
