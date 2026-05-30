import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Modal, useWindowDimensions, ScrollView, SafeAreaView } from 'react-native';
import { Search, Globe, Menu, User, ShieldCheck, ChevronDown, Plus, Minus, X, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import WebLink from './WebLink';
import { useAuth } from '../context/AuthContext';
import { supabase_lucifer_core } from '../utils/supabase';

export default function WebHeader({ defaultService = 'Vehicle Repair' }: { defaultService?: string }) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isMobileWeb = width < 768;

  // --- AUTHENTICATION STATE ---
  const { user } = useAuth();
  const isGuest = !user;
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      // Enterprise standard: use the metadata instantly available in Context.
      // Do not make a direct Supabase DB call from the header component.
      setProfile({ avatar_url: user.user_metadata?.avatar_url || null });
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    setShowProfileDropdown(false);
    await supabase_lucifer_core.auth.signOut();
    navigation.navigate('Login');
  };

  // --- DESKTOP DROPDOWN STATES ---
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  // --- MOBILE MODAL STATE ---
  const [showMobileSearchModal, setShowMobileSearchModal] = useState(false);

  // --- SEARCH FORM STATE ---
  const [selectedService, setSelectedService] = useState(defaultService);
  const [selectedLocation, setSelectedLocation] = useState('Helsinki');
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [adults, setAdults] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);

  if (Platform.OS !== 'web') return null;

  const servicesList = ['Vehicle Repair', 'Bike Repair', 'Pay Parking', 'Hotels & Stays', 'City Transit', 'Train Tickets', 'Flights'];
  
  // Smart Search Context Checks
  const requiresGuests = ['Hotels & Stays', 'Train Tickets', 'Flights'].includes(selectedService);
  const isTravel = ['Flights', 'City Transit', 'Train Tickets'].includes(selectedService);
  
  const handleSearchExecute = () => {
    setShowServiceDropdown(false);
    setShowLocationDropdown(false);
    setShowDateDropdown(false);
    setShowGuestDropdown(false);
    setShowMobileSearchModal(false);

    // Route dynamically to the Service Directory with the selected context
    navigation.navigate('ServiceDirectory', { 
      service: selectedService, 
      location: selectedLocation,
      guests: adults + childrenCount,
      date: selectedDate
    });
  };

  // ================= MOBILE HEADER =================
  if (isMobileWeb) {
    return (
      <>
        <View style={[styles.headerContainer, { paddingHorizontal: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <WebLink style={styles.logoSection} screen="Dashboard">
              <ShieldCheck color="#E11D48" size={28} />
              <Text style={[styles.logoText, { fontSize: 18 }]}>smarttags</Text>
            </WebLink>
            <View style={{ position: 'relative' }}>
              {isGuest ? (
                <WebLink screen="Login" style={{ backgroundColor: '#E11D48', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Log In</Text>
                </WebLink>
              ) : (
                <TouchableOpacity 
                  style={styles.profileMenu}
                  onPress={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <Menu color="#222222" size={16} />
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
              <Search color="#E11D48" size={18} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#222222' }}>{selectedLocation}</Text>
                <Text style={{ fontSize: 12, color: '#717171' }}>{selectedService} • {selectedDate ? `May ${selectedDate}` : 'Any week'} {requiresGuests ? `• ${adults + childrenCount || 'Add'} guests` : ''}</Text>
              </View>
          </TouchableOpacity>
        </View>

        {/* Full-screen Mobile Search Modal */}
        <Modal visible={showMobileSearchModal} animationType="slide" transparent={false}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
            <View style={styles.mobileModalHeader}>
              <TouchableOpacity onPress={() => setShowMobileSearchModal(false)} style={styles.mobileCloseBtn}>
                <X color="#222" size={24} />
              </TouchableOpacity>
              <View style={styles.mobileServiceToggleRow}>
                 <Text style={{fontSize: 16, fontWeight: 'bold'}}>{selectedService}</Text>
              </View>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {/* Service Selection Card */}
              <View style={styles.mobileCard}>
                <Text style={styles.mobileCardTitle}>What are you looking for?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                  {servicesList.map(srv => (
                    <TouchableOpacity 
                      key={srv} 
                      onPress={() => setSelectedService(srv)}
                      style={[styles.mobileServicePill, selectedService === srv && styles.mobileServicePillActive]}
                    >
                      <Text style={{ color: selectedService === srv ? '#FFF' : '#222', fontWeight: '500' }}>{srv}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Location Selection Card */}
              <View style={styles.mobileCard}>
                <Text style={styles.mobileCardTitle}>{isTravel ? 'Where to?' : 'Select City'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                  {['Helsinki', 'Espoo', 'Vantaa', 'Tampere', 'Turku'].map(loc => (
                    <TouchableOpacity 
                      key={loc}
                      onPress={() => setSelectedLocation(loc)}
                      style={[styles.mobileLocBtn, selectedLocation === loc && { borderColor: '#222', borderWidth: 2 }]}
                    >
                      <Text style={{ fontWeight: selectedLocation === loc ? 'bold' : 'normal' }}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Guests Card */}
              {requiresGuests && (
                <View style={styles.mobileCard}>
                  <Text style={styles.mobileCardTitle}>Who's coming?</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <Text style={{ fontSize: 16 }}>Adults</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <TouchableOpacity onPress={() => setAdults(Math.max(0, adults - 1))} style={styles.circleBtn}><Minus size={16} color="#717171" /></TouchableOpacity>
                      <Text style={{ fontSize: 16, minWidth: 20, textAlign: 'center' }}>{adults}</Text>
                      <TouchableOpacity onPress={() => setAdults(adults + 1)} style={styles.circleBtn}><Plus size={16} color="#717171" /></TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.mobileFooterBar}>
              <TouchableOpacity onPress={() => setShowMobileSearchModal(false)}>
                <Text style={{ fontSize: 16, fontWeight: '600', textDecorationLine: 'underline' }}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mobileSearchExecuteBtn} onPress={handleSearchExecute}>
                <Search color="#FFF" size={18} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Search</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  // ================= DESKTOP HEADER =================
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Left: Logo */}
        <WebLink style={styles.logoSection} screen="Dashboard">
          <ShieldCheck color="#E11D48" size={32} />
          <Text style={styles.logoText}>smarttags</Text>
        </WebLink>

        {/* Center: Search Pill */}
        <View style={styles.searchPill}>
          <TouchableOpacity 
            style={[styles.searchSection, showServiceDropdown && styles.activeSection]} 
            onPress={() => { setShowServiceDropdown(!showServiceDropdown); setShowLocationDropdown(false); setShowDateDropdown(false); setShowGuestDropdown(false); }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.searchTitle}>Service</Text>
                <Text style={styles.searchSub}>{selectedService}</Text>
              </View>
              <ChevronDown color="#717171" size={16} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={[styles.searchSection, showLocationDropdown && styles.activeSection]}
            onPress={() => { setShowLocationDropdown(!showLocationDropdown); setShowServiceDropdown(false); setShowDateDropdown(false); setShowGuestDropdown(false); }}
          >
            <Text style={styles.searchTitle}>{isTravel ? 'Destination' : 'Where'}</Text>
            <Text style={styles.searchSub}>{selectedLocation}</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={[styles.searchSection, showDateDropdown && styles.activeSection]}
            onPress={() => { setShowDateDropdown(!showDateDropdown); setShowServiceDropdown(false); setShowLocationDropdown(false); setShowGuestDropdown(false); }}
          >
            <Text style={styles.searchTitle}>{isTravel ? 'Departure' : 'When'}</Text>
            <Text style={styles.searchSub}>{selectedDate ? `May ${selectedDate}, 2026` : 'Add dates'}</Text>
          </TouchableOpacity>
          
          {requiresGuests && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity 
                style={[styles.searchSection, showGuestDropdown && styles.activeSection]}
                onPress={() => { setShowGuestDropdown(!showGuestDropdown); setShowDateDropdown(false); setShowServiceDropdown(false); setShowLocationDropdown(false); }}
              >
                <Text style={styles.searchTitle}>Who</Text>
                <Text style={styles.searchSub}>{adults + childrenCount > 0 ? `${adults + childrenCount} guests` : 'Add guests'}</Text>
              </TouchableOpacity>
            </>
          )}
          
          <View style={styles.searchButtonContainer}>
            <TouchableOpacity style={styles.searchIconBg} onPress={handleSearchExecute}>
              <Search color="#FFF" size={16} />
              <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>Search</Text>
            </TouchableOpacity>
          </View>

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

          {/* Absolute Location Dropdown */}
          {showLocationDropdown && (
            <View style={[styles.dropdownMenu, { left: 160 }]}>
              {['Helsinki', 'Espoo', 'Vantaa', 'Tampere', 'Turku'].map((loc, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.dropdownItem, selectedLocation === loc && styles.dropdownItemActive]}
                  onPress={() => { setSelectedLocation(loc); setShowLocationDropdown(false); setShowDateDropdown(true); }}
                >
                  <Text style={[styles.dropdownItemText, selectedLocation === loc && styles.dropdownItemTextActive]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Absolute Date Dropdown (Modern Calendar) */}
          {showDateDropdown && (
            <View style={[styles.dropdownMenu, { left: 180, width: 320, padding: 20 }]}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 16, textAlign: 'center' }}>May 2026</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <Text key={d} style={{ color: '#717171', width: 40, textAlign: 'center', fontSize: 14 }}>{d}</Text>)}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
                {Array.from({length: 5}).map((_, i) => <View key={`e-${i}`} style={{ width: 40, height: 40 }} />)}
                {Array.from({length: 31}, (_, i) => i + 1).map(d => (
                  <TouchableOpacity 
                    key={d} 
                    onPress={() => { setShowDateDropdown(false); setSelectedDate(d); }}
                    style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: selectedDate === d ? '#E11D48' : 'transparent' }}
                  >
                    <Text style={{ color: selectedDate === d ? '#FFF' : '#222' }}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Absolute Guest Dropdown */}
          {showGuestDropdown && (
            <View style={[styles.dropdownMenu, { right: 120, left: 'auto', width: 320, padding: 24 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Adults</Text>
                  <Text style={{ color: '#717171', fontSize: 14 }}>Ages 13 or above</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={() => setAdults(Math.max(0, adults - 1))} style={styles.circleBtn}><Minus size={16} color="#717171" /></TouchableOpacity>
                  <Text style={{ fontSize: 16 }}>{adults}</Text>
                  <TouchableOpacity onPress={() => setAdults(adults + 1)} style={styles.circleBtn}><Plus size={16} color="#717171" /></TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Children</Text>
                  <Text style={{ color: '#717171', fontSize: 14 }}>Ages 2-12</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={() => setChildrenCount(Math.max(0, childrenCount - 1))} style={styles.circleBtn}><Minus size={16} color="#717171" /></TouchableOpacity>
                  <Text style={{ fontSize: 16 }}>{childrenCount}</Text>
                  <TouchableOpacity onPress={() => setChildrenCount(childrenCount + 1)} style={styles.circleBtn}><Plus size={16} color="#717171" /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Right: Actions */}
        <View style={styles.rightActions}>
          <WebLink style={styles.actionBtn} screen="Services">
            <Text style={styles.hostText}>Explore Services</Text>
          </WebLink>
          <TouchableOpacity style={[styles.actionBtn, styles.globeIcon]}>
            <Globe color="#222222" size={18} />
          </TouchableOpacity>
          
          <View style={{ position: 'relative' }}>
            {isGuest ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <WebLink screen="Login" style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ fontWeight: '600', color: '#222', fontSize: 15 }}>Log In</Text>
                </WebLink>
                <WebLink screen="Login" style={{ backgroundColor: '#E11D48', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 }}>
                  <Text style={{ fontWeight: 'bold', color: '#FFF', fontSize: 15 }}>Sign Up</Text>
                </WebLink>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.profileMenu}
                  onPress={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <Menu color="#222222" size={18} />
                  <View style={styles.avatarCircle}>
                    {profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <User color="#FFF" size={16} />
                    )}
                  </View>
                </TouchableOpacity>
                
                {/* Absolute Profile Dropdown */}
                {showProfileDropdown && (
                  <View style={[styles.dropdownMenu, { top: 50, right: 0, left: 'auto', width: 240, padding: 8, zIndex: 999 }]}>
                    <WebLink style={styles.dropdownItem} screen="Profile" onPress={() => setShowProfileDropdown(false)}>
                      <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Messages</Text>
                    </WebLink>
                    <WebLink style={styles.dropdownItem} screen="Profile" onPress={() => setShowProfileDropdown(false)}>
                      <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Profile</Text>
                    </WebLink>
                    <WebLink style={styles.dropdownItem} screen="HostDashboard" onPress={() => setShowProfileDropdown(false)}>
                      <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Host Dashboard</Text>
                    </WebLink>
                    <View style={{ height: 1, backgroundColor: '#EBEBEB', marginVertical: 8 }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    paddingVertical: 16,
    zIndex: 100,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E11D48',
    marginLeft: 6,
    letterSpacing: -0.5,
  },
  mobileSearchPill: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EBEBEB'
  },
  mobileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
  },
  mobileCloseBtn: {
    position: 'absolute',
    left: 20,
    padding: 8,
    backgroundColor: '#F7F7F7',
    borderRadius: 20,
  },
  mobileServiceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  mobileCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  mobileCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  mobileServicePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F7F7F7',
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  mobileServicePillActive: {
    backgroundColor: '#222',
    borderColor: '#222',
  },
  mobileLocBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  mobileFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
  },
  mobileSearchExecuteBtn: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    height: 66,
    flex: 2,
    maxWidth: 850,
    position: 'relative',
  },
  searchSection: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    height: '100%',
    borderRadius: 32,
  },
  activeSection: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#222222',
  },
  searchSub: {
    fontSize: 14,
    color: '#717171',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#DDDDDD',
  },
  searchButtonContainer: {
    paddingRight: 8,
    justifyContent: 'center',
  },
  searchIconBg: {
    backgroundColor: '#E11D48',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
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
    backgroundColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#4B5563',
  },
  dropdownItemTextActive: {
    fontWeight: 'bold',
    color: '#111827',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 22,
  },
  hostText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  globeIcon: {
    paddingHorizontal: 10,
    marginRight: 4,
  },
  profileMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 30,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 12,
    backgroundColor: '#FFFFFF',
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
    borderColor: '#DDDDDD',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
