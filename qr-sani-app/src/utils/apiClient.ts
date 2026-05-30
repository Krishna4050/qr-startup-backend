import axios from 'axios';
import { supabase_lucifer_core } from './supabase';

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Helper to remove trailing slashes from the backend URL
const getBackendUrl = () => {
  let backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    console.error("CRITICAL ERROR: EXPO_PUBLIC_BACKEND_URL is not set in Vercel/Expo Environment Variables!");
    return "http://localhost:8080"; // Fallback for dev if env missing
  }
  return backendUrl.replace(/\/$/, "");
};

// Create a generic Axios client
const apiClient = axios.create({
  baseURL: getBackendUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Calculate the storage key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const projectId = supabaseUrl ? supabaseUrl.split('//')[1].split('.')[0] : '';
const storageKey = `sb-${projectId}-auth-token`;

// Safe storage fetcher
const getStoredSession = async () => {
  try {
    let jsonStr: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        jsonStr = window.localStorage.getItem(storageKey);
      }
    } else {
      jsonStr = await SecureStore.getItemAsync(storageKey);
    }

    if (jsonStr) {
      const parsed = JSON.parse(jsonStr);
      return parsed.access_token ? parsed : null;
    }
  } catch (e) {
    console.error("Failed to parse stored session:", e);
  }
  return null;
};

// Intercept all requests to inject the latest session token
apiClient.interceptors.request.use(
  async (config) => {
    // Read directly from storage to bypass Supabase GoTrue web hanging bug
    const session = await getStoredSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Intercept responses to handle global 401 Unauthorized logouts
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn("API returned 401 Unauthorized. Session might be invalid or expired.");
      // Optionally trigger a logout here if needed
      // await supabase_lucifer_core.auth.signOut();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
