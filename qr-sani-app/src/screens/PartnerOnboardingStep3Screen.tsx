import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform, 
  ScrollView,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Wifi, Coffee, Armchair, Car, Key, Clock, ShieldCheck, BatteryCharging } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2;

// Customized Amenities for a Vehicle Service Center
const AMENITIES = [
  { id: 'wifi', label: 'Free WiFi', Icon: Wifi },
  { id: 'waiting_room', label: 'Waiting Room', Icon: Armchair },
  { id: 'coffee', label: 'Free Coffee', Icon: Coffee },
  { id: 'loaner_car', label: 'Loaner Car', Icon: Car },
  { id: 'after_hours', label: '24/7 Drop-off', Icon: Key },
  { id: 'quick_lube', label: 'Express Service', Icon: Clock },
  { id: 'ev_charging', label: 'EV Charging', Icon: BatteryCharging },
  { id: 'warranty', label: 'Service Warranty', Icon: ShieldCheck },
];

export default function PartnerOnboardingStep3Screen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // Bring forward the data from Step 1 & 2
  const { shopData } = route.params || {};

  React.useEffect(() => {
    if (!shopData) {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }
  }, [shopData]);

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const toggleAmenity = (id: string) => {
    setSelectedAmenities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    // Navigate to Verification, passing the fully assembled payload!
    navigation.navigate('PartnerOnboardingStep4', {
      shopData: {
        ...shopData,
        amenities: selectedAmenities
      }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#0A192F" size={24} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.mainTitle}>Tell customers what your shop has to offer</Text>
          <Text style={styles.subtitle}>You can add more amenities later after you publish your listing.</Text>

          <Text style={styles.sectionHeader}>Customer favorites</Text>

          {/* AMENITIES GRID */}
          <View style={styles.gridContainer}>
            {AMENITIES.map((amenity) => {
              const isSelected = selectedAmenities.includes(amenity.id);
              return (
                <TouchableOpacity
                  key={amenity.id}
                  style={[styles.amenityCard, isSelected && styles.amenityCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => toggleAmenity(amenity.id)}
                >
                  <amenity.Icon 
                    color={isSelected ? "#0A192F" : "#0A192F"} 
                    size={32} 
                    strokeWidth={isSelected ? 2 : 1.5} 
                    style={{ marginBottom: 16 }}
                  />
                  <Text style={[styles.amenityLabel, isSelected && styles.amenityLabelSelected]}>
                    {amenity.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* STICKY BOTTOM PROGRESS BAR */}
        <View style={styles.bottomBar}>
          <View style={styles.progressBarBg}>
            <View style={styles.progressBarFill} />
          </View>
          
          <View style={styles.bottomBarContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.primaryButton}
              activeOpacity={0.9}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 10, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 120 },
  
  mainTitle: { fontSize: 30, fontWeight: '800', color: '#0A192F', letterSpacing: -0.5, marginBottom: 8, lineHeight: 36 },
  subtitle: { fontSize: 16, color: '#717171', lineHeight: 22, marginBottom: 32 },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#0A192F', marginBottom: 16 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  amenityCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, minHeight: 110, justifyContent: 'center' },
  
  // Notice we use a very subtle gray tint for selection instead of the loud blue, exactly like Airbnb's UI
  amenityCardSelected: { borderColor: '#0A192F', backgroundColor: '#F8FAFC' }, 
  
  amenityLabel: { fontSize: 15, fontWeight: '600', color: '#0A192F' },
  amenityLabelSelected: { color: '#0A192F' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  progressBarBg: { height: 4, backgroundColor: '#F3F4F6', width: '100%' },
  progressBarFill: { height: 4, backgroundColor: '#0A192F', width: '75%' }, // 75% for Step 3
  
  bottomBarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 24 },
  backText: { fontSize: 16, fontWeight: '600', color: '#0A192F', textDecorationLine: 'underline' },
  primaryButton: { backgroundColor: '#0A192F', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});