import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { XCircle, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

const { width } = Dimensions.get('window');

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  
  // --- NEW: The Magic "Is Focused" Hook ---
  const isFocused = useIsFocused(); 
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isLocked, setIsLocked] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'verifying' | 'invalid' | 'claimed'>('idle');

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // --- NEW: Reset scanner if user leaves the tab and comes back ---
  useEffect(() => {
    if (!isFocused) {
      setScanStatus('idle');
      setIsLocked(false);
    }
  }, [isFocused]);

  const handleBarcodeScanned = async ({ type, data }: any) => {
    if (isLocked) return; 
    
    setIsLocked(true);
    setScanStatus('verifying');

    try {
      const { data: vaultTag, error } = await supabase_lucifer_core
        .from('valid_qrs')
        .select('public_url_code, is_claimed')
        .eq('public_url_code', data)
        .maybeSingle();

      if (error) throw error;

      if (!vaultTag) {
        setScanStatus('invalid');
        return; 
      }

      if (vaultTag.is_claimed) {
        setScanStatus('claimed');
        return; 
      }

      setScanStatus('idle');
      navigation.navigate('TagRegistration', { tagCode: data });
      setTimeout(() => setIsLocked(false), 1000); 

    } catch (err) {
      console.error(err);
      setScanStatus('invalid'); 
    }
  };

  const resetScanner = () => {
    setScanStatus('idle');
    setIsLocked(false);
  };

  if (!permission?.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0F2D4D" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Requesting camera permission...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* CAMERA BACKGROUND - Only mounts when the screen is active! */}
      {isFocused && (
        <CameraView 
          style={StyleSheet.absoluteFillObject} 
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      {/* --- NEW: THE DARK BLUR OVERLAY --- */}
      <View style={styles.maskContainer}>
        {/* Top Dark Section */}
        <View style={styles.maskRow} /> 
        
        {/* Middle Section with the clear hole */}
        <View style={styles.maskCenter}>
          <View style={styles.maskSide} />
          
          <View style={styles.targetBox}>
            {/* The four corner brackets (optional visual flair) */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          <View style={styles.maskSide} />
        </View>

        {/* Bottom Dark Section */}
        <View style={[styles.maskRow, { alignItems: 'center', paddingTop: 20 }]}>
           <Text style={styles.targetText}>Position the QR code inside the frame</Text>
        </View>
      </View>

      {/* HEADER OVERLAY */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#FFFFFF" size={28} />
        </TouchableOpacity>
      </View>

      {/* --- ERROR OVERLAYS --- */}
      {scanStatus === 'verifying' && (
        <View style={styles.overlayContainer}>
          <View style={[styles.statusCard, { borderColor: '#3B82F6' }]}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.statusTitle}>Verifying Tag...</Text>
            <Text style={styles.statusSub}>Checking secure vault</Text>
          </View>
        </View>
      )}

      {scanStatus === 'invalid' && (
        <View style={styles.overlayContainer}>
          <View style={[styles.statusCard, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
            <XCircle color="#EF4444" size={48} />
            <Text style={[styles.statusTitle, { color: '#991B1B' }]}>Invalid QR Code</Text>
            <Text style={[styles.statusSub, { color: '#B91C1C' }]}>This is not a recognized official tag. Please scan a valid tag.</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#EF4444' }]} onPress={resetScanner}>
              <RefreshCw color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
              <Text style={styles.retryBtnText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {scanStatus === 'claimed' && (
        <View style={styles.overlayContainer}>
          <View style={[styles.statusCard, { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }]}>
            <AlertTriangle color="#F59E0B" size={48} />
            <Text style={[styles.statusTitle, { color: '#92400E' }]}>Already Claimed</Text>
            <Text style={[styles.statusSub, { color: '#B45309' }]}>This tag is already registered. If you are the owner, manage it from your Dashboard.</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: '#F59E0B' }]} onPress={resetScanner}>
              <RefreshCw color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
              <Text style={styles.retryBtnText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { position: 'absolute', top: 50, left: 20, zIndex: 20 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  
  // Mask Styles
  maskContainer: { ...StyleSheet.absoluteFillObject, zIndex: 10 },
  maskRow: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  maskCenter: { flexDirection: 'row', height: 260 },
  maskSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)' },
  
  // Target Box Styles
  targetBox: { width: 260, height: 260, backgroundColor: 'transparent', position: 'relative' },
  targetText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },

  // Corner Bracket Accents
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#FFFFFF', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 24 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 24 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 24 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 24 },

  // Overlay UI Styles
  overlayContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 30 },
  statusCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 2 },
  statusTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  statusSub: { fontSize: 15, color: '#4B5563', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryBtn: { flexDirection: 'row', width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  retryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});