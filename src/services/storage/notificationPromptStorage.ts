import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@medicoo_doctors_notification_prompt_shown';

// Mirrors legalStorage.ts's shape - a plain flag so the notification
// priming prompt (NotificationPermissionModal) only ever asks once per
// install, rather than nagging on every login.
export async function hasShownNotificationPrompt(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(STORAGE_KEY)) === 'true';
    } catch {
        return false;
    }
}

export async function markNotificationPromptShown(): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {
        // silent fail - worst case the prompt shows again next login
    }
}
