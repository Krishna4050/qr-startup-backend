import React from 'react';
import { View, StyleSheet, Platform, Linking, Text, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import WebLayout from '../components/WebLayout';
import { ArrowLeft } from 'lucide-react-native';

export default function FlightCheckoutScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { url } = route.params || {};

  // If on mobile (where iframe doesn't work natively), fallback to standard browser linking
  React.useEffect(() => {
    if (Platform.OS !== 'web' && url) {
      Linking.openURL(url);
      navigation.goBack();
    }
  }, [url, Platform.OS]);

  if (!url) {
    return (
      <WebLayout>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No checkout session found.</Text>
        </View>
      </WebLayout>
    );
  }

  return (
    <WebLayout>
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ArrowLeft color="#0A192F" size={24} />
                <Text style={styles.backText}>Back to Services</Text>
            </TouchableOpacity>
        </View>
        {Platform.OS === 'web' ? (
          <iframe 
            src={url} 
            style={{ width: '100%', height: 'calc(100vh - 80px)', border: 'none' }} 
            allow="payment"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
          />
        ) : (
           <View style={styles.errorContainer}>
             <Text style={styles.errorText}>Opening secure checkout...</Text>
           </View>
        )}
      </View>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#0A192F' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorText: { fontSize: 18, color: '#64748B' }
});
