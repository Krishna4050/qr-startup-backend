// import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Securely pulling the keys from your .env file!
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// --- Platform-Aware Storage Adapter ---
// On the web, we use synchronous localStorage to prevent "refresh amnesia"
// On mobile, we use asynchronous AsyncStorage (the native standard)
const customStorageAdapter = Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.localStorage : undefined) : AsyncStorage;

// --- Lucifer Core DB Connection ---
export const supabase_lucifer_core = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevents hanging on web
  },
});