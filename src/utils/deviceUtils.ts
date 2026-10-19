import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@device_id';

/**
 * A stable, per-install identifier (not the OS device ID - just needs to be
 * unique and persistent so the backend can tell devices/sessions apart).
 */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export type NotificationPermissionStatus = 'granted' | 'provisional' | 'denied' | 'not-determined';

const toPermissionStatus = (authStatus: number): NotificationPermissionStatus => {
  if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) return 'granted';
  if (authStatus === messaging.AuthorizationStatus.PROVISIONAL) return 'provisional';
  if (authStatus === messaging.AuthorizationStatus.DENIED) return 'denied';
  return 'not-determined';
};

/** Reads the current permission state without prompting the OS dialog. */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  try {
    return toPermissionStatus(await messaging().hasPermission());
  } catch {
    return 'not-determined';
  }
}

/**
 * Prompts the OS permission dialog (only actually shows it if the status is
 * still undetermined - iOS/Android both no-op and just return the existing
 * decision otherwise). Returns whether notifications are usable afterward.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.warn('Failed to request notification permission:', error);
    return false;
  }
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const enabled = await requestNotificationPermission();
    if (!enabled) return null;

    return await messaging().getToken();
  } catch (error) {
    console.warn('Failed to get FCM token:', error);
    return null;
  }
}
