// 'mandatoryUpdate' - the backend-driven app config says the installed
// build is below the minimum supported version (see appConfig.api.ts's
// `update.updateRequired`). RootNavigator shows MandatoryUpdateScreen
// instead of Auth/Main, with no way to skip - this only ever comes from a
// successfully-parsed config response, never a default, so a config-fetch
// failure can't accidentally produce this state.
// 'maintenance' - maintenance mode is on AND this specific doctor has been
// confirmed (via the authenticated journey-status check) to have no
// in-progress consultation to protect - see BootCoordinator.ts. Never set
// from an uncertain/failed journey-status check (that fails toward
// letting the doctor in restricted instead), only a confirmed "no active
// journey."
export type BootStatus = 'idle' | 'loading' | 'ready' | 'error' | 'mandatoryUpdate' | 'maintenance';

export interface BootState {
  status: BootStatus;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  initialRoute: string | null;
  deepLinkIntent: null | {
    route: string;
    params?: any;
  };
  // Set once boot has been in 'loading' for longer than a short grace
  // period (see BootCoordinator.ts) - lets App.tsx swap the otherwise-blank
  // native splash for a JS screen with a "this is taking a while" message,
  // instead of leaving a slow connection looking like a frozen app.
  isSlow: boolean;
}
