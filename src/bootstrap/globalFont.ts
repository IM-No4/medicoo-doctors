import { StyleSheet, Text, TextInput } from 'react-native';
import { fontFamilyForWeight } from '../constants/fonts';

/**
 * Forces every <Text>/<TextInput> in the app onto the single font defined
 * in constants/fonts.ts, without touching each of the hundreds of call
 * sites individually.
 *
 * Why this can't just be Text.defaultProps: React 19 removed defaultProps
 * support for function components, and RN's Text/TextInput are now plain
 * function components, not the old class-based implementation that trick
 * used to rely on - so that approach is silently a no-op on this RN/React
 * version.
 *
 * Instead this patches the React JSX runtime itself (react/jsx-runtime's
 * `jsx`/`jsxs`, and react/jsx-dev-runtime's `jsxDEV` for the dev bundle).
 */

function resolveFontFamily(style: unknown): string {
  const flat: any = StyleSheet.flatten(style as any) || {};

  if (flat.fontFamily) return flat.fontFamily;

  return fontFamilyForWeight(flat.fontWeight, flat.fontStyle === 'italic');
}

function injectFont(type: unknown, props: any) {
  if ((type !== Text && type !== TextInput) || !props) return props;
  return { ...props, style: [props.style, { fontFamily: resolveFontFamily(props.style) }] };
}

function patchExport(mod: any, name: string) {
  const original = mod?.[name];
  if (typeof original !== 'function') return;
  mod[name] = (type: unknown, props: any, ...rest: any[]) =>
    original(type, injectFont(type, props), ...rest);
}

let installed = false;

export function installGlobalAppFont() {
  if (installed) return;
  installed = true;

  // Metro's bundler requires a literal string argument to require() - each
  // of these is called directly rather than through a shared helper.

  // Production/release bundles use jsx-runtime.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jsxRuntime = require('react/jsx-runtime');
    patchExport(jsxRuntime, 'jsx');
    patchExport(jsxRuntime, 'jsxs');
  } catch {
    // Not present in this bundle - nothing to patch.
  }

  // The dev/Fast Refresh bundle uses jsx-dev-runtime instead.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jsxDevRuntime = require('react/jsx-dev-runtime');
    patchExport(jsxDevRuntime, 'jsxDEV');
  } catch {
    // Not present in this bundle - nothing to patch.
  }
}
