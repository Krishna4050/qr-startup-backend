import RefreshableScroll from '../components/RefreshableScroll';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { Settings, ShieldCheck, Bell, Key, Briefcase, AlertTriangle, BatteryMedium, Tag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase_lucifer_core } from '../utils/supabase';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('User'); // State for our name
  const [tags, setTags] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  // Calculate Overview Stats
  const totalTags = tags.length;
  const foundItems = tags.filter(t => t.status === 'found').length;
  const pendingAlerts = alerts.filter(a => !a.is_read).length;

  // --- NEW: Dynamic Greeting Engine ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning!';
    if (hour >= 12 && hour < 17) return 'Good Afternoon!';
    if (hour >= 17 && hour < 22) return 'Good Evening!';
    return 'Good Night!';
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) return;

      // 1. Grab the username from the hidden Auth Metadata as a bulletproof fallback
      const fallbackName = user.user_metadata?.username;

      // 2. Try to fetch from the Profiles table
      const { data: profileData, error: profileError } = await supabase_lucifer_core
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single();
      
      // Set the best available name! (Display Name -> DB Username -> Auth Username -> 'User')
      setDisplayName(profileData?.display_name || profileData?.username || fallbackName || 'User');

      // 3. Fetch Active Tags
      const { data: tagsData } = await supabase_lucifer_core
        .from('qr_tags')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (tagsData) setTags(tagsData);

      // 4. Fetch Recent Alerts
      const { data: alertsData } = await supabase_lucifer_core
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (alertsData) setAlerts(alertsData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0F2D4D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER SECTION */}
      <LinearGradient colors={['#0F2D4D', '#174871']} style={styles.headerGradient}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              {/* --- NEW: Inject Dynamic Greeting --- */}
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              
              {/* --- NEW: Inject Bulletproof Username --- */}
              <Text style={styles.userNameText}>{displayName}</Text>
            </View>
            <TouchableOpacity style={styles.settingsIcon}>
              <Settings color="#F2F3F4" size={24} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

     <RefreshableScroll style={styles.scrollContainer} showsVerticalScrollIndicator={false} onRefreshAction={fetchDashboardData}>
  
  {/* ACTIVE TAGS SECTION ... */}
        
        {/* ACTIVE TAGS SECTION */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Active Tags</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{totalTags < 10 ? `0${totalTags}` : totalTags}</Text></View>
          </View>
          <TouchableOpacity><Text style={styles.seeAllText}>SEE ALL</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {tags.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>No tags added yet. Tap the + button to add one!</Text>
            </View>
          ) : (
            tags.map((tag) => (
              <View key={tag.id} style={styles.tagCard}>
                <Text style={styles.tagCategory}>ITEM TAG</Text>
                <Text style={styles.tagTitle} numberOfLines={2}>{tag.item_name || 'Unnamed Item'}</Text>
                <View style={styles.tagStatus}>
                  <ShieldCheck color={tag.status === 'active' ? "#10B981" : "#F59E0B"} size={14} />
                  <Text style={[styles.tagStatusText, { color: tag.status === 'active' ? '#10B981' : '#F59E0B' }]}>
                    {tag.status === 'active' ? 'Protected & Active' : 'Reported Lost'}
                  </Text>
                </View>
                <View style={styles.tagIconWrapper}><Tag color="#0F2D4D" size={20} /></View>
              </View>
            ))
          )}
        </ScrollView>

        {/* RECENT ALERTS SECTION */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.badgeText, { color: '#2563EB' }]}>{pendingAlerts < 10 ? `0${pendingAlerts}` : pendingAlerts}</Text></View>
          </View>
          <TouchableOpacity><Text style={styles.seeAllText}>SEE ALL</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {alerts.length === 0 ? (
             <View style={styles.emptyCard}>
               <Text style={styles.emptyCardText}>No new alerts.</Text>
             </View>
          ) : (
            alerts.map((alert) => (
              <View key={alert.id} style={[styles.alertCard, { borderLeftColor: alert.alert_type === 'low_battery' ? '#EF4444' : '#F59E0B' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.alertCategory}>{alert.alert_type.replace('_', ' ').toUpperCase()}</Text>
                  {alert.alert_type === 'low_battery' ? <BatteryMedium color="#EF4444" size={16} /> : <AlertTriangle color="#F59E0B" size={16} />}
                </View>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={[styles.alertDetail, alert.alert_type === 'low_battery' && { color: '#EF4444', fontWeight: 'bold' }]}>
                  {alert.description}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* OVERVIEW SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalScroll, { paddingBottom: 40 }]} snapToInterval={width * 0.75 + 16} decelerationRate="fast">
          <View style={[styles.overviewCard, { backgroundColor: '#6366F1' }]}>
            <Text style={styles.overviewCardTitle}>Total Tags</Text>
            <Text style={styles.overviewCardNumber}>{totalTags}</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: '#06B6D4' }]}>
            <Text style={styles.overviewCardTitle}>Found Items</Text>
            <Text style={styles.overviewCardNumber}>{foundItems}</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: '#F59E0B' }]}>
            <Text style={styles.overviewCardTitle}>Pending Alerts</Text>
            <Text style={styles.overviewCardNumber}>{pendingAlerts}</Text>
          </View>
        </ScrollView>

      </RefreshableScroll>
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
  
  emptyCard: { width: width * 0.85, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  emptyCardText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },

  tagCard: { width: width * 0.65, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tagCategory: { fontSize: 10, fontWeight: 'bold', color: '#6B7280', letterSpacing: 1, marginBottom: 8 },
  tagTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12, height: 40 },
  tagStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tagStatusText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  tagIconWrapper: { width: 36, height: 36, backgroundColor: '#F3F4F6', borderRadius: 18, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 16, right: 16 },

  alertCard: { width: width * 0.75, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  alertCategory: { fontSize: 10, fontWeight: 'bold', color: '#6B7280', letterSpacing: 1, marginBottom: 8 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  alertDetail: { fontSize: 12, color: '#6B7280' },

  overviewCard: { width: width * 0.75, height: width * 0.6, borderRadius: 24, padding: 24, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  overviewCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', opacity: 0.9 },
  overviewCardNumber: { fontSize: 64, fontWeight: '900', color: '#FFFFFF' },
});