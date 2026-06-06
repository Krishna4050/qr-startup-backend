import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Linking, SafeAreaView } from 'react-native';
import { Plane, Lock, ShieldCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../utils/apiClient';

export default function FlightSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSecureBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/flights/links');
      if (res.data && res.data.status === 'success' && res.data.url) {
        // Securely open the Duffel checkout link
        Linking.openURL(res.data.url);
      } else {
        setError('Failed to generate secure checkout link.');
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred connecting to the secure server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0A192F', '#112240']} style={styles.headerGradient}>
        <Plane color="#00E5FF" size={48} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Book Flights Securely</Text>
        <Text style={styles.subtitle}>Powered by our global airline partners</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.securityCard}>
          <ShieldCheck color="#10B981" size={32} style={{ marginBottom: 12 }} />
          <Text style={styles.securityTitle}>Secure Checkout Portal</Text>
          <Text style={styles.securityText}>
            You will be redirected to our PCI-compliant secure booking portal. 
            Search hundreds of airlines and pay securely.
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.bookButton} 
          onPress={startSecureBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.bookButtonText}>Start Flight Search</Text>
              <Lock color="#FFF" size={20} style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 32,
    width: '100%',
    maxWidth: 400,
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A192F',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  bookButton: {
    backgroundColor: '#00E5FF',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    color: '#0A192F',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
});
