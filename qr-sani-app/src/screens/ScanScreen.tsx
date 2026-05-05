import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  
  // This tells us if the user is actually looking at this tab right now
  const isFocused = useIsFocused(); 
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Reset scanner when they leave and come back to the tab
    if (isFocused) {
      setScanned(false);
    }
  }, [isFocused]);

  if (!permission) {
    // Camera permissions are still loading
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // User hasn't given permission yet
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    // Prevent the scanner from scanning 100 times in one second
    if (scanned) return; 
    setScanned(true);
    
    // Instantly teleport the user to the registration screen, passing the QR code data with them!
    navigation.navigate('TagRegistration', { tagCode: data });
  };

  return (
    <View style={styles.container}>
      {/* Only render camera if the tab is focused, saves battery! */}
      {isFocused && (
        <CameraView 
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        >
          {/* THE DARK OVERLAY & TARGETING RETICLE */}
          <View style={styles.overlay}>
            <View style={styles.topOverlay} />
            
            <View style={styles.middleRow}>
              <View style={styles.sideOverlay} />
              
              {/* The Clear Cutout Box */}
              <View style={styles.scanArea}>
                {/* Glowing Corner Accents */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>

              <View style={styles.sideOverlay} />
            </View>

            <View style={styles.bottomOverlay}>
              <Text style={styles.scanText}>Position the QR code inside the frame</Text>
            </View>
          </View>
        </CameraView>
      )}

      {/* CLOSE BUTTON (Goes back to dashboard) */}
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.navigate('Home')}>
        <X color="#FFFFFF" size={28} />
      </TouchableOpacity>
    </View>
  );
}

const overlayColor = 'rgba(15, 45, 77, 0.75)'; // Dark Navy with 75% opacity

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 24 },
  permissionText: { fontSize: 18, textAlign: 'center', marginBottom: 24, color: '#0F2D4D', fontWeight: 'bold' },
  permissionBtn: { backgroundColor: '#0F2D4D', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  permissionBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  // Overlay Layout Magic
  overlay: { flex: 1 },
  topOverlay: { flex: 1, backgroundColor: overlayColor },
  middleRow: { flexDirection: 'row', height: SCAN_AREA_SIZE },
  sideOverlay: { flex: 1, backgroundColor: overlayColor },
  scanArea: { width: SCAN_AREA_SIZE, height: SCAN_AREA_SIZE, backgroundColor: 'transparent' },
  bottomOverlay: { flex: 1, backgroundColor: overlayColor, alignItems: 'center', paddingTop: 40 },
  scanText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },

  // Glowing Corners
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#10B981', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 16 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 16 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 16 },

  // Close Button
  closeButton: { position: 'absolute', top: 60, right: 24, width: 44, height: 44, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 22, justifyContent: 'center', alignItems: 'center' }
});