import { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator,
  Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform
} from 'react-native';
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase_lucifer_core } from '../utils/supabase';

export default function OtpVerificationScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const userEmail = route.params?.email || 'your email'; 

  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // --- NEW: Resend Timer State ---
  const [timeLeft, setTimeLeft] = useState(60);
  const [isResending, setIsResending] = useState(false);

  // --- NEW: Countdown Engine ---
  useEffect(() => {
    if (timeLeft === 0) return;
    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const lucifer_go_back = () => navigation.replace('Login');

  const sani_verify_code = async () => {
    Keyboard.dismiss(); 
    if (otp.length !== 6) return;

    setIsVerifying(true);
    const { data, error } = await supabase_lucifer_core.auth.verifyOtp({ email: userEmail, token: otp, type: 'signup' });

    if (error) {
      Alert.alert("Verification Failed", error.message);
      setIsVerifying(false);
    } else if (data.session) {
      navigation.replace('Onboarding');
    }
  };

  // --- NEW: Resend Logic ---
  const handleResend = async () => {
    setIsResending(true);
    const { error } = await supabase_lucifer_core.auth.resend({ type: 'signup', email: userEmail });
    setIsResending(false);
    
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setTimeLeft(60); // Reset timer to 60 seconds
      Alert.alert("Code Sent!", "A new 6-digit code has been sent to your email.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={lucifer_go_back}>
            <ArrowLeft color="#6B7280" size={24} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <ShieldCheck color="#10B981" size={48} />
          </View>
          
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We sent a secure code to <Text style={{fontWeight: 'bold', color: '#111827'}}>{userEmail}</Text>.
          </Text>

          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor="#D1D5DB"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            autoFocus={true}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <TouchableOpacity style={[styles.verifyBtn, otp.length === 6 ? styles.verifyBtnActive : null]} onPress={sani_verify_code} disabled={isVerifying || otp.length !== 6}>
            {isVerifying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.verifyBtnText}>Verify Account</Text>}
          </TouchableOpacity>

          {/* --- NEW: Resend UI --- */}
          <View style={styles.resendContainer}>
            {timeLeft > 0 ? (
              <Text style={styles.resendText}>Resend code in <Text style={{fontWeight: 'bold', color: '#4F46E5'}}>{timeLeft}s</Text></Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isResending} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isResending ? <ActivityIndicator size="small" color="#4F46E5" /> : (
                  <>
                    <RefreshCw color="#4F46E5" size={16} style={{ marginRight: 6 }} />
                    <Text style={[styles.resendText, { color: '#4F46E5', fontWeight: 'bold' }]}>Resend Code</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  backButton: { position: 'absolute', top: 60, left: 24, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  backButtonText: { fontSize: 16, color: '#6B7280', marginLeft: 8, fontWeight: '500' },
  iconCircle: { width: 96, height: 96, backgroundColor: '#D1FAE5', borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24, marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 24, paddingHorizontal: 12 },
  otpInput: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 12, fontSize: 36, fontWeight: 'bold', letterSpacing: 8, textAlign: 'center', width: '80%', paddingVertical: 16, marginBottom: 32, color: '#111827' },
  verifyBtn: { backgroundColor: '#D1D5DB', padding: 16, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center' },
  verifyBtnActive: { backgroundColor: '#4F46E5', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  verifyBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  resendContainer: { marginTop: 24, height: 40, justifyContent: 'center', alignItems: 'center' },
  resendText: { fontSize: 14, color: '#6B7280' }
});