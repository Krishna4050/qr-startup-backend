import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Settings, Plus, MapPin, Clock, Home, CheckCircle } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

export default function HostDashboardScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [myShops, setMyShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) fetchMyShops();
  }, [isFocused]);

  const fetchMyShops = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase_lucifer_core
        .from('shop_locations')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setMyShops(data);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Host Dashboard</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Settings color="#0A192F" size={24} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#4A00E0" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.welcomeText}>Welcome back, Partner</Text>
          <Text style={styles.subText}>Manage your locations and track your verification status.</Text>

          <Text style={styles.sectionTitle}>Your Locations</Text>

          {myShops.map((shop) => (
            <View key={shop.id} style={styles.shopCard}>
              <View style={[styles.statusBadge, shop.verification_status === 'pending' ? styles.statusPending : styles.statusActive]}>
                {shop.verification_status === 'pending' ? (
                  <Clock color="#B45309" size={14} style={{ marginRight: 4 }} />
                ) : (
                  <CheckCircle color="#15803D" size={14} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.statusText, shop.verification_status === 'active' && { color: '#15803D' }]}>
                  {shop.verification_status === 'pending' ? 'Verification Pending' : 'Active & Listed'}
                </Text>
              </View>
              
              <Text style={styles.shopName}>{shop.shop_name}</Text>
              <View style={styles.locationRow}>
                <MapPin color="#717171" size={14} />
                <Text style={styles.locationText}>{shop.street}, {shop.city}</Text>
              </View>
            </View>
          ))}

          {/* ADD ANOTHER LOCATION BUTTON */}
          <TouchableOpacity style={styles.addLocationBtn} activeOpacity={0.8} onPress={() => navigation.navigate('PartnerOnboardingIntro')}>
            <View style={styles.addIconBg}><Plus color="#0A192F" size={24} /></View>
            <Text style={styles.addLocationText}>Add another location</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ... (Keep existing styles, but add these two for the status badges)
const styles = StyleSheet.create({
  // ... existing styles ...
  statusPending: { backgroundColor: '#FEF3C7' },
  statusActive: { backgroundColor: '#DCFCE7' },
});