import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Plane, ArrowRight, Clock, Info, CheckCircle2, AlertCircle, Briefcase, Backpack, X } from 'lucide-react-native';
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
  stops: number;
  hasCheckedBag: boolean;
  hasCarryOnBag: boolean;
  checkedBagPrice: number;
  carryOnBagPrice: number;
}

export default function FlightSearch() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  // Params from WebHeader
  const routeOrigin = route.params?.origin || 'HEL';
  const routeDestination = route.params?.destination || 'JFK';
  const routeDate = route.params?.departureDate || '2026-05-12';
  const guests = route.params?.guests || 1;
  const flightType = route.params?.type || 'round-trip';
  const cabinClass = route.params?.cabinClass || 'economy';
  const initDirectOnly = route.params?.directOnly || false;

  const [currentDate, setCurrentDate] = useState(routeDate);

  const [isLoading, setIsLoading] = useState(true);
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Date Navigator state
  const [datePrices, setDatePrices] = useState<Record<string, number>>({});
  const [datesLoading, setDatesLoading] = useState(false);

  // Filters State
  const [stopFilters, setStopFilters] = useState({
    direct: initDirectOnly,
    oneStop: false,
    multiStop: false
  });
  const [requireCarryOn, setRequireCarryOn] = useState(false);
  const [requireChecked, setRequireChecked] = useState(false);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [maxDurationMin, setMaxDurationMin] = useState<number>(9999);

  // Sort State
  const [sortType, setSortType] = useState<'best' | 'cheapest' | 'fastest'>('best');

  useEffect(() => {
    fetchDatePrices(currentDate);
  }, [routeOrigin, routeDestination]);

  useEffect(() => {
    fetchFlights(currentDate);
  }, [routeOrigin, routeDestination, currentDate, guests, flightType, cabinClass]);

  // Set initial max duration when flights load
  useEffect(() => {
    if (flights.length > 0) {
      setMaxDurationMin(Math.max(...flights.map(f => getDurationMinutes(f.duration))));
    }
  }, [flights]);

  const fetchDatePrices = async (targetDate: string) => {
    try {
      setDatesLoading(true);
      const res = await apiClient.get(`/api/flights/dates?origin=${routeOrigin}&destination=${routeDestination}&date=${targetDate}`);
      if (res.data?.status === 'success') {
        setDatePrices(res.data.data);
      }
    } catch (e) {
      console.error("Failed to fetch date prices", e);
    } finally {
      setDatesLoading(false);
    }
  };

  const fetchFlights = async (dateStr: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.post('/api/flights/search', {
        origin: routeOrigin,
        destination: routeDestination,
        departureDate: dateStr,
        type: flightType,
        guests,
        cabinClass,
        directOnly: false // Fetch all, filter locally
      });
      
      if (res.data?.status === 'success') {
        setFlights(res.data.data);
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

  const handleBook = (flight: FlightOffer) => {
    alert(`Initiating booking for ${flight.airline} ${flight.flightNum} via ${flight.provider} provider at ${flight.price} ${flight.currency}. Phase 3 Checkout coming next!`);
  };

  const getDurationMinutes = (dur: string) => {
    let minutes = 0;
    const dMatch = dur.match(/P(\d+)D/);
    const hMatch = dur.match(/(\d+)H/);
    const mMatch = dur.match(/(\d+)M/);
    if (dMatch) minutes += parseInt(dMatch[1]) * 24 * 60;
    if (hMatch) minutes += parseInt(hMatch[1]) * 60;
    if (mMatch) minutes += parseInt(mMatch[1]);
    return minutes || 9999;
  };

  const formatDuration = (dur: string) => {
    let minutes = getDurationMinutes(dur);
    if (minutes === 9999) return dur;
    return `${Math.floor(minutes/60)}h ${minutes%60}m`;
  };

  const formatMinDuration = (minutes: number) => {
    if (minutes === 9999) return 'Any';
    return `${Math.floor(minutes/60)}h ${minutes%60}m`;
  };

  const availableAirlines = Array.from(new Set(flights.map(f => f.airline))).sort();

  const toggleAirline = (airline: string) => {
    setSelectedAirlines(prev => 
      prev.includes(airline) ? prev.filter(a => a !== airline) : [...prev, airline]
    );
  };

  const toggleStop = (type: 'direct' | 'oneStop' | 'multiStop') => {
    setStopFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Filter Logic
  const filteredFlights = flights.filter(f => {
    // Stops
    const stopsActive = stopFilters.direct || stopFilters.oneStop || stopFilters.multiStop;
    if (stopsActive) {
      if (stopFilters.direct && f.stops === 0) { /* valid */ }
      else if (stopFilters.oneStop && f.stops === 1) { /* valid */ }
      else if (stopFilters.multiStop && f.stops > 1) { /* valid */ }
      else return false;
    }

    // Airlines
    if (selectedAirlines.length > 0 && !selectedAirlines.includes(f.airline)) return false;

    // Duration
    if (getDurationMinutes(f.duration) > maxDurationMin) return false;

    return true;
  });

  const getCalculatedPrice = (f: FlightOffer) => {
    let p = f.price;
    if (requireChecked && !f.hasCheckedBag) p += f.checkedBagPrice;
    if (requireCarryOn && !f.hasCarryOnBag) p += f.carryOnBagPrice;
    return p;
  };

  // Sort Logic
  const sortedFlights = [...filteredFlights].sort((a, b) => {
    if (sortType === 'cheapest') return getCalculatedPrice(a) - getCalculatedPrice(b);
    if (sortType === 'fastest') return getDurationMinutes(a.duration) - getDurationMinutes(b.duration);
    const aScore = getCalculatedPrice(a) + (getDurationMinutes(a.duration) * 0.5);
    const bScore = getCalculatedPrice(b) + (getDurationMinutes(b.duration) * 0.5);
    return aScore - bScore;
  });

  const availableDates = Object.keys(datePrices).sort();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F2D4D', '#174871']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.routeHeader}>
            <Text style={styles.airportCode}>{routeOrigin}</Text>
            <View style={styles.flightLine}>
              <View style={styles.line} />
              <Plane color="#00E5FF" size={24} style={{ marginHorizontal: 8 }} />
              <View style={styles.line} />
            </View>
            <Text style={styles.airportCode}>{routeDestination}</Text>
          </View>
          <Text style={styles.searchDetails}>
            {currentDate} • {guests} Passenger{guests > 1 ? 's' : ''} • {cabinClass}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.dateNavigatorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateNavigator}>
          {datesLoading && availableDates.length === 0 ? (
            <Text style={{color: '#94A3B8', padding: 16}}>Loading live prices from Duffel...</Text>
          ) : (
            availableDates.map(d => (
              <TouchableOpacity 
                key={d} 
                style={[styles.dateNavBtn, currentDate === d && styles.dateNavBtnActive]}
                onPress={() => setCurrentDate(d)}
              >
                <Text style={[styles.dateNavDate, currentDate === d && styles.dateNavDateActive]}>{d.split('-').slice(1).join('/')}</Text>
                <Text style={[styles.dateNavPrice, currentDate === d && styles.dateNavPriceActive]}>€{Math.round(datePrices[d])}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.contentWrapper}>
        {Platform.OS === 'web' && (
          <View style={styles.sidebar}>
            {/* Stops */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Stops</Text>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleStop('direct')}>
                <View style={[styles.checkbox, stopFilters.direct && styles.checkboxActive]}>
                  {stopFilters.direct && <CheckCircle2 color="#0A192F" size={14} />}
                </View>
                <Text style={styles.checkboxLabel}>Direct</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleStop('oneStop')}>
                <View style={[styles.checkbox, stopFilters.oneStop && styles.checkboxActive]}>
                  {stopFilters.oneStop && <CheckCircle2 color="#0A192F" size={14} />}
                </View>
                <Text style={styles.checkboxLabel}>1 Stop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleStop('multiStop')}>
                <View style={[styles.checkbox, stopFilters.multiStop && styles.checkboxActive]}>
                  {stopFilters.multiStop && <CheckCircle2 color="#0A192F" size={14} />}
                </View>
                <Text style={styles.checkboxLabel}>2+ Stops</Text>
              </TouchableOpacity>
            </View>

            {/* Trip Duration Slider */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Max Trip Duration</Text>
              <Text style={{fontSize: 14, color: '#00E5FF', fontWeight: 'bold', marginBottom: 12}}>{formatMinDuration(maxDurationMin)}</Text>
              {React.createElement('input', {
                type: 'range',
                min: '60',
                max: Math.max(...flights.map(f => getDurationMinutes(f.duration)), 120),
                value: maxDurationMin,
                onChange: (e: any) => setMaxDurationMin(parseInt(e.target.value)),
                style: { width: '100%', cursor: 'pointer', accentColor: '#00E5FF' } as any
              })}
            </View>

            {/* Baggage */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Baggage Included</Text>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setRequireCarryOn(!requireCarryOn)}>
                <View style={[styles.checkbox, requireCarryOn && styles.checkboxActive]}>
                  {requireCarryOn && <CheckCircle2 color="#0A192F" size={14} />}
                </View>
                <Backpack color="#64748B" size={16} style={{marginRight: 8}}/>
                <Text style={styles.checkboxLabel}>Carry-on bag</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setRequireChecked(!requireChecked)}>
                <View style={[styles.checkbox, requireChecked && styles.checkboxActive]}>
                  {requireChecked && <CheckCircle2 color="#0A192F" size={14} />}
                </View>
                <Briefcase color="#64748B" size={16} style={{marginRight: 8}}/>
                <Text style={styles.checkboxLabel}>Checked bag</Text>
              </TouchableOpacity>
            </View>

            {/* Airlines */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Airlines</Text>
              {availableAirlines.map(airline => (
                <TouchableOpacity key={airline} style={styles.checkboxRow} onPress={() => toggleAirline(airline)}>
                  <View style={[styles.checkbox, selectedAirlines.includes(airline) && styles.checkboxActive]}>
                    {selectedAirlines.includes(airline) && <CheckCircle2 color="#0A192F" size={14} />}
                  </View>
                  <Text style={styles.checkboxLabel}>{airline}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.mainContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00E5FF" />
              <Text style={styles.loadingText}>Searching hundreds of airlines...</Text>
              <Text style={styles.loadingSub}>Fetching live pricing and dates...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle color="#EF4444" size={48} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tab, sortType === 'best' && styles.tabActive]} onPress={() => setSortType('best')}>
                  <Text style={[styles.tabTitle, sortType === 'best' && styles.tabTitleActive]}>Best</Text>
                  {flights.length > 0 && <Text style={[styles.tabSub, sortType === 'best' && styles.tabSubActive]}>€{Math.round(sortedFlights[0]?.price || flights[0]?.price)}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, sortType === 'cheapest' && styles.tabActive]} onPress={() => setSortType('cheapest')}>
                  <Text style={[styles.tabTitle, sortType === 'cheapest' && styles.tabTitleActive]}>Cheapest</Text>
                  {flights.length > 0 && <Text style={[styles.tabSub, sortType === 'cheapest' && styles.tabSubActive]}>€{Math.round(Math.min(...flights.map(f => f.price)))}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, sortType === 'fastest' && styles.tabActive]} onPress={() => setSortType('fastest')}>
                  <Text style={[styles.tabTitle, sortType === 'fastest' && styles.tabTitleActive]}>Fastest</Text>
                  {flights.length > 0 && <Text style={[styles.tabSub, sortType === 'fastest' && styles.tabSubActive]}>
                    {formatDuration([...flights].sort((a,b) => getDurationMinutes(a.duration) - getDurationMinutes(b.duration))[0]?.duration)}
                  </Text>}
                </TouchableOpacity>
              </View>

              <Text style={styles.resultsCount}>{sortedFlights.length} results sorted by {sortType}</Text>

              <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {sortedFlights.map((flight, idx) => (
                  <View key={flight.id + idx} style={styles.flightCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.emissionText}>This flight emits less CO2e than typical on this route</Text>
                    </View>
                    
                    <View style={styles.cardContent}>
                      <View style={styles.airlineRow}>
                        <View style={styles.airlineLogoPlaceholder}>
                          <Plane color="#0A192F" size={16} />
                        </View>
                        <Text style={styles.airlineName} numberOfLines={1}>{flight.airline}</Text>
                      </View>
                      
                      <View style={styles.timeRow}>
                        <View style={styles.timeBlock}>
                          <Text style={styles.timeText}>{flight.departure.split('T')[1]?.slice(0,5) || flight.departure.split(' ')[1]}</Text>
                          <Text style={styles.airportText}>{routeOrigin}</Text>
                        </View>
                        
                        <View style={styles.durationBlock}>
                          <Text style={styles.durationText}>{formatDuration(flight.duration)}</Text>
                          <View style={styles.durationLine}>
                            {!flight.isDirect && <View style={styles.stopDot} />}
                          </View>
                          <Text style={[styles.directText, !flight.isDirect && {color: '#EF4444'}]}>
                            {flight.isDirect ? 'Direct' : flight.stops + (flight.stops > 1 ? ' Stops' : ' Stop')}
                          </Text>
                        </View>
                        
                        <View style={styles.timeBlock}>
                          <Text style={styles.timeText}>{flight.arrival.split('T')[1]?.slice(0,5) || flight.arrival.split(' ')[1]}</Text>
                          <Text style={styles.airportText}>{routeDestination}</Text>
                        </View>
                      </View>

                      <View style={styles.priceActionBlock}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, justifyContent: 'flex-end'}}>
                          <Briefcase size={12} color={flight.hasCarryOnBag || !requireCarryOn ? "#10B981" : "#F59E0B"} />
                          <Backpack size={12} color={flight.hasCheckedBag || !requireChecked ? "#10B981" : "#F59E0B"} />
                        </View>
                        <Text style={styles.providerHint}>via {flight.provider}</Text>
                        <Text style={styles.priceText}>€{Math.round(getCalculatedPrice(flight))}</Text>
                        <TouchableOpacity style={styles.bookButton} onPress={() => handleBook(flight)}>
                          <Text style={styles.bookButtonText}>Select</Text>
                          <ArrowRight color="#FFF" size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: { width: '100%', maxWidth: 1000, alignItems: 'center' },
  routeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  airportCode: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  flightLine: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16 },
  line: { height: 2, width: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  searchDetails: { fontSize: 16, color: '#E2E8F0', fontWeight: '500' },
  
  dateNavigatorContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center'
  },
  dateNavigator: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    alignItems: 'center',
    minWidth: '100%',
    justifyContent: 'center'
  },
  dateNavBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  dateNavBtnActive: {
    backgroundColor: '#0F2D4D',
    borderColor: '#0F2D4D'
  },
  dateNavDate: { fontSize: 14, color: '#64748B', fontWeight: '600', marginBottom: 6 },
  dateNavDateActive: { color: '#E2E8F0' },
  dateNavPrice: { fontSize: 18, color: '#0A192F', fontWeight: 'bold' },
  dateNavPriceActive: { color: '#00E5FF' },

  contentWrapper: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
    padding: 20,
    gap: 24
  },
  sidebar: {
    width: 250,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2
  },
  filterSection: { marginBottom: 24 },
  filterTitle: { fontSize: 16, fontWeight: 'bold', color: '#0A192F', marginBottom: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#CBD5E1', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { borderColor: '#00E5FF', backgroundColor: '#00E5FF' },
  checkboxLabel: { fontSize: 14, color: '#334155' },

  mainContent: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8
  },
  tabActive: { backgroundColor: '#0F2D4D' },
  tabTitle: { fontSize: 15, fontWeight: 'bold', color: '#64748B' },
  tabTitleActive: { color: '#FFF' },
  tabSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  tabSubActive: { color: '#00E5FF' },

  resultsCount: { fontSize: 14, color: '#64748B', marginBottom: 16 },

  flightCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
    overflow: 'hidden'
  },
  cardHeader: { backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  emissionText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  cardContent: {
    padding: 24,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  airlineRow: { width: 140, flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'web' ? 0 : 16 },
  airlineLogoPlaceholder: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  airlineName: { fontSize: 14, fontWeight: '700', color: '#0A192F', flex: 1 },

  timeRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Platform.OS === 'web' ? 24 : 0 },
  timeBlock: { alignItems: 'center', width: 60 },
  timeText: { fontSize: 18, fontWeight: '900', color: '#0A192F' },
  airportText: { fontSize: 14, color: '#64748B', fontWeight: '600', marginTop: 4 },

  durationBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  durationText: { fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: '600' },
  durationLine: { height: 2, width: '100%', backgroundColor: '#E2E8F0', marginVertical: 4, justifyContent: 'center', alignItems: 'center' },
  stopDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  directText: { fontSize: 12, color: '#10B981', fontWeight: 'bold' },

  priceActionBlock: { 
    alignItems: 'flex-end', 
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#E2E8F0',
    paddingLeft: Platform.OS === 'web' ? 24 : 0,
    marginTop: Platform.OS === 'web' ? 0 : 24,
    width: Platform.OS === 'web' ? 180 : '100%'
  },
  priceText: { fontSize: 24, fontWeight: '900', color: '#0A192F', marginBottom: 12 },
  providerHint: { fontSize: 11, color: '#94A3B8', marginBottom: 4 },
  bookButton: {
    backgroundColor: '#0A192F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    gap: 8
  },
  bookButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { fontSize: 20, fontWeight: 'bold', color: '#0A192F', marginTop: 24 },
  loadingSub: { fontSize: 15, color: '#64748B', marginTop: 8 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  errorText: { fontSize: 18, color: '#EF4444', marginTop: 16, fontWeight: '600' },
});
