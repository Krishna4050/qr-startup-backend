import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Modal, useWindowDimensions, ScrollView, SafeAreaView, TextInput, DeviceEventEmitter, ActivityIndicator, Linking } from 'react-native';
import { Search, Globe, Menu, User, Building2, ChevronDown, Plus, Minus, X, ArrowLeft, ArrowLeftRight, MapPin, Plane, Wrench, Bike, Car, Bed, BusFront, Train, CheckCircle } from 'lucide-react-native';
import { useNavigation, useLinkTo } from '@react-navigation/native';
import WebLink from './WebLink';
import { useAuth } from '../context/AuthContext';
import { supabase_lucifer_core } from '../utils/supabase';
import apiClient from '../utils/apiClient';

const mockAirports: any[] = [];

const DateDropdownComponent = ({ currentMonth, currentYear, todayDate, selectedDate, returnDate, flightType, setShowDateDropdown, setSelectedDate, setReturnDate, setShowGuestDropdown, styles, isMobileOverride }: any) => {
  const [displayMonth, setDisplayMonth] = useState(currentMonth);
  const [displayYear, setDisplayYear] = useState(currentYear);

  const today = new Date();
  const currentM = today.getMonth() + 1;
  const currentY = today.getFullYear();
  const isPrevDisabled = parseInt(displayYear) === currentY && parseInt(displayMonth) === currentM;

  const handlePrevMonth = () => {
    if (isPrevDisabled) return;
    let newM = parseInt(displayMonth) - 1;
    let newY = parseInt(displayYear);
    if (newM < 1) { newM = 12; newY -= 1; }
    setDisplayMonth(newM.toString().padStart(2, '0'));
    setDisplayYear(newY.toString());
  };

  const handleNextMonth = () => {
    let newM = parseInt(displayMonth) + 1;
    let newY = parseInt(displayYear);
    if (newM > 12) { newM = 1; newY += 1; }
    setDisplayMonth(newM.toString().padStart(2, '0'));
    setDisplayYear(newY.toString());
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mIndex = parseInt(displayMonth) - 1;
  const mName = mIndex >= 0 && mIndex < 12 ? monthNames[mIndex] : displayMonth;

  const firstDay = new Date(parseInt(displayYear), mIndex, 1).getDay();
  const blanks = firstDay === 0 ? 6 : firstDay - 1;
  const blankArr = Array.from({ length: blanks });
  
  const daysInMonth = new Date(parseInt(displayYear), mIndex + 1, 0).getDate();
  const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <View style={isMobileOverride ? { width: '100%', paddingVertical: 10 } : [styles.dropdownMenu, { top: 70, left: 0, width: 320, padding: 20 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 8 }} disabled={isPrevDisabled}>
          <Text style={{ color: isPrevDisabled ? '#334155' : '#00E5FF', fontSize: 18 }}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 16 }}>{mName} {displayYear}</Text>
        <TouchableOpacity onPress={handleNextMonth} style={{ padding: 8 }}>
          <Text style={{ color: '#00E5FF', fontSize: 18 }}>{'>'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-start' }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <Text key={`h-${i}`} style={{ width: 35, textAlign: 'center', color: '#94A3B8', fontSize: 12, marginBottom: 8 }}>{day}</Text>
        ))}
        {blankArr.map((_, i) => <View key={`e-${i}`} style={{ width: 35, height: 35 }} />)}
        {daysArr.map(d => {
          const dStr = `${displayYear}-${displayMonth.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          
          const tStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
          
          const isToday = dStr === tStr;
          const isSelected = selectedDate === dStr || returnDate === dStr;
          
          const cellDate = new Date(parseInt(displayYear), mIndex, d);
          const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const isPast = cellDate < todayOnly;

          const bg = isSelected ? '#00E5FF' : isToday ? 'rgba(0, 229, 255, 0.1)' : 'transparent';
          const bw = isToday && !isSelected ? 1 : 0;
          const txtColor = isPast ? '#334155' : isSelected ? '#0A192F' : isToday ? '#00E5FF' : '#E2E8F0';
          const fw = isToday ? 'bold' : 'normal';
          
          let priceColor = '#F59E0B'; 
          if (d >= 12 && d <= 15) priceColor = '#10B981';
          if (d >= 16 && d <= 20) priceColor = '#EF4444';
          
          return (
            <TouchableOpacity 
              key={d} 
              disabled={isPast}
              onPress={() => {
                if (flightType === 'one-way') {
                  setSelectedDate(dStr);
                  setShowDateDropdown(false);
                  setShowGuestDropdown(true);
                } else {
                  if (!selectedDate) setSelectedDate(dStr);
                  else if (!returnDate) { setReturnDate(dStr); setShowDateDropdown(false); setShowGuestDropdown(true); }
                  else { setSelectedDate(dStr); setReturnDate(null); }
                }
              }}
              style={{ 
                width: 35, height: 35, justifyContent: 'center', alignItems: 'center', borderRadius: 17.5, 
                backgroundColor: bg,
                borderWidth: bw,
                borderColor: '#00E5FF',
                marginBottom: 4
              }}
            >
              <Text style={{ color: txtColor, fontWeight: fw as 'bold' | 'normal' }}>{d}</Text>
              {!isPast && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: priceColor, marginTop: 2 }} />}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  );
};

export default function WebHeader({ defaultService = 'Vehicle Repair' }: { defaultService?: string }) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isMobileWeb = width < 1024;
  const linkTo = useLinkTo();

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showFlightOriginDropdown, setShowFlightOriginDropdown] = useState(false);
  const [showFlightDestinationDropdown, setShowFlightDestinationDropdown] = useState(false);
  const [showReturnDateDropdown, setShowReturnDateDropdown] = useState(false);
  const [showFlightTypeDropdown, setShowFlightTypeDropdown] = useState(false);
  
  const [originSuggestions, setOriginSuggestions] = useState<any[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<any[]>([]);
  const [isSearchingAirports, setIsSearchingAirports] = useState(false);
  const [showMobileSearchModal, setShowMobileSearchModal] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [globalLocationSuggestions, setGlobalLocationSuggestions] = useState<any[]>([]);
  const [isSearchingGlobalLocations, setIsSearchingGlobalLocations] = useState(false);

  const [selectedService, setSelectedService] = useState(defaultService);
  const [selectedLocation, setSelectedLocation] = useState('Helsinki');
  const [flightOrigin, setFlightOrigin] = useState('HEL');
  const [flightOriginDisplay, setFlightOriginDisplay] = useState('Helsinki (HEL)');
  const [flightDestination, setFlightDestination] = useState('JFK');
  const [flightDestinationDisplay, setFlightDestinationDisplay] = useState('New York (JFK)');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState<string | null>(null);
  const [adults, setAdults] = useState(1);
  const [childrenCount, setChildrenCount] = useState(0);
  const [cabinClass, setCabinClass] = useState('Economy');
  
  const [addNearbyAirports, setAddNearbyAirports] = useState(false);
  const [directFlightsOnly, setDirectFlightsOnly] = useState(false);
  
  const [flightType, setFlightType] = useState<'round-trip' | 'one-way'>('round-trip');
  const [flightDealsCity, setFlightDealsCity] = useState('');
  const [activeTab, setActiveTab] = useState('Explore');

  const [isCollapsed, setIsCollapsed] = useState(Platform.OS === 'web' && window.location.pathname.includes('/flights'));

  const [loadingFlight, setLoadingFlight] = useState(false);

  const handleFlightLink = async () => {
    setLoadingFlight(true);
    try {
      const origin = Platform.OS === 'web' ? window.location.origin : 'https://app.krishnaadhikari.com';
      const res = await apiClient.post('/api/flights/links', {
        user_id: user?.id || '',
        origin: origin
      });
      if (res.data && res.data.status === 'success' && res.data.url) {
        Linking.openURL(res.data.url);
      } else {
        alert('Failed to generate secure checkout link.');
      }
    } catch (err: any) {
      console.error(err);
      alert('An error occurred connecting to the secure server.');
    } finally {
      setLoadingFlight(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web' && window.location.pathname.includes('/flights')) {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('origin')) setFlightOrigin(searchParams.get('origin') as string);
      if (searchParams.get('destination')) setFlightDestination(searchParams.get('destination') as string);
      if (searchParams.get('departureDate')) setSelectedDate(searchParams.get('departureDate'));
      if (searchParams.get('returnDate')) setReturnDate(searchParams.get('returnDate'));
      if (searchParams.get('guests')) setAdults(parseInt(searchParams.get('guests') as string));
      setSelectedService('Flights');
      setIsCollapsed(true);
    }
  }, []);

  const { user, logout, isFullyRegistered } = useAuth();
  const isGuest = !user || !isFullyRegistered;
  const [profile, setProfile] = useState<any>({ avatar_url: user?.user_metadata?.avatar_url || null });
  const todayDate = new Date().getDate();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const servicesList = ['Vehicle Repair', 'Bike Repair', 'Pay Parking', 'Hotels & Stays', 'City Transit', 'Train Tickets'];

  useEffect(() => {
    if (user) {
      apiClient.get(`/api/dashboard?t=${Date.now()}`)
        .then(res => setProfile(res.data?.profile || { avatar_url: user.user_metadata?.avatar_url || null }))
        .catch(() => setProfile({ avatar_url: user.user_metadata?.avatar_url || null }));
    }
  }, [user]);

  const handleSignOut = async () => {
    try { await logout(); navigation.navigate('Dashboard'); } catch (err) { console.error(err); }
  };

  const isFlight = selectedService === 'Flights';
  const requiresGuests = !['Vehicle Repair', 'Bike Repair'].includes(selectedService);
  const isTravel = ['Flights', 'City Transit', 'Train Tickets'].includes(selectedService);
  
  const handleSearchExecute = () => {
    if (!['Vehicle Repair', 'Bike Repair', 'Pay Parking'].includes(selectedService)) {
      if (!selectedLocation || selectedLocation.trim() === '') {
        setSearchError('Please select a destination to continue.');
        return;
      }
    }
    
    setSearchError('');
    setShowServiceDropdown(false);
    setShowLocationDropdown(false);
    setShowDateDropdown(false);
    setShowGuestDropdown(false);
    setShowFlightOriginDropdown(false);
    setShowFlightDestinationDropdown(false);
    setShowReturnDateDropdown(false);
    setShowMobileSearchModal(false);
    setIsCollapsed(true);

    if (isFlight) {
      navigation.navigate('FlightSearch' as never, {
        origin: flightOrigin,
        destination: flightDestination,
        departureDate: selectedDate || '2026-05-12',
        returnDate: returnDate || undefined,
        type: flightType,
        guests: adults + childrenCount,
        cabinClass: cabinClass,
        directOnly: directFlightsOnly
      } as never);
    } else {
      navigation.navigate('ServiceDirectory', { 
        service: selectedService, 
        location: selectedLocation,
        guests: adults + childrenCount,
        date: selectedDate
      });
    }
  };

  if (isMobileWeb) {
    const anyDropdownOpen = showProfileDropdown || showServiceDropdown || showLocationDropdown || showDateDropdown || showGuestDropdown || showFlightOriginDropdown || showFlightDestinationDropdown || showReturnDateDropdown || showFlightTypeDropdown;
    return (
      <>
        <View style={[styles.headerContainer, { paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 24 : 0 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, zIndex: 9999 }}>
            <WebLink style={styles.logoSection} screen="Home">
              <Image source={require('../../assets/icon.png')} style={{ width: 48, height: 48, borderRadius: 12 }} />
              <Text style={[styles.logoText, { fontSize: 24 }]}>Aicrett</Text>
            </WebLink>
            <View style={{ position: 'relative' }}>
              {isGuest ? (
                <WebLink screen="Login" style={{ backgroundColor: '#00E5FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                  <Text style={{ color: '#0A192F', fontWeight: 'bold', fontSize: 14 }}>Log In</Text>
                </WebLink>
              ) : (
                <TouchableOpacity 
                  style={styles.profileMenu}
                  onPress={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <Menu color="#E2E8F0" size={16} />
                  <View style={[styles.avatarCircle, { width: 28, height: 28 }]}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <User color="#FFF" size={14} />
                    )}
                  </View>
                </TouchableOpacity>
              )}
              {showProfileDropdown && (
                <View style={[styles.dropdownMenu, { top: 40, right: 0, left: 'auto', width: 200, padding: 8 }]}>
                  <WebLink style={styles.dropdownItem} screen="Profile" onPress={() => setShowProfileDropdown(false)}><Text style={styles.dropdownItemText}>Profile</Text></WebLink>
                  <WebLink style={styles.dropdownItem} screen="UserMessages" onPress={() => setShowProfileDropdown(false)}><Text style={styles.dropdownItemText}>Messages</Text></WebLink>
                  <WebLink style={styles.dropdownItem} screen="HostDashboard" onPress={() => setShowProfileDropdown(false)}><Text style={styles.dropdownItemText}>Host Dashboard</Text></WebLink>
                  <View style={{ height: 1, backgroundColor: '#EBEBEB', marginVertical: 4 }} />
                  <TouchableOpacity style={styles.dropdownItem} onPress={handleSignOut}><Text style={[styles.dropdownItemText, {color: '#E11D48'}]}>Sign Out</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          {/* Airbnb-style Mobile Search Pill */}
          <TouchableOpacity 
            style={styles.mobileSearchPill}
            onPress={() => setShowMobileSearchModal(true)}
          >
              <Search color="#00E5FF" size={18} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#F8FAFC' }}>Start your search</Text>
              </View>
          </TouchableOpacity>

          {/* Airbnb-style Mobile Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -20, paddingBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 32 }}>
            <TouchableOpacity onPress={handleFlightLink} style={styles.mobileTab}>
                {loadingFlight ? <ActivityIndicator color="#00E5FF" size={24} style={{ marginBottom: 6, alignSelf: 'center' }} /> : <Plane color="#94A3B8" size={24} style={{ marginBottom: 6, alignSelf: 'center' }} />}
                <Text style={styles.mobileTabText}>Flights</Text>
            </TouchableOpacity>
            <WebLink screen="Services" onPress={() => setActiveTab('Services')} style={[styles.mobileTab, activeTab === 'Services' && styles.mobileTabActive]}>
                <Menu color={activeTab === 'Services' ? '#00E5FF' : '#94A3B8'} size={24} style={{ marginBottom: 6, alignSelf: 'center' }} />
                <Text style={[styles.mobileTabText, activeTab === 'Services' && styles.mobileTabTextActive]}>Services</Text>
            </WebLink>
            <WebLink screen="Pricing" onPress={() => setActiveTab('Pricing')} style={[styles.mobileTab, activeTab === 'Pricing' && styles.mobileTabActive]}>
                <Building2 color={activeTab === 'Pricing' ? '#00E5FF' : '#94A3B8'} size={24} style={{ marginBottom: 6, alignSelf: 'center' }} />
                <Text style={[styles.mobileTabText, activeTab === 'Pricing' && styles.mobileTabTextActive]}>Pricing</Text>
            </WebLink>
          </ScrollView>
        </View>

        {/* Full-screen Mobile Search Modal */}
        <Modal visible={showMobileSearchModal} animationType="slide" transparent={false}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 }}>
              <TouchableOpacity onPress={() => setShowMobileSearchModal(false)} style={{ padding: 4 }}>
                <X color="#E2E8F0" size={24} />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF' }}>Find Service</Text>
              <TouchableOpacity onPress={() => { setSelectedLocation(''); setAdults(1); setSelectedDate(null); }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#00E5FF' }}>Clear all</Text>
              </TouchableOpacity>
            </View>

            {/* Top Global Search (Optional) */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Search color="#94A3B8" size={20} />
                <TextInput 
                  style={{ flex: 1, color: '#FFF', fontSize: 16, marginLeft: 12, outlineStyle: 'none' } as any}
                  placeholder="Search services, cities..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 20, backgroundColor: '#0F172A' }}>
              {/* Service Selection Card */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>What are you looking for?</Text>
                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                  {servicesList.map(srv => {
                    let IconComponent = Search;
                    if (srv === 'Vehicle Repair') IconComponent = Wrench;
                    if (srv === 'Bike Repair') IconComponent = Bike;
                    if (srv === 'Pay Parking') IconComponent = Car;
                    if (srv === 'Hotels & Stays') IconComponent = Bed;
                    if (srv === 'City Transit') IconComponent = BusFront;
                    if (srv === 'Train Tickets') IconComponent = Train;
                    if (srv === 'Flights') IconComponent = Plane;

                    const isSelected = selectedService === srv;
                    
                    return (
                      <TouchableOpacity 
                        key={srv} 
                        onPress={() => setSelectedService(srv)}
                        style={{ 
                          width: 100, height: 100, backgroundColor: isSelected ? 'rgba(0, 229, 255, 0.1)' : '#1E293B', 
                          borderRadius: 12, padding: 12, marginRight: 12, justifyContent: 'space-between', 
                          borderWidth: 2, borderColor: isSelected ? '#00E5FF' : 'transparent', position: 'relative' 
                        }}
                      >
                        <IconComponent color={isSelected ? '#00E5FF' : '#94A3B8'} size={24} />
                        {isSelected && (
                          <View style={{ position: 'absolute', top: 8, right: 8 }}>
                            <CheckCircle color="#00E5FF" size={16} />
                          </View>
                        )}
                        <Text style={{ color: isSelected ? '#00E5FF' : '#94A3B8', fontSize: 13, fontWeight: '600' }}>{srv}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* WHERE Section */}
              <View style={{ backgroundColor: '#1E293B', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
                <TouchableOpacity onPress={() => setShowLocationDropdown(!showLocationDropdown)} style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>WHERE</Text>
                  {!showLocationDropdown && <Text style={{ color: '#E2E8F0', fontSize: 16 }}>{selectedLocation || 'Search destinations'}</Text>}
                </TouchableOpacity>
                {showLocationDropdown && (
                  <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 }}>
                      <Search color="#00E5FF" size={20} />
                      <TextInput 
                        style={{ flex: 1, color: '#FFF', fontSize: 16, marginLeft: 12, outlineStyle: 'none' } as any}
                        placeholder="Search destinations"
                        placeholderTextColor="#94A3B8"
                        value={selectedLocation}
                        onChangeText={async (val) => {
                          setSelectedLocation(val);
                          setSearchError('');
                          if (val.length > 2) {
                            try {
                              setIsSearchingGlobalLocations(true);
                              const apiUrl = process.env.EXPO_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';
                              const res = await fetch(`${apiUrl}?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5&email=${process.env.EXPO_PUBLIC_NOMINATIM_EMAIL || 'request@krishnaadhikari.com'}`);
                              const data = await res.json();
                              setGlobalLocationSuggestions(data);
                            } catch (e) {
                              console.error(e);
                            } finally {
                              setIsSearchingGlobalLocations(false);
                            }
                          } else {
                            setGlobalLocationSuggestions([]);
                          }
                        }}
                      />
                    </View>
                    <View style={{ marginTop: 12 }}>
                      {isSearchingGlobalLocations ? (
                        <ActivityIndicator color="#00E5FF" style={{ marginTop: 16 }} />
                      ) : globalLocationSuggestions.length > 0 ? (
                        globalLocationSuggestions.map((loc, idx) => (
                          <TouchableOpacity key={idx} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' }} onPress={() => { setSelectedLocation(loc.display_name.split(',')[0]); setShowLocationDropdown(false); setShowDateDropdown(true); }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MapPin color="#94A3B8" size={18} />
                              <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={{ color: '#E2E8F0', fontSize: 16 }}>{loc.display_name.split(',')[0]}</Text>
                                <Text style={{ color: '#94A3B8', fontSize: 13 }} numberOfLines={1}>{loc.display_name}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : selectedLocation.length > 2 ? (
                         <Text style={{ color: '#94A3B8', padding: 12 }}>No matches found.</Text>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>

              {/* WHEN Section */}
              <View style={{ backgroundColor: '#1E293B', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
                <TouchableOpacity onPress={() => setShowDateDropdown(!showDateDropdown)} style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>WHEN</Text>
                  {!showDateDropdown && <Text style={{ color: '#E2E8F0', fontSize: 16 }}>{selectedDate ? (returnDate ? `${selectedDate} to ${returnDate}` : selectedDate) : 'Add dates'}</Text>}
                </TouchableOpacity>
                {showDateDropdown && (
                  <View style={{ paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
                    <DateDropdownComponent 
                      currentMonth={currentMonth}
                      currentYear={currentYear}
                      todayDate={todayDate}
                      selectedDate={selectedDate}
                      returnDate={returnDate}
                      flightType={flightType}
                      setShowDateDropdown={setShowDateDropdown}
                      setSelectedDate={setSelectedDate}
                      setReturnDate={setReturnDate}
                      setShowGuestDropdown={setShowGuestDropdown}
                      styles={styles}
                      isMobileOverride={true}
                    />
                  </View>
                )}
              </View>

              {/* WHO / VEHICLES Section */}
              {!['Vehicle Repair', 'Bike Repair'].includes(selectedService) && (
                <View style={{ backgroundColor: '#1E293B', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
                  <TouchableOpacity onPress={() => setShowGuestDropdown(!showGuestDropdown)} style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>{selectedService === 'Pay Parking' ? 'VEHICLES' : 'WHO'}</Text>
                    {!showGuestDropdown && (
                      <Text style={{ color: '#E2E8F0', fontSize: 16 }}>
                        {(adults + childrenCount) > 0 
                          ? `${adults + childrenCount} ${selectedService === 'Pay Parking' ? ((adults + childrenCount) === 1 ? 'vehicle' : 'vehicles') : ((adults + childrenCount) === 1 ? 'guest' : 'guests')}` 
                          : (selectedService === 'Pay Parking' ? 'Add vehicles' : 'Add guests')}
                      </Text>
                    )}
                  </TouchableOpacity>
                  {showGuestDropdown && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: selectedService === 'Pay Parking' ? 0 : 20 }}>
                        <Text style={{ fontSize: 16, color: '#E2E8F0', fontWeight: '500' }}>{selectedService === 'Pay Parking' ? 'Vehicles' : 'Adults'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                          <TouchableOpacity onPress={() => setAdults(Math.max(1, adults - 1))} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#94A3B8', justifyContent: 'center', alignItems: 'center' }}><Minus size={16} color="#94A3B8" /></TouchableOpacity>
                          <Text style={{ fontSize: 16, minWidth: 20, textAlign: 'center', color: '#E2E8F0' }}>{adults}</Text>
                          <TouchableOpacity onPress={() => setAdults(adults + 1)} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#94A3B8', justifyContent: 'center', alignItems: 'center' }}><Plus size={16} color="#94A3B8" /></TouchableOpacity>
                        </View>
                      </View>
                      
                      {selectedService !== 'Pay Parking' && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={{ fontSize: 16, color: '#E2E8F0', fontWeight: '500' }}>Children</Text>
                            <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>Ages 2-12</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <TouchableOpacity onPress={() => setChildrenCount(Math.max(0, childrenCount - 1))} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: childrenCount === 0 ? '#334155' : '#94A3B8', justifyContent: 'center', alignItems: 'center' }}><Minus size={16} color={childrenCount === 0 ? '#334155' : '#94A3B8'} /></TouchableOpacity>
                            <Text style={{ fontSize: 16, minWidth: 20, textAlign: 'center', color: '#E2E8F0' }}>{childrenCount}</Text>
                            <TouchableOpacity onPress={() => setChildrenCount(childrenCount + 1)} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#94A3B8', justifyContent: 'center', alignItems: 'center' }}><Plus size={16} color="#94A3B8" /></TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Bottom Fixed Search Button */}
            <View style={{ padding: 20, backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: '#1E293B' }}>
              {searchError ? (
                <Text style={{ color: '#EF4444', marginBottom: 12, textAlign: 'center', fontWeight: 'bold' }}>{searchError}</Text>
              ) : null}
              <TouchableOpacity style={{ backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} onPress={handleSearchExecute}>
                <Search color="#0A192F" size={20} />
                <Text style={{ color: '#0A192F', fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>Search</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  // ================= DESKTOP HEADER =================
  return (
    <>
      {/* Invisible Overlay to close dropdowns on outside click */}
      {(showServiceDropdown || showLocationDropdown || showDateDropdown || showGuestDropdown || showProfileDropdown) && (
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => {
            setShowServiceDropdown(false);
            setShowLocationDropdown(false);
            setShowDateDropdown(false);
            setShowGuestDropdown(false);
            setShowProfileDropdown(false);
            setShowFlightOriginDropdown(false);
            setShowFlightDestinationDropdown(false);
            setShowReturnDateDropdown(false);
          }} 
          style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, cursor: 'default' } as any}
        />
      )}
    <View style={styles.headerContainer}>
      <View style={[styles.headerContent, { zIndex: 9999 }]}>
        {/* Left: Logo */}
        <WebLink style={styles.logoSection} screen="Dashboard">
          <Image source={require('../../assets/icon.png')} style={{ width: 56, height: 56, borderRadius: 14 }} />
          <Text style={[styles.logoText, { fontSize: 28 }]}>Aicrett</Text>
        </WebLink>

        {/* Center: Top Tabs */}
        <View style={styles.topTabsContainer}>
          <TouchableOpacity onPress={handleFlightLink} style={styles.topTab} disabled={loadingFlight}>
            {loadingFlight ? <ActivityIndicator color="#00E5FF" size="small" /> : <Text style={styles.topTabText}>Flights</Text>}
          </TouchableOpacity>
          <WebLink screen="Services" onPress={() => setActiveTab('Services')} style={[styles.topTab, activeTab === 'Services' && styles.topTabActive]}>
            <Text style={[styles.topTabText, activeTab === 'Services' && styles.topTabTextActive]}>Services</Text>
          </WebLink>
          <WebLink screen="Pricing" onPress={() => setActiveTab('Pricing')} style={[styles.topTab, activeTab === 'Pricing' && styles.topTabActive]}>
            <Text style={[styles.topTabText, activeTab === 'Pricing' && styles.topTabTextActive]}>Pricing</Text>
          </WebLink>
        </View>

        {/* Right: Actions */}
        <View style={styles.rightActions}>
          <TouchableOpacity style={[styles.actionBtn, styles.globeIcon]}>
            <Globe color="#E2E8F0" size={18} />
          </TouchableOpacity>
          
          <View style={{ position: 'relative' }}>
            {isGuest ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <WebLink screen="Login" style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ fontWeight: '600', color: '#E2E8F0', fontSize: 15 }}>Log In</Text>
                </WebLink>
                <WebLink screen="Login" style={{ backgroundColor: '#00E5FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 }}>
                  <Text style={{ fontWeight: 'bold', color: '#0A192F', fontSize: 15 }}>Sign Up</Text>
                </WebLink>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.profileMenu}
                  onPress={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <Menu color="#E2E8F0" size={16} />
                  <View style={styles.avatarCircle}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <User color="#FFF" size={16} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Profile Dropdown */}
                {showProfileDropdown && (
                  <View style={[styles.dropdownMenu, { top: 50, right: 0, left: 'auto', width: 240, padding: 8, zIndex: 999 }]}>
                    {isFullyRegistered && profile?.first_name && profile?.last_name ? (
                      <>
                        <WebLink style={styles.dropdownItem} screen="UserMessages" onPress={() => setShowProfileDropdown(false)}>
                          <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Messages</Text>
                        </WebLink>
                        <WebLink style={styles.dropdownItem} screen="Profile" onPress={() => setShowProfileDropdown(false)}>
                          <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Profile</Text>
                        </WebLink>
                        <WebLink style={styles.dropdownItem} screen="HostDashboard" onPress={() => setShowProfileDropdown(false)}>
                          <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Host Dashboard</Text>
                        </WebLink>
                        <View style={{ height: 1, backgroundColor: '#EBEBEB', marginVertical: 8 }} />
                      </>
                    ) : (
                      <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('Dashboard'); }}>
                        <Text style={[styles.dropdownItemText, { fontWeight: '600', color: '#EF4444' }]}>Complete Profile First</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.dropdownItem} onPress={handleSignOut}>
                      <Text style={[styles.dropdownItemText, { color: '#E11D48' }]}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>

      {/* Bottom Row: Search Pill */}
      <View style={styles.searchPillContainer}>
        {isCollapsed && isFlight ? (
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 8, borderRadius: 8, maxWidth: 950, width: '100%', alignSelf: 'center', borderWidth: 1, borderColor: '#334155' }} 
            onPress={() => setIsCollapsed(false)}
          >
            <View style={{ width: 40, height: 40, backgroundColor: '#00E5FF', borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
              <Search color="#0A192F" size={20} />
            </View>
            <Text style={{ color: '#E2E8F0', fontSize: 16, fontWeight: '500' }}>
               {flightOriginDisplay.split(' ')[0]} ({flightOrigin}) - {flightDestinationDisplay.split(' ')[0]} ({flightDestination}) • {selectedDate ? (() => {
                  const [y, m, d] = selectedDate.split('-');
                  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  return `${monthNames[parseInt(m) - 1]} ${parseInt(d)}`;
                })() : ''} • {adults + childrenCount} adult{adults+childrenCount > 1?'s':''}, {cabinClass}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ position: 'relative', width: '100%', maxWidth: isFlight ? 950 : 700, zIndex: 10 }}>
          
          {isFlight ? (
            <View style={{ width: '100%' }}>
              {/* Top Options Row */}
              <View style={{ flexDirection: 'row', marginBottom: 12, zIndex: 20, alignItems: 'center' }}>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
                  onPress={() => setShowServiceDropdown(!showServiceDropdown)}
                >
                  <Text style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 14 }}>Service: Flights</Text>
                  <ChevronDown color="#F8FAFC" size={14} style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setShowFlightTypeDropdown(!showFlightTypeDropdown)}
                >
                  <Text style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 14 }}>{flightType === 'round-trip' ? 'Roundtrip' : 'One-way'}</Text>
                  <ChevronDown color="#F8FAFC" size={14} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>

              {/* Absolute Flight Type Dropdown */}
              {showFlightTypeDropdown && (
                <View style={{ position: 'absolute', top: 36, left: 140, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, zIndex: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}>
                  <TouchableOpacity onPress={() => { setFlightType('round-trip'); setShowFlightTypeDropdown(false); }} style={{ padding: 8 }}>
                    <Text style={{ color: flightType === 'round-trip' ? '#0A192F' : '#64748B', fontWeight: flightType === 'round-trip' ? 'bold' : 'normal' }}>Roundtrip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setFlightType('one-way'); setShowFlightTypeDropdown(false); if(returnDate) setReturnDate(null); }} style={{ padding: 8 }}>
                    <Text style={{ color: flightType === 'one-way' ? '#0A192F' : '#64748B', fontWeight: flightType === 'one-way' ? 'bold' : 'normal' }}>One-way</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Glassmorphism Pill */}
              <View style={styles.searchPill}>
                {/* From Input */}
                <View style={[styles.searchSection, showFlightOriginDropdown && styles.activeSection, { position: 'relative' }]}>
                  <Text style={styles.searchTitle} numberOfLines={1}>From</Text>
                  <TextInput 
                    style={[styles.searchSub, { padding: 0, margin: 0, outlineStyle: 'none' }] as any}
                    value={flightOriginDisplay}
                    onChangeText={async (val) => { 
                      setFlightOriginDisplay(val); 
                      // Fallback: If they type an IATA code directly
                      if (val.length === 3) setFlightOrigin(val.toUpperCase());
                      setShowFlightOriginDropdown(true);
                      if (val.length > 1) {
                        try {
                          setIsSearchingAirports(true);
                          const res = await apiClient.get(`/api/flights/airports?q=${val}`);
                          setOriginSuggestions(res.data || res);
                        } catch (e) { console.log('Error fetching airports', e); }
                        finally { setIsSearchingAirports(false); }
                      } else { setOriginSuggestions([]); }
                    }}
                    placeholder="Where from?"
                    placeholderTextColor="#94A3B8"
                  />
                  {showFlightOriginDropdown && originSuggestions && (
                    <View style={[styles.dropdownMenu, { top: 70, left: 0, maxHeight: 350, backgroundColor: '#FFFFFF', padding: 0, borderRadius: 16, overflow: 'hidden', minWidth: 280 }]}>
                      <ScrollView keyboardShouldPersistTaps="handled">
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B', marginVertical: 12, paddingHorizontal: 16 }}>SUGGESTIONS</Text>
                        {originSuggestions.length > 0 ? (
                          originSuggestions.map((loc, idx) => (
                            <TouchableOpacity 
                              key={idx} 
                              style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                              onPress={() => { 
                                setFlightOrigin(loc.iata); 
                                setFlightOriginDisplay(`${loc.name} (${loc.iata})`);
                                setShowFlightOriginDropdown(false); 
                                setShowFlightDestinationDropdown(true); 
                              }}
                            >
                              <View style={{ width: 32, alignItems: 'center' }}>
                                {loc.type === 'city' ? <MapPin color="#64748B" size={20} /> : <Plane color="#64748B" size={20} />}
                              </View>
                              <View style={{ marginLeft: 8 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>{loc.name} <Text style={{ fontWeight: 'normal', color: '#64748B' }}>({loc.iata})</Text></Text>
                                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{loc.country}</Text>
                              </View>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={{ padding: 16, color: '#64748B' }}>{isSearchingAirports ? 'Searching...' : 'No matches found'}</Text>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                <View style={styles.divider} />
                
                <TouchableOpacity 
                  style={{ position: 'absolute', left: '22%', zIndex: 10, padding: 4, backgroundColor: '#1E293B', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                  onPress={() => {
                    const temp = flightOrigin;
                    const tempDisp = flightOriginDisplay;
                    setFlightOrigin(flightDestination);
                    setFlightOriginDisplay(flightDestinationDisplay);
                    setFlightDestination(temp);
                    setFlightDestinationDisplay(tempDisp);
                  }}
                >
                  <ArrowLeftRight color="#94A3B8" size={14} />
                </TouchableOpacity>

                {/* To Input */}
                <View style={[styles.searchSection, showFlightDestinationDropdown && styles.activeSection, { position: 'relative' }]}>
                  <Text style={styles.searchTitle} numberOfLines={1}>To</Text>
                  <TextInput 
                    style={[styles.searchSub, { padding: 0, margin: 0, outlineStyle: 'none' }] as any}
                    value={flightDestinationDisplay}
                    onChangeText={async (val) => { 
                      setFlightDestinationDisplay(val); 
                      // Fallback: If they type an IATA code directly
                      if (val.length === 3) setFlightDestination(val.toUpperCase());
                      setShowFlightDestinationDropdown(true);
                      if (val.length > 1) {
                        try {
                          setIsSearchingAirports(true);
                          const res = await apiClient.get(`/api/flights/airports?q=${val}`);
                          setDestinationSuggestions(res.data || res);
                        } catch (e) { console.log('Error fetching airports', e); }
                        finally { setIsSearchingAirports(false); }
                      } else { setDestinationSuggestions([]); }
                    }}
                    placeholder="Where to?"
                    placeholderTextColor="#94A3B8"
                  />
                  {showFlightDestinationDropdown && destinationSuggestions && (
                    <View style={[styles.dropdownMenu, { top: 70, left: 0, maxHeight: 350, backgroundColor: '#FFFFFF', padding: 0, borderRadius: 16, overflow: 'hidden', minWidth: 280 }]}>
                      <ScrollView keyboardShouldPersistTaps="handled">
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B', marginVertical: 12, paddingHorizontal: 16 }}>SUGGESTIONS</Text>
                        {destinationSuggestions.length > 0 ? (
                          destinationSuggestions.map((loc, idx) => (
                            <TouchableOpacity 
                              key={idx} 
                              style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                              onPress={() => { 
                                setFlightDestination(loc.iata); 
                                setFlightDestinationDisplay(`${loc.name} (${loc.iata})`);
                                setShowFlightDestinationDropdown(false); 
                                setShowDateDropdown(true); 
                              }}
                            >
                              <View style={{ width: 32, alignItems: 'center' }}>
                                {loc.type === 'city' ? <MapPin color="#64748B" size={20} /> : <Plane color="#64748B" size={20} />}
                              </View>
                              <View style={{ marginLeft: 8 }}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>{loc.name} <Text style={{ fontWeight: 'normal', color: '#64748B' }}>({loc.iata})</Text></Text>
                                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{loc.country}</Text>
                              </View>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={{ padding: 16, color: '#64748B' }}>{isSearchingAirports ? 'Searching...' : 'No matches found'}</Text>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                <View style={styles.divider} />

                {/* Depart */}
                <TouchableOpacity 
                  style={[styles.searchSection, showDateDropdown && styles.activeSection, { flex: 0.8, position: 'relative' }]}
                  onPress={() => { setShowDateDropdown(!showDateDropdown); setShowGuestDropdown(false); }}
                >
                  <View>
                    <Text style={styles.searchTitle} numberOfLines={1}>Depart</Text>
                    <Text style={[styles.searchSub, !selectedDate && { color: '#94A3B8' }]} numberOfLines={1}>
                      {selectedDate ? (() => {
                        const [y, m, d] = selectedDate.split('-');
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        return `${monthNames[parseInt(m) - 1]} ${parseInt(d)}`;
                      })() : 'Add date'}
                    </Text>
                  </View>
                  {showDateDropdown && (
                    <DateDropdownComponent 
                      currentMonth={currentMonth}
                      currentYear={currentYear}
                      todayDate={todayDate}
                      selectedDate={selectedDate}
                      returnDate={returnDate}
                      flightType={flightType}
                      setShowDateDropdown={setShowDateDropdown}
                      setSelectedDate={setSelectedDate}
                      setReturnDate={setReturnDate}
                      setShowGuestDropdown={setShowGuestDropdown}
                      styles={styles}
                    />
                  )}
                </TouchableOpacity>

                {flightType === 'round-trip' && (
                  <>
                    <View style={styles.divider} />
                    {/* Return */}
                    <TouchableOpacity 
                      style={[styles.searchSection, showDateDropdown && styles.activeSection, { flex: 0.8 }]}
                      onPress={() => { setShowDateDropdown(!showDateDropdown); setShowGuestDropdown(false); }}
                    >
                      <View>
                        <Text style={styles.searchTitle} numberOfLines={1}>Return</Text>
                        <Text style={[styles.searchSub, !returnDate && { color: '#94A3B8' }]} numberOfLines={1}>
                          {returnDate ? (() => {
                            const [y, m, d] = returnDate.split('-');
                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                            return `${monthNames[parseInt(m) - 1]} ${parseInt(d)}`;
                          })() : 'Add date'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
                
                <View style={styles.divider} />

                {/* Travelers */}
                <TouchableOpacity 
                  style={[styles.searchSection, showGuestDropdown && styles.activeSection, { flex: 1.2 }]}
                  onPress={() => { setShowGuestDropdown(!showGuestDropdown); setShowDateDropdown(false); setShowFlightOriginDropdown(false); setShowFlightDestinationDropdown(false); }}
                >
                  <View>
                    <Text style={styles.searchTitle} numberOfLines={1}>Travelers and cabin</Text>
                    <Text style={styles.searchSub} numberOfLines={1}>{adults + childrenCount} Pax, {cabinClass}</Text>
                  </View>
                </TouchableOpacity>

                {/* Search Button */}
                <View style={styles.searchButtonContainer}>
                  <TouchableOpacity style={styles.searchIconBg} onPress={handleSearchExecute}>
                    <Search color="#0A192F" size={16} />
                    <Text style={{ color: '#0A192F', fontWeight: 'bold', marginLeft: 6 }}>Search</Text>
                  </TouchableOpacity>
                </View>

              </View>

                {/* Bottom Options Row */}
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 24, paddingLeft: 12 }}>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setAddNearbyAirports(!addNearbyAirports)}>
                    <View style={{ width: 16, height: 16, backgroundColor: addNearbyAirports ? '#00E5FF' : 'transparent', borderWidth: 1, borderColor: '#94A3B8', marginRight: 8, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                      {addNearbyAirports && <View style={{ width: 8, height: 8, backgroundColor: '#0A192F', borderRadius: 2 }} />}
                    </View>
                    <Text style={{ color: '#E2E8F0', fontSize: 13 }}>Add nearby airports</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => setDirectFlightsOnly(!directFlightsOnly)}>
                    <View style={{ width: 16, height: 16, backgroundColor: directFlightsOnly ? '#00E5FF' : 'transparent', borderWidth: 1, borderColor: '#94A3B8', marginRight: 8, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                      {directFlightsOnly && <View style={{ width: 8, height: 8, backgroundColor: '#0A192F', borderRadius: 2 }} />}
                    </View>
                    <Text style={{ color: '#E2E8F0', fontSize: 13 }}>Direct flights</Text>
                  </TouchableOpacity>
                </View>
              </View>
          ) : (
            <View style={styles.searchPill}>
              <TouchableOpacity 
                style={[styles.searchSection, showServiceDropdown && styles.activeSection]} 
                onPress={() => { setShowServiceDropdown(!showServiceDropdown); setShowLocationDropdown(false); setShowDateDropdown(false); setShowGuestDropdown(false); }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.searchTitle} numberOfLines={1}>Service</Text>
                    <Text style={styles.searchSub} numberOfLines={1}>{selectedService}</Text>
                  </View>
                  <ChevronDown color="#94A3B8" size={16} />
                </View>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <View style={[styles.searchSection, showLocationDropdown && styles.activeSection, { position: 'relative' }]}>
                <Text style={styles.searchTitle} numberOfLines={1}>{isTravel ? 'Destination' : 'Where'}</Text>
                <TextInput 
                  style={[styles.searchSub, { padding: 0, margin: 0, outlineStyle: 'none' }] as any}
                  value={selectedLocation}
                  onChangeText={async (val) => { 
                    setSelectedLocation(val);
                    setSearchError('');
                    setShowLocationDropdown(true);
                    if (val.length > 2) {
                      try {
                        setIsSearchingGlobalLocations(true);
                        const apiUrl = process.env.EXPO_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';
                        const res = await fetch(`${apiUrl}?q=${encodeURIComponent(val)}&format=json&addressdetails=1&limit=5&email=${process.env.EXPO_PUBLIC_NOMINATIM_EMAIL || 'request@krishnaadhikari.com'}`);
                        const data = await res.json();
                        setGlobalLocationSuggestions(data);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsSearchingGlobalLocations(false);
                      }
                    } else {
                      setGlobalLocationSuggestions([]);
                    }
                  }}
                  placeholder="Search destinations"
                  placeholderTextColor="#94A3B8"
                />
                {showLocationDropdown && globalLocationSuggestions && (
                  <View style={[styles.dropdownMenu, { top: 70, left: 0, maxHeight: 350, backgroundColor: '#FFFFFF', padding: 0, borderRadius: 16, overflow: 'hidden', minWidth: 280 }]}>
                    <ScrollView keyboardShouldPersistTaps="handled">
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748B', marginVertical: 12, paddingHorizontal: 16 }}>SUGGESTIONS</Text>
                      {isSearchingGlobalLocations ? (
                        <ActivityIndicator color="#00E5FF" style={{ padding: 16 }} />
                      ) : globalLocationSuggestions.length > 0 ? (
                        globalLocationSuggestions.map((loc, idx) => (
                          <TouchableOpacity 
                            key={idx} 
                            style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                            onPress={() => { 
                              setSelectedLocation(loc.display_name.split(',')[0]); 
                              setShowLocationDropdown(false); 
                              setShowDateDropdown(true); 
                            }}
                          >
                            <View style={{ width: 32, alignItems: 'center' }}>
                              <MapPin color="#64748B" size={20} />
                            </View>
                            <View style={{ marginLeft: 8, flex: 1 }}>
                              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>{loc.display_name.split(',')[0]}</Text>
                              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }} numberOfLines={1}>{loc.display_name}</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={{ padding: 16, color: '#64748B' }}>No matches found</Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                style={[styles.searchSection, showDateDropdown && styles.activeSection, { position: 'relative' }]}
                onPress={() => { setShowDateDropdown(!showDateDropdown); setShowServiceDropdown(false); setShowLocationDropdown(false); setShowGuestDropdown(false); }}
              >
                <View>
                  <Text style={styles.searchTitle} numberOfLines={1}>{isTravel ? 'Departure' : 'When'}</Text>
                  <Text style={[styles.searchSub, !selectedDate && { color: '#94A3B8' }]} numberOfLines={1}>
                    {selectedDate ? (() => {
                      const [y, m, d] = selectedDate.split('-');
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      return `${monthNames[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
                    })() : 'Add dates'}
                  </Text>
                </View>
                {showDateDropdown && (
                  <DateDropdownComponent 
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                    todayDate={todayDate}
                    selectedDate={selectedDate}
                    returnDate={returnDate}
                    flightType={flightType}
                    setShowDateDropdown={setShowDateDropdown}
                    setSelectedDate={setSelectedDate}
                    setReturnDate={setReturnDate}
                    setShowGuestDropdown={setShowGuestDropdown}
                    styles={styles}
                  />
                )}
              </TouchableOpacity>
              
              {requiresGuests && (
                <>
                  <View style={styles.divider} />
                  <TouchableOpacity 
                  style={[styles.searchSection, showGuestDropdown && styles.activeSection, { flex: 0.8 }]}
                  onPress={() => { setShowGuestDropdown(!showGuestDropdown); setShowDateDropdown(false); setShowServiceDropdown(false); setShowFlightOriginDropdown(false); setShowFlightDestinationDropdown(false); }}
                >
                  <View>
                    <Text style={styles.searchTitle} numberOfLines={1}>{selectedService === 'Pay Parking' ? 'Vehicle' : 'Who'}</Text>
                    <Text style={styles.searchSub} numberOfLines={1}>
                      {adults + childrenCount} {selectedService === 'Pay Parking' ? ((adults + childrenCount) === 1 ? 'vehicle' : 'vehicles') : ((adults + childrenCount) === 1 ? 'guest' : 'guests')}
                    </Text>
                  </View>
                </TouchableOpacity>
                </>
              )}
              
              <View style={styles.searchButtonContainer}>
                <TouchableOpacity style={styles.searchIconBg} onPress={handleSearchExecute}>
                  <Search color="#0A192F" size={16} />
                  <Text style={{ color: '#0A192F', fontWeight: 'bold', marginLeft: 6 }}>Search</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {searchError ? (
            <Text style={{ color: '#EF4444', marginTop: 12, textAlign: 'center', fontWeight: 'bold', fontSize: 15, zIndex: 10 }}>{searchError}</Text>
          ) : null}

          {/* Absolute Service Dropdown */}
          {showServiceDropdown && (
            <View style={styles.dropdownMenu}>
              {servicesList.map((service, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.dropdownItem, selectedService === service && styles.dropdownItemActive]}
                  onPress={() => { setSelectedService(service); setShowServiceDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, selectedService === service && styles.dropdownItemTextActive]}>{service}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Kept other absolute dropdowns (Guest, Service, Location) unchanged below */}

          {/* Removed old absolute Location Dropdown */}

          {/* Removed old absolute Date Dropdown */}

          {/* Absolute Guest Dropdown */}
          {showGuestDropdown && (
            <View style={[styles.dropdownMenu, { right: 120, left: 'auto', width: 320, padding: 24 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#E2E8F0' }}>{selectedService === 'Pay Parking' ? 'Vehicles' : 'Adults'}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 14 }}>{selectedService === 'Pay Parking' ? 'Number of vehicles' : 'Ages 16 or above'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={() => setAdults(Math.max(1, adults - 1))} style={styles.circleBtn}><Minus size={16} color="#94A3B8" /></TouchableOpacity>
                  <Text style={{ fontSize: 16, color: '#E2E8F0' }}>{adults}</Text>
                  <TouchableOpacity onPress={() => setAdults(adults + 1)} style={styles.circleBtn}><Plus size={16} color="#94A3B8" /></TouchableOpacity>
                </View>
              </View>
              {selectedService !== 'Pay Parking' && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <View>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#E2E8F0' }}>Children</Text>
                    <Text style={{ color: '#94A3B8', fontSize: 14 }}>Ages 0-15</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity onPress={() => setChildrenCount(Math.max(0, childrenCount - 1))} style={styles.circleBtn}><Minus size={16} color="#94A3B8" /></TouchableOpacity>
                    <Text style={{ fontSize: 16, color: '#E2E8F0' }}>{childrenCount}</Text>
                    <TouchableOpacity onPress={() => setChildrenCount(childrenCount + 1)} style={styles.circleBtn}><Plus size={16} color="#94A3B8" /></TouchableOpacity>
                  </View>
                </View>
              )}

              {isFlight && (
                <>
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 }} />
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#E2E8F0', marginBottom: 16 }}>Cabin Class</Text>
                  {['Economy', 'Premium Economy', 'Business', 'First Class'].map(c => (
                    <TouchableOpacity key={c} onPress={() => { setCabinClass(c); setShowGuestDropdown(false); }} style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: cabinClass === c ? '#00E5FF' : '#94A3B8', fontWeight: cabinClass === c ? 'bold' : 'normal', fontSize: 16 }}>{c}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
        )}
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#0A192F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    zIndex: 100,
  },
  headerContent: {
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    height: 80,
  },
  logoSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00E5FF',
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  searchPillContainer: {
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  topTabsContainer: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  topTab: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabActive: {
    borderBottomColor: '#00E5FF',
  },
  topTabText: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
  },
  topTabTextActive: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  rightActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  mobileSearchPill: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 30,
    padding: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  mobileTab: {
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  mobileTabActive: {
    borderBottomColor: '#00E5FF',
  },
  mobileTabText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  mobileTabTextActive: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  mobileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0A192F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  mobileCloseBtn: {
    position: 'absolute',
    left: 20,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  mobileServiceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  mobileCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  mobileCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  mobileServicePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mobileServicePillActive: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  mobileLocBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mobileFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0B1120',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  mobileSearchExecuteBtn: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 66,
    width: '100%',
    // @ts-ignore: React Native web specific CSS
    backdropFilter: 'blur(10px)',
  },
  searchSection: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    height: '100%',
    borderRadius: 32,
  },
  activeSection: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderWidth: 1,
  },
  searchTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  searchSub: {
    fontSize: 14,
    color: '#F8FAFC',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchButtonContainer: {
    paddingRight: 8,
    justifyContent: 'center',
  },
  searchIconBg: {
    backgroundColor: '#00E5FF',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 76,
    left: 0,
    width: 300,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  dropdownItemTextActive: {
    fontWeight: 'bold',
    color: '#00E5FF',
  },

  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
  },
  hostText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  globeIcon: {
    paddingHorizontal: 10,
    marginRight: 4,
  },
  profileMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#717171',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
