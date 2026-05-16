import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { X, Wrench, Camera, CheckCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function PartnerOnboardingIntroScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* TOP HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color="#0A192F" size={24} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.mainTitle}>It's easy to get started on QR-Startup</Text>

          {/* STEP 1 */}
          <View style={styles.stepRow}>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepNumber}>1</Text>
              <View>
                <Text style={styles.stepTitle}>Tell us about your shop</Text>
                <Text style={styles.stepDesc}>Share some basic info, like where it is and how many cars you can service.</Text>
              </View>
            </View>
            <View style={styles.stepIconContainer}>
              <Wrench color="#0A192F" size={32} strokeWidth={1.5} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* STEP 2 */}
          <View style={styles.stepRow}>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepNumber}>2</Text>
              <View>
                <Text style={styles.stepTitle}>Make it stand out</Text>
                <Text style={styles.stepDesc}>Add 5 or more photos plus a title and description—we'll help you out.</Text>
              </View>
            </View>
            <View style={styles.stepIconContainer}>
              <Camera color="#0A192F" size={32} strokeWidth={1.5} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* STEP 3 */}
          <View style={styles.stepRow}>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepNumber}>3</Text>
              <View>
                <Text style={styles.stepTitle}>Finish up and publish</Text>
                <Text style={styles.stepDesc}>Set your starting prices, publish your listing, and get ready for bookings.</Text>
              </View>
            </View>
            <View style={styles.stepIconContainer}>
              <CheckCircle color="#0A192F" size={32} strokeWidth={1.5} />
            </View>
          </View>

        </ScrollView>

        {/* STICKY BOTTOM BAR (Airbnb Style) */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={styles.primaryButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PartnerOnboardingStep1')}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1 },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 24 : 10, paddingBottom: 10 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  
  mainTitle: { fontSize: 32, fontWeight: '800', color: '#0A192F', letterSpacing: -0.5, marginBottom: 40, lineHeight: 38 },
  
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  stepTextContainer: { flex: 1, flexDirection: 'row', paddingRight: 20 },
  stepNumber: { fontSize: 18, fontWeight: '600', color: '#0A192F', marginRight: 16, marginTop: 2 },
  stepTitle: { fontSize: 18, fontWeight: '700', color: '#0A192F', marginBottom: 6 },
  stepDesc: { fontSize: 15, color: '#717171', lineHeight: 22 },
  
  stepIconContainer: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 24, marginLeft: 34 },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 24, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  primaryButton: { backgroundColor: '#FF715B', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }, // Sunset Coral from our Aurora palette!
  primaryButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});