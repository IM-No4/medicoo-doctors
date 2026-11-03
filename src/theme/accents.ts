// Soft accent colours for icon tiles and small labels, so a screen is not all one colour.
//
//   green  (the brand colour, in colors.ts)  main actions, selected things, money received, "done"
//   blue   time and places: appointments, dates, bank accounts
//   violet medical records: prescriptions, medicines, reports
//   sky    conversation: chat, calls, messages
//   amber  rating, pending, attention
//   slate  everything else
//
// Each accent is a strong colour for the icon (fg) and a pale tint behind it (bg). Use them for decoration only: a button, a status
// that means something (paid / refunded / failed) or an error keeps its own colour.

export type AccentKind = 'green' | 'blue' | 'violet' | 'sky' | 'amber' | 'slate';

const ACCENTS: Record<AccentKind, { light: { fg: string; bg: string }; dark: { fg: string; bg: string } }> = {
  green: { light: { fg: '#0FBBA1', bg: '#E6FAF6' }, dark: { fg: '#05E0AE', bg: '#07303A' } },
  blue: { light: { fg: '#3B82F6', bg: '#EAF2FF' }, dark: { fg: '#60A5FA', bg: '#12213A' } },
  violet: { light: { fg: '#8B5CF6', bg: '#F3EFFF' }, dark: { fg: '#A78BFA', bg: '#1E1838' } },
  sky: { light: { fg: '#0EA5E9', bg: '#E8F6FD' }, dark: { fg: '#38BDF8', bg: '#10243A' } },
  amber: { light: { fg: '#D97706', bg: '#FEF3C7' }, dark: { fg: '#FBBF24', bg: '#2E2210' } },
  slate: { light: { fg: '#64748B', bg: '#F1F5F9' }, dark: { fg: '#94A3B8', bg: '#172230' } },
};

export const accent = (kind: AccentKind, isDark: boolean) => ACCENTS[kind][isDark ? 'dark' : 'light'];
