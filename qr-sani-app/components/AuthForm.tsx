import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, ScrollView, StyleSheet } from 'react-native';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, User, Users, Compass, Camera, Upload, Navigation, MapPin, Sparkles, Calendar, AtSign, ArrowLeft, Shield, X } from 'lucide-react-native';
import { supabase_lucifer_core } from '../src/utils/supabase';
import { useAuth } from '../src/context/AuthContext';
import { registerForPushNotificationsAsync } from '../src/utils/notifications';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import apiClient from '../src/utils/apiClient';

// Dynamically import Turnstile so it doesn't break React Native iOS/Android builds
let Turnstile: any = null;
if (Platform.OS === 'web') {
  try {
    Turnstile = require('@marsidev/react-turnstile').Turnstile;
  } catch (e) {
    console.warn("Turnstile not installed yet");
  }
}

type AuthStep = 'contact' | 'verify' | 'contact_not_found' | 'password' | 'signup_otp' | 'signup_password' | 'signup_name' | 'signup_dob' | 'signup_gender' | 'signup_location' | 'signup_profile' | 'signup_terms' | 'forgot_email_contact' | 'forgot_email_otp' | 'forgot_email_result' | 'forgot_password_method' | 'forgot_password_contact' | 'forgot_password_otp' | 'forgot_password_new' | 'forgot_password_signout';

type AuthFormProps = {
  initialStep?: AuthStep;
  onSuccess?: () => void;
  isModal?: boolean;
  forceRegistrationCompletion?: boolean;
  onClose?: () => void;
};

export default function AuthForm({ initialStep = 'contact', onSuccess, isModal = false, forceRegistrationCompletion = false, onClose }: AuthFormProps) {
  const navigation = useNavigation<any>();
  const { logout, user } = useAuth();
  const [step, setStep] = useState<AuthStep>(initialStep);
  
  // States
  const [contact, setContact] = useState(''); // Email or Phone
  const [isPhone, setIsPhone] = useState(false);
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (forceRegistrationCompletion && user) {
      setStep('signup_password');
      const contactVal = user.email || user.phone || '';
      setContact(contactVal);
      setIsPhone(!!user.phone);
    }
  }, [forceRegistrationCompletion, user]);
  
  // Signup States
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('Finland');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [manualLocation, setManualLocation] = useState(false);
  
  const [gender, setGender] = useState('');
  const [customGender, setCustomGender] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  
  const [username, setUsername] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameTaken, setUsernameTaken] = useState(false);
  
  const [confirmPassword, setConfirmPassword] = useState('');
  const [promotionsOptOut, setPromotionsOptOut] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCountdown > 0) {
      interval = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // Secure Recovery Flow States
  const [failedPasswordAttempts, setFailedPasswordAttempts] = useState(0);
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phone' | null>(null);
  const [recoveryContact, setRecoveryContact] = useState('');
  const [recoveryOTP, setRecoveryOTP] = useState('');
  const [recoveryResetToken, setRecoveryResetToken] = useState('');
  const [recoverySignoutAll, setRecoverySignoutAll] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [turnstileReady, setTurnstileReady] = useState(false);

  useEffect(() => {
    // Determine if contact is phone or email
    if (contact.startsWith('+') || /^\d+$/.test(contact)) {
      setIsPhone(true);
    } else {
      setIsPhone(false);
    }
  }, [contact]);

  useEffect(() => {
    if (initialStep === 'signup_name') {
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

  // --- NEW: Real-Time Username Checker ---
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameTaken(false);
      setUsernameSuggestions([]);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data } = await apiClient.get(`/api/profile/check-username?username=${username.trim()}`);
        if (data.taken) {
          setUsernameTaken(true);
          generateSmartSuggestions(username.trim());
        } else {
          setUsernameTaken(false);
          setUsernameSuggestions([]);
        }
      } catch (err) {
        setUsernameTaken(false);
        setUsernameSuggestions([]);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  const generateSmartSuggestions = async (baseName: string) => {
    const candidates = [
      `${baseName}${Math.floor(Math.random() * 999)}`,
      `${baseName}_${Math.floor(Math.random() * 99)}`,
      `${baseName}HQ`,
      `${baseName}Official`
    ];

    const takenNames: string[] = [];
    
    await Promise.all(candidates.map(async (name) => {
      try {
        const { data } = await apiClient.get(`/api/profile/check-username?username=${name}`);
        if (data.taken) {
          takenNames.push(name);
        }
      } catch (err) {}
    }));
    
    const safeSuggestions = candidates.filter(name => !takenNames.includes(name));
    setUsernameSuggestions(safeSuggestions.slice(0, 3));
  };

  const checkPasswordStrength = (pwd: string) => {
    if (pwd.length < 9) return 'Weak';
    if (firstName && pwd.toLowerCase().includes(firstName.toLowerCase())) return 'Weak';
    if (lastName && pwd.toLowerCase().includes(lastName.toLowerCase())) return 'Weak';
    if (contact && pwd.toLowerCase().includes(contact.toLowerCase())) return 'Weak';

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

  const handleGoBack = () => {
    setStep('contact');
    setError('');
    setPassword('');
    setOtp('');
    setTurnstileReady(false);
    setTurnstileToken(null);
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
    setTurnstileReady(true);
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
        handleGoBack();
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      setTurnstileReady(false); // Stop Turnstile from auto-refreshing
      if (data.exists) {
        setStep('password'); // Login flow
      } else {
        // New User -> Send OTP and go to signup_otp
        const { error: otpError } = await supabase_lucifer_core.auth.signInWithOtp(
          isPhone ? { phone: contact } : { email: contact }
        );
        if (otpError) throw otpError;
        setStep('signup_otp');
        setResendCountdown(60);
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please try again.');
      handleGoBack();
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError('');
    try {
      const { error: otpError } = await supabase_lucifer_core.auth.signInWithOtp(
        isPhone ? { phone: contact } : { email: contact }
      );
      if (otpError) throw otpError;
      setResendCountdown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
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
      setFailedPasswordAttempts(prev => prev + 1);
    } else {
      setFailedPasswordAttempts(0);
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
        if (data.session) {
          await supabase_lucifer_core.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
        } else {
          throw new Error('Session could not be established automatically. Please try logging in.');
        }
        setStep('signup_password');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code.');
    }
    setLoading(false);
  };

  const withTimeout = (promise: Promise<any>, ms: number, message: string) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
    ]);
  };

  const handleFinalizeProfile = async () => {
    if (!firstName || !lastName || !dob || !username) {
      setError('Please fill in all required fields.');
      return;
    }
    if (usernameTaken) {
      setError('Please choose an available username.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Upload Avatar if present and not a remote URL
      let uploadedAvatarUrl = avatarUrl;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        const formData = new FormData();
        formData.append('file', {
          uri: avatarUrl,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
        const uploadRes = await withTimeout(apiClient.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }), 15000, "Image upload timed out");
        uploadedAvatarUrl = uploadRes.data.url;
      }

      // 2. Submit Profile
      await withTimeout(apiClient.post('/api/profile', {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        preferred_name: preferredName,
        date_of_birth: dob,
        gender: customGender ? customGender : gender,
        country,
        state: stateName,
        city,
        street,
        zip_code: zipCode,
        house_number: houseNumber,
        bio,
        username: username.toLowerCase(),
        avatar_url: uploadedAvatarUrl,
      }), 10000, "Profile API timed out");

      if (onSuccess) onSuccess();
    } catch (e: any) {
      setError(e.message || e.response?.data?.error || 'Failed to save profile');
    }
    setLoading(false);
  };

  // --- RECOVERY HANDLERS ---
  const handleForgotEmailSendOTP = async () => {
    if (!recoveryContact) { setError('Please enter your recovery contact'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient.post('/api/auth/recovery/forgot-email/send-otp', { contact: recoveryContact });
      if (res.data.status === 'success') { setStep('forgot_email_otp'); }
    } catch (e: any) {
      setError(e.response?.data || e.message || 'Error sending OTP');
    }
    setLoading(false);
  };

  const handleForgotEmailVerifyOTP = async () => {
    if (recoveryOTP.length < 8) return;
    setLoading(true); setError('');
    try {
      const res = await apiClient.post('/api/auth/recovery/forgot-email/verify-otp', { contact: recoveryContact, code: recoveryOTP });
      if (res.data.email) {
        setContact(res.data.email);
        setStep('forgot_email_result');
      }
    } catch (e: any) {
      setError(e.response?.data || e.message || 'Invalid code');
    }
    setLoading(false);
  };

  const initForgotPasswordFlow = async () => {
     setError('');
     setRecoveryContact(contact);
     setStep('forgot_password_contact');
  };

  const handleForgotPasswordSendOTP = async () => {
    if (!recoveryContact) { setError('Please enter your recovery contact'); return; }
    setLoading(true); setError('');
    try {
      const res = await apiClient.post('/api/auth/recovery/forgot-password/send-otp', { contact: recoveryContact });
      if (res.data.status === 'success') { setStep('forgot_password_otp'); }
    } catch (e: any) {
      setError(e.response?.data || e.message || 'Account not found');
    }
    setLoading(false);
  };

  const handleForgotPasswordVerifyOTP = async () => {
    if (recoveryOTP.length < 8) return;
    setLoading(true); setError('');
    try {
      const res = await apiClient.post('/api/auth/recovery/forgot-password/verify-otp', { contact: recoveryContact, code: recoveryOTP });
      if (res.data.reset_token) {
        setRecoveryResetToken(res.data.reset_token);
        setStep('forgot_password_new');
      }
    } catch (e: any) {
      setError(e.response?.data || e.message || 'Invalid code');
    }
    setLoading(false);
  };

  const handleForgotPasswordReset = async () => {
    if (newPassword.length < 9 || passwordStrength === 'Weak') { setError('Password is too weak'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match'); return; }
    
    setLoading(true); setError('');
    try {
      await apiClient.post('/api/auth/recovery/forgot-password/reset', { 
        reset_token: recoveryResetToken, 
        new_password: newPassword,
        signout_all: recoverySignoutAll
      });
      // Success
      setPassword('');
      setFailedPasswordAttempts(0);
      setStep('password');
    } catch (e: any) {
      setError(e.response?.data || e.message || 'Failed to reset password');
    }
    setLoading(false);
  };
  // -----------------------

  const handleDobChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
    }
    if (cleaned.length > 6) {
      formatted = formatted.slice(0, 7) + '-' + cleaned.slice(6, 8);
    }
    setDob(formatted);
    setError('');
  };

  useEffect(() => {
    if (username.length > 2) {
      const checkDelay = setTimeout(async () => {
        setIsCheckingUsername(true);
        try {
          const { data } = await apiClient.get(`/api/profile/check-username?username=${username.toLowerCase().trim()}`);
          setUsernameTaken(data.taken);
          if (data.taken) {
            setUsernameSuggestions([username.toLowerCase() + '123', username.toLowerCase() + '_fi', username.toLowerCase() + new Date().getFullYear()]);
          } else {
            setUsernameSuggestions([]);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsCheckingUsername(false);
        }
      }, 500);
      return () => clearTimeout(checkDelay);
    } else {
      setUsernameTaken(false);
      setUsernameSuggestions([]);
    }
  }, [username]);

  const handleLocationToggle = async () => {
    setLoading(true);
    setError('');
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied. Please enter manually.');
        setManualLocation(true);
        setLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      if (geocode && geocode.length > 0) {
        setCountry(geocode[0].country || 'Finland');
        setStateName(geocode[0].region || '');
        setCity(geocode[0].city || '');
        setStreet(geocode[0].street || '');
        setZipCode(geocode[0].postalCode || '');
      }
      setStep('signup_profile');
    } catch (e: any) {
      setError('Location detection failed. Please enter manually.');
      setManualLocation(true);
    }
    setLoading(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const handleTermsSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Update auth.users with the new password
      const { error: pwdError } = await supabase_lucifer_core.auth.updateUser({ password });
      // If the password was already saved during a previous attempt, Supabase will complain. 
      // We can safely ignore this specific error and proceed!
      if (pwdError && !pwdError.message.toLowerCase().includes('different from the old password')) {
        throw pwdError;
      }

      // 2. Update public.profiles with ONLY terms and verification data
      const { data: sessionData } = await supabase_lucifer_core.auth.getSession();
      const user = sessionData?.session?.user;
      
      if (user) {
        const profileData = {
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

        await handleLoginSuccess(user);

        // Crucial: Refresh session to trigger AuthContext to re-fetch terms_agreed = true
        // This makes the Global Auth Guard securely and automatically route us to the Dashboard!
        await supabase_lucifer_core.auth.refreshSession();
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
    // We strictly DO NOT manually navigate here. The Global Auth Guard (App Router) 
    // handles switching from GuestStack/RegistrationStack to AuthStack automatically!
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
          <Text style={styles.title}>Welcome to ATS Finland</Text>
          <Text style={styles.subtitle}>Enter your email or phone to sign in or register for a new account.</Text>
          
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

          <TouchableOpacity style={{ marginTop: 8 }} onPress={() => { setRecoveryContact(''); setStep('forgot_email_contact'); }}>
            <Text style={styles.linkText}>Forgot email?</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 32 }}>
            <Text style={styles.disclaimerText}>
              Not your computer? Use Guest mode to sign in privately.
            </Text>
          </View>

          <View style={[styles.actionRow, { justifyContent: 'flex-end' }]}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleContactSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
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
            <ActivityIndicator size="large" color="#0F2D4D" />
          </View>
          {loading && <ActivityIndicator color="#0F2D4D" />}
        </View>
      );
    }

    if (step === 'password') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Welcome back</Text>
          <TouchableOpacity style={styles.chipWrapper} onPress={handleGoBack}>
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
            <View style={{ flexDirection: 'column' }}>
              <TouchableOpacity onPress={handleGoBack} style={{ marginBottom: failedPasswordAttempts > 0 ? 16 : 0 }}>
                <Text style={styles.linkText}>Back</Text>
              </TouchableOpacity>
              {failedPasswordAttempts > 0 && (
                <TouchableOpacity onPress={initForgotPasswordFlow}>
                  <Text style={[styles.linkText, { color: '#DC2626' }]}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>
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
              
            />
          </View>

          {error ? (
            <View style={styles.inlineErrorRow}>
               <AlertCircle color="#DC2626" size={14} />
               <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <TouchableOpacity onPress={handleResendOtp} disabled={resendCountdown > 0 || loading}>
              <Text style={[styles.linkText, { fontSize: 14, color: resendCountdown > 0 ? '#9CA3AF' : '#007AFF' }]}>
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.actionRow, { marginTop: 40 }]}>
            <TouchableOpacity onPress={handleGoBack}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleOtpSubmit} disabled={loading || otp.length < 6}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Verify</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'signup_password') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Secure your account</Text>
          <Text style={styles.subtitle}>Create a strong password for your new account</Text>
          
          <View style={[styles.inputWrapper, { marginTop: 24 }]}>
            <Lock color="#6B7280" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Password" 
              placeholderTextColor="#9CA3AF" 
              secureTextEntry={!showPassword} 
              value={password} 
              onChangeText={handlePasswordChange} 
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
              textContentType="newPassword"
              importantForAutofill="no"
              // @ts-ignore
              autoFill="off"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
              {showPassword ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -8, marginBottom: 16, paddingLeft: 12 }}>
             <Text style={{ fontSize: 12, color: passwordStrength === 'Strong' ? '#059669' : passwordStrength === 'Medium' ? '#D97706' : '#DC2626' }}>
               Strength: {passwordStrength || 'Weak'}
             </Text>
          </View>

          <View style={styles.inputWrapper}>
            <Lock color="#6B7280" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Confirm Password" 
              placeholderTextColor="#9CA3AF" 
              secureTextEntry={!showPassword} 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
              autoComplete="off"
              autoCorrect={false}
              spellCheck={false}
              textContentType="newPassword"
              importantForAutofill="no"
              // @ts-ignore
              autoFill="off"
            />
          </View>

          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => {
              if (forceRegistrationCompletion) {
                logout();
              } else {
                setStep('signup_otp');
              }
            }}><Text style={styles.linkText}>{forceRegistrationCompletion ? 'Cancel' : 'Back'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => {
              if (passwordStrength === 'Weak' || password.length < 9) {
                setError('Password is too weak. Must be at least 9 characters.');
                return;
              }
              if (password !== confirmPassword) {
                setError('Passwords do not match.');
                return;
              }
              setError('');
              setStep('signup_terms');
            }}>
               <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const PROFILE_STEPS: AuthStep[] = ['signup_name', 'signup_dob', 'signup_gender', 'signup_location', 'signup_profile', 'signup_terms'];
    const profileStepIndex = PROFILE_STEPS.indexOf(step);

    const renderProfileLayout = (children: React.ReactNode, title: string, subtitle?: string, onNext?: () => void, onBack?: () => void, isNextDisabled?: boolean, showShield?: boolean, customNextText?: string) => {
      return (
        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', position: 'relative' }}>
            {profileStepIndex > 0 && onBack && (
              <TouchableOpacity onPress={onBack} style={{ position: 'absolute', left: 16, padding: 8 }}>
                <ArrowLeft color="#111827" size={24} />
              </TouchableOpacity>
            )}
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>Profile completion</Text>
            {isModal && onClose && (
              <TouchableOpacity onPress={onClose} style={{ position: 'absolute', right: 16, padding: 8 }}>
                <X color="#111827" size={24} />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress Bar */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 8 }}>
            {PROFILE_STEPS.map((_, idx) => (
              <View key={idx} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: idx <= profileStepIndex ? '#5452F6' : '#E5E7EB' }} />
            ))}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>{title}</Text>
            {subtitle && <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 }}>{subtitle}</Text>}
            
            {children}
          </ScrollView>

          <View style={{ padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
            {showShield && (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <Shield color="#6B7280" size={16} style={{ marginTop: 2, marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 }}>All information you provide is secure and will only be used to create your profile</Text>
              </View>
            )}
            <TouchableOpacity 
              style={{ backgroundColor: isNextDisabled || loading ? '#9CA3AF' : '#5452F6', borderRadius: 24, paddingVertical: 16, alignItems: 'center' }}
              onPress={onNext}
              disabled={isNextDisabled || loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>{customNextText || 'Next'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    if (step === 'signup_name') {
      return renderProfileLayout(
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>First name <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="e.g. Jane" placeholderTextColor="#9CA3AF" value={firstName} onChangeText={(t) => {setFirstName(t); setError('');}} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Middle name (optional)</Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="e.g. Marie" placeholderTextColor="#9CA3AF" value={middleName} onChangeText={setMiddleName} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Last name <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="e.g. Doe" placeholderTextColor="#9CA3AF" value={lastName} onChangeText={(t) => {setLastName(t); setError('');}} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Preferred name (optional)</Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="What should we call you?" placeholderTextColor="#9CA3AF" value={preferredName} onChangeText={setPreferredName} />
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
        </View>,
        "What is your name?",
        "Please provide us with your real name and surname as it is necessary for your contract creation.",
        () => {
          if (!firstName || !lastName) setError('First and Last name are required');
          else { setError(''); setStep('signup_dob'); }
        },
        undefined,
        false,
        true
      );
    }

    if (step === 'signup_dob') {
      return renderProfileLayout(
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Date of birth</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 16 }}>
              <Calendar color="#6B7280" size={20} style={{ marginRight: 12 }} />
              <TextInput style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: '#111827', letterSpacing: 2, outlineStyle: 'none' } as any} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" keyboardType="number-pad" maxLength={10} value={dob} onChangeText={handleDobChange} />
            </View>
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
        </View>,
        "When were you born?",
        "You must be at least 18 years old.",
        () => {
          if (dob.length < 10) setError('Please enter a valid date (YYYY-MM-DD)');
          else { setError(''); setStep('signup_gender'); }
        },
        () => setStep('signup_name'),
        false,
        false
      );
    }

    if (step === 'signup_gender') {
      return renderProfileLayout(
        <View style={{ gap: 16 }}>
          <TouchableOpacity onPress={() => setGender('Male')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: gender === 'Male' ? 'rgba(84, 82, 246, 0.1)' : '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: gender === 'Male' ? '#5452F6' : 'transparent' }}>
             <User color={gender === 'Male' ? '#5452F6' : '#6B7280'} size={24} />
             <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '500', color: gender === 'Male' ? '#5452F6' : '#374151' }}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setGender('Female')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: gender === 'Female' ? 'rgba(84, 82, 246, 0.1)' : '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: gender === 'Female' ? '#5452F6' : 'transparent' }}>
             <User color={gender === 'Female' ? '#5452F6' : '#6B7280'} size={24} />
             <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '500', color: gender === 'Female' ? '#5452F6' : '#374151' }}>Female</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setGender('Other')} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: gender === 'Other' ? 'rgba(84, 82, 246, 0.1)' : '#F3F4F6', borderRadius: 8, borderWidth: 1, borderColor: gender === 'Other' ? '#5452F6' : 'transparent' }}>
             <Sparkles color={gender === 'Other' ? '#5452F6' : '#6B7280'} size={24} />
             <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '500', color: gender === 'Other' ? '#5452F6' : '#374151' }}>Other</Text>
          </TouchableOpacity>

          {gender === 'Other' && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Specify gender (optional)</Text>
              <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="E.g. Non-binary" placeholderTextColor="#9CA3AF" value={customGender} onChangeText={setCustomGender} />
            </View>
          )}
        </View>,
        "Which gender best describes you?",
        "This helps us personalize your experience.",
        () => {
           if (!gender) setGender('Other'); // Default
           setStep('signup_location');
        },
        () => setStep('signup_dob'),
        false,
        false
      );
    }

    if (step === 'signup_location') {
      if (!manualLocation) {
        return renderProfileLayout(
          <View style={{ alignItems: 'center', marginVertical: 32 }}>
             <MapPin color="#5452F6" size={64} style={{ marginBottom: 24, opacity: 0.9 }} />
             <TouchableOpacity style={{ backgroundColor: '#F3F4F6', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24 }} onPress={() => setManualLocation(true)}>
                <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600' }}>Enter location manually instead</Text>
             </TouchableOpacity>
          </View>,
          "Enable your location",
          "You'll need to enable your location in order to find the best local features.",
          handleLocationToggle,
          () => setStep('signup_gender'),
          false,
          false,
          "Enable location"
        );
      }

      return renderProfileLayout(
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Country <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="E.g. Finland" placeholderTextColor="#9CA3AF" value={country} onChangeText={setCountry} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>State / Region</Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="E.g. Uusimaa" placeholderTextColor="#9CA3AF" value={stateName} onChangeText={setStateName} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>City <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="E.g. Helsinki" placeholderTextColor="#9CA3AF" value={city} onChangeText={setCity} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Street</Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="Street address" placeholderTextColor="#9CA3AF" value={street} onChangeText={setStreet} />
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Zip Code</Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="Postal code" placeholderTextColor="#9CA3AF" value={zipCode} onChangeText={setZipCode} />
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
        </View>,
        "Confirm your location",
        "Please provide your accurate location details.",
        () => {
           if (!country || !city) setError('Country and City are required');
           else { setError(''); setStep('signup_profile'); }
        },
        () => setManualLocation(false),
        false,
        false
      );
    }

    if (step === 'signup_profile') {
      return renderProfileLayout(
        <View style={{ gap: 24 }}>
          <View style={{ alignItems: 'center' }}>
             <TouchableOpacity style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' }} onPress={pickImage}>
               {avatarUrl ? (
                 <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <View style={{ alignItems: 'center' }}>
                   <Camera color="#9CA3AF" size={32} />
                   <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 8 }}>Upload photo</Text>
                 </View>
               )}
             </TouchableOpacity>
          </View>

          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Username <Text style={{ color: '#DC2626' }}>*</Text></Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 16 }}>
              <AtSign color="#6B7280" size={16} style={{ marginRight: 8 }} />
              <TextInput style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any} placeholder="Choose a unique username" placeholderTextColor="#9CA3AF" value={username} onChangeText={(t) => {setUsername(t); setError('');}} autoCapitalize="none" />
              {isCheckingUsername ? <ActivityIndicator size="small" color="#5452F6" /> : (username.length > 2 && !usernameTaken ? <CheckCircle color="#10B981" size={20} /> : null)}
            </View>
          </View>

          {usernameTaken && (
            <View style={{ backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8 }}>
               <Text style={{ color: '#DC2626', fontSize: 12, marginBottom: 8, fontWeight: '600' }}>Username is taken. Try these:</Text>
               <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                 {usernameSuggestions.map(sug => (
                    <TouchableOpacity key={sug} style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#FCA5A5' }} onPress={() => setUsername(sug)}>
                      <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '500' }}>{sug}</Text>
                    </TouchableOpacity>
                 ))}
               </View>
            </View>
          )}

          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>About you</Text>
            <TextInput style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, color: '#111827', height: 120, outlineStyle: 'none' } as any} placeholder="Tell us a little bit about yourself..." placeholderTextColor="#9CA3AF" multiline value={bio} onChangeText={setBio} maxLength={500} />
            <Text style={{ alignSelf: 'flex-end', fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>{bio.length}/500</Text>
          </View>

          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
        </View>,
        "Upload Profile",
        "Personalize your profile with a photo and a brief bio.",
        handleFinalizeProfile,
        () => setStep('signup_location'),
        isCheckingUsername || loading,
        false
      );
    }

    if (step === 'signup_terms') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Review & Agree</Text>
          <Text style={styles.subtitle}>Please review the terms and policies before finalizing your account.</Text>

          <View style={{ gap: 24, marginTop: 16 }}>
            <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>
                ATS will send you promotions such as deals and marketing notifications. You can opt out anytime via account settings or within marketing emails.
              </Text>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 }} onPress={() => setPromotionsOptOut(!promotionsOptOut)}>
                 <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: promotionsOptOut ? 0 : 2, borderColor: '#D1D5DB', backgroundColor: promotionsOptOut ? '#006085' : 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 }}>
                   {promotionsOptOut && <CheckCircle color="#FFF" size={16} />}
                 </View>
                 <Text style={{ flex: 1, color: '#374151', fontSize: 14, fontWeight: '500' }}>I don’t want to receive ATS promotions.</Text>
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12 }}>
              <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>
                By selecting "Agree and continue", I agree to ATS Terms of Service, Payments Terms of Service, and Nondiscrimination Policy, and acknowledge the Privacy Policy.
              </Text>
            </View>
          </View>

          {error ? (
            <View style={[styles.inlineErrorRow, { marginTop: 16 }]}>
               <AlertCircle color="#DC2626" size={14} />
               <Text style={styles.inlineErrorText}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.actionRow, { marginTop: 32 }]}>
            <TouchableOpacity onPress={() => setStep('signup_password')}>
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTermsSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Agree and continue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // --- RECOVERY UI STEPS ---
    if (step === 'forgot_email_contact') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Find your email</Text>
          <Text style={styles.subtitle}>Enter your phone number or recovery email</Text>
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <TextInput style={styles.input} placeholder="Phone or Email" value={recoveryContact} onChangeText={(t) => {setRecoveryContact(t); setError('');}} autoCapitalize="none"  />
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleGoBack}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleForgotEmailSendOTP} disabled={loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Next</Text>}</TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'forgot_email_otp') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Verify it's you</Text>
          <Text style={styles.subtitle}>An 8-digit secure code was sent to {recoveryContact}</Text>
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <TextInput style={[styles.input, { letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: 'bold' }]} placeholder="00000000" keyboardType="number-pad" maxLength={8} value={recoveryOTP} onChangeText={(t) => {setRecoveryOTP(t); setError(''); if(t.length === 8) handleForgotEmailVerifyOTP();}}  />
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => setStep('forgot_email_contact')}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleForgotEmailVerifyOTP} disabled={loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Verify</Text>}</TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'forgot_email_result') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Account Found</Text>
          <Text style={styles.subtitle}>Your primary login email is:</Text>
          <View style={[styles.inputWrapper, { justifyContent: 'center', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E3A8A' }}>{contact}</Text>
          </View>
          <View style={[styles.actionRow, { justifyContent: 'center' }]}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('password')}><Text style={styles.primaryButtonText}>Log In</Text></TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'forgot_password_contact') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Account Recovery</Text>
          <Text style={styles.subtitle}>Enter your email or phone number to receive a recovery code</Text>
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <TextInput style={styles.input} placeholder="Email or Phone" value={recoveryContact} onChangeText={(t) => {setRecoveryContact(t); setError('');}} autoCapitalize="none"  />
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => setStep('password')}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleForgotPasswordSendOTP} disabled={loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Next</Text>}</TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'forgot_password_otp') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Verification</Text>
          <Text style={styles.subtitle}>An 8-digit code was sent to {recoveryContact}</Text>
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <TextInput style={[styles.input, { letterSpacing: 8, textAlign: 'center', fontSize: 24, fontWeight: 'bold' }]} placeholder="00000000" keyboardType="number-pad" maxLength={8} value={recoveryOTP} onChangeText={(t) => {setRecoveryOTP(t); setError(''); if(t.length === 8) handleForgotPasswordVerifyOTP();}}  />
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => setStep('forgot_password_contact')}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleForgotPasswordVerifyOTP} disabled={loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Verify</Text>}</TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'forgot_password_new') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Create a strong, new password</Text>
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <Lock color="#4B5563" size={20} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="New Password" placeholderTextColor="#9CA3AF" secureTextEntry={!showPassword} value={newPassword} onChangeText={(t) => {setNewPassword(t); setPasswordStrength(checkPasswordStrength(t)); setError('');}}  />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>{showPassword ? <EyeOff color="#4B5563" size={20} /> : <Eye color="#4B5563" size={20} />}</TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -8, marginBottom: 16, paddingLeft: 12 }}>
             <Text style={{ fontSize: 12, color: passwordStrength === 'Strong' ? '#059669' : passwordStrength === 'Medium' ? '#D97706' : '#DC2626' }}>Strength: {passwordStrength || 'Weak'}</Text>
          </View>
          <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
            <Lock color="#4B5563" size={20} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#9CA3AF" secureTextEntry={!showPassword} value={confirmNewPassword} onChangeText={(t) => {setConfirmNewPassword(t); setError('');}} />
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
          <View style={styles.actionRow}>
             <TouchableOpacity onPress={() => setStep('forgot_password_contact')}><Text style={styles.linkText}>Cancel</Text></TouchableOpacity>
             <TouchableOpacity style={styles.primaryButton} onPress={() => { if(newPassword === confirmNewPassword && passwordStrength !== 'Weak') setStep('forgot_password_signout'); else setError('Passwords must match and be strong.'); }}><Text style={styles.primaryButtonText}>Next</Text></TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === 'forgot_password_signout') {
      return (
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Security Check</Text>
          <Text style={styles.subtitle}>Mandatory security measure: Sign out from all other devices globally.</Text>
          <View style={{ backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#FCA5A5' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
               <AlertCircle color="#DC2626" size={20} />
               <Text style={{ marginLeft: 8, fontWeight: 'bold', color: '#991B1B' }}>Active Sessions Revocation</Text>
             </View>
             <Text style={{ color: '#991B1B', lineHeight: 20 }}>
               By continuing, you will be instantly logged out from all mobile apps, web browsers, and other devices worldwide. You will need to log back in with your new password.
             </Text>
          </View>
          {error ? <View style={styles.inlineErrorRow}><AlertCircle color="#DC2626" size={14} /><Text style={styles.inlineErrorText}>{error}</Text></View> : null}
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.primaryButton} onPress={handleForgotPasswordReset} disabled={loading}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Confirm & Reset</Text>}</TouchableOpacity>
          </View>
        </View>
      );
    }

    return null;
  };

  const content = renderContent();

  const handleVerificationCompleteRef = useRef(handleVerificationComplete);
  useEffect(() => {
    handleVerificationCompleteRef.current = handleVerificationComplete;
  }, [handleVerificationComplete]);

  const stableOnSuccess = useCallback((token: string) => {
    handleVerificationCompleteRef.current(token);
  }, []);

  const renderTurnstile = () => {
    if (Platform.OS === 'web' && Turnstile && turnstileReady) {
      const isVisible = step === 'verify';
      return (
        <View style={isVisible ? { alignItems: 'center', marginVertical: 32 } : { position: 'absolute', top: -9999, left: -9999, opacity: 0 }}>
          <Turnstile 
            siteKey={process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'} 
            onSuccess={stableOnSuccess}
          />
        </View>
      );
    }
    return null;
  };

  const KeyboardWrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;

  if (isModal) {
    return (
      <KeyboardWrapper behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%' }}>
         <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, width: '100%', maxWidth: 448, alignSelf: 'center', justifyContent: 'center' }}>
           <View key={step} style={{ flexShrink: 1, width: '100%' }}>{content}</View>
           {renderTurnstile()}
         </View>
      </KeyboardWrapper>
    );
  }

  return (
    <KeyboardWrapper behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%' }}>
      {Platform.OS === 'web' ? (
        <View style={styles.container}>
          <View style={styles.innerContainer}>
            <View style={styles.card}>
              <View key={step}>{content}</View>
              {renderTurnstile()}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.innerContainer}>
            <View style={styles.card}>
              <View key={step}>{content}</View>
            </View>
          </View>
        </View>
      )}
    </KeyboardWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F0FE', width: '100%' },
  innerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%', maxWidth: 448, maxHeight: '100%', flexShrink: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, shadowColor: '#0A66C2', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 32, elevation: 4, display: 'flex', flexDirection: 'column' },
  stepContainer: { width: '100%', flexShrink: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' },
  helperText: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, paddingHorizontal: 16, height: 56, marginBottom: 16, backgroundColor: '#F9FAFB' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2', borderWidth: 1.5 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', outlineStyle: 'none' } as any,
  inlineErrorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 8 },
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
  checkboxChecked: { backgroundColor: '#0F2D4D', borderColor: '#0F2D4D' },
  genderCard: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingVertical: 24, marginHorizontal: 4, backgroundColor: '#FFFFFF' },
  genderCardSelected: { borderColor: '#0A66C2', backgroundColor: '#F0F9FF' },
  genderText: { marginTop: 8, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  genderTextSelected: { color: '#0A66C2', fontWeight: '600' },
  avatarUploadBlock: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  suggestionChip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E0F2FE', borderRadius: 16, marginRight: 8, marginBottom: 8 }
});