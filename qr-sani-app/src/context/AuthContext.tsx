import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking'; // NEW: Deep Linking Engine
import { supabase_lucifer_core } from '../utils/supabase';
import { getOrCreateKeyPair } from '../utils/crypto';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null, isLoading: true });

export const AuthProvider = ({ children }: any) => {
  const [mayalu_session, set_mayalu_session] = useState<Session | null>(null);
  const [is_sani_loading, set_is_sani_loading] = useState(true);

  useEffect(() => {
    // Standard Startup Check
    supabase_lucifer_core.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.log("Normal auth background check failed, user needs to log in.");
        // We just log it instead of letting it throw a red screen
      }
      set_mayalu_session(session);
      set_is_sani_loading(false);
    });

    // Standard State Listener
    const { data: { subscription } } = supabase_lucifer_core.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        set_mayalu_session(session); 
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
      } else {
        set_mayalu_session(null);
      }
      set_is_sani_loading(false); // ALWAYS UNLOCK APP!
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
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session: mayalu_session, user: mayalu_session?.user || null, isLoading: is_sani_loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);