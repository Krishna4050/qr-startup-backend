import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import { Settings, ShieldCheck, Bell, Key, Briefcase, AlertTriangle, BatteryMedium } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Get screen width to make our cards responsive
const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      {/* HEADER SECTION (Using our Dark Dusk Theme to match Auth) */}
      <LinearGradient 
        colors={['#0F2D4D', '#174871']} 
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greetingText}>Good Morning!</Text>
              <Text style={styles.userNameText}>Alan Matthew</Text>
            </View>
            <TouchableOpacity style={styles.settingsIcon}>
              <Settings color="#F2F3F4" size={24} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* ACTIVE TAGS SECTION */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Active Tags</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>04</Text></View>
          </View>
          <TouchableOpacity><Text style={styles.seeAllText}>SEE ALL</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {/* Tag Card 1 */}
          <View style={styles.tagCard}>
            <Text style={styles.tagCategory}>HOUSE KEYS</Text>
            <Text style={styles.tagTitle}>Main Door Key & Garage Remote</Text>
            <View style={styles.tagStatus}>
              <ShieldCheck color="#10B981" size={14} />
              <Text style={styles.tagStatusText}>Protected & Active</Text>
            </View>
            <View style={styles.tagIconWrapper}><Key color="#0F2D4D" size={20} /></View>
          </View>

          {/* Tag Card 2 */}
          <View style={styles.tagCard}>
            <Text style={styles.tagCategory}>BACKPACK</Text>
            <Text style={styles.tagTitle}>Work Laptop & Accessories Bag</Text>
            <View style={styles.tagStatus}>
              <ShieldCheck color="#10B981" size={14} />
              <Text style={styles.tagStatusText}>Protected & Active</Text>
            </View>
            <View style={styles.tagIconWrapper}><Briefcase color="#0F2D4D" size={20} /></View>
          </View>
        </ScrollView>

        {/* RECENT ALERTS SECTION */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.badgeText, { color: '#2563EB' }]}>02</Text></View>
          </View>
          <TouchableOpacity><Text style={styles.seeAllText}>SEE ALL</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {/* Alert Card 1 */}
          <View style={[styles.alertCard, { borderLeftColor: '#F59E0B' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.alertCategory}>SCAN ALERT</Text>
              <AlertTriangle color="#F59E0B" size={16} />
            </View>
            <Text style={styles.alertTitle}>Gym Bag</Text>
            <Text style={styles.alertDetail}>📍 Downtown • Today, 9:00 AM</Text>
          </View>

          {/* Alert Card 2 */}
          <View style={[styles.alertCard, { borderLeftColor: '#EF4444' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.alertCategory}>LOW BATTERY</Text>
              <BatteryMedium color="#EF4444" size={16} />
            </View>
            <Text style={styles.alertTitle}>Smart Tag</Text>
            <Text style={[styles.alertDetail, { color: '#EF4444', fontWeight: 'bold' }]}>Requires attention: Replace in 2 days</Text>
          </View>
        </ScrollView>

        {/* OVERVIEW SECTION (The Big Colored Cards) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={[styles.horizontalScroll, { paddingBottom: 40 }]}
          snapToInterval={width * 0.75 + 16} // Snaps nicely on mobile
          decelerationRate="fast"
        >
          {/* Purple Card */}
          <View style={[styles.overviewCard, { backgroundColor: '#6366F1' }]}>
            <Text style={styles.overviewCardTitle}>Total Tags</Text>
            <Text style={styles.overviewCardNumber}>4</Text>
          </View>

          {/* Cyan Card */}
          <View style={[styles.overviewCard, { backgroundColor: '#06B6D4' }]}>
            <Text style={styles.overviewCardTitle}>Found Items</Text>
            <Text style={styles.overviewCardNumber}>1</Text>
          </View>

          {/* Yellow Card */}
          <View style={[styles.overviewCard, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.overviewCardTitle}>Pending Alerts</Text>
            <Text style={styles.overviewCardNumber}>2</Text>
          </View>
        </ScrollView>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 10 },
  greetingText: { fontSize: 14, color: '#DED1C6', marginBottom: 4 },
  userNameText: { fontSize: 24, fontWeight: 'bold', color: '#F2F3F4' },
  settingsIcon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scrollContainer: { flex: 1, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  badge: { backgroundColor: '#0F2D4D', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  seeAllText: { fontSize: 12, fontWeight: 'bold', color: '#3B82F6' },
  horizontalScroll: { paddingHorizontal: 24, paddingBottom: 16, gap: 16 },
  
  // Tag Cards
  tagCard: { width: width * 0.65, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tagCategory: { fontSize: 10, fontWeight: 'bold', color: '#6B7280', letterSpacing: 1, marginBottom: 8 },
  tagTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12, height: 40 },
  tagStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tagStatusText: { fontSize: 12, color: '#10B981', fontWeight: '600', marginLeft: 4 },
  tagIconWrapper: { width: 36, height: 36, backgroundColor: '#F3F4F6', borderRadius: 18, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 16, right: 16 },

  // Alert Cards
  alertCard: { width: width * 0.75, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  alertCategory: { fontSize: 10, fontWeight: 'bold', color: '#6B7280', letterSpacing: 1, marginBottom: 8 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  alertDetail: { fontSize: 12, color: '#6B7280' },

  // Big Colored Overview Cards
  overviewCard: { width: width * 0.75, height: width * 0.6, borderRadius: 24, padding: 24, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  overviewCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', opacity: 0.9 },
  overviewCardNumber: { fontSize: 64, fontWeight: '900', color: '#FFFFFF' },
});