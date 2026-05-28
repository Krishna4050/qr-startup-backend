import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, useWindowDimensions } from 'react-native';
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
  ShieldAlert,
  ArrowRight
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RefreshableScroll from '../components/RefreshableScroll';
import WebHeader from '../components/WebHeader';
import ResponsiveWrapper from '../components/ResponsiveWrapper';
import WebLink from '../components/WebLink';
import { useAuth } from '../context/AuthContext';

export default function ServicesScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  
  const isWeb = Platform.OS === 'web';
  const isDesktopWeb = isWeb && width >= 768;

  const handleRefresh = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 800));
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
    { id: 'repair', title: 'Vehicle Repair', desc: 'Find trusted mechanics', icon: <Wrench color="#3B82F6" size={28} />, color: '#EFF6FF', route: 'VehicleRepairDirectory' },
    { id: 'bike', title: 'Bike Repair', desc: 'Quick fixes nearby', icon: <Bike color="#10B981" size={28} />, color: '#ECFDF5', route: 'BikeRepairDirectory' },
    { id: 'parking', title: 'Pay Parking', desc: 'Secure city parking', icon: <Car color="#F59E0B" size={28} />, color: '#FFFBEB', route: 'ParkingMap' },
    { id: 'hotel', title: 'Hotels & Stays', desc: 'Book your perfect stay', icon: <Bed color="#8B5CF6" size={28} />, color: '#F5F3FF', route: 'HotelSearch' },
    { id: 'transit', title: 'City Transit', desc: 'Local bus & metro', icon: <BusFront color="#EC4899" size={28} />, color: '#FDF2F8', route: 'TransitPass' },
    { id: 'train', title: 'Train Tickets', desc: 'Intercity travel', icon: <Train color="#06B6D4" size={28} />, color: '#ECFEFF', route: 'TrainSearch' },
    { id: 'flight', title: 'Flights', desc: 'Global connections', icon: <Plane color="#6366F1" size={28} />, color: '#EEF2FF', route: 'FlightSearch' },
  ];

  const mobileCardWidth = (width - 48 - 16) / 2;

  return (
    <ResponsiveWrapper bg="#FAFAFC">
      <WebHeader isGuest={!user} />
      
      {/* Mobile App Header (Hidden on Web) */}
      {!isWeb && (
        <LinearGradient colors={['#0F2D4D', '#174871']} style={styles.mobileHeader}>
          <Text style={styles.mobileHeaderTitle}>Explore Services</Text>
          <Text style={styles.mobileHeaderSub}>Everything you need, in one place.</Text>
        </LinearGradient>
      )}

      <RefreshableScroll 
        onRefreshAction={handleRefresh} 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.innerContent, isDesktopWeb && { paddingHorizontal: 40, paddingTop: 40 }]}>
          
          {/* Desktop Web Title */}
          {isDesktopWeb && (
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 36, fontWeight: '900', color: '#0A192F', letterSpacing: -1 }}>Services Explorer</Text>
              <Text style={{ fontSize: 18, color: '#64748B', marginTop: 8 }}>Discover and book essential services instantly.</Text>
            </View>
          )}

          {/* EMERGENCY BREAKDOWN BUTTON */}
          <TouchableOpacity activeOpacity={0.9} onPress={handleEmergencyPress}>
            <LinearGradient colors={['#EF4444', '#B91C1C']} style={[styles.emergencyCard, isDesktopWeb && { padding: 32, borderRadius: 24, marginBottom: 48 }]}>
              <View style={styles.emergencyContent}>
                <View style={[styles.emergencyIconBg, isDesktopWeb && { width: 72, height: 72, borderRadius: 36 }]}>
                  <ShieldAlert color="#EF4444" size={isDesktopWeb ? 40 : 32} />
                </View>
                <View style={{ flex: 1, marginLeft: 20 }}>
                  <Text style={[styles.emergencyTitle, isDesktopWeb && { fontSize: 24 }]}>My vehicle broke down</Text>
                  <Text style={[styles.emergencySub, isDesktopWeb && { fontSize: 16, marginTop: 4 }]}>Request instant towing & roadside assistance anywhere in the city.</Text>
                </View>
                <View style={[styles.sosButton, isDesktopWeb && { paddingHorizontal: 24, paddingVertical: 12 }]}>
                  <Text style={styles.sosButtonText}>SOS Alert</Text>
                  <ArrowRight color="#EF4444" size={16} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* SERVICES GRID */}
          <Text style={[styles.sectionHeading, isDesktopWeb && { fontSize: 24, marginBottom: 24 }]}>Categories</Text>
          
          <View style={[styles.gridContainer, isDesktopWeb && { gap: 24 }]}>
              {services.map((item) => {
                // Vehicle Repair is the only active route — use WebLink for it
                if (item.id === 'repair') {
                  return (
                    <WebLink
                      key={item.id}
                      screen="VehicleRepairDirectory"
                      style={[
                        styles.serviceBox, 
                        isDesktopWeb ? { width: '23%', minWidth: 220, padding: 24 } : { width: isWeb ? '47%' : mobileCardWidth }
                      ]}
                    >
                      <View style={styles.serviceBoxTop}>
                        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                          {item.icon}
                        </View>
                        {isDesktopWeb && <ChevronRight color="#CBD5E1" size={24} />}
                      </View>
                      <View style={styles.serviceBoxBottom}>
                        <Text style={[styles.serviceTitle, isDesktopWeb && { fontSize: 18, textAlign: 'left' }]}>{item.title}</Text>
                        {isDesktopWeb && <Text style={styles.serviceDesc}>{item.desc}</Text>}
                      </View>
                    </WebLink>
                  );
                }
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[
                      styles.serviceBox, 
                      isDesktopWeb ? { width: '23%', minWidth: 220, padding: 24 } : { width: isWeb ? '47%' : mobileCardWidth }
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      Alert.alert("Coming Soon", `The ${item.title} directory is being built next!`);
                    }}
                  >
                    <View style={styles.serviceBoxTop}>
                      <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                        {item.icon}
                      </View>
                      {isDesktopWeb && <ChevronRight color="#CBD5E1" size={24} />}
                    </View>
                    <View style={styles.serviceBoxBottom}>
                      <Text style={[styles.serviceTitle, isDesktopWeb && { fontSize: 18, textAlign: 'left' }]}>{item.title}</Text>
                      {isDesktopWeb && <Text style={styles.serviceDesc}>{item.desc}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      </RefreshableScroll>
    </ResponsiveWrapper>
  );
}

const styles = StyleSheet.create({
  mobileHeader: { 
    paddingTop: Platform.OS === 'android' ? 60 : 50, 
    paddingBottom: 24, 
    paddingHorizontal: 24, 
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  mobileHeaderTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  mobileHeaderSub: { fontSize: 15, color: '#D1D5DB' },
  
  scrollContent: { flex: 1 },
  innerContent: { padding: 24, paddingBottom: 100 },
  
  // Emergency Card
  emergencyCard: { borderRadius: 20, padding: 20, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, marginBottom: 32 },
  emergencyContent: { flexDirection: 'row', alignItems: 'center' },
  emergencyIconBg: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  emergencyTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 2 },
  emergencySub: { fontSize: 13, color: '#FECACA', lineHeight: 18, maxWidth: '90%' },
  sosButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, gap: 6 },
  sosButtonText: { color: '#EF4444', fontWeight: 'bold', fontSize: 14 },

  sectionHeading: { fontSize: 18, fontWeight: '800', color: '#0A192F', marginBottom: 16 },
  
  // Grid
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  serviceBox: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    justifyContent: 'space-between'
  },
  serviceBoxTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 16 },
  iconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  serviceBoxBottom: { width: '100%', alignItems: Platform.OS === 'web' ? 'flex-start' : 'center' },
  serviceTitle: { fontSize: 15, fontWeight: '700', color: '#0A192F', textAlign: 'center' },
  serviceDesc: { fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'left' }
});