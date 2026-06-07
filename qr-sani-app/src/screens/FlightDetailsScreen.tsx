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
  const renderSegments = () => {
    if (!flight.details?.slices?.[0]?.segments) return null;
    return flight.details.slices.map((slice: any, sIdx: number) => (
      <View key={sIdx} style={styles.sliceContainer}>
        {slice.segments.map((seg: any, idx: number) => (
          <View key={idx} style={styles.segmentCard}>
            <View style={styles.segmentHeader}>
              <Plane color="#64748B" size={20} style={{ transform: [{ rotate: '45deg' }] }} />
              <Text style={styles.airlineText}>
                {seg.operating_carrier?.name || seg.marketing_carrier?.name} • Flight {seg.operating_carrier_flight_number}
              </Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{formatDuration(seg.duration)}</Text>
              </View>
            </View>
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <Text style={styles.timeText}>{new Date(seg.departing_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={styles.cityText}>{seg.origin.city_name} ({seg.origin.iata_code})</Text>
                <Text style={styles.dateText}>{new Date(seg.departing_at).toLocaleDateString()}</Text>
              </View>
              <View style={styles.routeLine}>
                <View style={styles.line} />
              </View>
              <View style={styles.routePoint}>
                <Text style={styles.timeText}>{new Date(seg.arriving_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={styles.cityText}>{seg.destination.city_name} ({seg.destination.iata_code})</Text>
                <Text style={styles.dateText}>{new Date(seg.arriving_at).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    ));
  };

  const renderPassengers = () => {
    if (!flight.details?.passengers) return null;
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Passenger Information</Text>
        {flight.details.passengers.map((p: any, idx: number) => {
          // Check bags from segments
          const baggages = flight.details?.slices?.[0]?.segments?.[0]?.passengers?.find((sp: any) => sp.passenger_id === p.id)?.baggages || [];
          const checkedBags = baggages.filter((b: any) => b.type === 'checked').reduce((sum: number, b: any) => sum + b.quantity, 0);

          return (
            <View key={idx} style={styles.passengerRow}>
              <View>
                <Text style={styles.passengerName}>{(p.title || '').toUpperCase()} {p.given_name} {p.family_name}</Text>
                <Text style={styles.passengerSub}>DOB: {p.born_on} • Gender: {p.gender?.toUpperCase()}</Text>
              </View>
              <View style={styles.bagBadge}>
                <Text style={styles.bagText}>{checkedBags > 0 ? `${checkedBags} Checked Bag(s)` : 'No Checked Bags'}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
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
              <View style={styles.headerText}>
                <Text style={styles.title}>Booking Reference: {flight.pnr}</Text>
                <Text style={styles.subtitle}>Booked on {new Date(flight.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: flight.status === 'cancelled' ? '#FEE2E2' : '#DCFCE7' }]}>
                <Text style={[styles.statusText, { color: flight.status === 'cancelled' ? '#DC2626' : '#16A34A' }]}>
                  {flight.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total Amount Paid</Text>
              <Text style={styles.priceValue}>{flight.total_amount} {flight.currency}</Text>
            </View>
          </View>

          {renderSegments()}
          {renderPassengers()}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Refund & Cancellation Policy</Text>
            <View style={styles.policyList}>
              <Text style={styles.policyText}>• Cancellations made within 24 hours of booking are usually fully refundable.</Text>
              <Text style={styles.policyText}>• After 24 hours, refunds are subject to the specific airline's fare rules.</Text>
              <Text style={styles.policyText}>• Once approved, refunds process back to your original payment method in 5-10 business days.</Text>
            </View>
          </View>

          {flight.status !== 'cancelled' && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
                {cancelling ? <ActivityIndicator color="#FFF" /> : <XCircle color="#FFF" size={20} />}
                <Text style={styles.cancelText}>{cancelling ? 'Processing Quote...' : 'Cancel Flight & Get Refund'}</Text>
              </TouchableOpacity>
              <Text style={styles.disclaimer}>
                Clicking this will first show you the exact refund amount from the airline before you confirm.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatDuration(isoStr: string) {
  if (!isoStr) return '';
  const match = isoStr.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return isoStr;
  const h = match[1] ? match[1].replace('H', 'h ') : '';
  const m = match[2] ? match[2].replace('M', 'm') : '';
  return (h + m).trim();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#0A192F' },
  content: { padding: 24, maxWidth: 800, marginHorizontal: 'auto', width: '100%', gap: 24 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#0A192F' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceLabel: { fontSize: 16, color: '#64748B' },
  priceValue: { fontSize: 24, fontWeight: '700', color: '#0A192F' },
  
  sliceContainer: { gap: 16, marginBottom: 24 },
  segmentCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  segmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  airlineText: { marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#0A192F', flex: 1 },
  durationBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  durationText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  
  routeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  routePoint: { flex: 1, alignItems: 'flex-start' },
  timeText: { fontSize: 22, fontWeight: '700', color: '#0A192F' },
  cityText: { fontSize: 16, fontWeight: '500', color: '#334155', marginTop: 4 },
  dateText: { fontSize: 14, color: '#64748B', marginTop: 2 },
  routeLine: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  line: { height: 2, backgroundColor: '#CBD5E1', width: '100%', borderRadius: 2 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0A192F', marginBottom: 16 },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#0A192F' },
  passengerSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  bagBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  bagText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  
  policyList: { gap: 8 },
  policyText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  
  actions: { marginTop: 8 },
  cancelBtn: { backgroundColor: '#DC2626', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 },
  cancelText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  disclaimer: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 12 }
});
