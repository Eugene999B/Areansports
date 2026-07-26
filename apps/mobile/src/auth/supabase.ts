import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const isAuthenticationConfigured = Boolean(supabaseUrl && supabasePublishableKey);

function secureStorageKey(key: string): string {
  return `arenasports_${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(secureStorageKey(key));
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(secureStorageKey(key), value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(secureStorageKey(key));
  },
};

export const supabase = isAuthenticationConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        ...(Platform.OS === 'web' ? {} : { storage: secureStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;
