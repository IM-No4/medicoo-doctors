import AsyncStorage from '@react-native-async-storage/async-storage';

// The welcome tour is shown once per doctor. The server remembers it too (welcomeTourSeenAt on the profile); this local flag covers the gap if
// that request fails, so the tour never reappears on the same phone.
const key = (doctorId: string) => `@medicoo_doctors_welcome_tour_seen_${doctorId}`;

export async function hasSeenWelcomeTour(doctorId: string): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(key(doctorId))) === 'true';
    } catch {
        return false;
    }
}

export async function markWelcomeTourSeenLocally(doctorId: string): Promise<void> {
    try {
        await AsyncStorage.setItem(key(doctorId), 'true');
    } catch {
        // silent: worst case the server flag is the only record
    }
}
