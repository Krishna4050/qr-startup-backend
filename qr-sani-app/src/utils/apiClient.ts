import axios from 'axios';
import { supabase_lucifer_core } from './supabase';

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

// Intercept all requests to inject the latest session token
apiClient.interceptors.request.use(
  async (config) => {
    // We grab the session from the Supabase client directly
    const { data: { session } } = await supabase_lucifer_core.auth.getSession();
    
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
