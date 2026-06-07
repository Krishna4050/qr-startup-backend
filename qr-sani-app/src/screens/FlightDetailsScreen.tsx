import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import WebLayout from '../components/WebLayout';
import { ArrowLeft, Plane, XCircle, Euro, CheckCircle2 } from 'lucide-react-native';
import apiClient from '../utils/apiClient';

export default function FlightDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { flight } = route.params || {};

  const [cancelling, setCancelling] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string | null>(null);

  useEffect(() => {
    if (!flight) {
      navigation.replace('Dashboard');
    }
  }, [flight]);

  if (!flight) return null;

  const handleCancel = async () => {
    try {
      setCancelling(true);
      // Step 1: Request refund quote
      const res = await apiClient.post('/api/flights/cancel', {
        order_id: flight.duffel_order_id,
        confirm: false
      });

      if (res.data && res.data.refund_amount) {
        const amount = res.data.refund_amount;
        const currency = res.data.currency;
        
        Alert.alert(
          'Confirm Cancellation',
          `Are you sure you want to cancel this flight?\n\nYou will be refunded: ${amount} ${currency}. This cannot be undone.`,
          [
            { text: 'Keep Flight', style: 'cancel', onPress: () => setCancelling(false) },
            { 
              text: 'Confirm & Refund', 
              style: 'destructive',
              onPress: async () => {
                // Step 2: Confirm cancellation
                try {
                  await apiClient.post('/api/flights/cancel', {
                    order_id: flight.duffel_order_id,
                    confirm: true
                  });
                  Alert.alert('Success', 'Your flight was cancelled and refund is processing.');
                  navigation.goBack();
                } catch (err) {
                  Alert.alert('Error', 'Failed to process refund. Please try again.');
                  setCancelling(false);
                }
              }
            }
          ]
        );
      }
    } catch (err) {
      Alert.alert('Cancellation Failed', 'This ticket may be non-refundable or an error occurred.');
      setCancelling(false);
    }
  };
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={styles.backBtn}>
                <ArrowLeft color="#0A192F" size={24} />
                <Text style={styles.backText}>Back to Dashboard</Text>
            </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Plane color="#0A192F" size={32} />
              <View style={styles.headerText}>
                <Text style={styles.title}>Flight Booking</Text>
                <Text style={styles.subtitle}>Ref: {flight.pnr}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: flight.status === 'cancelled' ? '#FEE2E2' : '#DCFCE7' }]}>
                <Text style={[styles.statusText, { color: flight.status === 'cancelled' ? '#DC2626' : '#16A34A' }]}>
                  {flight.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Passenger Name</Text>
                <Text style={styles.detailValue}>{flight.passenger_name || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Amount Paid</Text>
                <Text style={styles.detailValue}>{flight.total_amount} {flight.currency}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Booked On</Text>
                <Text style={styles.detailValue}>{new Date(flight.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>

          {flight.status !== 'cancelled' && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
                {cancelling ? <ActivityIndicator color="#FFF" /> : <XCircle color="#FFF" size={20} />}
                <Text style={styles.cancelText}>{cancelling ? 'Processing...' : 'Cancel Flight & Get Refund'}</Text>
              </TouchableOpacity>
              <Text style={styles.disclaimer}>
                Refund amounts are calculated by the airline dynamically. You will see the exact refund amount before confirming.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#0A192F' },
  content: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerText: { marginLeft: 16, flex: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#0A192F' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  detailsList: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailLabel: { fontSize: 14, color: '#64748B' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#0A192F' },
  actions: { marginTop: 32 },
  cancelBtn: { backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 },
  cancelText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  disclaimer: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 12 }
});
