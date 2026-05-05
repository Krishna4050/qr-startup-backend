import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator, Alert } from 'react-native';
import { Tag, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase_lucifer_core } from '../utils/supabase';

export default function TagRegistrationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // Grab the raw QR data we passed from the scanner
  const tagCode = route.params?.tagCode || ''; 

  const [itemName, setItemName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterTag = async () => {
    Keyboard.dismiss();
    if (!itemName.trim()) {
      Alert.alert("Missing Name", "Please enter what this tag is attached to.");
      return;
    }

    setLoading(true);

    try {
      // Get the current logged-in user
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "You must be logged in to register a tag.");
        setLoading(false);
        return;
      }

      // Insert the new tag into the database
      const { error } = await supabase_lucifer_core
        .from('qr_tags')
        .insert({
          owner_id: user.id,
          tag_code: tagCode,
          item_name: itemName.trim(),
          status: 'active'
        });

      if (error) {
        // Handle the specific error if a tag is already claimed (Unique Constraint Violation)
        if (error.code === '23505') {
          Alert.alert("Already Registered", "This QR tag has already been claimed by someone!");
        } else {
          Alert.alert("Registration Failed", error.message);
        }
      } else {
        // Success! Send them back to the Dashboard so they can see their new tag.
        Alert.alert("Success!", "Your tag is now protected and active.");
        navigation.navigate('Home'); 
      }
    } catch (err) {
      console.error(err);
      Alert.alert("System Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft color="#0F2D4D" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register New Tag</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Tag color="#10B981" size={48} />
          </View>
          
          <Text style={styles.title}>What are we tracking?</Text>
          <Text style={styles.subtitle}>
            Give this tag a name so you know exactly what item it is attached to.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. House Keys, Work Laptop, Gym Bag"
              placeholderTextColor="#9CA3AF"
              value={itemName}
              onChangeText={setItemName}
              autoFocus={true}
              returnKeyType="done"
              onSubmitEditing={handleRegisterTag}
            />
          </View>

          <View style={styles.tagPreviewBox}>
            <Text style={styles.tagPreviewLabel}>Scanned Tag ID:</Text>
            <Text style={styles.tagPreviewCode} numberOfLines={1} ellipsizeMode="middle">
              {tagCode}
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.registerBtn, itemName.length > 0 ? styles.registerBtnActive : null]} 
            onPress={handleRegisterTag} 
            disabled={loading || itemName.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle color="#FFFFFF" size={20} style={{ marginRight: 8 }} />
                <Text style={styles.registerBtnText}>Secure This Item</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F2D4D' },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  iconCircle: { width: 96, height: 96, backgroundColor: '#D1FAE5', borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24, marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  inputContainer: { width: '100%', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#0F2D4D', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 16, height: 56, fontSize: 16, color: '#111827' },
  tagPreviewBox: { width: '100%', backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  tagPreviewLabel: { fontSize: 12, color: '#6B7280', fontWeight: 'bold' },
  tagPreviewCode: { fontSize: 12, color: '#0F2D4D', fontWeight: 'bold', flex: 1, textAlign: 'right', marginLeft: 16 },
  registerBtn: { flexDirection: 'row', backgroundColor: '#D1D5DB', height: 56, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center' },
  registerBtnActive: { backgroundColor: '#0F2D4D', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  registerBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});