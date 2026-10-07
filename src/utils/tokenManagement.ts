import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export async function setToken(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

export async function getToken(key: string) {
  const value = await SecureStore.getItemAsync(key);
  if (value) return value;

  // One-time migration for installs that stored the token in AsyncStorage
  // before this moved to SecureStore.
  const legacyValue = await AsyncStorage.getItem(key);
  if (legacyValue) {
    await SecureStore.setItemAsync(key, legacyValue);
    await AsyncStorage.removeItem(key);
    return legacyValue;
  }

  return null;
}

export async function clearToken(key: string) {
  await SecureStore.deleteItemAsync(key);
  await AsyncStorage.removeItem(key);
}
