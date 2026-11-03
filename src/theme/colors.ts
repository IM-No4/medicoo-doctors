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
  primaryDark: '#012233',
  primaryBg: '#F0FDF9',
  background: '#F8FAFC',
  card: '#FFFFFF',
  cardSecondary: '#F1F5F9',
  text: '#012233',
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
  primaryLight: '#0B4A48',
  primaryDark: '#011823',
  primaryBg: '#07303A',
  background: '#011A29',
  card: '#082E41',
  cardSecondary: '#10384D',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#1C4A60',
  borderLight: '#10384D',
  inputBg: '#10384D',
  inputBorder: '#1C4A60',
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

// The Medicoo Doctors identity (the app icon and splash). Use these for brand moments; screens take everything else from the theme above.
export const brand = {
  navy: '#012233',
  mint: '#05E0AE',
} as const;
