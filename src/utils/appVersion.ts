import Constants from 'expo-constants';

// Single source of truth for the version shown anywhere in the app -
// reads the real version from app.json (via Expo's config, embedded into
// the build), and is what gets sent to the backend's app-config endpoint
// for the mandatory/optional update check (see appConfig.api.ts).
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
