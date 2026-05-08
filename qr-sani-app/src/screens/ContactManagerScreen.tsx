import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Phone, ShieldCheck, Plus, Trash2, Smartphone, KeyRound } from 'lucide-react-native';

export default function ContactManagerScreen() {
  const navigation = useNavigation<any>();

  // --- OTP Flow States ---
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [otpStep, setOtpStep] = useState<'idle' | 'sending' | 'awaiting_code' | 'verifying'>('idle');
  const [otpCode, setOtpCode] = useState('');

  // --- Emergency Contacts State ---
  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: '1', name: 'Mom', phone: '+1 555-0198' }
  ]);

  // --- Simulated OTP Logic ---
  const handleSendOTP = () => {
    if (phoneNumber.length < 10) {
      Alert.alert("Invalid Number", "Please enter a valid phone number.");
      return;
    }
    setOtpStep('sending');
    // Simulate API delay
    setTimeout(() => {
      setOtpStep('awaiting_code');
      Alert.alert("Test Mode", "Since SMS isn't hooked up yet, type '1234' as your code.");
    }, 1500);
  };

  const handleVerifyOTP = () => {
    if (otpCode !== '1234') {
      Alert.alert("Invalid Code", "Please enter 1234 for testing.");
      return;
    }
    setOtpStep('verifying');
    setTimeout(() => {
      setOtpStep('idle');
      setIsVerified(true);
      Alert.alert("Success", "Your phone number is now verified and secure!");
    }, 1000);
  };

  const removeContact = (id: string) => {
    Alert.alert("Remove Contact", "Are you sure you want to remove this emergency contact?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setEmergencyContacts(prev => prev.filter(c => c.id !== id)) }
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Details</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* --- SECTION 1: MY PHONE NUMBER (OTP Flow) --- */}
        <Text style={styles.sectionHeading}>My Verified Number</Text>
        <Text style={styles.sectionSub}>This number is used to verify your identity and alert you if a tag is scanned.</Text>

        {isVerified ? (
          <View style={styles.verifiedCard}>
            <View style={styles.verifiedLeft}>
              <ShieldCheck color="#10B981" size={24} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.verifiedTitle}>Secure & Verified</Text>
                <Text style={styles.verifiedNumber}>{phoneNumber}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsVerified(false)}><Text style={styles.changeText}>Change</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            {otpStep === 'idle' && (
              <>
                <View style={styles.inputContainer}>
                  <Smartphone color="#9CA3AF" size={20} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter mobile number" 
                    keyboardType="phone-pad" 
                    value={phoneNumber} 
                    onChangeText={setPhoneNumber} 
                  />
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSendOTP}>
                  <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                </TouchableOpacity>
              </>
            )}

            {otpStep === 'sending' && (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#0F2D4D" />
                <Text style={styles.loadingText}>Sending secure code...</Text>
              </View>
            )}

            {(otpStep === 'awaiting_code' || otpStep === 'verifying') && (
              <>
                <Text style={styles.otpInstructions}>Enter the 4-digit code sent to {phoneNumber}</Text>
                <View style={[styles.inputContainer, { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]}>
                  <KeyRound color="#3B82F6" size={20} style={styles.inputIcon} />
                  <TextInput 
                    style={[styles.input, { fontSize: 20, letterSpacing: 8, fontWeight: 'bold', color: '#1E3A8A' }]} 
                    placeholder="••••" 
                    keyboardType="number-pad" 
                    maxLength={4}
                    value={otpCode} 
                    onChangeText={setOtpCode} 
                  />
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOTP} disabled={otpStep === 'verifying'}>
                  {otpStep === 'verifying' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Verify Code</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOtpStep('idle')} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={styles.changeText}>Wrong number? Go back.</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* --- SECTION 2: EMERGENCY CONTACTS --- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Emergency Contacts</Text>
          <Text style={styles.counterText}>{emergencyContacts.length}/5</Text>
        </View>
        <Text style={styles.sectionSub}>If a finder scans your tag, they can tap to call these numbers if they can't reach you.</Text>

        <View style={styles.card}>
          {emergencyContacts.map((contact, index) => (
            <View key={contact.id} style={[styles.contactRow, index !== emergencyContacts.length - 1 && styles.borderBottom]}>
              <View style={styles.contactLeft}>
                <View style={styles.avatarIcon}><Phone color="#4B5563" size={18} /></View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removeContact(contact.id)}>
                <Trash2 color="#EF4444" size={18} />
              </TouchableOpacity>
            </View>
          ))}

          {emergencyContacts.length < 5 && (
            <TouchableOpacity 
              style={styles.addBtn} 
              onPress={() => Alert.alert("Add Contact", "Form to add a new contact will open here.")}
            >
              <Plus color="#3B82F6" size={20} />
              <Text style={styles.addBtnText}>Add Emergency Contact</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  
  sectionHeading: { fontSize: 16, fontWeight: 'bold', color: '#0F2D4D', marginTop: 8 },
  sectionSub: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24 },
  counterText: { fontSize: 14, fontWeight: 'bold', color: '#6B7280', marginBottom: 2 },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 56, paddingHorizontal: 16, marginBottom: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  
  primaryBtn: { backgroundColor: '#0F2D4D', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  loadingState: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#4B5563', fontWeight: '500' },
  
  otpInstructions: { textAlign: 'center', color: '#4B5563', marginBottom: 16, fontWeight: '500' },

  verifiedCard: { backgroundColor: '#ECFDF5', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verifiedLeft: { flexDirection: 'row', alignItems: 'center' },
  verifiedTitle: { fontSize: 14, fontWeight: 'bold', color: '#065F46' },
  verifiedNumber: { fontSize: 18, fontWeight: '900', color: '#047857', marginTop: 2 },
  changeText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 14 },

  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  contactLeft: { flexDirection: 'row', alignItems: 'center' },
  avatarIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  contactPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', height: 52, borderRadius: 12, marginTop: 16 },
  addBtnText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 15, marginLeft: 8 }
});