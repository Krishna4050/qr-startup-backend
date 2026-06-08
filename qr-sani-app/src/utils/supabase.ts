// import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Securely pulling the keys from your .env file!
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// --- Platform-Aware Storage Adapter ---
// On the web, we use synchronous localStorage wrapped in Promises.
// On mobile, we use highly secure expo-secure-store.
const customStorageAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// --- Lucifer Core DB Connection ---
export const supabase_lucifer_core = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorageAdapter, // MUST use the custom Promise-wrapped adapter on both mobile and web to prevent hangs
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevents URL parser hang on web
    lock: Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.locks 
          ? undefined // Use standard Web Locks API to prevent multi-tab race conditions
          : (name, timeout, fn) => fn(), // Bypass on mobile
  },
});