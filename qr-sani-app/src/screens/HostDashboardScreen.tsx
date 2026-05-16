import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Settings, Plus, MapPin, Clock, Home } from 'lucide-react-native';

export default function HostDashboardScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Host Dashboard</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <Settings color="#0A192F" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* WELCOME SECTION */}
        <Text style={styles.welcomeText}>Welcome back, Partner</Text>
        <Text style={styles.subText}>Manage your locations and track bookings.</Text>

        {/* LOCATIONS LIST */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Your Locations</Text>
        </View>

        {/* The Shop they just added */}
        <View style={styles.shopCard}>
          <View style={styles.statusBadge}>
            <Clock color="#B45309" size={14} style={{ marginRight: 4 }} />
            <Text style={styles.statusText}>Pending Verification</Text>
          </View>
          
          <Text style={styles.shopName}>Your New Shop Location</Text>
          <View style={styles.locationRow}>
            <MapPin color="#717171" size={14} />
            <Text style={styles.locationText}>Location details currently under review</Text>
          </View>
        </View>

        {/* ADD ANOTHER LOCATION BUTTON */}
        <TouchableOpacity 
          style={styles.addLocationBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PartnerOnboardingIntro')}
        >
          <View style={styles.addIconBg}>
            <Plus color="#0A192F" size={24} />
          </View>
          <Text style={styles.addLocationText}>Add another location</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* QUICK NAV TO GO BACK TO USER MODE */}
      <TouchableOpacity 
        style={styles.switchModeBtn}
        onPress={() => navigation.navigate('ServicesScreen')}
      >
        <Home color="#4A00E0" size={20} style={{ marginRight: 8 }} />
        <Text style={styles.switchModeText}>Return to User View</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 10, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0A192F', letterSpacing: -0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 100 },
  
  welcomeText: { fontSize: 28, fontWeight: '800', color: '#0A192F', marginBottom: 4 },
  subText: { fontSize: 16, color: '#717171', marginBottom: 32 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0A192F' },

  shopCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  statusText: { color: '#B45309', fontSize: 13, fontWeight: '600' },
  shopName: { fontSize: 18, fontWeight: '700', color: '#0A192F', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: '#717171', fontSize: 14, marginLeft: 6 },

  addLocationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  addIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  addLocationText: { fontSize: 16, fontWeight: '600', color: '#0A192F' },

  switchModeBtn: { flexDirection: 'row', position: 'absolute', bottom: Platform.OS === 'ios' ? 34 : 24, left: 24, right: 24, backgroundColor: '#F5F3FF', paddingVertical: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' },
  switchModeText: { color: '#4A00E0', fontSize: 16, fontWeight: '700' }
});