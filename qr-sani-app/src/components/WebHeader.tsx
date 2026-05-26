import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Modal, FlatList, useWindowDimensions } from 'react-native';
import { Search, Globe, Menu, User, ShieldCheck, ChevronDown, Plus, Minus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function WebHeader({ profile, isGuest, onSearch }: { profile?: any, isGuest?: boolean, onSearch?: (filters: any) => void }) {
  const navigation = useNavigation<any>();
  const [selectedService, setSelectedService] = useState('Vehicle Repair');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('Helsinki');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [adults, setAdults] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);

  const { width } = useWindowDimensions();
  const isMobileWeb = width < 768;

  if (Platform.OS !== 'web') return null;

  if (isMobileWeb) {
    return (
      <View style={[styles.headerContainer, { paddingHorizontal: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity style={styles.logoSection} onPress={() => navigation.navigate('Dashboard')}>
            <ShieldCheck color="#E11D48" size={28} />
            <Text style={[styles.logoText, { fontSize: 18 }]}>smarttags</Text>
          </TouchableOpacity>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity 
              style={styles.profileMenu}
              onPress={() => isGuest ? navigation.navigate('Login') : setShowProfileDropdown(!showProfileDropdown)}
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
            {showProfileDropdown && (
              <View style={[styles.dropdownMenu, { top: 40, right: 0, left: 'auto', width: 200, padding: 8 }]}>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('Profile'); }}><Text style={styles.dropdownItemText}>Profile</Text></TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('UserMessages'); }}><Text style={styles.dropdownItemText}>Messages</Text></TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('HostDashboard'); }}><Text style={styles.dropdownItemText}>Host Dashboard</Text></TouchableOpacity>
                <View style={{ height: 1, backgroundColor: '#EBEBEB', marginVertical: 4 }} />
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('Login'); }}><Text style={styles.dropdownItemText}>Sign Out</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={{ marginTop: 16, backgroundColor: '#F7F7F7', borderRadius: 24, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDDDDD' }}>
            <Search color="#E11D48" size={18} />
            <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: '500', color: '#222222' }}>Where to?</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const servicesList = ['Vehicle Repair', 'Bike Repair', 'Pay Parking', 'Hotels & Stays', 'City Transit', 'Train Tickets', 'Flights'];
  const requiresGuests = ['Hotels & Stays', 'Train Tickets', 'Flights'].includes(selectedService);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Left: Logo */}
        <TouchableOpacity style={styles.logoSection} onPress={() => navigation.navigate('Home')}>
          <ShieldCheck color="#E11D48" size={32} />
          <Text style={styles.logoText}>smarttags</Text>
        </TouchableOpacity>

        {/* Center: Search Pill */}
        <View style={styles.searchPill}>
          <TouchableOpacity 
            style={[styles.searchSection, showServiceDropdown && styles.activeSection]} 
            onPress={() => { setShowServiceDropdown(!showServiceDropdown); setShowLocationDropdown(false); setShowDateDropdown(false); }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.searchTitle}>Which service</Text>
                <Text style={styles.searchSub}>{selectedService}</Text>
              </View>
              <ChevronDown color="#717171" size={16} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={[styles.searchSection, showLocationDropdown && styles.activeSection]}
            onPress={() => { setShowLocationDropdown(!showLocationDropdown); setShowServiceDropdown(false); setShowDateDropdown(false); }}
          >
            <Text style={styles.searchTitle}>Where</Text>
            <Text style={styles.searchSub}>{selectedLocation}</Text>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={[styles.searchSection, showDateDropdown && styles.activeSection]}
            onPress={() => { setShowDateDropdown(!showDateDropdown); setShowServiceDropdown(false); setShowLocationDropdown(false); }}
          >
            <Text style={styles.searchTitle}>When</Text>
            <Text style={styles.searchSub}>{selectedDate ? `May ${selectedDate}, 2026` : 'Add dates'}</Text>
          </TouchableOpacity>
          

          
          {/* Search Button Container */}
          <View style={styles.searchButtonContainer}>
            <TouchableOpacity 
              style={styles.searchIconBg}
              onPress={() => {
                setShowServiceDropdown(false);
                setShowLocationDropdown(false);
                setShowDateDropdown(false);
                if (onSearch) {
                  onSearch({ service: selectedService, location: selectedLocation, date: selectedDate });
                }
              }}
            >
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
                  onPress={() => {
                    setSelectedService(service);
                    setShowServiceDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedService === service && styles.dropdownItemTextActive]}>
                    {service}
                  </Text>
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
                  onPress={() => {
                    setSelectedLocation(loc);
                    setShowLocationDropdown(false);
                    setShowDateDropdown(true);
                  }}
                >
                  <Text style={[styles.dropdownItemText, selectedLocation === loc && styles.dropdownItemTextActive]}>
                    {loc}
                  </Text>
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


        </View>

        {/* Right: Actions */}
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Services')}>
            <Text style={styles.hostText}>Explore Services</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.globeIcon]}>
            <Globe color="#222222" size={18} />
          </TouchableOpacity>
          
          <View style={{ position: 'relative' }}>
            <TouchableOpacity 
              style={styles.profileMenu}
              onPress={() => isGuest ? navigation.navigate('Login') : setShowProfileDropdown(!showProfileDropdown)}
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
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('Profile'); }}>
                  <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('UserMessages'); }}>
                  <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Messages & Notifications</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('HostDashboard'); }}>
                  <Text style={[styles.dropdownItemText, { fontWeight: '600' }]}>Host Dashboard</Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: '#EBEBEB', marginVertical: 8 }} />
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileDropdown(false); navigation.navigate('Login'); }}>
                  <Text style={[styles.dropdownItemText, { color: '#E11D48' }]}>Sign Out</Text>
                </TouchableOpacity>
              </View>
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
