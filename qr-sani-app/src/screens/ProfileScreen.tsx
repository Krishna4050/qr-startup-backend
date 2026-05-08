import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { User, Shield, CreditCard, Moon, Bell, Clock, Globe, HelpCircle, Info, ChevronRight, LogOut, ArrowRight, Phone} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Archive /* ...other icons */ } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import RefreshableScroll from '../components/RefreshableScroll';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Local UI States
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase_lucifer_core
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      setProfileData(data);
      calculateCompletion(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = (data: any) => {
    if (!data) return;
    const fieldsToCheck = ['first_name', 'last_name', 'phone_number', 'country', 'city', 'avatar_url', 'bio', 'date_of_birth'];
    let filledFields = 0;
    fieldsToCheck.forEach(field => {
      if (data[field] !== null && data[field] !== '') filledFields++;
    });
    setCompletionPercentage(Math.round((filledFields / fieldsToCheck.length) * 100));
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase_lucifer_core.auth.signOut();
    if (error) {
      Alert.alert('Logout Error', error.message);
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, isDarkMode ? styles.bgDark : styles.bgLight, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={isDarkMode ? "#FFFFFF" : "#0F2D4D"} />
      </View>
    );
  }

  // --- Dynamic Theme Colors ---
  const theme = {
    bg: isDarkMode ? '#000000' : '#F2F3F4',
    card: isDarkMode ? '#1C1C1E' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#A1A1AA' : '#6B7280',
    icon: isDarkMode ? '#A1A1AA' : '#4B5563',
    border: isDarkMode ? '#2C2C2E' : '#F3F4F6'
  };

  // Helper component for rendering menu rows
  const MenuRow = ({ icon: Icon, title, rightElement, onPress, isLast = false }: any) => (
    <TouchableOpacity 
      style={[styles.menuRow, { borderBottomWidth: isLast ? 0 : 1, borderBottomColor: theme.border }]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuRowLeft}>
        <Icon color={theme.icon} size={20} />
        <Text style={[styles.menuRowTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {rightElement || <ChevronRight color={theme.subText} size={20} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bg }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Account</Text>
      </View>

      <RefreshableScroll onRefreshAction={fetchProfileData} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* DYNAMIC COMPLETION BANNER (Hides if 100%) */}
        {completionPercentage < 100 && (
          <View style={styles.completionBanner}>
            <View style={styles.bannerHeader}>
              <Text style={styles.bannerTitle}>Profile Setup</Text>
              <View style={styles.proBadge}><Text style={styles.proBadgeText}>{completionPercentage}%</Text></View>
            </View>
            <Text style={styles.bannerSubtext}>Complete your profile to unlock all tracking features and ensure finders can contact you.</Text>
            
            {/* Custom Progress Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
            </View>

            <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.upgradeBtnText}>Complete Now</Text>
              <ArrowRight color="#0F2D4D" size={16} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        )}

       {/* SECTION 1: Account Settings */}
        <View style={[styles.cardGroup, { backgroundColor: theme.card }]}>
          <MenuRow icon={User} title="Profile Information" onPress={() => navigation.navigate('EditProfile')} />
          <MenuRow icon={Shield} title="Privacy & Security" onPress={() => Alert.alert("Navigate", "Go to Security Screen")} />
          <MenuRow icon={CreditCard} title="Subscription & Billing" onPress={() => {}} />
          
          {/* --- NEW: Contact Manager --- */}
          <MenuRow 
            icon={Phone} 
            title="Contact Details & Emergency" 
            onPress={() => navigation.navigate('ContactManager')} 
          />

          <MenuRow 
            icon={Archive} 
            title="Archived Tags" 
            isLast={true} 
            onPress={() => navigation.navigate('FilteredTags', { filterType: 'archived' })} 
          />
        </View>

        {/* SECTION 2: App Preferences */}
        <View style={[styles.cardGroup, { backgroundColor: theme.card }]}>
          <MenuRow 
            icon={Moon} 
            title="Dark Mode" 
            rightElement={<Switch value={isDarkMode} onValueChange={setIsDarkMode} trackColor={{ false: '#D1D5DB', true: '#10B981' }} />} 
          />
          <MenuRow 
            icon={Bell} 
            title="Notifications" 
            rightElement={<Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#D1D5DB', true: '#10B981' }} />} 
          />
          <MenuRow 
            icon={Clock} 
            title="Save History" 
            rightElement={<Switch value={saveHistory} onValueChange={setSaveHistory} trackColor={{ false: '#D1D5DB', true: '#10B981' }} />} 
          />
          <MenuRow 
            icon={Globe} 
            title="Language" 
            rightElement={<View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={{color: theme.subText, marginRight: 4}}>English</Text><ChevronRight color={theme.subText} size={20} /></View>} 
            onPress={() => {}}
          />
          <MenuRow icon={HelpCircle} title="Help Center" onPress={() => {}} />
          <MenuRow icon={Info} title="About" isLast={true} onPress={() => {}} />
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#DC2626" size={20} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </RefreshableScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgDark: { backgroundColor: '#000000' },
  bgLight: { backgroundColor: '#F2F3F4' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24, justifyContent: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  
  // Completion Banner
  completionBanner: { backgroundColor: '#0F2D4D', borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bannerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginRight: 12 },
  proBadge: { borderWidth: 1, borderColor: '#FFFFFF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  proBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  bannerSubtext: { color: '#9CA3AF', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 20 },
  progressBarFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },
  upgradeBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  upgradeBtnText: { color: '#0F2D4D', fontSize: 16, fontWeight: 'bold' },

  // Card Groups
  cardGroup: { borderRadius: 20, marginBottom: 24, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20 },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center' },
  menuRowTitle: { fontSize: 16, marginLeft: 16, fontWeight: '500' },

  // Logout
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginTop: 8, marginBottom: 20 },
  logoutText: { color: '#DC2626', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});