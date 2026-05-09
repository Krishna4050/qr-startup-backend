import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Mail, Lock, AtSign, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { supabase_lucifer_core } from '../src/utils/supabase';
import { authStyles as styles } from '../styles/authStyles';
import { registerForPushNotificationsAsync } from '../src/utils/notifications';



export default function AuthForm() {
  const navigation = useNavigation<any>();
  const [isLogin, setIsLogin] = useState(true);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // --- NEW: INLINE ERROR STATE & SUGGESTIONS ---
  const [errors, setErrors] = useState({ username: '', email: '', password: '', confirm: '', auth: '' });
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  // --- STRICT VALIDATION ENGINES ---
  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  
  const validatePassword = (val: string) => {
    if (val.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(val)) return "Must contain at least 1 uppercase letter.";
    if (!/\d/.test(val)) return "Must contain at least 1 number.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(val)) return "Must contain at least 1 special character.";
    return null; // Passes all checks!
  };

  // MNSKB Smart Suggestion Generator
  const generateSuggestions = (base: string) => {
    const clean = base.toLowerCase().replace(/[^a-z0-9]/g, '');
    return [`${clean}123`, `${clean}_official`, `the_${clean}`];
  };

  const lucifer_signIn = async () => {
    Keyboard.dismiss();
    setErrors({ username: '', email: '', password: '', confirm: '', auth: '' }); // Clear old errors

    // Basic Sign In validation
    let hasError = false;
    let newErrors = { ...errors };
    if (!email) { newErrors.email = "Email is required."; hasError = true; }
    if (!password) { newErrors.password = "Password is required."; hasError = true; }
    if (hasError) return setErrors(newErrors);

    setLoading(true);
    const { error, data } = await supabase_lucifer_core.auth.signInWithPassword({ email, password });
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        await supabase_lucifer_core.auth.resend({ type: 'signup', email: email });
        navigation.replace('OtpVerification', { email: email });
      } else {
        // Show Supabase error directly under the form
        setErrors(prev => ({ ...prev, auth: error.message }));
      }
    } else {
      // --- PUSH NOTIFICATION & SECURITY LOGIC ---
      if (data?.user) {
        try {
          console.log("Fetching Push Token...");
          const token = await registerForPushNotificationsAsync();
          
          if (token) {
            //  Save token to Supabase
            await supabase_lucifer_core
              .from('profiles')
              .update({ expo_push_token: token })
              .eq('id', data.user.id);
            
            // Ping Go Server for the Security Geofence Check!
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL; 
            
            // We do not 'await' this fetch because we want it to run in the 
            // background without slowing down the user's login experience!
            fetch(`${backendUrl}/api/security/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: data.user.id,
                push_token: token,
                device: Platform.OS === 'ios' ? 'iPhone' : 'Android',
                
              })
            }).catch(err => console.log("Security ping silently failed:", err));
          }
        } catch (pushError) {
          console.error("Failed to get push token:", pushError);
        }
      }
      
      // ---  END OF NEW PUSH LOGIC  ---

      // Finally, send them to the Dashboard!
      navigation.replace('Dashboard'); 
    }
    setLoading(false);
  };

  const sani_signUp = async () => {
    Keyboard.dismiss();
    setUsernameSuggestions([]);
    
    let newErrors = { username: '', email: '', password: '', confirm: '', auth: '' };
    let hasError = false;

    if (!username || username.length < 3) {
      newErrors.username = "Username must be at least 3 characters.";
      hasError = true;
    }
    if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
      hasError = true;
    }
    
    const passCheck = validatePassword(password);
    if (passCheck) {
      newErrors.password = passCheck;
      hasError = true;
    }

    if (password !== confirmPassword) {
      newErrors.confirm = "Passwords do not match.";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    // --- REAL DATABASE USERNAME CHECK ---
    const { data: isAvailable, error: rpcError } = await supabase_lucifer_core.rpc('check_username_available', {
      requested_username: username.toLowerCase() // Always check lowercase for consistency
    });

    if (!isAvailable) {
      setErrors(prev => ({ ...prev, username: "This username is already taken." }));
      setUsernameSuggestions(generateSuggestions(username));
      setLoading(false);
      return;
    }
    // ------------------------------------

    // If available, proceed with standard signup
    const { error } = await supabase_lucifer_core.auth.signUp({
      email, 
      password, 
      options: { 
        data: { username: username.toLowerCase() } // Save lowercase to the hidden metadata
      }
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setErrors(prev => ({ ...prev, email: "This email is already registered." }));
      } else {
        setErrors(prev => ({ ...prev, auth: error.message }));
      }
    } else {
      navigation.replace('OtpVerification', { email: email }); 
    }
    setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%' }}>
        
        {/* --- THE PREMIUM BACKGROUND GRADIENT --- */}
        <LinearGradient 
          colors={['#F2F3F4', '#174871']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>{isLogin ? 'Welcome back' : 'Create an account'}</Text>

              {/* TOP LEVEL AUTH ERROR */}
              {errors.auth ? (
                <View style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DC2626' }}>
                  <AlertCircle color="#DC2626" size={16} style={{ marginRight: 8 }} />
                  <Text style={{ color: '#DC2626', fontSize: 14, flex: 1 }}>{errors.auth}</Text>
                </View>
              ) : null}

              {/* USERNAME */}
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Choose Username</Text>
                  <View style={[styles.inputWrapper, errors.username ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                    <AtSign color="#A77693" size={20} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="johndoe123" placeholderTextColor="#A77693" autoCapitalize="none" value={username} onChangeText={setUsername} />
                  </View>
                  {errors.username ? <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{errors.username}</Text> : null}
                  
                  {/* SUGGESTIONS ENGINE */}
                  {usernameSuggestions.length > 0 && (
                    <View style={{ flexDirection: 'row', marginTop: 8, gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 12, color: '#174871', width: '100%' }}>Suggestions:</Text>
                      {usernameSuggestions.map((sug, index) => (
                        <TouchableOpacity key={index} onPress={() => { setUsername(sug); setUsernameSuggestions([]); setErrors({...errors, username: ''}); }} style={{ backgroundColor: '#174871', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: '#F2F3F4', fontWeight: 'bold' }}>{sug}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* EMAIL */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[styles.inputWrapper, errors.email ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                  <Mail color="#A77693" size={20} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="you@example.com" placeholderTextColor="#A77693" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                </View>
                {errors.email ? <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{errors.email}</Text> : null}
              </View>

              {/* PASSWORD */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputWrapper, errors.password ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                  <Lock color="#A77693" size={20} style={styles.inputIcon} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="••••••••" placeholderTextColor="#A77693" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                    {showPassword ? <EyeOff color="#A77693" size={20} /> : <Eye color="#A77693" size={20} />}
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{errors.password}</Text> : null}
              </View>

              {/* CONFIRM PASSWORD */}
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={[styles.inputWrapper, errors.confirm ? { borderColor: '#DC2626', borderWidth: 1 } : null]}>
                    <Lock color="#A77693" size={20} style={styles.inputIcon} />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="••••••••" placeholderTextColor="#A77693" secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword} />
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 8 }}>
                      {showConfirmPassword ? <EyeOff color="#A77693" size={20} /> : <Eye color="#A77693" size={20} />}
                    </TouchableOpacity>
                  </View>
                  {errors.confirm ? <Text style={{ color: '#DC2626', fontSize: 12, marginTop: 4 }}>{errors.confirm}</Text> : null}
                </View>
              )}

              <TouchableOpacity style={styles.mainButton} onPress={isLogin ? lucifer_signIn : sani_signUp} disabled={loading}>
                {loading ? <ActivityIndicator color="#F2F3F4" /> : <Text style={styles.mainButtonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>{isLogin ? "Don't have an account? " : "Already have an account? "}</Text>
                <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setErrors({ username: '', email: '', password: '', confirm: '', auth: '' }); }}>
                  <Text style={styles.toggleText}>{isLogin ? 'Create Account' : 'Login'}</Text>
                </TouchableOpacity>
              </View>
              
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}