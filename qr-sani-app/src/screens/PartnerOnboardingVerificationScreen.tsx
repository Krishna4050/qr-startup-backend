import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ShieldCheck, UploadCloud, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase_lucifer_core } from '../utils/supabase';

export default function PartnerOnboardingVerificationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { shopData } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Store the local document info
  const [documentFile, setDocumentFile] = useState<{ uri: string, name: string } | null>(null);

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setDocumentFile({
        uri: result.assets[0].uri,
        name: result.assets[0].name
      });
    }
  };

  // Helper function to handle Supabase Base64 Uploads natively
  const uploadToSupabase = async (localUri: string, bucketPath: string, contentType: string) => {
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
    const { data, error } = await supabase_lucifer_core.storage
      .from('shop_assets')
      .upload(bucketPath, decode(base64), { contentType });

    if (error) throw error;
    
    // Get the public URL
    const { data: publicUrlData } = supabase_lucifer_core.storage.from('shop_assets').getPublicUrl(bucketPath);
    return publicUrlData.publicUrl;
  };

  // This securely hits your Go Backend to handle the Resend email logic!
  const triggerWelcomeEmail = async (userEmail: string, shopName: string) => {
    try {
      // Assuming your Go backend is running and exposed via env variable
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://YOUR_LOCAL_GO_IP:8080';
      
      await fetch(`${backendUrl}/api/host/welcome-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          shopName: shopName
        })
      });
    } catch (err) {
      console.error("Failed to trigger email from backend", err);
    }
  };

  const handleSubmit = async () => {
    if (!documentFile) {
      Alert.alert("Verification Required", "Please upload a document to proceed.");
      return;
    }


    setLoading(true);
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const timestamp = Date.now();

      // UPLOAD DOCUMENT
      setLoadingText('Uploading verification...');
      const docExt = documentFile.name.split('.').pop();
      const docPath = `documents/${user.id}_${timestamp}.${docExt}`;
      const uploadedDocUrl = await uploadToSupabase(documentFile.uri, docPath, 'application/octet-stream');

      // INSERT SHOP INTO DATABASE
      setLoadingText('Saving shop details...');
      const { data: newShopData, error: shopError } = await supabase_lucifer_core
        .from('shop_locations')
        .insert([{
          owner_id: user.id,
          shop_name: shopData.shopName,
          street: shopData.street,
          city: shopData.city,
          contact_phone: shopData.phone,
          contact_email: shopData.finalContactEmail,
          shop_types: shopData.shopTypes,
          amenities: shopData.amenities,
          verification_doc_url: uploadedDocUrl,
          verification_status: 'pending',
          is_active: false 
        }])
        .select('id')
        .single();

      if (shopError) throw shopError;
      const newShopId = newShopData.id;

      // UPLOAD PHOTOS & INSERT INTO shop_photos TABLE
      setLoadingText('Uploading photos...');
      const localUris = shopData.localPhotoUris || [];
      
      for (let i = 0; i < localUris.length; i++) {
        const photoPath = `photos/${newShopId}_${timestamp}_${i}.jpg`;
        const uploadedPhotoUrl = await uploadToSupabase(localUris[i], photoPath, 'image/jpeg');
        
        await supabase_lucifer_core.from('shop_photos').insert([{
          location_id: newShopId,
          photo_url: uploadedPhotoUrl
        }]);
      }
      await triggerWelcomeEmail(shopData.finalContactEmail, shopData.shopName);

      Alert.alert("Success!", "Your shop is securely saved and under review.");
      navigation.reset({ index: 0, routes: [{ name: 'HostDashboard' }] });
      
      // DONE! REDIRECT TO DASHBOARD
      Alert.alert("Success!", "Your shop is securely saved and under review.");
      navigation.reset({ index: 0, routes: [{ name: 'HostDashboard' }] });

    } catch (err: any) {
      console.error("Submission Error:", err);
      Alert.alert("Error Saving Data", err.message);
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} disabled={loading}>
            <ArrowLeft color="#0A192F" size={24} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <ShieldCheck color="#4A00E0" size={40} strokeWidth={2} />
          </View>
          
          <Text style={styles.mainTitle}>Let's verify your business</Text>
          <Text style={styles.subtitle}>Please provide a clear photo or PDF of your official business registration.</Text>

          {/* UPLOAD BOX */}
          <TouchableOpacity 
            style={[styles.uploadBox, documentFile && styles.uploadBoxSuccess]} 
            activeOpacity={0.8}
            onPress={handlePickDocument}
            disabled={loading}
          >
            {documentFile ? (
              <>
                <FileText color="#10B981" size={36} style={{ marginBottom: 12 }} />
                <Text style={styles.uploadTextSuccess} numberOfLines={1}>{documentFile.name}</Text>
                <Text style={styles.uploadSubtext}>Tap to change file</Text>
              </>
            ) : (
              <>
                <UploadCloud color="#4A00E0" size={36} style={{ marginBottom: 12 }} />
                <Text style={styles.uploadText}>Tap to pick document</Text>
                <Text style={styles.uploadSubtext}>Supports JPG, PNG, or PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.progressBarBg}><View style={styles.progressBarFill} /></View>
          
          <View style={styles.bottomBarContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
              <Text style={[styles.backText, loading && { opacity: 0.3 }]}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryButton, (!documentFile || loading) && styles.primaryButtonDisabled]}
              activeOpacity={0.9}
              onPress={handleSubmit}
              disabled={!documentFile || loading}
            >
              {loading ? (
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <ActivityIndicator color="#FFFFFF" style={{marginRight: 8}} />
                  <Text style={styles.primaryButtonText}>{loadingText || 'Processing...'}</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Submit to Review</Text>
              )}
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 120 },
  
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  mainTitle: { fontSize: 32, fontWeight: '800', color: '#0A192F', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#717171', lineHeight: 22, marginBottom: 32 },

  uploadBox: { backgroundColor: '#FAFAFC', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center' },
  uploadBoxSuccess: { borderColor: '#10B981', backgroundColor: '#ECFDF5', borderStyle: 'solid' },
  uploadText: { fontSize: 16, fontWeight: '600', color: '#0A192F', marginBottom: 4 },
  uploadTextSuccess: { fontSize: 16, fontWeight: '600', color: '#10B981', marginBottom: 4, paddingHorizontal: 20, textAlign: 'center' },
  uploadSubtext: { fontSize: 13, color: '#8892B0' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  progressBarBg: { height: 4, backgroundColor: '#F3F4F6', width: '100%' },
  progressBarFill: { height: 4, backgroundColor: '#10B981', width: '100%' }, 
  bottomBarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 24 },
  backText: { fontSize: 16, fontWeight: '600', color: '#0A192F', textDecorationLine: 'underline' },
  
  primaryButton: { backgroundColor: '#FF715B', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, minWidth: 120, alignItems: 'center' }, 
  primaryButtonDisabled: { backgroundColor: '#D1D5DB' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});