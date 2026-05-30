import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Modal, useWindowDimensions, ScrollView, SafeAreaView } from 'react-native';
import { Search, Globe, Menu, User, Building2, ChevronDown, Plus, Minus, X, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import WebLink from './WebLink';
import { useAuth } from '../context/AuthContext';
import { supabase_lucifer_core } from '../utils/supabase';
import apiClient from '../utils/apiClient';

const DateDropdownComponent = ({ currentMonth, currentYear, todayDate, selectedDate, setShowDateDropdown, setSelectedDate, styles }: any) => {
  return (
    <View style={[styles.dropdownMenu, { left: 180, width: 320, padding: 20 }]}>
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 16, textAlign: 'center', color: '#E2E8F0' }}>{currentMonth} {currentYear}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <Text key={d} style={{ color: '#94A3B8', width: 40, textAlign: 'center', fontSize: 14 }}>{d}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
        {[1, 2, 3, 4, 5].map((_, i) => <View key={`e-${i}`} style={{ width: 40, height: 40 }} />)}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map(d => {
          const isToday = d === todayDate;
          const isSelected = selectedDate === d;
          const bg = isSelected ? '#00E5FF' : isToday ? 'rgba(0, 229, 255, 0.1)' : 'transparent';
          const bw = isToday && !isSelected ? 1 : 0;
          const txtColor = isSelected ? '#0A192F' : isToday ? '#00E5FF' : '#E2E8F0';
          const fw = isToday ? 'bold' : 'normal';
          
          return (
            <TouchableOpacity 
              key={d} 
              onPress={() => { setShowDateDropdown(false); setSelectedDate(d); }}
              style={{ 
                width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, 
                backgroundColor: bg,
                borderWidth: bw,
                borderColor: '#00E5FF'
              }}
            >
              <Text style={{ color: txtColor, fontWeight: fw as 'bold' | 'normal' }}>{d}</Text>
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

  // --- AUTHENTICATION STATE ---
  const { user, logout } = useAuth();
  const isGuest = !user;
  const [profile, setProfile] = useState<any>(null);
  const todayDate = new Date().getDate();
  const currentMonth = new Date().toLocaleString('default', { month: 'short' });
  const currentYear = new Date().getFullYear();

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    if (user) {
      // Fetch avatar securely from the Go API Interceptor
      apiClient.get('/api/dashboard')
        .then(res => {
          if (res.data?.profile?.avatar_url) {
            setProfile({ avatar_url: res.data.profile.avatar_url });
          } else {
            setProfile({ avatar_url: user.user_metadata?.avatar_url || null });
          }
        })
        .catch(err => {
          setProfile({ avatar_url: user.user_metadata?.avatar_url || null });
        });
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await logout();
      navigation.navigate('Dashboard');
    } catch (err) {
      console.error(err);
    }
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

  // --- NEW: CATEGORY TABS STATE ---
  const [activeTab, setActiveTab] = useState('Explore');

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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 }}>
            <WebLink style={styles.logoSection} screen="Dashboard">
              <Image source={require('../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 8 }} />
              <Text style={[styles.logoText, { fontSize: 20 }]}>ATS finland</Text>
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
              <Search color="#00E5FF" size={20} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#F8FAFC' }}>Start your search</Text>
              </View>
          </TouchableOpacity>

          {/* Airbnb-style Mobile Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginHorizontal: -20, paddingBottom: 8 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 32 }}>
            <WebLink screen="Services" onPress={() => setActiveTab('Services')} style={[styles.mobileTab, activeTab === 'Services' && styles.mobileTabActive]}>
                <Menu color={activeTab === 'Services' ? '#00E5FF' : '#94A3B8'} size={24} style={{ marginBottom: 6, alignSelf: 'center' }} />
                <Text style={[styles.mobileTabText, activeTab === 'Services' && styles.mobileTabTextActive]}>Services</Text>
            </WebLink>
            <WebLink screen="ShopDetails" onPress={() => setActiveTab('Pricing')} style={[styles.mobileTab, activeTab === 'Pricing' && styles.mobileTabActive]}>
                <Building2 color={activeTab === 'Pricing' ? '#00E5FF' : '#94A3B8'} size={24} style={{ marginBottom: 6, alignSelf: 'center' }} />
                <Text style={[styles.mobileTabText, activeTab === 'Pricing' && styles.mobileTabTextActive]}>Pricing</Text>
            </WebLink>
          </ScrollView>
        </View>

        {/* Full-screen Mobile Search Modal */}
        <Modal visible={showMobileSearchModal} animationType="slide" transparent={false}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
            <View style={styles.mobileModalHeader}>
              <TouchableOpacity style={styles.mobileCloseBtn} onPress={() => setShowMobileSearchModal(false)}>
                <X color="#E2E8F0" size={20} />
              </TouchableOpacity>
              <View style={styles.mobileServiceToggleRow}>
                 <Text style={{fontSize: 16, fontWeight: 'bold', color: '#FFF'}}>{selectedService}</Text>
              </View>
            </View>

            <ScrollView style={{ padding: 20, backgroundColor: '#0B1120' }}>


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
                      <Text style={{ color: selectedService === srv ? '#FFF' : '#E2E8F0', fontWeight: '500' }}>{srv}</Text>
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
                      style={[styles.mobileLocBtn, selectedLocation === loc && { borderColor: '#00E5FF', borderWidth: 2 }]}
                    >
                      <Text style={{ fontWeight: selectedLocation === loc ? 'bold' : 'normal', color: '#E2E8F0' }}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Guests Card */}
              {requiresGuests && (
                <View style={styles.mobileCard}>
                  <Text style={styles.mobileCardTitle}>Who's coming?</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <Text style={{ fontSize: 16, color: '#E2E8F0' }}>Adults</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <TouchableOpacity onPress={() => setAdults(Math.max(0, adults - 1))} style={styles.circleBtn}><Minus size={16} color="#94A3B8" /></TouchableOpacity>
                      <Text style={{ fontSize: 16, minWidth: 20, textAlign: 'center', color: '#E2E8F0' }}>{adults}</Text>
                      <TouchableOpacity onPress={() => setAdults(adults + 1)} style={styles.circleBtn}><Plus size={16} color="#94A3B8" /></TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.mobileFooterBar}>
              <TouchableOpacity onPress={() => setShowMobileSearchModal(false)}>
                <Text style={{ fontSize: 16, fontWeight: '600', textDecorationLine: 'underline', color: '#E2E8F0' }}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mobileSearchExecuteBtn} onPress={handleSearchExecute}>
                <Search color="#0A192F" size={18} />
                <Text style={{ color: '#0A192F', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Search</Text>
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
          }} 
          style={{ position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, cursor: 'default' } as any}
        />
      )}
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Left: Logo */}
        <WebLink style={styles.logoSection} screen="Dashboard">
          <Image source={require('../../assets/icon.png')} style={{ width: 42, height: 42, borderRadius: 10 }} />
          <Text style={[styles.logoText, { fontSize: 24 }]}>ATS finland</Text>
        </WebLink>

        {/* Center: Top Tabs */}
        <View style={styles.topTabsContainer}>
          <WebLink screen="Services" onPress={() => setActiveTab('Services')} style={[styles.topTab, activeTab === 'Services' && styles.topTabActive]}>
            <Text style={[styles.topTabText, activeTab === 'Services' && styles.topTabTextActive]}>Services</Text>
          </WebLink>
          <WebLink screen="ShopDetails" onPress={() => setActiveTab('Pricing')} style={[styles.topTab, activeTab === 'Pricing' && styles.topTabActive]}>
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

      {/* Bottom Row: Search Pill */}
      <View style={styles.searchPillContainer}>
        <View style={{ position: 'relative', width: '100%', maxWidth: 700, zIndex: 10 }}>
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
            
            <TouchableOpacity 
              style={[styles.searchSection, showLocationDropdown && styles.activeSection]}
              onPress={() => { setShowLocationDropdown(!showLocationDropdown); setShowServiceDropdown(false); setShowDateDropdown(false); setShowGuestDropdown(false); }}
            >
              <View>
                <Text style={styles.searchTitle} numberOfLines={1}>{isTravel ? 'Destination' : 'Where'}</Text>
                <Text style={styles.searchSub} numberOfLines={1}>{selectedLocation}</Text>
              </View>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={[styles.searchSection, showDateDropdown && styles.activeSection]}
              onPress={() => { setShowDateDropdown(!showDateDropdown); setShowServiceDropdown(false); setShowLocationDropdown(false); setShowGuestDropdown(false); }}
            >
              <View>
                <Text style={styles.searchTitle} numberOfLines={1}>{isTravel ? 'Departure' : 'When'}</Text>
                <Text style={styles.searchSub} numberOfLines={1}>{selectedDate ? `May ${selectedDate}, 2026` : 'Add dates'}</Text>
              </View>
            </TouchableOpacity>
            
            {requiresGuests && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={[styles.searchSection, showGuestDropdown && styles.activeSection]}
                  onPress={() => { setShowGuestDropdown(!showGuestDropdown); setShowDateDropdown(false); setShowServiceDropdown(false); setShowLocationDropdown(false); }}
                >
                  <View>
                    <Text style={styles.searchTitle} numberOfLines={1}>Who</Text>
                    <Text style={styles.searchSub} numberOfLines={1}>{adults + childrenCount > 0 ? `${adults + childrenCount} guests` : 'Add guests'}</Text>
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
            <DateDropdownComponent 
               currentMonth={currentMonth} 
               currentYear={currentYear} 
               todayDate={todayDate} 
               selectedDate={selectedDate} 
               setShowDateDropdown={setShowDateDropdown} 
               setSelectedDate={setSelectedDate} 
               styles={styles} 
            />
          )}

          {/* Absolute Guest Dropdown */}
          {showGuestDropdown && (
            <View style={[styles.dropdownMenu, { right: 120, left: 'auto', width: 320, padding: 24 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#E2E8F0' }}>Adults</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 14 }}>Ages 13 or above</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={() => setAdults(Math.max(0, adults - 1))} style={styles.circleBtn}><Minus size={16} color="#94A3B8" /></TouchableOpacity>
                  <Text style={{ fontSize: 16, color: '#E2E8F0' }}>{adults}</Text>
                  <TouchableOpacity onPress={() => setAdults(adults + 1)} style={styles.circleBtn}><Plus size={16} color="#94A3B8" /></TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#E2E8F0' }}>Children</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 14 }}>Ages 2-12</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={() => setChildrenCount(Math.max(0, childrenCount - 1))} style={styles.circleBtn}><Minus size={16} color="#94A3B8" /></TouchableOpacity>
                  <Text style={{ fontSize: 16, color: '#E2E8F0' }}>{childrenCount}</Text>
                  <TouchableOpacity onPress={() => setChildrenCount(childrenCount + 1)} style={styles.circleBtn}><Plus size={16} color="#94A3B8" /></TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
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
    padding: 12,
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
    maxWidth: 700,
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
