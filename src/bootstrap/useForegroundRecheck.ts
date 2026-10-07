import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { runBootSequence } from './BootCoordinator';
import { AppDispatch, RootState } from '../redux/store';

// Minimum time between rechecks - a doctor flicking between apps
// repeatedly shouldn't fire a fresh boot sequence every single time.
const MIN_RECHECK_INTERVAL_MS = 60 * 1000;

// Single global foreground-resume recheck, mounted once for the app's
// lifetime. Re-running the full (lightweight, showLoadingState: false)
// boot sequence - rather than a bespoke partial recheck - is what lets a
// mandatory update, a maintenance screen, or a mid-consultation
// "restricted" state all resolve correctly the moment the app comes back
// to foreground, using the exact same logic that already handles each of
// those cases on cold boot. No visible flicker: showLoadingState: false
// skips bootStart(), so boot.status stays whatever it already was until
// the recheck's own result swaps it, same as MandatoryUpdateScreen's own
// existing foreground listener.
export function useForegroundRecheck() {
  const dispatch = useDispatch<AppDispatch>();
  const boot = useSelector((state: RootState) => state.boot);
  const appState = useRef(AppState.currentState);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      const cameToForeground = Boolean(appState.current.match(/inactive|background/)) && next === 'active';
      appState.current = next;
      if (!cameToForeground) return;

      // Nothing to recheck mid-initial-boot - the normal cold-boot flow
      // already covers it.
      if (boot.status === 'idle' || boot.status === 'loading') return;

      const now = Date.now();
      if (now - lastCheckRef.current < MIN_RECHECK_INTERVAL_MS) return;
      lastCheckRef.current = now;

      runBootSequence(dispatch, { showLoadingState: false });
    });
    return () => subscription.remove();
  }, [dispatch, boot.status]);
}
