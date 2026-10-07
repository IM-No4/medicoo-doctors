import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@medicoo_doctors_profile_summary';

// Just the doctor's name, cached on-device - exists purely so the app can
// show a personalized greeting without a network call before the full
// profile has loaded.
export interface ProfileSummary {
    name: string | null;
}

export async function saveProfileSummary(summary: ProfileSummary): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(summary));
    } catch {
        // silent fail - not critical
    }
}

export async function loadProfileSummary(): Promise<ProfileSummary | null> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}
