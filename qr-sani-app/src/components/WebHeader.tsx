import React, { useState, createElement } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Modal, FlatList } from 'react-native';
import { Search, Globe, Menu, User, ShieldCheck, ChevronDown, Plus, Minus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function WebHeader({ profile, isGuest }: { profile?: any, isGuest?: boolean }) {
  const navigation = useNavigation<any>();
  const [selectedService, setSelectedService] = useState('Vehicle Repair');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [adults, setAdults] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);

  if (Platform.OS !== 'web') return null;

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
            onPress={() => setShowServiceDropdown(!showServiceDropdown)}
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
          
          <TouchableOpacity style={styles.searchSection}>
            <Text style={styles.searchTitle}>When</Text>
            {Platform.OS === 'web' ? (
              createElement('input', { type: 'date', style: { border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#717171', fontSize: 14, fontFamily: 'inherit', padding: 0, marginTop: 2 } })
            ) : (
              <Text style={styles.searchSub}>Add dates</Text>
            )}
          </TouchableOpacity>
          
          {requiresGuests && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity 
                style={[styles.searchSection, { flex: 1 }, showGuestDropdown && styles.activeSection]}
                onPress={() => { setShowGuestDropdown(!showGuestDropdown); setShowServiceDropdown(false); }}
              >
                <Text style={styles.searchTitle}>Who</Text>
                <Text style={styles.searchSub}>{adults + childrenCount === 0 ? 'Add guests' : `${adults + childrenCount} guests`}</Text>
              </TouchableOpacity>
            </>
          )}
          
          {/* Search Button Container */}
          <View style={styles.searchButtonContainer}>
            <TouchableOpacity style={styles.searchIconBg}>
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

          {/* Absolute Guest Dropdown */}
          {showGuestDropdown && (
            <View style={[styles.dropdownMenu, { right: 100, left: 'auto', width: 300 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Adults</Text>
                  <Text style={{ color: '#717171', fontSize: 14 }}>Ages 13 or above</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity onPress={() => setAdults(Math.max(0, adults - 1))} style={styles.circleBtn}><Minus size={16} color="#717171" /></TouchableOpacity>
                  <Text style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{adults}</Text>
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
                  <Text style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{childrenCount}</Text>
                  <TouchableOpacity onPress={() => setChildrenCount(childrenCount + 1)} style={styles.circleBtn}><Plus size={16} color="#717171" /></TouchableOpacity>
                </View>
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
          
          <TouchableOpacity 
            style={styles.profileMenu}
            onPress={() => isGuest ? navigation.navigate('Login') : navigation.navigate('Profile')}
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
