import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function getStorageItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function setStorageItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteStorageItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
