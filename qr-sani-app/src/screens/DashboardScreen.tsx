import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { Settings, ShieldCheck, Bell, AlertTriangle, BatteryMedium, Tag, User, Users, PlusCircle, PauseCircle, ShieldAlert } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase_lucifer_core } from '../utils/supabase';
import RefreshableScroll from '../components/RefreshableScroll';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  // --- NEW: Toggle Lost Mode ---
  const toggleLostMode = async (tagId: string, currentStatus: string, itemName: string) => {
    const newStatus = currentStatus === 'active' ? 'lost' : 'active';
    const actionText = newStatus === 'lost' ? 'Marked as Lost' : 'Marked as Active';

    try {
      // Update Supabase directly
      const { error } = await supabase_lucifer_core
        .from('qr_tags')
        .update({ status: newStatus })
        .eq('id', tagId);

      if (error) throw error;

      Alert.alert(actionText, `${itemName} is now ${newStatus}.`);
      
      // Refresh the dashboard to show the new status
      fetchDashboardData(); 
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };
  const navigation = useNavigation<any>(); // <--- Fixed Navigation Types!

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  const [tags, setTags] = useState<any[]>([]);
  const [pausedTagsCount, setPausedTagsCount] = useState(0); // <--- New State for Paused Count!
  const [alerts, setAlerts] = useState<any[]>([]);

  // Overview Stats
  const totalTags = tags.length;
  const foundItems = tags.filter(t => t.status === 'found').length;
  const pendingAlerts = alerts.filter(a => !a.is_read).length;
  const totalContacts = 0; 

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

      const { data: profileData } = await supabase_lucifer_core
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      setProfile(profileData || { display_name: user.user_metadata?.username });

      // --- SMART FILTERING ADDED HERE ---
      const { data: tagsData } = await supabase_lucifer_core
        .from('qr_tags')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (tagsData) {
        // 1. Only show active or lost tags in the main horizontal list
        const visibleTags = tagsData.filter(t => t.status === 'active' || t.status === 'lost');
        setTags(visibleTags);
        
        // 2. Count the paused tags for the Overview Card
        const pausedCount = tagsData.filter(t => t.status === 'paused').length;
        setPausedTagsCount(pausedCount);
      }

      const { data: alertsData } = await supabase_lucifer_core
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (alertsData) setAlerts(alertsData);

    } catch (error) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert("Profile Picture", "Would you like to take a new photo or choose from your gallery?", [
        { text: "Camera", onPress: () => pickImage(true) },
        { text: "Gallery", onPress: () => pickImage(false) },
        { text: "Cancel", style: "cancel" }
    ]);
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      };

      if (useCamera) {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0].base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert("Error", "Could not open camera/gallery.");
    }
  };

  const uploadAvatar = async (base64Image: string) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) throw new Error("No user found");

      const filePath = `${user.id}/avatar.jpg`;
      
      const { error: uploadError } = await supabase_lucifer_core.storage
        .from('avatars')
        .upload(filePath, decode(base64Image), { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase_lucifer_core.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase_lucifer_core
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }));
      Alert.alert("Success", "Profile picture updated!");

    } catch (error: any) {
      console.error(error);
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0F2D4D" />
      </View>
    );
  }

  const displayName = profile?.display_name || profile?.username || 'User';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F2D4D', '#174871']} style={styles.headerGradient}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.userNameText}>{displayName}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {/* --- NEW: NOTIFICATION BELL --- */}
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                <Bell color="#F2F3F4" size={26} />
                {/* Optional: Add a red dot here if pendingAlerts > 0 */}
                {pendingAlerts > 0 && (
                  <View style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, backgroundColor: '#EF4444', borderRadius: 5, borderWidth: 2, borderColor: '#0F2D4D' }} />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#0F2D4D" /> : profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <User color="#0F2D4D" size={24} />}
                <View style={styles.avatarBadge}><Text style={styles.avatarBadgeText}>+</Text></View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <RefreshableScroll onRefreshAction={fetchDashboardData} style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* ACTIVE TAGS */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Active Tags</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{totalTags < 10 ? `0${totalTags}` : totalTags}</Text></View>
          </View>
          <TouchableOpacity><Text style={styles.seeAllText}>SEE ALL</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {tags.length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyCardText}>No tags added yet. Tap + to add!</Text></View>
          ) : (
            tags.map((tag) => (
              <TouchableOpacity 
                key={tag.id} 
                style={styles.tagCard}
                onPress={() => navigation.navigate('TagManage', { tagId: tag.id })}
              >
                <Text style={styles.tagCategory}>ITEM TAG</Text>
                <Text style={styles.tagTitle} numberOfLines={2}>{tag.item_name || 'Unnamed Item'}</Text>
                <View style={styles.tagStatus}>
                  <ShieldCheck color={tag.status === 'active' ? "#10B981" : "#F59E0B"} size={14} />
                  <Text style={[styles.tagStatusText, { color: tag.status === 'active' ? '#10B981' : '#F59E0B' }]}>{tag.status === 'active' ? 'Protected & Active' : 'Reported Lost'}</Text>
                </View>
                <View style={styles.tagIconWrapper}><Tag color="#0F2D4D" size={20} /></View>

                <TouchableOpacity 
                  style={[
                    styles.lostModeBtn, 
                    { backgroundColor: tag.status === 'lost' ? '#FEF2F2' : '#F3F4F6' }
                  ]}
                  onPress={() => toggleLostMode(tag.id, tag.status, tag.item_name)}
                >
                  <ShieldAlert 
                    color={tag.status === 'lost' ? '#EF4444' : '#9CA3AF'} 
                    size={18} 
                  />
                  <Text style={[
                    styles.lostModeText, 
                    { color: tag.status === 'lost' ? '#EF4444' : '#6B7280' }
                  ]}>
                    {tag.status === 'lost' ? 'Lost Mode: ON' : 'Mark as Lost'}
                  </Text>
                </TouchableOpacity>
                
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* RECENT ALERTS */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.badgeText, { color: '#2563EB' }]}>{pendingAlerts < 10 ? `0${pendingAlerts}` : pendingAlerts}</Text></View>
          </View>
          <TouchableOpacity><Text style={styles.seeAllText}>SEE ALL</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {alerts.length === 0 ? (
             <View style={styles.emptyCard}><Text style={styles.emptyCardText}>No new alerts.</Text></View>
          ) : (
            alerts.map((alert) => (
              <View key={alert.id} style={[styles.alertCard, { borderLeftColor: alert.alert_type === 'low_battery' ? '#EF4444' : '#F59E0B' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.alertCategory}>{alert.alert_type.replace('_', ' ').toUpperCase()}</Text>
                  {alert.alert_type === 'low_battery' ? <BatteryMedium color="#EF4444" size={16} /> : <AlertTriangle color="#F59E0B" size={16} />}
                </View>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={[styles.alertDetail, alert.alert_type === 'low_battery' && { color: '#EF4444', fontWeight: 'bold' }]}>{alert.description}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* FRIENDS & FAMILY NETWORK */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friends & Family</Text>
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <View style={styles.contactCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.contactIconBg, { backgroundColor: '#FCE7F3' }]}>
                <Users color="#DB2777" size={24} />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={styles.contactCardTitle}>Trusted Network</Text>
                <Text style={styles.contactCardNumber}>0 Members</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.addContactBtn, { backgroundColor: '#FDF2F8' }]} 
              onPress={() => navigation.navigate('TrustedNetwork')}
            >
              <PlusCircle color="#DB2777" size={20} />
              <Text style={[styles.addContactText, { color: '#DB2000' }]}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>

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

          {/* --- NEW PAUSED TAGS CARD ADDED HERE --- */}
          <TouchableOpacity 
            style={[styles.overviewCard, { backgroundColor: '#F59E0B' }]} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('FilteredTags', { filterType: 'paused' })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.overviewCardTitle}>Paused Tags</Text>
              <PauseCircle color="#FFFFFF" size={24} style={{ opacity: 0.8 }} />
            </View>
            <Text style={styles.overviewCardNumber}>{pausedTagsCount}</Text>
          </TouchableOpacity>

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
  
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#10B981', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0F2D4D' },
  avatarBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', lineHeight: 14 },

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

  contactCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
  contactCardTitle: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  contactCardNumber: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  addContactBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  addContactText: { color: '#3B82F6', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },

  overviewCard: { width: width * 0.65, height: width * 0.5, borderRadius: 24, padding: 24, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  overviewCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', opacity: 0.9 },
  overviewCardNumber: { fontSize: 56, fontWeight: '900', color: '#FFFFFF' },
  lostModeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 12, alignSelf: 'flex-start', zIndex: 10 },
  lostModeText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
});