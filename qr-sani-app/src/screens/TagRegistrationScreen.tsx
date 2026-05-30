import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ShieldCheck, Tag, KeyRound, ArrowLeft, Info } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export default function TagRegistrationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tagCode = route.params?.tagCode || ''; 

  const [itemName, setItemName] = useState('');
  const [activationPin, setActivationPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleRegisterTag = async () => {
    if (!itemName.trim()) {
      Alert.alert("Missing Name", "Please enter what this tag will be attached to.");
      return;
    }
    if (!activationPin.trim() || activationPin.length < 4) {
      Alert.alert("Missing PIN", "Please enter the Secret PIN.");
      return;
    }

    setLoading(true);

    try {
      if (!user) throw new Error("You must be logged in.");

      const { data: vaultTag, error: vaultError } = await supabase_lucifer_core
        .from('valid_qrs')
        .select('*')
        .eq('public_url_code', tagCode)
        .eq('activation_pin', activationPin.trim())
        .maybeSingle();

      if (vaultError) throw vaultError;

      if (!vaultTag) {
        Alert.alert("Authentication Failed", "The PIN does not match this tag. Please try again.");
        setLoading(false);
        return;
      }

      if (vaultTag.is_claimed) {
        Alert.alert("Already Claimed", "This tag has already been registered.");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase_lucifer_core.from('qr_tags').insert({
        owner_id: user.id,
        tag_code: tagCode,
        item_name: itemName.trim(),
        status: 'active'
      });

      if (insertError) throw insertError;

      const { error: lockError } = await supabase_lucifer_core.from('valid_qrs').update({ 
        is_claimed: true,
        claimed_by: user.id 
      }).eq('id', vaultTag.id);

      if (lockError) throw lockError;

      Alert.alert("Success!", "Your item is now securely protected.");
      navigation.navigate('Home'); 
      
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activate Tag</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <ShieldCheck color="#10B981" size={32} />
          <Text style={styles.bannerTitle}>Official Tag Detected</Text>
          <Text style={styles.bannerSub}>Ready to register</Text>
        </View>

        <Text style={styles.sectionDetail}>
          To complete setup and prove ownership, please enter the Secret PIN that came with this specific tag.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hardware Secret PIN</Text>
          <View style={[styles.inputContainer, { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]}>
            <KeyRound color="#3B82F6" size={20} style={styles.inputIcon} />
            <TextInput 
              style={[styles.input, { color: '#1E3A8A', fontWeight: 'bold', textTransform: 'uppercase' }]} 
              placeholder="e.g., A8X9P2MN" 
              placeholderTextColor="#93C5FD"
              autoCapitalize="characters"
              autoCorrect={false}
              value={activationPin} 
              onChangeText={setActivationPin} 
              maxLength={8}
            />
          </View>
          <View style={styles.infoRow}>
            <Info color="#6B7280" size={14} />
            <Text style={styles.infoText}>Find this 8-character code printed under the scratch-off area or inside the retail box.</Text>
          </View>
        </View>

        <View style={[styles.inputGroup, { marginTop: 12 }]}>
          <Text style={styles.label}>What are you attaching this to?</Text>
          <View style={styles.inputContainer}>
            <Tag color="#9CA3AF" size={20} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="e.g., House Keys" value={itemName} onChangeText={setItemName} />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, (!itemName.trim() || !activationPin.trim()) && styles.submitButtonDisabled]} 
          onPress={handleRegisterTag}
          disabled={loading || !itemName.trim() || !activationPin.trim()}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitButtonText}>Secure This Item</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  banner: { backgroundColor: '#F0FDF4', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#BBF7D0' },
  bannerTitle: { fontSize: 20, fontWeight: 'bold', color: '#065F46', marginTop: 12 },
  bannerSub: { fontSize: 14, color: '#047857', marginTop: 4 },
  sectionDetail: { fontSize: 15, color: '#4B5563', marginBottom: 32, lineHeight: 22, textAlign: 'center' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 56, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, paddingRight: 16 },
  infoText: { fontSize: 12, color: '#6B7280', marginLeft: 6, lineHeight: 16 },
  submitButton: { backgroundColor: '#0F2D4D', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  submitButtonDisabled: { backgroundColor: '#9CA3AF' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});