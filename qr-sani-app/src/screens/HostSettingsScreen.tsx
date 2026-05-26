import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, useWindowDimensions, TextInput, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, Calendar, Settings } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase_lucifer_core } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export default function HostSettingsScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('availability');
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Availability State
  const [capacity, setCapacity] = useState('5');
  const [isFullyBooked, setIsFullyBooked] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user) {
      fetchShops();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedShopId && selectedDate) {
      fetchAvailability();
    }
  }, [selectedShopId, selectedDate]);

  const fetchShops = async () => {
    if (!user) return;
    try {
      const { data } = await supabase_lucifer_core.from('shop_locations').select('id, shop_name').eq('owner_id', user.id);
      if (data && data.length > 0) {
        setShops(data);
        setSelectedShopId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const { data } = await supabase_lucifer_core
        .from('shop_availability')
        .select('*')
        .eq('shop_id', selectedShopId)
        .eq('available_date', selectedDate)
        .single();
        
      if (data) {
        setCapacity(data.max_capacity.toString());
        setIsFullyBooked(data.is_fully_booked);
      } else {
        setCapacity('5');
        setIsFullyBooked(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAvailability = async () => {
    if (!selectedShopId) return;
    setSaving(true);
    try {
      const { error } = await supabase_lucifer_core
        .from('shop_availability')
        .upsert({
          shop_id: selectedShopId,
          available_date: selectedDate,
          max_capacity: parseInt(capacity) || 5,
          is_fully_booked: isFullyBooked
        }, { onConflict: 'shop_id, available_date' });
        
      if (error) throw error;
      Alert.alert("Success", "Availability settings saved!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderSidebar = () => (
    <View style={[styles.sidebar, isDesktop && styles.sidebarDesktop]}>
      {!isDesktop && (
        <TouchableOpacity style={styles.mobileBackBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0A192F" size={24} />
        </TouchableOpacity>
      )}
      <Text style={styles.sidebarTitle}>Settings</Text>
      
      <TouchableOpacity 
        style={[styles.sidebarItem, activeTab === 'availability' && styles.sidebarItemActive]}
        onPress={() => setActiveTab('availability')}
      >
        <Calendar color={activeTab === 'availability' ? "#4A00E0" : "#64748B"} size={20} />
        <Text style={[styles.sidebarItemText, activeTab === 'availability' && styles.sidebarItemTextActive]}>Availability</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.sidebarItem, activeTab === 'general' && styles.sidebarItemActive]}
        onPress={() => setActiveTab('general')}
      >
        <Settings color={activeTab === 'general' ? "#4A00E0" : "#64748B"} size={20} />
        <Text style={[styles.sidebarItemText, activeTab === 'general' && styles.sidebarItemTextActive]}>General Settings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (loading) return <View style={styles.contentArea}><ActivityIndicator size="large" color="#4A00E0" /></View>;
    if (shops.length === 0) return <View style={styles.contentArea}><Text>No shops found.</Text></View>;

    if (activeTab === 'availability') {
      return (
        <View style={styles.contentArea}>
          <Text style={styles.contentTitle}>Manage Availability</Text>
          <Text style={styles.contentSubtitle}>Control how many vehicles you can repair each day.</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select Shop</Text>
            <View style={styles.shopSelector}>
              {shops.map(s => (
                <TouchableOpacity 
                  key={s.id} 
                  style={[styles.shopPill, selectedShopId === s.id && styles.shopPillActive]}
                  onPress={() => setSelectedShopId(s.id)}
                >
                  <Text style={[styles.shopPillText, selectedShopId === s.id && styles.shopPillTextActive]}>{s.shop_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              value={selectedDate} 
              onChangeText={setSelectedDate}
              placeholder="2026-05-26"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Daily Capacity (Number of Vehicles)</Text>
            <TextInput 
              style={styles.input} 
              value={capacity} 
              onChangeText={setCapacity}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Mark as Fully Booked?</Text>
            <TouchableOpacity 
              style={[styles.toggleBtn, isFullyBooked && styles.toggleBtnActive]}
              onPress={() => setIsFullyBooked(!isFullyBooked)}
            >
              <Text style={[styles.toggleBtnText, isFullyBooked && styles.toggleBtnTextActive]}>
                {isFullyBooked ? "Yes, Blocked" : "No, Open for bookings"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAvailability} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Availability</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.contentArea}>
        <Text style={styles.contentTitle}>General Settings</Text>
        <Text style={styles.contentSubtitle}>More settings coming soon.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isDesktop && (
        <View style={styles.desktopHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ArrowLeft color="#0A192F" size={24} />
            <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: 'bold' }}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.layoutWrapper, isDesktop && styles.layoutWrapperDesktop]}>
        {renderSidebar()}
        <ScrollView style={{ flex: 1 }}>
          {renderContent()}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  desktopHeader: { padding: 24, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  layoutWrapper: { flex: 1, flexDirection: 'column' },
  layoutWrapperDesktop: { flexDirection: 'row', maxWidth: 1200, width: '100%', alignSelf: 'center', marginTop: 32, paddingHorizontal: 24 },
  
  sidebar: { backgroundColor: '#FFF', padding: 24, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  sidebarDesktop: { width: 280, borderRadius: 12, borderBottomWidth: 0, borderWidth: 1, height: 'auto', marginRight: 24 },
  mobileBackBtn: { marginBottom: 16 },
  sidebarTitle: { fontSize: 24, fontWeight: 'bold', color: '#0A192F', marginBottom: 24 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  sidebarItemActive: { backgroundColor: '#F3F4F6' },
  sidebarItemText: { fontSize: 16, color: '#64748B', marginLeft: 12, fontWeight: '500' },
  sidebarItemTextActive: { color: '#0A192F', fontWeight: '600' },
  
  contentArea: { flex: 1, backgroundColor: '#FFF', padding: 32, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  contentTitle: { fontSize: 24, fontWeight: 'bold', color: '#0A192F', marginBottom: 8 },
  contentSubtitle: { fontSize: 16, color: '#64748B', marginBottom: 32 },
  
  formGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#0A192F', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 16, height: 50, fontSize: 16, backgroundColor: '#F8FAFC' },
  
  shopSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  shopPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  shopPillActive: { backgroundColor: '#0A192F', borderColor: '#0A192F' },
  shopPillText: { color: '#475569', fontWeight: '500' },
  shopPillTextActive: { color: '#FFF' },

  toggleBtn: { padding: 16, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  toggleBtnText: { fontWeight: '600', color: '#475569' },
  toggleBtnTextActive: { color: '#B91C1C' },
  
  saveBtn: { backgroundColor: '#4A00E0', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
