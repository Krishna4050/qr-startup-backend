import React, { useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import WebLayout from '../components/WebLayout';
import { ArrowLeft } from 'lucide-react-native';

export default function FlightCheckoutScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { url } = route.params || {};

  const [loading, setLoading] = useState(true);

  if (!url) {
    return (
         <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Checkout session expired or invalid.</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Dashboard')}>
               <Text style={styles.backBtnText}>Go Back</Text>
            </TouchableOpacity>
         </View>
    );
  }

  // On Web, we render a full-screen iframe
  if (Platform.OS === 'web') {
    return (
        <View style={styles.webContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
              <ArrowLeft color="#0A192F" size={20} />
              <Text style={styles.headerBackText}>Back to Services</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.banner}>
             <Text style={styles.bannerText}>
               ⏱ <Text style={{fontWeight: 'bold'}}>Live Airline Pricing:</Text> Flight prices and availability are held for ~15 minutes after selecting a flight. Please complete your checkout promptly to avoid timeouts.
             </Text>
          </View>
          
          <View style={styles.iframeWrapper}>
            {loading && (
               <View style={styles.loaderOverlay}>
                  <ActivityIndicator size="large" color="#0A192F" />
                  <Text style={styles.loaderText}>Securely loading flight engine...</Text>
               </View>
            )}
            <iframe 
              src={url}
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#F8FAFC' }}
              allow="payment; camera"
              onLoad={() => setLoading(false)}
            />
          </View>
        </View>
    );
  }

  // On Mobile, you'd use react-native-webview
  return (
    <View style={styles.errorContainer}>
       <Text style={styles.errorText}>Please open this page in a web browser to book flights.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#DC2626', marginBottom: 16 },
  backBtn: { backgroundColor: '#0A192F', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },
  webContainer: { flex: 1, backgroundColor: '#F8FAFC', width: '100%', height: '100%' },
  header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerBack: { flexDirection: 'row', alignItems: 'center' },
  headerBackText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#0A192F' },
  banner: { backgroundColor: '#FEF3C7', padding: 12, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  bannerText: { color: '#92400E', fontSize: 14, textAlign: 'center' },
  iframeWrapper: { flex: 1, position: 'relative', width: '100%', minHeight: 800 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loaderText: { marginTop: 16, fontSize: 16, color: '#64748B', fontWeight: '500' }
});
