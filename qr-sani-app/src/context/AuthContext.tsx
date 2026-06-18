import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking'; // NEW: Deep Linking Engine
import { supabase_lucifer_core } from '../utils/supabase';
import { getOrCreateKeyPair } from '../utils/crypto';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  isFullyRegistered: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null, isLoading: true, logout: async () => {}, isFullyRegistered: false });

export const AuthProvider = ({ children }: any) => {
  const [mayalu_session, set_mayalu_session] = useState<Session | null>(null);
  const [is_sani_loading, set_is_sani_loading] = useState(true);
  const [is_fully_registered, set_is_fully_registered] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // In Expo Web, calling getSession() simultaneously with onAuthStateChange()
    // causes a fatal lock contention deadlock in gotrue-js.
    // We rely exclusively on onAuthStateChange, which automatically fires an INITIAL_SESSION event.
    
    // Safety fallback: if onAuthStateChange doesn't fire within 2 seconds (e.g. broken network), unlock the app.
    const safetyTimeout = setTimeout(() => {
      if (isMounted && is_sani_loading) {
        console.warn("Auth check timed out. Unlocking app.");
        set_is_sani_loading(false);
      }
    }, 2000);

    const { data: { subscription } } = supabase_lucifer_core.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        
        // Wrap database calls in a non-blocking macro-task to prevent gotrue-js deadlock!
        // When verifyOtp runs, it triggers onAuthStateChange. If we use supabase.from() here,
        // it calls getSession() under the hood, deadlocking the client!
        setTimeout(async () => {
          let termsAgreed = false;
          try {
            const { data, error } = await supabase_lucifer_core.from('profiles').select('terms_agreed').eq('id', session.user.id).single();
            if (!error && data) termsAgreed = data.terms_agreed;
          } catch (e) {
            console.warn("Failed to check terms_agreed", e);
          }

          if (isMounted) {
            set_mayalu_session(session); 
            set_is_fully_registered(termsAgreed);
          }

          // Automatically ensure E2E keys exist and are synced to profile
          if (event === 'SIGNED_IN') {
            try {
              const keys = await getOrCreateKeyPair();
              await supabase_lucifer_core
                .from('profiles')
                .update({ chat_public_key: keys.publicKey })
                .eq('id', session.user.id);
            } catch (e) {
              console.error("Failed to sync E2E keys on login:", e);
            }
          }
        }, 0);
      } else {
        if (isMounted) {
          set_mayalu_session(null);
          set_is_fully_registered(false);
        }
      }
      if (isMounted) {
        set_is_sani_loading(false); // ALWAYS UNLOCK APP!
        clearTimeout(safetyTimeout);
      }
    });
    // --- MNSKB Deep Link Interceptor ---
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (url && url.includes('access_token')) {
        // Extract the hidden tokens from the URL fragment
        const fragment = url.split('#')[1];
        if (!fragment) return;
        
        // Manual string parsing to avoid polyfill crashes
        const params = fragment.split('&').reduce((acc, current) => {
          const [key, value] = current.split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);

        if (params.access_token && params.refresh_token) {
          // Force the Supabase Engine to log them in!
          const { error } = await supabase_lucifer_core.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          
          if (!error) console.log("[Core] Deep Link Auth Successful!");
        }
      }
    };

    // Listen if the app is already open in the background
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
    
    // Listen if the app was completely closed and opened via the link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const logout = async () => {
    set_is_sani_loading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
      await Promise.race([supabase_lucifer_core.auth.signOut(), timeoutPromise]);
    } catch (e) {
      console.warn("Signout timed out, forcefully clearing session");
    } finally {
      if (Platform.OS === 'web') {
        // Find and remove specifically the Supabase auth token to truly log out
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('-auth-token')) {
            localStorage.removeItem(key);
          }
        }
      }
      set_mayalu_session(null);
      set_is_sani_loading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session: mayalu_session, 
      user: mayalu_session?.user || null, 
      isLoading: is_sani_loading, 
      logout, 
      isFullyRegistered: is_fully_registered 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);