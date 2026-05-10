import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  Wrench, 
  Bed, 
  Car, 
  Bike, 
  BusFront, 
  Train, 
  Plane, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RefreshableScroll from '../components/RefreshableScroll'; // <-- IMPORTED

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2;

export default function ServicesScreen() {
  const navigation = useNavigation<any>();

  // Add the refresh handler
  const handleRefresh = async (): Promise<void> => {
    console.log("Refreshing Services Hub...");
    // Await the dummy timeout instead of returning it
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleEmergencyPress = () => {
    Alert.alert(
      "Emergency Breakdown",
      "We will share your GPS location with our partner towing companies in Finland. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Share Location", style: "destructive", onPress: () => console.log("Triggering SOS flow...") }
      ]
    );
  };

  const services = [
    { id: 'repair', title: 'Vehicle Repair', icon: <Wrench color="#3B82F6" size={32} />, color: '#EFF6FF', route: 'VehicleRepairDirectory' },
    { id: 'bike', title: 'Bike Repair', icon: <Bike color="#10B981" size={32} />, color: '#ECFDF5', route: 'BikeRepairDirectory' },
    { id: 'parking', title: 'Pay Parking', icon: <Car color="#F59E0B" size={32} />, color: '#FFFBEB', route: 'ParkingMap' },
    { id: 'hotel', title: 'Hotels & Stays', icon: <Bed color="#8B5CF6" size={32} />, color: '#F5F3FF', route: 'HotelSearch' },
    { id: 'transit', title: 'City Transit', icon: <BusFront color="#EC4899" size={32} />, color: '#FDF2F8', route: 'TransitPass' },
    { id: 'train', title: 'Train Tickets', icon: <Train color="#06B6D4" size={32} />, color: '#ECFEFF', route: 'TrainSearch' },
    { id: 'flight', title: 'Flights', icon: <Plane color="#6366F1" size={32} />, color: '#EEF2FF', route: 'FlightSearch' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services Explorer</Text>
        <Text style={styles.headerSub}>Everything you need, in one place.</Text>
      </View>

      {/* REPLACED SCROLLVIEW WITH REFRESHABLESCROLL */}
      <RefreshableScroll 
        onRefreshAction={handleRefresh} 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContent}>
          {/* EMERGENCY BREAKDOWN BUTTON */}
          <TouchableOpacity activeOpacity={0.8} onPress={handleEmergencyPress}>
            <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.emergencyCard}>
              <View style={styles.emergencyContent}>
                <View style={styles.emergencyIconBg}>
                  <ShieldAlert color="#EF4444" size={32} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={styles.emergencyTitle}>My vehicle broke down</Text>
                  <Text style={styles.emergencySub}>Request instant towing & roadside assistance.</Text>
                </View>
                <ChevronRight color="#FFFFFF" size={24} style={{ opacity: 0.8 }} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* SERVICES GRID */}
          <Text style={styles.sectionHeading}>Browse Services</Text>
          
          <View style={styles.gridContainer}>
            {services.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.serviceBox}
                activeOpacity={0.7}
                onPress={() => {
                  if (item.id === 'repair') {
                    navigation.navigate('VehicleRepairDirectory');
                  } else {
                    Alert.alert("Coming Soon", `The ${item.title} directory is being built next!`);
                  }
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                  {item.icon}
                </View>
                <Text style={styles.serviceTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </RefreshableScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    paddingTop: Platform.OS === 'android' ? 60 : 50, 
    paddingBottom: 20, 
    paddingHorizontal: 24, 
    backgroundColor: '#0F2D4D',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  headerSub: { fontSize: 15, color: '#D1D5DB' },
  
  scrollContent: { flex: 1 },
  innerContent: { padding: 24, paddingBottom: 100 },
  
  // Emergency Card
  emergencyCard: { borderRadius: 20, padding: 20, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, marginBottom: 32 },
  emergencyContent: { flexDirection: 'row', alignItems: 'center' },
  emergencyIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  emergencyTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  emergencySub: { fontSize: 13, color: '#FECACA', lineHeight: 18 },

  sectionHeading: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  
  // Grid
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  serviceBox: { 
    width: CARD_WIDTH, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 20, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  serviceTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', textAlign: 'center' }
});