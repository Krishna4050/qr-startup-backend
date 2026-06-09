import React, { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ScrollView, StyleSheet } from 'react-native';
import { Mail, Lock, AtSign, Eye, EyeOff, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { supabase_lucifer_core } from '../src/utils/supabase';
import { registerForPushNotificationsAsync } from '../src/utils/notifications';
import { useNavigation } from '@react-navigation/native';

// Dynamically import Turnstile so it doesn't break React Native iOS/Android builds
let Turnstile: any = null;
if (Platform.OS === 'web') {
  try {
    Turnstile = require('@marsidev/react-turnstile').Turnstile;
  } catch (e) {
    console.warn("Turnstile not installed yet");
  }
}

export default function AuthForm() {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<'email' | 'verify' | 'email_not_found' | 'password' | 'signup'>('email');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleEmailSubmit = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setStep('verify');

    // If mobile, auto-complete verification (Turnstile is web-only for now)
    if (Platform.OS !== 'web') {
      setTimeout(() => handleVerificationComplete('mobile_bypass'), 1000);
    }
  };

  const handleVerificationComplete = async (token: string) => {
    setTurnstileToken(token);
    setLoading(true);
    setError('');
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL; 
      const res = await fetch(`${backendUrl}/api/auth/verify-email`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: email.toLowerCase(), turnstile_token: token })
      });
      
      if (!res.ok) {
        setError('Verification failed. Please try again.');
        setStep('email');
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      if (data.exists) {
        setStep('password');
      } else {
        setStep('email_not_found');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setStep('email');
    }
    setLoading(false);
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setLoading(true);
    setError('');

    const { error, data } = await supabase_lucifer_core.auth.signInWithPassword({ email, password });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
         setError('Wrong password. Try again or click Forgot password to reset it.');
      } else if (error.message.includes('Email not confirmed')) {
         await supabase_lucifer_core.auth.resend({ type: 'signup', email: email });
         navigation.replace('OtpVerification', { email: email });
      } else {
         setError(error.message);
      }
    } else {
      handleLoginSuccess(data.user);
    }
    setLoading(false);
  };

  const handleSignupSubmit = async () => {
    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    // Check username
    const { data: isAvailable } = await supabase_lucifer_core.rpc('check_username_available', {
      requested_username: username.toLowerCase()
    });

    if (!isAvailable) {
      setError('This username is already taken.');
      setLoading(false);
      return;
    }

    const { error, data } = await supabase_lucifer_core.auth.signUp({
      email, 
      password, 
      options: { data: { username: username.toLowerCase() } }
    });

    if (error) {
      setError(error.message);
    } else {
      navigation.replace('OtpVerification', { email: email }); 
    }
    setLoading(false);
  };

  const handleLoginSuccess = async (user: any) => {
    if (!user) return;
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        const { data: profile } = await supabase_lucifer_core.from('profiles').select('push_tokens').eq('id', user.id).single();
        const existingTokens = profile?.push_tokens || [];
        if (!existingTokens.includes(token)) {
          await supabase_lucifer_core.from('profiles').update({ push_tokens: [...existingTokens, token] }).eq('id', user.id);
        }
        
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL; 
        fetch(`${backendUrl}/api/security/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, push_token: token, device: Platform.OS === 'ios' ? 'iPhone' : 'Android' })
        }).catch(() => {});
      }
    } catch (e) {}
    navigation.replace('Dashboard'); 
  };

  const handleGoogleLogin = async () => {
    // In Expo, standard Supabase OAuth opens a browser session
    const { data, error } = await supabase_lucifer_core.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: Platform.OS === 'web' ? window.location.origin + '/dashboard' : 'your-app-scheme://dashboard'
      }
    });
    if (error) setError(error.message);
  };

  const handleAppleLogin = async () => {
    if (Platform.OS === 'web') {
      alert("Apple Login is coming soon!");
    }
    // Apple Login temporarily disabled until Apple Developer Program enrollment
    return;
  };

  const renderContent = () => {
    if (step === 'email') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Use your ATS Finland Account</Text>
          
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <TextInput 
              style={styles.input} 
              placeholder="Email or phone" 
              placeholderTextColor="#5F6368" 
              keyboardType="email-address" 
              autoCapitalize="none" 
              value={email} 
              onChangeText={(t) => {setEmail(t); setError('');}} 
              onSubmitEditing={handleEmailSubmit}
            />
          </View>
          {error ? (
            <View style={styles.inlineErrorRow}>
               <AlertCircle color="#DC2626" size={14} />
               <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={{ marginTop: 8 }} onPress={() => {}}>
            <Text style={styles.linkText}>Forgot email?</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 32 }}>
            <Text style={styles.disclaimerText}>
              Not your computer? Use Guest mode to sign in privately.
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => setStep('signup')}>
              <Text style={styles.linkText}>Create account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleEmailSubmit}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>

          {/* Social Logins */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
               <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
               <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'verify') {
      return (
        <View style={[styles.stepContainer, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={styles.title}>Security Check</Text>
          <Text style={styles.subtitle}>Please verify you are human</Text>
          <View style={{ marginVertical: 32 }}>
            {Platform.OS === 'web' && Turnstile ? (
              <Turnstile 
                siteKey={process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} 
                onSuccess={(token: string) => handleVerificationComplete(token)}
              />
            ) : (
              <ActivityIndicator size="large" color="#0F2D4D" />
            )}
          </View>
          {loading && <ActivityIndicator color="#0F2D4D" />}
        </View>
      );
    }

    if (step === 'email_not_found') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Account not found</Text>
          <View style={styles.chipWrapper}>
            <Text style={styles.chipText}>{email}</Text>
          </View>
          
          <View style={[styles.inlineErrorRow, { marginTop: 16, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8 }]}>
             <AlertCircle color="#DC2626" size={16} />
             <Text style={[styles.inlineErrorText, { fontSize: 14 }]}>
               This email address doesn't exist in our system. Do you want to create a new account?
             </Text>
          </View>

          <View style={[styles.actionRow, { marginTop: 32 }]}>
            <TouchableOpacity onPress={() => setStep('email')}>
              <Text style={styles.linkText}>Use different email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('signup')}>
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'password') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Welcome</Text>
          <TouchableOpacity style={styles.chipWrapper} onPress={() => setStep('email')}>
            <Text style={styles.chipText}>{email}</Text>
          </TouchableOpacity>
          
          <View style={[styles.inputWrapper, error ? styles.inputError : null, { marginTop: 24 }]}>
            <Lock color="#4B5563" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Enter your password" 
              placeholderTextColor="#9CA3AF" 
              secureTextEntry={!showPassword} 
              value={password} 
              onChangeText={(t) => {setPassword(t); setError('');}} 
              onSubmitEditing={handlePasswordSubmit}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
              {showPassword ? <EyeOff color="#4B5563" size={20} /> : <Eye color="#4B5563" size={20} />}
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.inlineErrorRow}>
               <AlertCircle color="#DC2626" size={14} />
               <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={{ marginTop: 8 }} onPress={() => {}}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={[styles.actionRow, { marginTop: 40 }]}>
            <TouchableOpacity onPress={() => setStep('email')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handlePasswordSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Next</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'signup') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Enter your details below</Text>
          
          <View style={styles.inputWrapper}>
            <Mail color="#4B5563" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              value={email} 
              editable={false}
              color="#9CA3AF"
            />
          </View>

          <View style={[styles.inputWrapper, { marginTop: 16 }]}>
            <AtSign color="#4B5563" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Choose a username" 
              placeholderTextColor="#9CA3AF" 
              autoCapitalize="none" 
              value={username} 
              onChangeText={(t) => {setUsername(t); setError('');}} 
            />
          </View>

          <View style={[styles.inputWrapper, { marginTop: 16 }]}>
            <Lock color="#4B5563" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Create password" 
              placeholderTextColor="#9CA3AF" 
              secureTextEntry={!showPassword} 
              value={password} 
              onChangeText={(t) => {setPassword(t); setError('');}} 
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
              {showPassword ? <EyeOff color="#4B5563" size={20} /> : <Eye color="#4B5563" size={20} />}
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.inlineErrorRow}>
               <AlertCircle color="#DC2626" size={14} />
               <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.actionRow, { marginTop: 40 }]}>
            <TouchableOpacity onPress={() => setStep('email')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSignupSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Sign Up</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  const FormContent = (
    <View style={styles.innerContainer}>
      <View style={styles.card}>
        {renderContent()}
      </View>
      <View style={styles.footerLinks}>
        <TouchableOpacity><Text style={styles.footerLink}>Help</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.footerLink}>Privacy</Text></TouchableOpacity>
        <TouchableOpacity><Text style={styles.footerLink}>Terms</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {Platform.OS === 'web' ? (
         FormContent
      ) : (
         <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            {FormContent}
         </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F9', // Google-like light background
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    maxWidth: 448,
    paddingHorizontal: 40,
    paddingTop: 48,
    paddingBottom: 36,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#DADCE0',
    shadowColor: Platform.OS !== 'web' ? '#000' : 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  stepContainer: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#202124',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: '#202124',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 56,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    // @ts-ignore
    outlineStyle: 'none', // Web specific to remove default focus outline
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  inlineErrorText: {
    color: '#DC2626',
    fontSize: 12,
    marginLeft: 6,
  },
  linkText: {
    color: '#0A66C2', // Google blue
    fontSize: 14,
    fontWeight: '500',
  },
  disclaimerText: {
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
  },
  primaryButton: {
    backgroundColor: '#0A66C2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24, // Pill shape like Google
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chipWrapper: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 24,
  },
  footerLink: {
    color: '#6B7280',
    fontSize: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  socialButtonText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  }
});