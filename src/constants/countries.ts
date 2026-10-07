export interface Country {
  name: string;
  dialCode: string;
  code: string;
  flag: string;
  maxLength?: number;
}

export const COUNTRIES: Country[] = [
  { name: 'India', dialCode: '+91', code: 'IN', flag: '🇮🇳', maxLength: 10 },
  { name: 'United States', dialCode: '+1', code: 'US', flag: '🇺🇸', maxLength: 10 },
  { name: 'United Kingdom', dialCode: '+44', code: 'GB', flag: '🇬🇧', maxLength: 10 },
  { name: 'United Arab Emirates', dialCode: '+971', code: 'AE', flag: '🇦🇪', maxLength: 9 },
  { name: 'Saudi Arabia', dialCode: '+966', code: 'SA', flag: '🇸🇦', maxLength: 9 },
  { name: 'Canada', dialCode: '+1', code: 'CA', flag: '🇨🇦', maxLength: 10 },
  { name: 'Australia', dialCode: '+61', code: 'AU', flag: '🇦🇺', maxLength: 9 },
  { name: 'Germany', dialCode: '+49', code: 'DE', flag: '🇩🇪', maxLength: 11 },
  { name: 'France', dialCode: '+33', code: 'FR', flag: '🇫🇷', maxLength: 9 },
  { name: 'Singapore', dialCode: '+65', code: 'SG', flag: '🇸🇬', maxLength: 8 },
  { name: 'Malaysia', dialCode: '+60', code: 'MY', flag: '🇲🇾', maxLength: 10 },
  { name: 'Qatar', dialCode: '+974', code: 'QA', flag: '🇶🇦', maxLength: 8 },
  { name: 'Oman', dialCode: '+968', code: 'OM', flag: '🇴🇲', maxLength: 8 },
  { name: 'Kuwait', dialCode: '+965', code: 'KW', flag: '🇰🇼', maxLength: 8 },
  { name: 'Bahrain', dialCode: '+973', code: 'BH', flag: '🇧🇭', maxLength: 8 },
  { name: 'Egypt', dialCode: '+20', code: 'EG', flag: '🇪🇬', maxLength: 10 },
  { name: 'South Africa', dialCode: '+27', code: 'ZA', flag: '🇿🇦', maxLength: 9 },
  { name: 'Nigeria', dialCode: '+234', code: 'NG', flag: '🇳🇬', maxLength: 10 },
  { name: 'Kenya', dialCode: '+254', code: 'KE', flag: '🇰🇪', maxLength: 9 },
  { name: 'Bangladesh', dialCode: '+880', code: 'BD', flag: '🇧🇩', maxLength: 10 },
  { name: 'Pakistan', dialCode: '+92', code: 'PK', flag: '🇵🇰', maxLength: 10 },
  { name: 'Sri Lanka', dialCode: '+94', code: 'LK', flag: '🇱🇰', maxLength: 9 },
  { name: 'Nepal', dialCode: '+977', code: 'NP', flag: '🇳🇵', maxLength: 10 },
  { name: 'Japan', dialCode: '+81', code: 'JP', flag: '🇯🇵', maxLength: 10 },
  { name: 'South Korea', dialCode: '+82', code: 'KR', flag: '🇰🇷', maxLength: 10 },
  { name: 'China', dialCode: '+86', code: 'CN', flag: '🇨🇳', maxLength: 11 },
  { name: 'Indonesia', dialCode: '+62', code: 'ID', flag: '🇮🇩', maxLength: 11 },
  { name: 'Philippines', dialCode: '+63', code: 'PH', flag: '🇵🇭', maxLength: 10 },
  { name: 'Thailand', dialCode: '+66', code: 'TH', flag: '🇹🇭', maxLength: 9 },
  { name: 'Vietnam', dialCode: '+84', code: 'VN', flag: '🇻🇳', maxLength: 9 },
  { name: 'Brazil', dialCode: '+55', code: 'BR', flag: '🇧🇷', maxLength: 11 },
  { name: 'Mexico', dialCode: '+52', code: 'MX', flag: '🇲🇽', maxLength: 10 },
  { name: 'Spain', dialCode: '+34', code: 'ES', flag: '🇪🇸', maxLength: 9 },
  { name: 'Italy', dialCode: '+39', code: 'IT', flag: '🇮🇹', maxLength: 10 },
  { name: 'Netherlands', dialCode: '+31', code: 'NL', flag: '🇳🇱', maxLength: 9 },
  { name: 'Switzerland', dialCode: '+41', code: 'CH', flag: '🇨🇭', maxLength: 9 },
  { name: 'Sweden', dialCode: '+46', code: 'SE', flag: '🇸🇪', maxLength: 9 },
  { name: 'Norway', dialCode: '+47', code: 'NO', flag: '🇳🇴', maxLength: 8 },
  { name: 'Denmark', dialCode: '+45', code: 'DK', flag: '🇩🇰', maxLength: 8 },
  { name: 'Ireland', dialCode: '+353', code: 'IE', flag: '🇮🇪', maxLength: 9 },
  { name: 'New Zealand', dialCode: '+64', code: 'NZ', flag: '🇳🇿', maxLength: 9 },
  { name: 'Turkey', dialCode: '+90', code: 'TR', flag: '🇹🇷', maxLength: 10 },
  { name: 'Russia', dialCode: '+7', code: 'RU', flag: '🇷🇺', maxLength: 10 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India (+91)
