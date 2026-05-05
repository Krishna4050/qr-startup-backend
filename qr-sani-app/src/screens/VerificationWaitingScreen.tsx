import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase_lucifer_core } from '../utils/supabase';

export default function VerificationWaitingScreen({ navigation }: any) {
  const { user } = useAuth();
  // Listen for the Deep Link Auth update!
  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigation.replace('Onboarding');
    }
  }, [user]);
  const [isChecking, setIsChecking] = useState(false);

  // --- MNSKB Auto-Polling Engine ---
  useEffect(() => {
    const sani_polling_interval = setInterval(async () => {
      try {
        // We put this in a try/catch so network drops on 4G don't crash the app!
        const { data, error } = await supabase_lucifer_core.auth.refreshSession();
        
        // If there's an error (like no internet), we just wait for the next 3-second tick
        if (error) return; 

        if (data?.session?.user?.email_confirmed_at) {
          clearInterval(sani_polling_interval); // Stop checking
          navigation.replace('Onboarding'); // Auto-direct!
        }
      } catch (err) {
        console.log("[Core] Polling tick skipped due to network status.");
      }
    }, 3000);

    return () => clearInterval(sani_polling_interval);
  }, []);

  // Manual fallback check just in case
  const sani_check_verification = async () => {
    setIsChecking(true);
    const { data } = await supabase_lucifer_core.auth.refreshSession();
    
    if (data.session?.user.email_confirmed_at) {
      navigation.replace('Onboarding'); 
    } else {
      Alert.alert("Not Verified Yet", "Please check your inbox or spam folder.");
    }
    setIsChecking(false);
  };

  // If they made a mistake, this logs out the unverified account and sends them back!
  const lucifer_go_back = async () => {
    await supabase_lucifer_core.auth.signOut();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      
      {/* The Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={lucifer_go_back}>
        <ArrowLeft color="#6B7280" size={24} />
        <Text style={styles.backButtonText}>Wrong email? Go back</Text>
      </TouchableOpacity>

      <View style={styles.iconCircle}>
        <Mail color="#4F46E5" size={48} />
      </View>
      
      <Text style={styles.title}>Verify your email</Text>
      
      {/* THE EXACT TEXT YOU REQUESTED */}
      <Text style={styles.subtitle}>
        Verification link has been sent to the entered email address please check email to process further.
      </Text>

      <View style={styles.emailDisplayRow}>
        <Text style={styles.emailText}>{user?.email}</Text>
      </View>

      {/* Visual indicator that the app is auto-checking */}
      <View style={styles.autoCheckContainer}>
        <ActivityIndicator color="#4F46E5" size="small" style={{ marginRight: 8 }} />
        <Text style={styles.autoCheckText}>Waiting for verification...</Text>
      </View>

      {/* Manual Check Fallback */}
      <TouchableOpacity style={styles.checkBtn} onPress={sani_check_verification} disabled={isChecking}>
        <RefreshCw color="#6B7280" size={20} style={{marginRight: 8}} />
        <Text style={styles.checkBtnText}>{isChecking ? "Checking..." : "I have already verified"}</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  backButton: { position: 'absolute', top: 60, left: 24, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  backButtonText: { fontSize: 16, color: '#6B7280', marginLeft: 8, fontWeight: '500' },
  
  iconCircle: { width: 96, height: 96, backgroundColor: '#E0E7FF', borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 24, paddingHorizontal: 12 },
  
  emailDisplayRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, marginBottom: 40, borderWidth: 1, borderColor: '#E5E7EB' },
  emailText: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  
  autoCheckContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8 },
  autoCheckText: { color: '#4F46E5', fontWeight: '600' },
  
  checkBtn: { flexDirection: 'row', backgroundColor: 'transparent', padding: 16, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
  checkBtnText: { color: '#4B5563', fontSize: 16, fontWeight: 'bold' }
});