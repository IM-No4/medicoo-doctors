import { Platform } from 'react-native';
import { APP_VERSION } from '../../utils/appVersion';
import { apiClient } from './client';

// Null when the backend couldn't resolve the installed version it was
// sent (shouldn't happen since this app always sends one) - every caller
// must treat null the same as "no update known", never as "update required".
export interface AppUpdateInfo {
    latestVersion: string;
    minimumSupportedVersion: string;
    storeUrl: string | null;
    updateRequired: boolean;
    updateAvailable: boolean;
}

export interface MaintenanceInfo {
    enabled: boolean;
    title: string;
    message: string;
    services: {
        pharmacy: 'available' | 'maintenance';
        consultation: 'available' | 'maintenance';
    };
}

// GET /api/app/config - public, no auth required. Same endpoint medicoo
// (the patient app) uses, scoped to this app via `app=doctor` so it gets
// its own independently-managed minimum/latest version, store URL, and
// maintenance state. Only `update`/`maintenance` are consumed here - the
// rest of the payload (theme/splash/enabledServices) is consumer-app-only.
export const getAppConfig = async (): Promise<{ update: AppUpdateInfo | null; maintenance: MaintenanceInfo | null }> => {
    const response = await apiClient.get('/api/app/config', {
        params: { app: 'doctor', platform: Platform.OS, appVersion: APP_VERSION },
        timeout: 8000,
    });
    return {
        update: response.data?.data?.update ?? null,
        maintenance: response.data?.data?.maintenance ?? null,
    };
};

// Authenticated, dual-role endpoint (same doctorLoginAuth JWT this app
// already sends) - advisory only, see maintenanceGate.js on the backend
// for the actual enforcement. Only ever called when maintenance is
// already known to be enabled, and only when logged in.
export const getMaintenanceJourneyStatus = async (): Promise<{ hasActiveJourney: boolean }> => {
    const response = await apiClient.get('/api/user/maintenance-status', { timeout: 8000 });
    return response.data?.data ?? { hasActiveJourney: true };
};
