import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@medicoo_doctors_update_dismissed_version';

// "Later" on the optional-update popup - stores the exact latest-version
// string that was dismissed, not a boolean, so a future, newer release
// (a different latestVersion) makes the popup eligible to show again
// instead of being silenced forever.
export async function setDismissedVersion(version: string): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, version);
    } catch {
        // silent fail - worst case the popup shows again when it didn't need to
    }
}

export async function getDismissedVersion(): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export async function clearDismissedVersion(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
        // silent fail
    }
}
