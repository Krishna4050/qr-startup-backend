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
import { ArrowLeft, Wrench, Truck, Car, Zap, Sparkles, Settings, Bike, Wrench as Tool } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2; // 2 columns, accounting for padding and gap

const SHOP_TYPES = [
  { id: 'general', label: 'General Mechanic', Icon: Wrench },
  { id: 'towing', label: 'Towing & Recovery', Icon: Truck },
  { id: 'body', label: 'Auto Body & Paint', Icon: Car },
  { id: 'ev', label: 'EV Specialist', Icon: Zap },
  { id: 'tires', label: 'Tire Shop', Icon: Settings },
  { id: 'detailing', label: 'Auto Detailing', Icon: Sparkles },
  { id: 'mobile', label: 'Mobile Mechanic', Icon: Tool },
  { id: 'motorcycle', label: 'Motorcycle Repair', Icon: Bike },
];

export default function PartnerOnboardingStep2Screen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // Retrieve the data passed from Step 1
  const { shopData } = route.params || {};

  // Store multiple selected IDs
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const toggleType = (id: string) => {
    setSelectedTypes(prev => 
      prev.includes(id) 
        ? prev.filter(type => type !== id) 
        : [...prev, id]
    );
  };

  const handleNext = () => {
    // Navigate to final Verification step, passing all accumulated data
    navigation.navigate('PartnerOnboardingStep3', {
      shopData: {
        ...shopData,
        shopTypes: selectedTypes
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
          <Text style={styles.mainTitle}>Which of these best describes your shop?</Text>
          <Text style={styles.subtitle}>Select all the services you officially offer at this location.</Text>

          {/* MULTI-SELECT GRID */}
          <View style={styles.gridContainer}>
            {SHOP_TYPES.map((type) => {
              const isSelected = selectedTypes.includes(type.id);
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => toggleType(type.id)}
                >
                  <type.Icon 
                    color={isSelected ? "#4A00E0" : "#0A192F"} 
                    size={32} 
                    strokeWidth={isSelected ? 2 : 1.5} 
                    style={{ marginBottom: 16 }}
                  />
                  <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                    {type.label}
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
              style={[
                styles.primaryButton, 
                selectedTypes.length === 0 && styles.primaryButtonDisabled
              ]}
              activeOpacity={0.9}
              onPress={handleNext}
              disabled={selectedTypes.length === 0}
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

  // Grid Styles
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  typeCard: { width: CARD_WIDTH, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, minHeight: 110, justifyContent: 'center' },
  typeCardSelected: { borderColor: '#0A192F', backgroundColor: '#F5F3FF' }, // Aurora Indigo tint
  
  typeLabel: { fontSize: 15, fontWeight: '600', color: '#0A192F' },
  typeLabelSelected: { color: '#0A192F' },

  // Bottom Bar Styles
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  progressBarBg: { height: 4, backgroundColor: '#F3F4F6', width: '100%' },
  progressBarFill: { height: 4, backgroundColor: '#0A192F', width: '40%' }, // 66% because it's Step 2 of 3!
  
  bottomBarContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 24 },
  backText: { fontSize: 16, fontWeight: '600', color: '#0A192F', textDecorationLine: 'underline' },
  primaryButton: { backgroundColor: '#0A192F', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  primaryButtonDisabled: { backgroundColor: '#D1D5DB' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});