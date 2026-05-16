import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView, Image, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Plus, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function PartnerOnboardingStep4Screen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { shopData } = route.params || {};

  // Store local URIs. We will upload them all at once in Step 5 for a better UX!
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const pickImage = async (useCamera: boolean) => {
    // Request permissions
    const permissionResult = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Please allow access to add photos.");
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.7,
        });

    if (!result.canceled) {
      const newUris = result.assets.map(asset => asset.uri);
      setSelectedPhotos(prev => [...prev, ...newUris]);
    }
  };

  const removePhoto = (uriToRemove: string) => {
    setSelectedPhotos(prev => prev.filter(uri => uri !== uriToRemove));
  };

  const handleNext = () => {
    navigation.navigate('PartnerOnboardingVerification', {
      shopData: {
        ...shopData,
        localPhotoUris: selectedPhotos // Pass the local URIs to the final screen
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#0A192F" size={24} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.mainTitle}>Add some photos of your shop</Text>
          <Text style={styles.subtitle}>You'll need at least 1 photo to get started. You can add more later.</Text>

          {/* ACTION BUTTONS */}
          <TouchableOpacity style={styles.actionCard} onPress={() => pickImage(false)} activeOpacity={0.7}>
            <Plus color="#0A192F" size={28} />
            <Text style={styles.actionText}>Add photos from gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => pickImage(true)} activeOpacity={0.7}>
            <Camera color="#0A192F" size={28} />
            <Text style={styles.actionText}>Take new photos</Text>
          </TouchableOpacity>

          {/* REAL PHOTO PREVIEWS */}
          <View style={styles.photoGrid}>
            {selectedPhotos.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.deleteBtn} onPress={() => removePhoto(uri)}>
                  <X color="#FFFFFF" size={16} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.progressBarBg}><View style={styles.progressBarFill} /></View>
          <View style={styles.bottomBarContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryButton, selectedPhotos.length === 0 && styles.primaryButtonDisabled]}
              activeOpacity={0.9}
              onPress={handleNext}
              disabled={selectedPhotos.length === 0}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 10, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },
  mainTitle: { fontSize: 32, fontWeight: '800', color: '#0A192F', letterSpacing: -0.5, marginBottom: 8, lineHeight: 36 },
  subtitle: { fontSize: 16, color: '#717171', lineHeight: 22, marginBottom: 32 },
  
  actionCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, backgroundColor: '#FFFFFF' },
  actionText: { fontSize: 18, fontWeight: '600', color: '#0A192F', marginLeft: 16 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  photoWrapper: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  thumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  deleteBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 16 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  progressBarBg: { height: 4, backgroundColor: '#F3F4F6', width: '100%' },
  progressBarFill: { height: 4, backgroundColor: '#0A192F', width: '80%' },
  bottomBarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 24 },
  backText: { fontSize: 16, fontWeight: '600', color: '#0A192F', textDecorationLine: 'underline' },
  primaryButton: { backgroundColor: '#0A192F', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#D1D5DB' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});