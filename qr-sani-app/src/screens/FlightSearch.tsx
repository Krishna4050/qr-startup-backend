import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Image, Modal, useWindowDimensions, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Plane, ArrowRight, Clock, Info, CheckCircle2, AlertCircle, Briefcase, Backpack, X, Leaf, ChevronUp, ChevronDown, Bed, Car, Heart } from 'lucide-react-native';
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
  layoverAirports: string[];
  layoverDuration: number;
  departureTime: string;
}

const Accordion = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <View style={{ marginBottom: 16, borderBottomWidth: 1, borderColor: '#E2E8F0', paddingBottom: 16 }}>
      <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOpen ? 16 : 0 }} onPress={() => setIsOpen(!isOpen)}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0A192F' }}>{title}</Text>
        <Text style={{ fontSize: 18, color: '#0A192F', fontWeight: 'bold' }}>{isOpen ? '-' : '+'}</Text>
      </TouchableOpacity>
      {isOpen && <View>{children}</View>}
    </View>
  );
};

export default function FlightSearch() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  
  // Params from WebHeader
  const routeOrigin = route.params?.origin || 'HEL';
  const routeDestination = route.params?.destination || 'JFK';
  
  // Prevent Duffel 400 errors by validating date
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  const fallbackDate = tmrw.toISOString().split('T')[0];
  
  let initialDate = route.params?.departureDate;
  if (!initialDate || new Date(initialDate) < new Date()) {
    initialDate = fallbackDate;
  }
  const routeDate = initialDate;

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
  const [maxLayoverMin, setMaxLayoverMin] = useState<number>(9999);
  const [maxDepartureTime, setMaxDepartureTime] = useState<number>(24 * 60);
  const [selectedLayoverAirports, setSelectedLayoverAirports] = useState<string[]>([]);
  const [requireLowEmissions, setRequireLowEmissions] = useState(false);

  // Sort State
  const [sortType, setSortType] = useState<'best' | 'cheapest' | 'fastest'>('best');

  const { width } = useWindowDimensions();
  const isMobile = width < 1024;
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchDatePrices(currentDate);
  }, [routeOrigin, routeDestination]);

  useEffect(() => {
    fetchFlights(currentDate);
  }, [routeOrigin, routeDestination, currentDate, guests, flightType, cabinClass]);

  // Set initial max durations when flights load
  useEffect(() => {
    if (flights.length > 0) {
      setMaxDurationMin(Math.max(...flights.map(f => getDurationMinutes(f.duration))));
      setMaxLayoverMin(Math.max(...flights.map(f => f.layoverDuration || 0)));
      setMaxDepartureTime(24 * 60);
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
    } catch (err: any) {
      console.error("Flight Search Error:", err);
      setError(err.message || "Network error connecting to flight engine.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = (flight: FlightOffer) => {
    alert(`Redirecting you to ${flight.airline} to complete your booking...`);
    if (Platform.OS === 'web') {
      window.open('https://www.skyscanner.net', '_blank');
    }
  };

  const getDurationMinutes = (dur: string) => {
    if (!dur) return 9999;
    let minutes = 0;
    const dMatch = dur.match(/P(\d+)D/i);
    const hMatch = dur.match(/(\d+)H/i);
    const mMatch = dur.match(/(\d+)M/i);
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
  const availableLayoverAirports = Array.from(new Set(flights.flatMap(f => f.layoverAirports || []))).sort();

  const toggleAirline = (airline: string) => {
    setSelectedAirlines(prev => prev.includes(airline) ? prev.filter(a => a !== airline) : [...prev, airline]);
  };

  const toggleLayoverAirport = (airport: string) => {
    setSelectedLayoverAirports(prev => prev.includes(airport) ? prev.filter(a => a !== airport) : [...prev, airport]);
  };

  const toggleStop = (type: 'direct' | 'oneStop' | 'multiStop') => {
    setStopFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const parseDepartureMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hh, mm] = timeStr.split(':');
    return parseInt(hh) * 60 + parseInt(mm);
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

    // Layover Airports
    if (selectedLayoverAirports.length > 0) {
      if (!f.layoverAirports || !f.layoverAirports.some(a => selectedLayoverAirports.includes(a))) return false;
    }

    // Departure Time
    if (f.departureTime && parseDepartureMinutes(f.departureTime) > maxDepartureTime) return false;

    // Trip Duration
    if (getDurationMinutes(f.duration) > maxDurationMin) return false;

    // Layover Duration
    if ((f.layoverDuration || 0) > maxLayoverMin) return false;

    // Emissions (Mock)
    if (requireLowEmissions && Math.random() > 0.5) return false; // Mock 50% have low emissions

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
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
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

      <View style={[styles.contentWrapper, isMobile && { flexDirection: 'column' }]}>
        
        {/* Render Sidebar either inline or in Modal */}
        {(() => {
          const sidebarContent = (
            <View style={isMobile ? { flex: 1, padding: 16 } : styles.sidebar}>
            {/* Stops */}
            <Accordion title="Stops">
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
            </Accordion>

            {/* Departure Times */}
            <Accordion title="Departure times" defaultOpen={false}>
              <Text style={{fontSize: 14, color: '#00E5FF', fontWeight: 'bold', marginBottom: 12}}>
                Before {Math.floor(maxDepartureTime / 60).toString().padStart(2, '0')}:{(maxDepartureTime % 60).toString().padStart(2, '0')}
              </Text>
              {React.createElement('input', {
                type: 'range',
                min: '0',
                max: '1440',
                step: '30',
                value: maxDepartureTime,
                onChange: (e: any) => setMaxDepartureTime(parseInt(e.target.value)),
                style: { width: '100%', cursor: 'pointer', accentColor: '#00E5FF' } as any
              })}
            </Accordion>

            {/* Trip Duration Slider */}
            <Accordion title="Trip duration" defaultOpen={false}>
              <Text style={{fontSize: 14, color: '#00E5FF', fontWeight: 'bold', marginBottom: 12}}>{formatMinDuration(maxDurationMin)}</Text>
              {React.createElement('input', {
                type: 'range',
                min: '60',
                max: Math.max(...flights.map(f => getDurationMinutes(f.duration)), 120),
                value: maxDurationMin,
                onChange: (e: any) => setMaxDurationMin(parseInt(e.target.value)),
                style: { width: '100%', cursor: 'pointer', accentColor: '#00E5FF' } as any
              })}
            </Accordion>

            {/* Layovers */}
            <Accordion title="Layovers" defaultOpen={false}>
              <Text style={{fontSize: 14, color: '#00E5FF', fontWeight: 'bold', marginBottom: 12}}>Max layover: {formatMinDuration(maxLayoverMin)}</Text>
              {React.createElement('input', {
                type: 'range',
                min: '0',
                max: Math.max(...flights.map(f => f.layoverDuration || 0), 120),
                value: maxLayoverMin,
                onChange: (e: any) => setMaxLayoverMin(parseInt(e.target.value)),
                style: { width: '100%', cursor: 'pointer', accentColor: '#00E5FF', marginBottom: 16 } as any
              })}
              
              <Text style={{fontSize: 14, fontWeight: 'bold', color: '#0A192F', marginBottom: 12}}>Layover airports</Text>
              {availableLayoverAirports.length === 0 && <Text style={{fontSize: 13, color: '#94A3B8'}}>No layovers available</Text>}
              {availableLayoverAirports.map(airport => (
                <TouchableOpacity key={airport} style={styles.checkboxRow} onPress={() => toggleLayoverAirport(airport)}>
                  <View style={[styles.checkbox, selectedLayoverAirports.includes(airport) && styles.checkboxActive]}>
                    {selectedLayoverAirports.includes(airport) && <CheckCircle2 color="#0A192F" size={14} />}
                  </View>
                  <Text style={styles.checkboxLabel}>{airport}</Text>
                </TouchableOpacity>
              ))}
            </Accordion>

            {/* Baggage */}
            <Accordion title="Baggage" defaultOpen={false}>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setRequireCarryOn(!requireCarryOn)}>
                <View style={[styles.checkbox, requireCarryOn && styles.checkboxActive]}>
                  {requireCarryOn && <CheckCircle2 color="#0A192F" size={14} />}
                </View>
                <Backpack color="#64748B" size={16} style={{marginRight: 8}}/>
                <Text style={styles.checkboxLabel}>Carry-on bag (+€15 if not free)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setRequireChecked(!requireChecked)}>
                <View style={[styles.checkbox, requireChecked && styles.checkboxActive]}>
                  {requireChecked && <CheckCircle2 color="#0A192F" size={14} />}
                </View>
                <Briefcase color="#64748B" size={16} style={{marginRight: 8}}/>
                <Text style={styles.checkboxLabel}>Checked bag (+€45 if not free)</Text>
              </TouchableOpacity>
            </Accordion>

            {/* Airlines */}
            <Accordion title="Airlines">
              {availableAirlines.map(airline => (
                <TouchableOpacity key={airline} style={styles.checkboxRow} onPress={() => toggleAirline(airline)}>
                  <View style={[styles.checkbox, selectedAirlines.includes(airline) && styles.checkboxActive]}>
                    {selectedAirlines.includes(airline) && <CheckCircle2 color="#0A192F" size={14} />}
                  </View>
                  <Text style={styles.checkboxLabel}>{airline}</Text>
                </TouchableOpacity>
              ))}
            </Accordion>

            {/* Flight Emissions */}
            <Accordion title="Flight emissions" defaultOpen={false}>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => setRequireLowEmissions(!requireLowEmissions)}>
                <View style={[styles.checkbox, requireLowEmissions && styles.checkboxActive]}>
                  {requireLowEmissions && <CheckCircle2 color="#0A192F" size={14} />}
                </View>
                <Leaf color="#10B981" size={16} style={{marginRight: 8}}/>
                <Text style={styles.checkboxLabel}>Only show flights with lower CO2 emissions</Text>
              </TouchableOpacity>
            </Accordion>
            </View>
          );

          return (
            <>
              {!isMobile && Platform.OS === 'web' && sidebarContent}
              <Modal visible={showMobileFilters} animationType="slide" onRequestClose={() => setShowMobileFilters(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0A192F' }}>Filters</Text>
                    <TouchableOpacity onPress={() => setShowMobileFilters(false)}>
                      <X color="#0A192F" size={24} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ flex: 1 }}>
                    {sidebarContent}
                  </ScrollView>
                  <View style={{ padding: 16, borderTopWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' }}>
                    <TouchableOpacity style={{ backgroundColor: '#0A192F', padding: 16, borderRadius: 8, alignItems: 'center' }} onPress={() => setShowMobileFilters(false)}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Show {sortedFlights.length} flights</Text>
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </Modal>
            </>
          );
        })()}

        <View style={[styles.mainContent, isMobile && { minWidth: '100%' }]}>
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

              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <Text style={styles.resultsCount}>{sortedFlights.length} results sorted by {sortType}</Text>
                <TouchableOpacity onPress={() => fetchFlights(currentDate)} style={{backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16}}>
                  <Text style={{fontSize: 12, color: '#0A192F', fontWeight: '600'}}>Refresh Live Prices</Text>
                </TouchableOpacity>
              </View>

              {isMobile && (
                <TouchableOpacity 
                  style={{ backgroundColor: '#E2E8F0', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16, flexDirection: 'row', justifyContent: 'center' }} 
                  onPress={() => setShowMobileFilters(true)}
                >
                  <Text style={{ color: '#0A192F', fontWeight: 'bold', fontSize: 16 }}>Filter & Sort</Text>
                </TouchableOpacity>
              )}

              <View style={{ paddingBottom: 100 }}>
                {sortedFlights.map((flight, idx) => (
                  <View key={flight.id + idx} style={styles.flightCard}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.emissionText}>This flight emits less CO2e than typical on this route</Text>
                      <Info color="#64748B" size={14} style={{marginLeft: 6}} />
                    </View>
                    
                    <View style={styles.cardContent}>
                      <View style={styles.airlineRow}>
                        <View style={styles.airlineLogoPlaceholder}>
                          <Plane color="#0A192F" size={20} />
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.airlineName} numberOfLines={1}>{flight.airline}</Text>
                          {flight.provider !== 'duffel' && <Text style={{fontSize: 10, color: '#94A3B8'}}>Operated by {flight.airline}</Text>}
                        </View>
                      </View>
                      
                      <View style={styles.timeRow}>
                        <View style={styles.timeBlock}>
                          <Text style={styles.timeText}>{flight.departure.split('T')[1]?.slice(0,5) || flight.departure.split(' ')[1]}</Text>
                          <Text style={styles.airportText}>{routeOrigin}</Text>
                        </View>
                        
                        <View style={styles.durationBlock}>
                          <Text style={styles.durationText}>{formatDuration(flight.duration)}</Text>
                          <View style={styles.durationLineContainer}>
                            <View style={styles.durationLine} />
                            <Plane color="#CBD5E1" size={14} style={{marginHorizontal: 8}} />
                            <View style={styles.durationLine} />
                          </View>
                          <Text style={[styles.directText, !flight.isDirect && {color: '#EF4444'}]}>
                            {flight.isDirect ? 'Direct' : flight.stops + (flight.stops > 1 ? ' Stops' : ' Stop')}
                          </Text>
                          {!flight.isDirect && flight.layoverAirports && flight.layoverAirports.length > 0 && (
                            <Text style={{fontSize: 10, color: '#64748B', marginTop: 2, textAlign: 'center'}}>
                              {formatMinDuration(flight.layoverDuration)} in {flight.layoverAirports.join(', ')}
                            </Text>
                          )}
                        </View>
                        
                        <View style={styles.timeBlock}>
                          <Text style={styles.timeText}>{flight.arrival.split('T')[1]?.slice(0,5) || flight.arrival.split(' ')[1]}</Text>
                          <Text style={styles.airportText}>{routeDestination}</Text>
                        </View>
                      </View>

                      <View style={styles.priceActionBlock}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start'}}>
                          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8}}>
                            <Briefcase size={14} color={flight.hasCarryOnBag || !requireCarryOn ? "#10B981" : "#F59E0B"} />
                            <Backpack size={14} color={flight.hasCheckedBag || !requireChecked ? "#10B981" : "#F59E0B"} />
                          </View>
                          <Heart size={20} color="#94A3B8" />
                        </View>
                        <Text style={styles.providerHint}>1 deal from</Text>
                        <Text style={styles.priceText}>€{Math.round(getCalculatedPrice(flight))}</Text>
                        <TouchableOpacity style={styles.bookButton} onPress={() => handleBook(flight)}>
                          <Text style={styles.bookButtonText}>Select</Text>
                          <ArrowRight color="#FFF" size={16} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {!isMobile && Platform.OS === 'web' && (
          <View style={styles.rightSidebar}>
            <View style={styles.crossSellCard}>
              <View style={styles.crossSellHeader}>
                <Bed color="#FFF" size={20} />
                <Text style={styles.crossSellTitle}>Need a Hotel?</Text>
              </View>
              <View style={styles.crossSellBody}>
                <Text style={styles.crossSellDesc}>Find great deals on stays in {routeDestination}.</Text>
                <TouchableOpacity style={styles.crossSellBtn} onPress={() => alert(`Redirecting to hotel search for ${routeDestination}...`)}>
                  <Text style={styles.crossSellBtnText}>Search Hotels</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.crossSellCard}>
              <View style={styles.crossSellHeader}>
                <Car color="#FFF" size={20} />
                <Text style={styles.crossSellTitle}>Car Rental</Text>
              </View>
              <View style={styles.crossSellBody}>
                <Text style={styles.crossSellDesc}>Explore {routeDestination} at your own pace.</Text>
                <TouchableOpacity style={styles.crossSellBtn} onPress={() => alert(`Redirecting to car rentals in ${routeDestination}...`)}>
                  <Text style={styles.crossSellBtnText}>Find Cars</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: { width: '100%', alignItems: 'center' },
  
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
    width: '100%', 
    padding: 20, 
    gap: 24, 
    alignItems: 'flex-start' 
  },
  sidebar: {
    width: 200,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
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
    minWidth: 500,
  },
  rightSidebar: {
    width: 280,
    gap: 16
  },
  crossSellCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2
  },
  crossSellHeader: {
    backgroundColor: '#0A192F',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  crossSellTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  crossSellBody: { padding: 16 },
  crossSellDesc: { fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 20 },
  crossSellBtn: { backgroundColor: '#00E5FF', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  crossSellBtnText: { color: '#0A192F', fontWeight: 'bold', fontSize: 14 },
  
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
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  cardHeader: { backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center' },
  emissionText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  cardContent: {
    padding: 24,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  airlineRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginBottom: Platform.OS === 'web' ? 0 : 16 },
  airlineLogoPlaceholder: { width: 40, height: 40, borderRadius: 4, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  airlineName: { fontSize: 15, fontWeight: 'bold', color: '#0A192F' },

  timeRow: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Platform.OS === 'web' ? 16 : 0 },
  timeBlock: { alignItems: 'center', width: 64 },
  timeText: { fontSize: 22, fontWeight: 'bold', color: '#0A192F' },
  airportText: { fontSize: 14, color: '#64748B', marginTop: 4 },

  durationBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 16, minWidth: 100 },
  durationText: { fontSize: 13, color: '#64748B', marginBottom: 6 },
  durationLineContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 6 },
  durationLine: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  directText: { fontSize: 12, color: '#10B981' },

  priceActionBlock: { 
    flex: 1,
    alignItems: 'flex-end', 
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#E2E8F0',
    paddingLeft: Platform.OS === 'web' ? 24 : 0,
    marginTop: Platform.OS === 'web' ? 0 : 24,
  },
  priceText: { fontSize: 28, fontWeight: 'bold', color: '#0A192F', marginBottom: 12 },
  providerHint: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  bookButton: {
    backgroundColor: '#0A192F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    gap: 8
  },
  bookButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  loadingText: { fontSize: 20, fontWeight: 'bold', color: '#0A192F', marginTop: 24 },
  loadingSub: { fontSize: 15, color: '#64748B', marginTop: 8 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  errorText: { fontSize: 18, color: '#EF4444', marginTop: 16, fontWeight: '600' },
});
