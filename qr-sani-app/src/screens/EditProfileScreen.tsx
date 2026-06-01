import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { ArrowLeft, Save, User, Phone, MapPin, FileText, Calendar, Hash, Home as HomeIcon, Pencil, CheckCircle, XCircle, Camera } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/apiClient';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase_lucifer_core } from '../utils/supabase';

export default function EditProfileScreen({ route, isEmbedded }: any) {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { user } = useAuth();

  // Form Data State
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', username: '', gender: '', date_of_birth: '',
    avatar_url: '',
    phone_number: '', country: '', city: '', street: '', house_number: '', bio: ''
  });

  // --- NEW: Username Checking States ---
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    loadCurrentData();
  }, [user?.id]);

  const loadCurrentData = async () => {
    try {
      if (!user) return;

      const { data } = await apiClient.get('/api/profile');

      if (data && data.id) {
        setFormData({
          first_name: data.first_name || '', last_name: data.last_name || '', username: data.username || '',
          gender: data.gender || '', date_of_birth: data.date_of_birth || '', phone_number: data.phone_number || '',
          country: data.country || '', city: data.city || '', street: data.street || '',
          house_number: data.house_number || '', bio: data.bio || '', avatar_url: data.avatar_url || ''
        });
        setOriginalUsername(data.username || ''); // Remember their current username!
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  // --- NEW: Real-Time Username Checker ---
  useEffect(() => {
    // 1. If it's empty, or they haven't changed it from their own original username, do nothing.
    if (!formData.username || formData.username === originalUsername) {
      setUsernameStatus('idle');
      setSuggestions([]);
      return;
    }

    // 2. Turn on the spinner
    setUsernameStatus('checking');

    // 3. DEBOUNCER: Wait 500ms after they stop typing before asking the database
    const delayDebounceFn = setTimeout(async () => {
      
      try {
        const { data } = await apiClient.get(`/api/profile/check-username?username=${formData.username.trim()}`);
        if (data.taken) {
          setUsernameStatus('taken');
          generateSmartSuggestions(formData.username.trim());
        } else {
          setUsernameStatus('available');
          setSuggestions([]);
        }
      } catch (err) {
        // Fallback or ignore
        setUsernameStatus('available');
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.username, originalUsername]);

  const generateSmartSuggestions = async (baseName: string) => {
    // Generate 4 possible variations
    const candidates = [
      `${baseName}${Math.floor(Math.random() * 999)}`,
      `${baseName}_${Math.floor(Math.random() * 99)}`,
      `${baseName}HQ`,
      `${baseName}Official`
    ];

    // Bulk check which of these suggestions are ALREADY taken
    const takenNames: string[] = [];
    
    await Promise.all(candidates.map(async (name) => {
      try {
        const { data } = await apiClient.get(`/api/profile/check-username?username=${name}`);
        if (data.taken) {
          takenNames.push(name);
        }
      } catch (err) {
        // ignore errors for suggestions
      }
    }));
    
    // Filter out any taken ones, and only keep the safe ones!
    const safeSuggestions = candidates.filter(name => !takenNames.includes(name));
    setSuggestions(safeSuggestions.slice(0, 3)); // Show the top 3
  };

  const validateForm = () => {
    let newErrors: any = {};
    let isValid = true;

    // Check all required fields
    const fieldsToCheck = ['first_name', 'last_name', 'username', 'gender', 'phone_number', 'country', 'city', 'street', 'house_number', 'bio'];
    
    fieldsToCheck.forEach(field => {
      if (!formData[field as keyof typeof formData] || formData[field as keyof typeof formData].trim() === '') {
        newErrors[field] = 'This field is required';
        isValid = false;
      }
    });

    if (!formData.date_of_birth || formData.date_of_birth.trim() === '') {
      newErrors.date_of_birth = 'This field is required';
      isValid = false;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date_of_birth)) {
      newErrors.date_of_birth = 'Must be YYYY-MM-DD';
      isValid = false;
    }

    // NEW: Stop saving if the username is actively taken!
    if (usernameStatus === 'taken') {
       newErrors.username = 'Please choose an available username';
       isValid = false;
    }

    setErrors(newErrors);
    if (!isValid) Alert.alert("Missing Information", "Please check the red fields below.");
    return isValid;
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const pickImage = async () => {
    try {
      const options: ImagePicker.ImagePickerOptions = { 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [1, 1], 
        quality: 0.5, 
        base64: true 
      };
      
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert("Error", "Could not select an image.");
    }
  };

  const uploadAvatar = async (base64Image: string) => {
    setUploadingAvatar(true);
    try {
      if (!user) throw new Error("No user found");

      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase_lucifer_core.storage.from('avatars').upload(filePath, decode(base64Image), { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase_lucifer_core.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      
      const newFormData = { ...formData, avatar_url: newAvatarUrl };
      await apiClient.post('/api/profile', newFormData);

      setFormData(newFormData);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (!user) throw new Error("Not logged in");

      await apiClient.post('/api/profile', formData);

      setOriginalUsername(formData.username); // Update the baseline
      setUsernameStatus('idle');
      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);

    } catch (error: any) {
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color="#0F2D4D" /></View>;

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {!isEditing && <View style={styles.readOnlyBanner}><Text style={styles.readOnlyText}>Tap the pencil icon to edit your details.</Text></View>}

      {/* --- AVATAR SECTION --- */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} disabled={uploadingAvatar} style={styles.avatarWrapper}>
          {formData.avatar_url ? (
            <Image source={{ uri: formData.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User color="#9CA3AF" size={40} />
            </View>
          )}
          
          <View style={styles.avatarEditBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Camera color="#FFFFFF" size={14} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarSubtext}>Tap to change picture</Text>
      </View>

      {/* --- PERSONAL INFO SECTION --- */}
      <Text style={styles.sectionHeading}>Personal Information</Text>
      
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>First Name</Text>
          <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, errors.first_name && styles.inputError]}>
            <User color={errors.first_name ? "#EF4444" : "#9CA3AF"} size={18} style={styles.inputIcon} />
            <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="John" value={formData.first_name} onChangeText={(t) => updateField('first_name', t)} />
          </View>
          {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Last Name</Text>
          <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, errors.last_name && styles.inputError]}>
            <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="Doe" value={formData.last_name} onChangeText={(t) => updateField('last_name', t)} />
          </View>
          {errors.last_name && <Text style={styles.errorText}>{errors.last_name}</Text>}
        </View>
      </View>

      {/* --- USERNAME SECTION (NOW WITH LIVE CHECKING) --- */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username</Text>
        <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, (errors.username || usernameStatus === 'taken') && styles.inputError]}>
          <Text style={{color: (errors.username || usernameStatus === 'taken') ? '#EF4444' : '#9CA3AF', marginRight: 8, fontSize: 16}}>@</Text>
          <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="johndoe123" autoCapitalize="none" value={formData.username} onChangeText={(t) => updateField('username', t.toLowerCase().replace(/\s/g, ''))} />
          
          {/* Status Indicators inside the input box */}
          {isEditing && usernameStatus === 'checking' && <ActivityIndicator size="small" color="#3B82F6" />}
          {isEditing && usernameStatus === 'available' && <CheckCircle color="#10B981" size={20} />}
          {isEditing && usernameStatus === 'taken' && <XCircle color="#EF4444" size={20} />}
        </View>
        
        {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
        {usernameStatus === 'taken' && <Text style={styles.errorText}>Username is already taken.</Text>}
        
        {/* Suggestion Chips */}
        {isEditing && suggestions.length > 0 && (
          <View style={styles.suggestionsWrapper}>
            <Text style={styles.suggestionLabel}>Available:</Text>
            <View style={styles.suggestionRow}>
              {suggestions.map((sug, idx) => (
                <TouchableOpacity key={idx} style={styles.suggestionChip} onPress={() => updateField('username', sug)}>
                  <Text style={styles.suggestionChipText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Gender</Text>
          <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, errors.gender && styles.inputError]}>
            <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="Male, Female..." value={formData.gender} onChangeText={(t) => updateField('gender', t)} />
          </View>
          {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Date of Birth</Text>
          <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, errors.date_of_birth && styles.inputError]}>
            <Calendar color={errors.date_of_birth ? "#EF4444" : "#9CA3AF"} size={18} style={styles.inputIcon} />
            <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="YYYY-MM-DD" value={formData.date_of_birth} onChangeText={(t) => updateField('date_of_birth', t)} />
          </View>
          {errors.date_of_birth && <Text style={styles.errorText}>{errors.date_of_birth}</Text>}
        </View>
      </View>

      {/* --- ADDRESS SECTION --- */}
      <Text style={styles.sectionHeading}>Address</Text>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>Country</Text>
          <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, errors.country && styles.inputError]}>
            <MapPin color={errors.country ? "#EF4444" : "#9CA3AF"} size={18} style={styles.inputIcon} />
            <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="USA" value={formData.country} onChangeText={(t) => updateField('country', t)} />
          </View>
          {errors.country && <Text style={styles.errorText}>{errors.country}</Text>}
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>City</Text>
          <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, errors.city && styles.inputError]}>
            <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="New York" value={formData.city} onChangeText={(t) => updateField('city', t)} />
          </View>
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
          <Text style={styles.label}>Street</Text>
          <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, errors.street && styles.inputError]}>
            <HomeIcon color={errors.street ? "#EF4444" : "#9CA3AF"} size={18} style={styles.inputIcon} />
            <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="Main St" value={formData.street} onChangeText={(t) => updateField('street', t)} />
          </View>
          {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>House #</Text>
          <View style={[styles.inputContainer, !isEditing && styles.inputDisabled, errors.house_number && styles.inputError]}>
            <Hash color={errors.house_number ? "#EF4444" : "#9CA3AF"} size={18} style={styles.inputIcon} />
            <TextInput style={[styles.input, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="123" value={formData.house_number} onChangeText={(t) => updateField('house_number', t)} />
          </View>
          {errors.house_number && <Text style={styles.errorText}>{errors.house_number}</Text>}
        </View>
      </View>

      {/* --- BIO SECTION --- */}
      <Text style={styles.sectionHeading}>About You</Text>

      <View style={styles.inputGroup}>
        <View style={[styles.inputContainer, { height: 100, alignItems: 'flex-start', paddingTop: 12 }, !isEditing && styles.inputDisabled, errors.bio && styles.inputError]}>
          <FileText color={errors.bio ? "#EF4444" : "#9CA3AF"} size={18} style={styles.inputIcon} />
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }, !isEditing && styles.textDisabled]} editable={isEditing} placeholder="Write a short bio..." multiline value={formData.bio} onChangeText={(t) => updateField('bio', t)} />
        </View>
        {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
      </View>

    </ScrollView>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, isEmbedded && { paddingTop: 20 }]}>
        {!isEmbedded ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><ArrowLeft color="#111827" size={24} /></TouchableOpacity>
        ) : (
          <View style={{ width: 32 }} />
        )}
        <Text style={styles.headerTitle}>{isEditing ? "Editing Profile" : "Profile Details"}</Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.iconBtn}>
            {loading ? <ActivityIndicator color="#10B981" /> : <Save color="#10B981" size={24} />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconBtn}><Pencil color="#3B82F6" size={22} /></TouchableOpacity>
        )}
      </View>
      {renderForm()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  
  readOnlyBanner: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, marginBottom: 20, alignItems: 'center' },
  readOnlyText: { color: '#2563EB', fontSize: 13, fontWeight: '500' },

  sectionHeading: { fontSize: 16, fontWeight: 'bold', color: '#0F2D4D', marginBottom: 16, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 52, paddingHorizontal: 16 },
  inputDisabled: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }, 
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }, 
  
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  textDisabled: { color: '#6B7280' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '500' },

  // New Suggestion Styles
  suggestionsWrapper: { marginTop: 8, marginLeft: 4 },
  suggestionLabel: { fontSize: 12, color: '#6B7280', marginBottom: 6, fontWeight: '600' },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  suggestionChipText: { color: '#2563EB', fontSize: 12, fontWeight: '600' },
  
  // Avatar Styles
  avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatarWrapper: { position: 'relative', width: 100, height: 100, borderRadius: 50, overflow: 'visible' },
  avatarImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  avatarEditBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3B82F6', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
  avatarSubtext: { marginTop: 12, fontSize: 13, color: '#6B7280', fontWeight: '500' }
});