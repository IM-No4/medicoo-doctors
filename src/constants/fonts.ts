/**
 * SINGLE SOURCE OF TRUTH for the app's font family.
 *
 * To swap the app's font in the future, this is the only file that needs
 * to change:
 *   1. Drop the new font's .ttf files into src/assets/fonts/, one per
 *      weight + an Italic variant of each (18 files total), named
 *      "<Name>-<Suffix>.ttf" / "<Name>-<Suffix>Italic.ttf" using the exact
 *      suffixes in WEIGHT_TO_SUFFIX below (Thin, ExtraLight, Light,
 *      Regular, Medium, SemiBold, Bold, ExtraBold, Black).
 *   2. Update FONT_FAMILY_NAME and the requires in FONT_MAP to point at
 *      the new files.
 *
 * Nothing else in the app needs to change - globalFont.ts reads
 * FONT_FAMILY_NAME/WEIGHT_TO_SUFFIX to pick a family for every
 * <Text>/<TextInput> automatically (see that file for how), and App.tsx
 * just loads whatever FONT_MAP exports here.
 */

export const FONT_FAMILY_NAME = 'Poppins';

// Custom fonts don't get RN's automatic bold/weight synthesis the way
// system fonts do, especially on Android - each visual weight has to be
// its own loaded font file, referenced by its own family name. This maps
// every fontWeight value already used across the app's styles (100-900,
// plus 'normal'/'bold') to the matching suffix on disk.
export const WEIGHT_TO_SUFFIX: Record<string, string> = {
  '100': 'Thin',
  '200': 'ExtraLight',
  '300': 'Light',
  '400': 'Regular',
  normal: 'Regular',
  '500': 'Medium',
  '600': 'SemiBold',
  '700': 'Bold',
  bold: 'Bold',
  '800': 'ExtraBold',
  '900': 'Black',
};

// For the rare spot that needs to reference the font family directly
// (rather than relying on globalFont.ts's automatic injection) - e.g. a
// non-Text component that takes its own fontFamily-shaped prop.
export function fontFamilyForWeight(weight?: string | number, italic = false): string {
  const suffix = WEIGHT_TO_SUFFIX[String(weight ?? '400')] || 'Regular';
  return `${FONT_FAMILY_NAME}-${suffix}${italic ? 'Italic' : ''}`;
}

import {
  MuseoModerno_400Regular,
  MuseoModerno_500Medium,
  MuseoModerno_600SemiBold,
  MuseoModerno_700Bold,
  MuseoModerno_800ExtraBold,
  MuseoModerno_900Black,
} from '@expo-google-fonts/museomoderno';

import {
  Poppins_100Thin,
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';

export const FONT_MAP = {
  // Poppins (Primary App Font for all text, headings, numbers, and UI)
  'Poppins-Thin': Poppins_100Thin,
  'Poppins-ExtraLight': Poppins_200ExtraLight,
  'Poppins-Light': Poppins_300Light,
  'Poppins-Regular': Poppins_400Regular,
  'Poppins-Medium': Poppins_500Medium,
  'Poppins-SemiBold': Poppins_600SemiBold,
  'Poppins-Bold': Poppins_700Bold,
  'Poppins-ExtraBold': Poppins_800ExtraBold,
  'Poppins-Black': Poppins_900Black,

  // MuseoModerno (Brand Logo)
  MuseoModerno_400Regular,
  MuseoModerno_500Medium,
  MuseoModerno_600SemiBold,
  MuseoModerno_700Bold,
  MuseoModerno_800ExtraBold,
  MuseoModerno_900Black,
  'MuseoModerno-Bold': MuseoModerno_700Bold,
  'MuseoModerno-SemiBold': MuseoModerno_600SemiBold,
  'MuseoModerno-Regular': MuseoModerno_400Regular,
};
