import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export default function PartnerOnboardingStep1Screen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const [shopName, setShopName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [usePrimaryPhone, setUsePrimaryPhone] = useState(true);
  const [usePrimaryEmail, setUsePrimaryEmail] = useState(true);

  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setPrimaryEmail(user.email || '');
        const { data: profile } = await supabase_lucifer_core.from('profiles').select('phone').eq('id', user.id).single();
        if (profile?.phone) {
          setPrimaryPhone(profile.phone);
        } else {
          setUsePrimaryPhone(false);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleNext = async () => {
    // UPDATED VALIDATION: Email is no longer required here
    const finalPhone = usePrimaryPhone ? primaryPhone : phone;
    const finalEmail = usePrimaryEmail ? primaryEmail : email;

    if (!shopName || !street || !city || !finalPhone) {
      Alert.alert("Missing Info", "Please fill out all required fields so customers can find you.");
      return;
    }

    setLoading(true);
    try {
      if (!user) throw new Error("You must be logged in to create a listing.");

      // THE FALLBACK LOGIC: If they leave it blank, use their account email
      const finalContactEmail = finalEmail.trim() !== '' ? finalEmail : user.email;
       
      console.log("Ready to push to Supabase:", { shopName, street, city, phone: finalPhone, finalContactEmail });
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      
      navigation.navigate('PartnerOnboardingStep2', {
        // We pass the data forward so we can save it all at the end!
        shopData: { shopName, street, city, phone: finalPhone, finalContactEmail }
      });
      
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (inputName: string) => [
    styles.input,
    focusedInput === inputName && styles.inputFocused
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#0A192F" size={24} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.mainTitle}>Tell us about your shop</Text>
          <Text style={styles.subtitle}>Customers will use this information to find and contact your service point.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Shop Name *</Text>
            <TextInput style={getInputStyle('shopName')} placeholder="e.g. Helsinki Auto & Towing" placeholderTextColor="#A1A1AA" value={shopName} onChangeText={setShopName} onFocus={() => setFocusedInput('shopName')} onBlur={() => setFocusedInput(null)} />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 2, marginRight: 12 }]}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput style={getInputStyle('street')} placeholder="Mannerheimintie 10" placeholderTextColor="#A1A1AA" value={street} onChangeText={setStreet} onFocus={() => setFocusedInput('street')} onBlur={() => setFocusedInput(null)} />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput style={getInputStyle('city')} placeholder="Helsinki" placeholderTextColor="#A1A1AA" value={city} onChangeText={setCity} onFocus={() => setFocusedInput('city')} onBlur={() => setFocusedInput(null)} />
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={styles.label}>Contact Phone *</Text>
                {primaryPhone ? <Text style={styles.helperText}>Use {primaryPhone} or add a new one.</Text> : null}
              </View>
              {primaryPhone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ marginRight: 8, fontSize: 13, color: '#0A192F', fontWeight: 'bold' }}>Use Primary</Text>
                  <Switch value={usePrimaryPhone} onValueChange={setUsePrimaryPhone} trackColor={{ false: '#E2E8F0', true: '#0A192F' }} />
                </View>
              ) : null}
            </View>
            
            {!usePrimaryPhone && (
              <TextInput style={getInputStyle('phone')} placeholder="+358 40 123 4567" placeholderTextColor="#A1A1AA" keyboardType="phone-pad" value={phone} onChangeText={setPhone} onFocus={() => setFocusedInput('phone')} onBlur={() => setFocusedInput(null)} />
            )}
          </View>

          <View style={styles.formGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={styles.label}>Official Contact Email <Text style={styles.optionalText}>(Optional)</Text></Text>
                {primaryEmail ? <Text style={styles.helperText}>Use {primaryEmail} or add a new one.</Text> : <Text style={styles.helperText}>Leave blank to use your current account email.</Text>}
              </View>
              {primaryEmail ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ marginRight: 8, fontSize: 13, color: '#0A192F', fontWeight: 'bold' }}>Use Primary</Text>
                  <Switch value={usePrimaryEmail} onValueChange={setUsePrimaryEmail} trackColor={{ false: '#E2E8F0', true: '#0A192F' }} />
                </View>
              ) : null}
            </View>

            {!usePrimaryEmail && (
              <TextInput style={getInputStyle('email')} placeholder="contact@helsinkiauto.fi" placeholderTextColor="#A1A1AA" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} onFocus={() => setFocusedInput('email')} onBlur={() => setFocusedInput(null)} />
            )}
          </View>

        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.progressBarBg}><View style={styles.progressBarFill} /></View>
          <View style={styles.bottomBarContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryButton, (!shopName || !street || !city || (!usePrimaryPhone && !phone) || (usePrimaryPhone && !primaryPhone)) && styles.primaryButtonDisabled]}
              activeOpacity={0.9}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Next</Text>}
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 10, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },
  mainTitle: { fontSize: 32, fontWeight: '800', color: '#0A192F', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#717171', lineHeight: 22, marginBottom: 32 },
  formGroup: { marginBottom: 20 },
  row: { flexDirection: 'row' },
  label: { fontSize: 14, fontWeight: '700', color: '#0A192F', marginBottom: 4, letterSpacing: 0.3 },
  optionalText: { color: '#8892B0', fontWeight: '500' },
  helperText: { fontSize: 13, color: '#8892B0', marginBottom: 8 },
  input: { backgroundColor: '#FAFAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, height: 56, fontSize: 16, color: '#0A192F' },
  inputFocused: { borderColor: '#0A192F', backgroundColor: '#FFFFFF', borderWidth: 1.5 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  progressBarBg: { height: 4, backgroundColor: '#F3F4F6', width: '100%' },
  progressBarFill: { height: 4, backgroundColor: '#0A192F', width: '33%' },
  bottomBarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 24 },
  backText: { fontSize: 16, fontWeight: '600', color: '#0A192F', textDecorationLine: 'underline' },
  primaryButton: { backgroundColor: '#0A192F', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#D1D5DB' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});