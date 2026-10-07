import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@medicoo_doctors_legal_snooze';

// "Remind me later" on the Terms & Privacy re-acceptance modal - stores a
// plain epoch-ms timestamp for when the modal is next allowed to show
// again, so declining to act right away doesn't nag on every app open.
export async function setSnoozeUntil(hours: number): Promise<void> {
    try {
        const until = Date.now() + hours * 60 * 60 * 1000;
        await AsyncStorage.setItem(STORAGE_KEY, String(until));
    } catch {
        // silent fail - worst case the modal shows again sooner than intended
    }
}

export async function getSnoozeUntil(): Promise<number | null> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export async function isSnoozed(): Promise<boolean> {
    const until = await getSnoozeUntil();
    return !!until && until > Date.now();
}

export async function clearSnooze(): Promise<void> {
    try {
        await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
        // silent fail
    }
}
