import React, { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, ScrollView, StyleSheet } from 'react-native';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react-native';
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

type AuthFormProps = {
  initialStep?: 'contact' | 'verify' | 'contact_not_found' | 'password' | 'signup_otp' | 'signup_details' | 'signup_terms';
  onSuccess?: () => void;
};

export default function AuthForm({ initialStep = 'contact', onSuccess }: AuthFormProps) {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<'contact' | 'verify' | 'contact_not_found' | 'password' | 'signup_otp' | 'signup_details' | 'signup_terms'>(initialStep);
  
  // States
  const [contact, setContact] = useState(''); // Email or Phone
  const [isPhone, setIsPhone] = useState(false);
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Signup States
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('Finland');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [promotionsOptOut, setPromotionsOptOut] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    // Determine if contact is phone or email
    if (contact.startsWith('+') || /^\d+$/.test(contact)) {
      setIsPhone(true);
    } else {
      setIsPhone(false);
    }
  }, [contact]);

  useEffect(() => {
    if (initialStep === 'signup_details') {
      supabase_lucifer_core.auth.getUser().then(({ data }) => {
        if (data.user) {
          if (data.user.email) {
            setContact(data.user.email);
            setIsPhone(false);
          } else if (data.user.phone) {
            setContact(data.user.phone);
            setIsPhone(true);
          }
        }
      });
    }
  }, [initialStep]);

  const checkPasswordStrength = (pwd: string) => {
    if (pwd.length < 9) return 'Weak';
    if (pwd.toLowerCase().includes(firstName.toLowerCase()) && firstName !== '') return 'Weak';
    if (pwd.toLowerCase().includes(lastName.toLowerCase()) && lastName !== '') return 'Weak';
    if (pwd.toLowerCase().includes(contact.toLowerCase())) return 'Weak';

    let score = 0;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score < 3) return 'Medium';
    return 'Strong';
  };

  const handlePasswordChange = (t: string) => {
    setPassword(t);
    setPasswordStrength(checkPasswordStrength(t));
    setError('');
  };

  const handleContactSubmit = () => {
    if (!contact) {
      setError('Please enter an email or phone number.');
      return;
    }
    if (isPhone && !contact.startsWith('+')) {
      setError('Please include your country code (e.g., +358).');
      return;
    }
    if (!isPhone && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
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
      const res = await fetch(`${backendUrl}/api/auth/verify-contact`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ contact: contact.toLowerCase(), turnstile_token: token })
      });
      
      if (!res.ok) {
        setError('Verification failed. Please try again.');
        setStep('contact');
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      if (data.exists) {
        setStep('password'); // Login flow
      } else {
        // New User -> Send OTP and go to signup_otp
        const { error: otpError } = await supabase_lucifer_core.auth.signInWithOtp(
          isPhone ? { phone: contact } : { email: contact }
        );
        if (otpError) throw otpError;
        setStep('signup_otp');
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
      setStep('contact');
    }
    setLoading(false);
  };

  const handleLoginSubmit = async () => {
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setLoading(true);
    setError('');

    const credentials = isPhone ? { phone: contact, password } : { email: contact, password };
    const { error, data } = await supabase_lucifer_core.auth.signInWithPassword(credentials as any);
    
    if (error) {
      setError(error.message);
    } else {
      handleLoginSuccess(data.user);
    }
    setLoading(false);
  };

  const handleOtpSubmit = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: verifyErr } = await supabase_lucifer_core.auth.verifyOtp({
        [isPhone ? 'phone' : 'email']: contact,
        token: otp,
        type: isPhone ? 'sms' : 'email',
      } as any);

      if (verifyErr) throw verifyErr;
      if (data.user) {
        // OTP Verified, User created & session active!
        setStep('signup_details');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code.');
    }
    setLoading(false);
  };

  const handleDetailsSubmit = async () => {
    if (!firstName || !lastName || !dob || !city || !street || !username) {
      setError('Please fill in all required fields.');
      return;
    }
    if (passwordStrength === 'Weak' || password.length < 9) {
      setError('Password is too weak. Must be at least 9 characters and cannot contain your name/email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
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

    setStep('signup_terms');
    setLoading(false);
  };

  const handleTermsSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Update auth.users with the new password
      const { error: pwdError } = await supabase_lucifer_core.auth.updateUser({ password });
      if (pwdError) throw pwdError;

      // 2. Update public.profiles with the demographic data
      const { data: sessionData } = await supabase_lucifer_core.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (user) {
        const profileData = {
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          preferred_name: preferredName,
          date_of_birth: dob,
          country,
          city,
          street,
          house_number: houseNumber,
          username: username.toLowerCase(),
          promotions_opt_out: promotionsOptOut,
          promotions_opt_out_at: promotionsOptOut ? new Date().toISOString() : null,
          terms_agreed: true,
          terms_agreed_at: new Date().toISOString(),
          is_email_verified: !isPhone,
          is_phone_verified: isPhone,
          phone_number: isPhone ? contact : null,
        };

        const { error: profileErr } = await supabase_lucifer_core.from('profiles').update(profileData).eq('id', user.id);
        if (profileErr) throw profileErr;

        if (onSuccess) {
          onSuccess();
        } else {
          handleLoginSuccess(user);
        }
      }
    } catch (err: any) {
      setError(err.message);
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
    const { data, error } = await supabase_lucifer_core.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: Platform.OS === 'web' ? window.location.origin + '/dashboard' : 'your-app-scheme://dashboard' }
    });
    if (error) setError(error.message);
  };

  const handleAppleLogin = async () => {
    if (Platform.OS === 'web') alert("Apple Login is coming soon!");
  };

  const renderContent = () => {
    if (step === 'contact') {
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
              value={contact} 
              onChangeText={(t) => {setContact(t); setError('');}} 
              onSubmitEditing={handleContactSubmit}
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
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.linkText}>Create account</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleContactSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Next</Text>}
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
               <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: 20, height: 20, marginRight: 8 }} />
               <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
               <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" alt="Apple" style={{ width: 18, height: 20, marginRight: 8 }} />
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

    if (step === 'password') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Welcome back</Text>
          <TouchableOpacity style={styles.chipWrapper} onPress={() => setStep('contact')}>
            <Text style={styles.chipText}>{contact}</Text>
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
              onSubmitEditing={handleLoginSubmit}
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

          <View style={[styles.actionRow, { marginTop: 40 }]}>
            <TouchableOpacity onPress={() => setStep('contact')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleLoginSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Log in</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'signup_otp') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Confirm your {isPhone ? 'number' : 'email'}</Text>
          <Text style={styles.subtitle}>We sent a code to {contact}</Text>
          
          <View style={[styles.inputWrapper, { marginTop: 24 }]}>
            <TextInput 
              style={[styles.input, { letterSpacing: 8, fontSize: 24, textAlign: 'center' }]} 
              placeholder="000000" 
              placeholderTextColor="#9CA3AF" 
              keyboardType="number-pad" 
              maxLength={6}
              value={otp} 
              onChangeText={(t) => {setOtp(t); setError('');}} 
              onSubmitEditing={handleOtpSubmit}
              autoFocus
            />
          </View>

          {error ? (
            <View style={styles.inlineErrorRow}>
               <AlertCircle color="#DC2626" size={14} />
               <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.actionRow, { marginTop: 40 }]}>
            <TouchableOpacity onPress={() => setStep('contact')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleOtpSubmit} disabled={loading || otp.length < 6}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Verify</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'signup_details') {
      return (
        <ScrollView 
          style={{ flexShrink: 1, width: '100%' }} 
          contentContainerStyle={{ flexGrow: 1 }} 
          showsVerticalScrollIndicator={true}
        >
          <View style={[styles.stepContainer, { paddingBottom: 16 }]}>
            <Text style={styles.title}>Finish signing up</Text>
            <Text style={styles.subtitle}>Legal name</Text>
            <Text style={styles.helperText}>Make sure it matches the name on your government ID.</Text>

            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="First name on ID" value={firstName} onChangeText={setFirstName} /></View>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Middle name (optional)" value={middleName} onChangeText={setMiddleName} /></View>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Last name on ID" value={lastName} onChangeText={setLastName} /></View>
            
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Preferred first name (optional)" value={preferredName} onChangeText={setPreferredName} /></View>

            <Text style={[styles.subtitle, { marginTop: 24 }]}>Date of birth</Text>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="YYYY-MM-DD" value={dob} onChangeText={setDob} /></View>

            <Text style={[styles.subtitle, { marginTop: 24 }]}>Address</Text>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Country" value={country} onChangeText={setCountry} /></View>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} /></View>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Street" value={street} onChangeText={setStreet} /></View>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="House Number" value={houseNumber} onChangeText={setHouseNumber} /></View>

            <Text style={[styles.subtitle, { marginTop: 24 }]}>Account Info</Text>
            <View style={styles.inputWrapper}><TextInput style={styles.input} placeholder="Username (no spaces/special chars)" value={username} onChangeText={setUsername} autoCapitalize="none" /></View>
            
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="Password" secureTextEntry={!showPassword} value={password} onChangeText={handlePasswordChange} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                {showPassword ? <EyeOff color="#4B5563" size={20} /> : <Eye color="#4B5563" size={20} />}
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8 }}>
               <Text style={{ fontSize: 12, color: passwordStrength === 'Strong' ? '#059669' : passwordStrength === 'Medium' ? '#D97706' : '#DC2626' }}>
                 Strength: {passwordStrength || 'Weak'}
               </Text>
            </View>

            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry={!showPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
            </View>

            {error ? (
              <View style={styles.inlineErrorRow}>
                 <AlertCircle color="#DC2626" size={14} />
                 <Text style={styles.inlineErrorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity style={[styles.primaryButton, { width: '100%', marginTop: 24 }]} onPress={handleDetailsSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    if (step === 'signup_terms') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Almost done</Text>
          
          <Text style={[styles.disclaimerText, { marginTop: 24 }]}>
            ATS will send you promotions such as deals and marketing notifications. You can opt out anytime via account settings or within marketing emails.
          </Text>

          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }} onPress={() => setPromotionsOptOut(!promotionsOptOut)}>
             <View style={[styles.checkbox, promotionsOptOut && styles.checkboxChecked]}>
               {promotionsOptOut && <CheckCircle color="#FFF" size={14} />}
             </View>
             <Text style={{ marginLeft: 8, color: '#374151', flex: 1 }}>I don’t want to receive ATS promotions.</Text>
          </TouchableOpacity>

          <Text style={[styles.disclaimerText, { marginTop: 32 }]}>
            By selecting Agree and continue, I agree to ATS Terms of Service, Payments Terms of Service, and Nondiscrimination Policy, and acknowledge the Privacy Policy.
          </Text>

          {error ? (
            <View style={styles.inlineErrorRow}>
               <AlertCircle color="#DC2626" size={14} />
               <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.actionRow, { marginTop: 40 }]}>
            <TouchableOpacity onPress={() => setStep('signup_details')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTermsSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Agree and continue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%' }}>
      {Platform.OS === 'web' ? (
        <View style={styles.container}>
          <View style={styles.innerContainer}>
            <View style={styles.card}>
              {renderContent()}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.innerContainer}>
            <View style={styles.card}>
              {renderContent()}
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F0FE', width: '100%' },
  innerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, width: '100%', maxWidth: 448, maxHeight: '100%', flexShrink: 1, paddingHorizontal: 40, paddingTop: 48, paddingBottom: 36, borderTopWidth: 6, borderColor: '#0A66C2', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4, display: 'flex', flexDirection: 'column' },
  stepContainer: { width: '100%', flexShrink: 1 },
  title: { fontSize: 24, fontWeight: '400', color: '#202124', marginBottom: 8, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  subtitle: { fontSize: 16, color: '#202124', marginBottom: 40, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  helperText: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, height: 48, marginBottom: 12, backgroundColor: '#FFFFFF' },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any,
  inlineErrorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  inlineErrorText: { color: '#DC2626', fontSize: 12, marginLeft: 6 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 },
  linkText: { color: '#0A66C2', fontSize: 14, fontWeight: '600' },
  primaryButton: { backgroundColor: '#0A66C2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  chipWrapper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 8 },
  chipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 16, color: '#6B7280', fontSize: 12, fontWeight: '500' },
  socialRow: { flexDirection: 'row', justifyContent: 'space-between' },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingVertical: 10, marginHorizontal: 4 },
  socialButtonText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  disclaimerText: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#0F2D4D', borderColor: '#0F2D4D' }
});