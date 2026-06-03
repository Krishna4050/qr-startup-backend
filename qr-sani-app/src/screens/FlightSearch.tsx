import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Plane, ArrowRight, Clock, Info, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '../utils/apiClient';

interface FlightOffer {
  id: string;
  provider: string;
  airline: string;
  flightNum: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  currency: string;
  isDirect: boolean;
}

export default function FlightSearch() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  const origin = route.params?.origin || 'HEL';
  const destination = route.params?.destination || 'JFK';
  const departureDate = route.params?.departureDate || '12';
  const guests = route.params?.guests || 1;
  const flightType = route.params?.type || 'round-trip';

  const [isLoading, setIsLoading] = useState(true);
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        setIsLoading(true);
        // Hit our new Hybrid Arbitrage Engine in the Go Backend!
        const res = await apiClient.post('/api/flights/search', {
          origin,
          destination,
          departureDate: `2026-05-${departureDate}`,
          type: flightType,
          guests
        });
        
        if (res.data?.status === 'success') {
          // Sort by price ascending (Arbitrage logic applied on frontend for now, soon to be backend)
          const sorted = res.data.data.sort((a: FlightOffer, b: FlightOffer) => a.price - b.price);
          setFlights(sorted);
        } else {
          setError("Could not find flights. Please try again.");
        }
      } catch (err) {
        console.error("Flight Search Error:", err);
        setError("Network error connecting to flight engine.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlights();
  }, [origin, destination, departureDate, guests, flightType]);

  const handleBook = (flight: FlightOffer) => {
    // In Phase 3, this will navigate to the Passenger Details & Stripe Checkout flow
    alert(`Initiating booking for ${flight.airline} ${flight.flightNum} via ${flight.provider} provider at ${flight.price} ${flight.currency}. Phase 3 Checkout coming next!`);
  };

  return (
    <View style={styles.container}>
      {/* Search Header Summary */}
      <LinearGradient colors={['#0F2D4D', '#174871']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.routeHeader}>
            <Text style={styles.airportCode}>{origin}</Text>
            <View style={styles.flightLine}>
              <View style={styles.line} />
              <Plane color="#00E5FF" size={24} style={{ marginHorizontal: 8 }} />
              <View style={styles.line} />
            </View>
            <Text style={styles.airportCode}>{destination}</Text>
          </View>
          <Text style={styles.searchDetails}>
            May {departureDate}, 2026 • {guests} Passenger{guests > 1 ? 's' : ''} • {flightType === 'one-way' ? 'One Way' : 'Round Trip'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.resultsContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00E5FF" />
            <Text style={styles.loadingText}>Searching hundreds of airlines...</Text>
            <Text style={styles.loadingSub}>Our Hybrid Engine is comparing prices.</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <AlertCircle color="#EF4444" size={48} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>{flights.length} flights found</Text>
              <Text style={styles.resultsSubtitle}>Prices include taxes and fees</Text>
            </View>
            
            {flights.map((flight, idx) => {
              const isCheapest = idx === 0;
              return (
                <View key={flight.id} style={[styles.flightCard, isCheapest && styles.cheapestCard]}>
                  {isCheapest && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Cheapest</Text>
                    </View>
                  )}
                  
                  <View style={styles.cardContent}>
                    {/* Airline & Times */}
                    <View style={styles.flightInfo}>
                      <View style={styles.airlineRow}>
                        <View style={styles.airlineLogoPlaceholder}>
                          <Plane color="#0A192F" size={16} />
                        </View>
                        <Text style={styles.airlineName}>{flight.airline}</Text>
                        <Text style={styles.flightNum}>{flight.flightNum}</Text>
                      </View>
                      
                      <View style={styles.timeRow}>
                        <View style={styles.timeBlock}>
                          <Text style={styles.timeText}>{flight.departure.split(' ')[1]}</Text>
                          <Text style={styles.airportText}>{origin}</Text>
                        </View>
                        
                        <View style={styles.durationBlock}>
                          <Text style={styles.durationText}>{flight.duration}</Text>
                          <View style={styles.durationLine} />
                          <Text style={styles.directText}>{flight.isDirect ? 'Direct' : '1 Stop'}</Text>
                        </View>
                        
                        <View style={styles.timeBlock}>
                          <Text style={styles.timeText}>{flight.arrival.split(' ')[1]}</Text>
                          <Text style={styles.airportText}>{destination}</Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Price & Action */}
                    <View style={styles.priceActionBlock}>
                      <Text style={styles.priceText}>{flight.price.toFixed(2)} <Text style={styles.currencyText}>{flight.currency}</Text></Text>
                      <Text style={styles.providerHint}>via {flight.provider}</Text>
                      <TouchableOpacity style={styles.bookButton} onPress={() => handleBook(flight)}>
                        <Text style={styles.bookButtonText}>Select</Text>
                        <ArrowRight color="#FFF" size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {/* Ancillaries / Extras */}
                  <View style={styles.cardFooter}>
                    <View style={styles.featureItem}>
                      <CheckCircle2 color="#10B981" size={14} />
                      <Text style={styles.featureText}>Cabin bag included</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Info color="#94A3B8" size={14} />
                      <Text style={styles.featureText}>Checked bag extra</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: { width: '100%', maxWidth: 800, alignItems: 'center' },
  routeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  airportCode: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  flightLine: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16 },
  line: { height: 2, width: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  searchDetails: { fontSize: 16, color: '#E2E8F0', fontWeight: '500' },
  
  resultsContainer: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { fontSize: 20, fontWeight: 'bold', color: '#0A192F', marginTop: 24 },
  loadingSub: { fontSize: 15, color: '#64748B', marginTop: 8 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  errorText: { fontSize: 18, color: '#EF4444', marginTop: 16, fontWeight: '600' },
  
  listContainer: { width: '100%', maxWidth: 800, alignSelf: 'center', marginTop: -20 },
  resultsHeader: { marginBottom: 20, paddingHorizontal: 8 },
  resultsCount: { fontSize: 22, fontWeight: 'bold', color: '#0A192F' },
  resultsSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  
  flightCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  cheapestCard: {
    borderColor: '#00E5FF',
    borderWidth: 2,
  },
  badge: {
    backgroundColor: '#00E5FF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 16,
  },
  badgeText: { color: '#0A192F', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  cardContent: {
    padding: 24,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  flightInfo: { flex: 1 },
  airlineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  airlineLogoPlaceholder: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  airlineName: { fontSize: 16, fontWeight: '700', color: '#0A192F', marginRight: 8 },
  flightNum: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: Platform.OS === 'web' ? 40 : 0 },
  timeBlock: { alignItems: 'center' },
  timeText: { fontSize: 22, fontWeight: '900', color: '#0A192F' },
  airportText: { fontSize: 15, color: '#64748B', fontWeight: '600', marginTop: 4 },
  
  durationBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  durationText: { fontSize: 13, color: '#64748B', marginBottom: 4, fontWeight: '500' },
  durationLine: { height: 2, width: '100%', backgroundColor: '#E2E8F0', marginVertical: 4 },
  directText: { fontSize: 12, color: '#10B981', fontWeight: 'bold' },
  
  priceActionBlock: { 
    alignItems: Platform.OS === 'web' ? 'flex-end' : 'center', 
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderTopWidth: Platform.OS === 'web' ? 0 : 1,
    borderColor: '#E2E8F0',
    paddingLeft: Platform.OS === 'web' ? 32 : 0,
    paddingTop: Platform.OS === 'web' ? 0 : 24,
    marginTop: Platform.OS === 'web' ? 0 : 24,
    minWidth: 160
  },
  priceText: { fontSize: 32, fontWeight: '900', color: '#0A192F' },
  currencyText: { fontSize: 18, color: '#64748B', fontWeight: '600' },
  providerHint: { fontSize: 11, color: '#CBD5E1', marginBottom: 16 },
  bookButton: {
    backgroundColor: '#0A192F',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: Platform.OS === 'web' ? 'auto' : '100%',
    justifyContent: 'center',
    gap: 8
  },
  bookButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  cardFooter: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 13, color: '#64748B', fontWeight: '500' }
});
