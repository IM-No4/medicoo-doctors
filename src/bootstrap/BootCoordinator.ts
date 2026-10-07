import { loadAppConfig, setMaintenanceRestricted } from '../redux/slices/appConfigSlice';
import { getMaintenanceJourneyStatus } from '../services/api/appConfig.api';
import { getDoctorProfile } from '../services/api/user.api';
import { clearToken, getToken } from '../utils/tokenManagement';
import { bootMaintenance, bootMandatoryUpdate, bootStart, bootSuccess, setBootSlow } from './boot.slice';

// Advisory only - the real enforcement is maintenanceGate.js on the
// backend. Any failure here fails toward access (treat as "has a
// journey"), never toward the full block, since a wrong answer here is at
// worst a UX inconsistency, while the backend independently rejects any
// actual attempt to approve a new request regardless.
const hasActiveJourneyOrUnknown = async (): Promise<boolean> => {
  try {
    const { hasActiveJourney } = await getMaintenanceJourneyStatus();
    return hasActiveJourney;
  } catch {
    return true;
  }
};

// How long boot can run before it's fair to tell the user something's slow,
// rather than leaving them staring at a blank splash with zero feedback.
const SLOW_BOOT_THRESHOLD_MS = 5000;

// `showLoadingState` defaults to true for the normal cold-boot call (App
// mounts with boot.status 'idle') - that transient 'loading' status is
// harmless there because the native splash screen is still covering the
// screen at that point.
export const runBootSequence = async (dispatch: any, { showLoadingState = true }: { showLoadingState?: boolean } = {}) => {
  const slowTimer = showLoadingState
    ? setTimeout(() => dispatch(setBootSlow(true)), SLOW_BOOT_THRESHOLD_MS)
    : null;

  try {
    if (showLoadingState) {
      dispatch(bootStart());
    }

    // Fired now so its own network round-trip overlaps with the
    // token/profile checks below instead of running after them - resolved
    // just below, before any login/main routing decision, since a
    // mandatory update must block even a logged-out doctor from reaching
    // Login. A rejected fetch (any error) is swallowed here - this must
    // never be able to fail boot on its own, only an explicit
    // `updateRequired: true` from a successfully-parsed response does.
    const configPromise = dispatch(loadAppConfig()).catch(() => null);

    const startTime = Date.now();
    const MIN_SPLASH_DURATION = 3000; // 3 seconds

    const token = await getToken('access_token');

    const configResult: any = await configPromise;
    if (configResult?.payload?.update?.updateRequired) {
      const elapsed = Date.now() - startTime;
      const remaining = MIN_SPLASH_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      dispatch(bootMandatoryUpdate());
      return;
    }

    const maintenanceEnabled = Boolean(configResult?.payload?.maintenance?.enabled);

    // No account-level "onboarding" gate for this app the way the patient
    // app has one (health profile/medical disclaimer) - being authenticated
    // is enough to enter Main, where the doctor-approval gate (isDoctor/
    // approvalStatus, loaded from the profile) decides what's actually shown.
    if (!token) {
      const elapsed = Date.now() - startTime;
      const remaining = MIN_SPLASH_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      // A logged-out doctor has no journey to protect by definition.
      if (maintenanceEnabled) {
        dispatch(bootMaintenance());
        return;
      }

      dispatch(
        bootSuccess({
          isAuthenticated: false,
          onboardingCompleted: false,
          initialRoute: 'Login',
        })
      );
      return;
    }

    // Validate the token by making an API call
    try {
      await getDoctorProfile();

      // Authenticated and confirmed valid - now safe to ask "does THIS
      // doctor specifically have something to protect."
      let maintenanceBlocksEntry = false;
      if (maintenanceEnabled) {
        const hasJourney = await hasActiveJourneyOrUnknown();
        dispatch(setMaintenanceRestricted(hasJourney));
        maintenanceBlocksEntry = !hasJourney;
      }

      const elapsed = Date.now() - startTime;
      const remaining = MIN_SPLASH_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      if (maintenanceBlocksEntry) {
        dispatch(bootMaintenance());
        return;
      }

      dispatch(
        bootSuccess({
          isAuthenticated: true,
          onboardingCompleted: true,
          initialRoute: 'Main',
        })
      );
    } catch (error: any) {
      // A network error (no internet, timeout, DNS failure, 5xx - anything
      // where the server never actually said "this token is invalid") must
      // NEVER destroy the session. Only a genuine 401 from the server means
      // the token itself is invalid/expired.
      if (error?.response?.status !== 401) {
        const elapsed = Date.now() - startTime;
        const remaining = MIN_SPLASH_DURATION - elapsed;
        if (remaining > 0) {
          await new Promise(resolve => setTimeout(resolve, remaining));
        }

        // Trust the locally stored token and let the user into the app -
        // individual screens that need live data will fail/retry on their
        // own instead of the whole session being wiped.
        dispatch(
          bootSuccess({
            isAuthenticated: true,
            onboardingCompleted: true,
            initialRoute: 'Main',
          })
        );
        return;
      }

      // Token is genuinely invalid/expired (401) - clear it and send to login.
      await clearToken('access_token');

      const elapsed = Date.now() - startTime;
      const remaining = MIN_SPLASH_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      dispatch(
        bootSuccess({
          isAuthenticated: false,
          onboardingCompleted: false,
          initialRoute: 'Login',
        })
      );
    }
  } catch (e) {
    console.error('Boot sequence failed:', e);
    // Never leave the app stuck on the splash screen.
    dispatch(
      bootSuccess({
        isAuthenticated: false,
        onboardingCompleted: false,
        initialRoute: 'Login',
      })
    );
  } finally {
    if (slowTimer) clearTimeout(slowTimer);
  }
};
