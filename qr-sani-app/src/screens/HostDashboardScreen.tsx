import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supabase_lucifer_core } from '../utils/supabase';
import apiClient from '../utils/apiClient';

import { Settings, Plus, MapPin, Clock, Home, CheckCircle, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export default function HostDashboardScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const [myShops, setMyShops] = useState<any[]>([]);
  const [userName, setUserName] = useState('Partner');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused && user) {
      fetchDashboardData();
    } else if (isFocused && !user) {
      setLoading(false);
    }
  }, [isFocused, user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/api/host/dashboard');
      if (!res.data.first_name) {
        navigation.navigate('Dashboard');
        return;
      }
      setUserName(res.data.first_name || 'Partner');
      setMyShops(res.data.shops || []);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Host Dashboard</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('HostSettings')}>
          <Settings color="#0A192F" size={22} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4A00E0" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Hello, {userName}</Text>
            <Text style={styles.subText}>Manage your active listings and track your verification status.</Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Listings</Text>
            <Text style={styles.shopCount}>{myShops.length} Total</Text>
          </View>

          {myShops.map((shop) => {
            // Get the first photo to show as a thumbnail, or fallback to a placeholder
            const thumbnailUrl = shop.shop_photos?.[0] || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&q=80&w=150&h=150';

            return (
              <TouchableOpacity 
                key={shop.id} 
                style={styles.shopCard} 
                activeOpacity={0.8}
                // NAVIGATE TO THE NEW DETAILS SCREEN!
                onPress={() => navigation.navigate('HostShopDetails', { id: shop.id })}
              >
                <View style={styles.cardImageContainer}>
                  <Image source={{ uri: thumbnailUrl }} style={styles.cardImage} />
                </View>

                <View style={styles.cardInfo}>
                  <View style={[styles.statusBadge, shop.verification_status === 'pending' ? styles.statusPending : styles.statusActive]}>
                    {shop.verification_status === 'pending' ? (
                      <Clock color="#B45309" size={12} style={{ marginRight: 4 }} />
                    ) : (
                      <CheckCircle color="#15803D" size={12} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.statusText, shop.verification_status === 'active' && { color: '#15803D' }]}>
                      {shop.verification_status === 'pending' ? 'Review Pending' : 'Active'}
                    </Text>
                  </View>
                  
                  <Text style={styles.shopName} numberOfLines={1}>{shop.shop_name}</Text>
                  
                  <View style={styles.locationRow}>
                    <MapPin color="#8892B0" size={14} style={{ marginRight: 4 }} />
                    <Text style={styles.locationText} numberOfLines={1}>{shop.street}, {shop.city}</Text>
                  </View>
                </View>

                <ChevronRight color="#CBD5E1" size={24} />
              </TouchableOpacity>
            )
          })}

          <TouchableOpacity style={styles.addLocationBtn} activeOpacity={0.7} onPress={() => navigation.navigate('PartnerOnboardingIntro')}>
            <View style={styles.addIconBg}><Plus color="#0A192F" size={24} /></View>
            <View>
              <Text style={styles.addLocationText}>Add another location</Text>
              <Text style={styles.addLocationSub}>List a new repair shop</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
      )}

      <View style={styles.bottomNavContainer}>
        <TouchableOpacity style={styles.switchModeBtn} activeOpacity={0.9} onPress={() => navigation.navigate('VehicleRepairDirectory')}>
          <Home color="#FFFFFF" size={20} style={{ marginRight: 10 }} />
          <Text style={styles.switchModeText}>Return to User View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FAFAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0A192F', letterSpacing: -0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 140 }, 
  welcomeSection: { marginBottom: 32 },
  welcomeText: { fontSize: 28, fontWeight: '800', color: '#0A192F', marginBottom: 6, letterSpacing: -0.5 },
  subText: { fontSize: 16, color: '#717171', lineHeight: 22 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0A192F' },
  shopCount: { fontSize: 14, fontWeight: '600', color: '#8892B0' },
  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#4A00E0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  cardImageContainer: { width: 70, height: 70, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', marginRight: 16 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardInfo: { flex: 1, justifyContent: 'center' },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 6 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusText: { color: '#B45309', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  shopName: { fontSize: 16, fontWeight: '700', color: '#0A192F', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: '#8892B0', fontSize: 14, flex: 1 },
  addLocationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', marginTop: 8 },
  addIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  addLocationText: { fontSize: 16, fontWeight: '700', color: '#0A192F', marginBottom: 2 },
  addLocationSub: { fontSize: 13, color: '#8892B0' },
  bottomNavContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 34 : 24, left: 24, right: 24 },
  switchModeBtn: { flexDirection: 'row', backgroundColor: '#0A192F', paddingVertical: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#0A192F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  switchModeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 }
});