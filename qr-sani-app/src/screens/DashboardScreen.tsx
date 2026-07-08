import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator, Alert, Image, TextInput, Modal } from 'react-native';
import { Settings, ShieldCheck, Bell, AlertTriangle, BatteryMedium, Tag, User, Users, PlusCircle, PauseCircle, ShieldAlert, LayoutGrid, Globe, Wrench, Bike, Car, Bed, BusFront, Train, Plane, X, CheckCircle, Mail, KeyRound, Smartphone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase_lucifer_core } from '../utils/supabase';
import apiClient from '../utils/apiClient';
import RefreshableScroll from '../components/RefreshableScroll';
import WebFooter from '../components/WebFooter';
import WebLink from '../components/WebLink';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AuthForm from '../../components/AuthForm';
import { messaging } from '../utils/firebase';
import { getToken } from 'firebase/messaging';
import { useResponsive } from '../hooks/useResponsive';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused(); 
  const { user, session, isLoading: isAuthLoading, isFullyRegistered } = useAuth();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  const { width, isMobileWeb, isWeb } = useResponsive();

  const [tags, setTags] = useState<any[]>([]); // Combined array of My Tags + Shared Tags
  const [pausedTagsCount, setPausedTagsCount] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [flightOrders, setFlightOrders] = useState<any[]>([]);
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [networkMembers, setNetworkMembers] = useState(0);

  const [sharedWithMe, setSharedWithMe] = useState<any[]>([]);
  const [isGuest, setIsGuest] = useState(false);

  // --- SEARCH STATE ---
  const [searchFilters, setSearchFilters] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [flightDealsCity, setFlightDealsCity] = useState('');

  const [showWebPushPrompt, setShowWebPushPrompt] = useState(false);
  const [showConfirmAccount, setShowConfirmAccount] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  const [verifyType, setVerifyType] = useState<'email' | 'phone' | null>(null);
  const [verifyStep, setVerifyStep] = useState<'idle' | 'input' | 'otp' | 'success'>('idle');
  const [verifyTarget, setVerifyTarget] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const totalTags = tags.length;
  const foundItems = tags.filter(t => t.status === 'found' && !t.is_shared).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning!';
    if (hour >= 12 && hour < 17) return 'Good Afternoon!';
    if (hour >= 17 && hour < 22) return 'Good Evening!';
    return 'Good Night!';
  };

  useEffect(() => {
    if (isAuthLoading) return;
    
    // IP Geolocation for flight deals
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.city) {
          setFlightDealsCity(data.city);
        }
      }).catch(e => console.log('Location fetch failed'));

    if (!user) {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    setIsGuest(false);
    fetchDashboardData();
  }, [user?.id, session?.access_token, isAuthLoading]);

  useEffect(() => {
    if (isFocused && user) {
      fetchDashboardData();
    }
  }, [isFocused, user]);

  const [isNotificationsBlocked, setIsNotificationsBlocked] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && 'Notification' in window && user) {
      const isDismissed = sessionStorage.getItem('push_prompt_dismissed') === 'true';
      if (isDismissed) return;

      if (Notification.permission === 'default') {
        // Delay popup slightly for better UX
        const timer = setTimeout(() => setShowWebPushPrompt(true), 2000);
        return () => clearTimeout(timer);
      } else if (Notification.permission === 'granted') {
        // Get token quietly in background if already granted
        requestWebPush();
      } else if (Notification.permission === 'denied') {
        // The user previously blocked notifications natively
        const timer = setTimeout(() => {
          setIsNotificationsBlocked(true);
          setShowWebPushPrompt(true);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const requestWebPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      setShowWebPushPrompt(false);
      
      if (permission === 'granted' && messaging && user) {
        console.log("Generating Firebase Web Push Token...");
        const token = await getToken(messaging, {
          vapidKey: 'BG2LVOjcmoEeCtSyqttNLvWjX61XCak3lNhq3jI0ua5hvvP6IUQVjYRrWqtWgQhDu5jJFW0X9qwzNxHagLKMnQY'
        });

        if (token) {
          console.log("Firebase Web Push Token retrieved!");
          // Fetch existing tokens and append
          const { data: profile } = await supabase_lucifer_core
            .from('profiles')
            .select('push_tokens')
            .eq('id', user.id)
            .single();
            
          const existingTokens = profile?.push_tokens || [];
          if (!existingTokens.includes(token)) {
            await supabase_lucifer_core
              .from('profiles')
              .update({ push_tokens: [...existingTokens, token] })
              .eq('id', user.id);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to generate web push token", e);
      setShowWebPushPrompt(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const notifSubscription = supabase_lucifer_core
      .channel(`public:notifications-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchDashboardData(); 
      })
      .subscribe();

    const networkSubscription = supabase_lucifer_core
      .channel(`public:trusted_network-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trusted_network' }, () => {
        fetchDashboardData(); 
      })
      .subscribe();

    return () => {
      supabase_lucifer_core.removeChannel(notifSubscription);
      supabase_lucifer_core.removeChannel(networkSubscription);
    };
  }, [user?.id]);

  const fetchDashboardData = async () => {
    if (!user || !session) {
      console.log("[DEBUG] User or session is missing. Skipping fetch.");
      return;
    }
    
    console.log("[DEBUG] fetchDashboardData started. loading state:", loading);
    
    const fetchPromise = async () => {
      console.log("[DEBUG] Fetching dashboard from Go backend using Interceptor...");
      
      const res = await apiClient.get('/api/dashboard');
      const data = res.data;

      setProfile(data.profile || { display_name: user.user_metadata?.username });
      
      if (data.profile) {
        if (!data.profile.first_name || !data.profile.username) {
          // User verified OTP but hasn't completed their profile details yet
          setShowCompleteProfile(true);
        } else if (!user?.email_confirmed_at || !user?.phone_confirmed_at) {
          // User completed profile but missing one contact verification
          
          // Auto-detect which one to verify if only one is missing
          if (!user?.email_confirmed_at && user?.phone_confirmed_at) {
             setVerifyType('email');
             setVerifyTarget(user.email || '');
             setVerifyStep(user.email ? 'idle' : 'input'); 
          } else if (user?.email_confirmed_at && !user?.phone_confirmed_at) {
             setVerifyType('phone');
             setVerifyTarget(user.phone || '');
             setVerifyStep(user.phone ? 'idle' : 'input');
          } else {
             setVerifyType(null); // Show "Verify Both" buttons
          }
          
          setShowConfirmAccount(true);
        }
      }

      setTags([...(data.my_visible_tags || []), ...(data.shared_visible_tags || [])]);
      setSharedWithMe(data.shared_visible_tags || []);
      setPausedTagsCount(data.paused_tags_count || 0);
      setAlerts(data.alerts || []);
      setUnreadNotifications(data.unread_notifications || 0);
      setNetworkMembers(data.network_members || 0);

      try {
        const flightRes = await apiClient.get(`/api/flights/orders?user_id=${user.id}&email=${encodeURIComponent(user.email || '')}`);
        setFlightOrders(flightRes.data || []);
      } catch (e) {
        console.error("Failed to fetch flight orders", e);
      }

      console.log("[DEBUG] Dashboard fetch complete.");
    };

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Network request timed out')), 20000));
      await Promise.race([fetchPromise(), timeoutPromise]);
    } catch (error) {
      console.error("[DEBUG] Error fetching dashboard:", error);
    } finally {
      console.log("[DEBUG] Calling setLoading(false)");
      setLoading(false);
    }
  };

  const handleSearch = async (filters: any) => {
    setSearchFilters(filters);
    setIsSearching(true);
    try {
      // Mock search or actual DB fetch based on filters
      // Let's fetch from shop_locations
      const { data, error } = await supabase_lucifer_core
        .from('shop_locations')
        .select('*')
        .ilike('city', `%${filters.location}%`);
        
      if (error) throw error;
      setSearchResults(data || []);
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleLostMode = async (tag: any) => {
    if (tag.is_shared) {
        navigation.navigate('TagManage', { tagId: tag.id });
        return;
    }

    try {
      const res = await apiClient.post(`/api/tags/${tag.id}/toggle-status`);
      const newStatus = res.data.new_status;
      const actionText = newStatus === 'lost' ? 'Marked as Lost' : 'Marked as Active';
      Alert.alert(actionText, `${tag.item_name || 'Item'} is now ${newStatus}.`);
      fetchDashboardData(); 
    } catch (error: any) {
      Alert.alert("Error", error.response?.data || error.message);
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
        base64: true 
      };
      
      if (useCamera) {
        await ImagePicker.requestCameraPermissionsAsync();
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64) {
        await uploadAvatar(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert("Error", "Could not open camera/gallery.");
    }
  };

  const uploadAvatar = async (base64Image: string) => {
    setUploading(true);
    try {
      if (!user) throw new Error("No user found");

      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase_lucifer_core.storage.from('avatars').upload(filePath, decode(base64Image), { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase_lucifer_core.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      
      const { error: updateError } = await supabase_lucifer_core.from('profiles').update({ avatar_url: newAvatarUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      
      setProfile((prev: any) => ({ ...prev, avatar_url: newAvatarUrl }));
    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color="#0F2D4D" /></View>;

  if (isGuest) {
    return (
      <View style={[styles.container]}>
        {Platform.OS !== 'web' && (
          <LinearGradient colors={['#0F2D4D', '#174871']} style={styles.headerGradient}>
            <SafeAreaView>
              <View style={styles.headerContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.greetingText}>Welcome to</Text>
                  <Text style={styles.userNameText}>Aicrett</Text>
                </View>
                <TouchableOpacity 
                  style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>
        )}
        
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[{ padding: 24, gap: 32 }, styles.webMaxWidth]}>
          
          {searchFilters ? (
            <View style={styles.searchResultsContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text style={styles.mainSearchTitle}>
                  {searchResults?.length} places for {searchFilters.service} in {searchFilters.location}
                </Text>
                <TouchableOpacity onPress={() => setSearchFilters(null)}>
                  <Text style={{ color: '#E11D48', fontWeight: 'bold' }}>Clear Search</Text>
                </TouchableOpacity>
              </View>
              
              {isSearching ? (
                <ActivityIndicator size="large" color="#0F2D4D" style={{ marginTop: 40 }} />
              ) : (
                <View style={Platform.OS === 'web' ? [styles.webGridContainer, { paddingHorizontal: 0 }] : { gap: 16 }}>
                  {searchResults?.map(shop => (
                    <WebLink 
                      key={shop.id} 
                      screen="ShopDetails"
                      params={{ id: shop.id }}
                      style={[styles.shopCard, Platform.OS === 'web' && { width: '31%', minWidth: 250 }]}
                    >
                      <Image source={{ uri: shop.banner_url || 'https://images.unsplash.com/photo-1598555231223-f25b29b7a4be' }} style={styles.shopImage} />
                      <View style={styles.shopInfo}>
                        <Text style={styles.shopName} numberOfLines={1}>{shop.shop_name}</Text>
                        <Text style={styles.shopAddress}>{shop.street}, {shop.city}</Text>
                        <Text style={styles.shopRating}>★ 4.9 (120 reviews)</Text>
                      </View>
                    </WebLink>
                  ))}
                  {searchResults?.length === 0 && (
                     <View style={[styles.emptyCard, { width: '100%', padding: 48 }]}><Text style={styles.emptyCardText}>No shops available for these dates.</Text></View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Hero Section */}
              <View style={[styles.heroCard, Platform.OS === 'web' && { padding: 48 }]}>
            <ShieldCheck color="#2563EB" size={Platform.OS === 'web' ? 64 : 48} style={{ marginBottom: 16 }} />
            <Text style={[styles.heroTitle, Platform.OS === 'web' && { fontSize: 36 }]}>Welcome to Aicrett</Text>
            <Text style={[styles.heroSubtitle, Platform.OS === 'web' && { fontSize: 18, maxWidth: 600 }]}>
              Explore our comprehensive vehicle and transportation services.
            </Text>
            <TouchableOpacity 
              style={{ backgroundColor: '#0F2D4D', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, alignItems: 'center', alignSelf: 'flex-start', marginTop: 16 }}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Create Your Account</Text>
            </TouchableOpacity>
          </View>

          {/* Why Aicrett? */}
          <View>
            <Text style={styles.sectionTitle}>Why Aicrett?</Text>
            <View style={Platform.OS === 'web' ? [styles.webGridContainer, { paddingHorizontal: 0, marginTop: 16 }] : { gap: 16, marginTop: 16 }}>
              {[
                { title: "Comprehensive Services", desc: "Everything you need from parking to flights.", icon: <User color="#2563EB" size={32} /> },
                { title: "Privacy First", desc: "Your data stays completely hidden and secure.", icon: <ShieldCheck color="#10B981" size={32} /> },
                { title: "Always Available", desc: "Access services anywhere, anytime.", icon: <Globe color="#F59E0B" size={32} /> },
              ].map((item, idx) => (
                <View key={idx} style={[styles.whyCard, Platform.OS === 'web' && { width: '23%', minWidth: 200 }]}>
                  <View style={{ marginBottom: 12 }}>{item.icon}</View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>{item.title}</Text>
                  <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20 }}>{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Available Services */}
          <View>
            <Text style={styles.sectionTitle}>Available Services</Text>
            <View style={Platform.OS === 'web' ? [styles.webGridContainer, { paddingHorizontal: 0, marginTop: 16 }] : { gap: 16, marginTop: 16 }}>
               {[
                { title: "Vehicle Repair", desc: "Trusted mechanics near you", bg: '#EEF2FF', color: '#4338CA', icon: <Wrench color="#4338CA" size={24} />, route: 'ServiceDirectory' },
                { title: "Bike Repair", desc: "Fix your bike quickly", bg: '#ECFDF5', color: '#047857', icon: <Bike color="#047857" size={24} />, route: 'BikeRepairDirectory' },
                { title: "Pay Parking", desc: "Find and pay for parking", bg: '#FFFBEB', color: '#B45309', icon: <Car color="#B45309" size={24} />, route: 'ParkingMap' },
                { title: "Hotels & Stays", desc: "Find a place to stay", bg: '#F5F3FF', color: '#6D28D9', icon: <Bed color="#6D28D9" size={24} />, route: 'HotelSearch' },
                { title: "City Transit", desc: "Get around the city", bg: '#FDF2F8', color: '#BE185D', icon: <BusFront color="#BE185D" size={24} />, route: 'TransitPass' },
                { title: "Train Tickets", desc: "Travel across cities", bg: '#ECFEFF', color: '#0369A1', icon: <Train color="#0369A1" size={24} />, route: 'TrainSearch' },
                { title: "Flights", desc: "Book your next flight", bg: '#EEF2FF', color: '#4338CA', icon: <Plane color="#4338CA" size={24} />, route: 'FlightCheckout' },
              ].map((item, idx) => (
                <WebLink 
                  key={idx} 
                  screen={item.route}
                  style={[styles.serviceCard, { backgroundColor: item.bg }, Platform.OS === 'web' && { width: '23%', minWidth: 200 }]}
                >
                  <View style={{ marginBottom: 8 }}>{item.icon}</View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: item.color, marginBottom: 4 }}>{item.title}</Text>
                  <Text style={{ fontSize: 13, color: '#4B5563' }}>{item.desc}</Text>
                </WebLink>
              ))}
            </View>
          </View>
          </>
          )}
          </View>
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  const getFullName = () => {
    if (!profile) return 'User';
    
    const fn = profile.first_name || '';
    const ln = profile.last_name || '';
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    
    return profile.display_name || profile.username || 'User';
  };
  const displayName = getFullName();

  const GridOrScroll = ({ children }: any) => {
    if (Platform.OS === 'web') {
      return <View style={[styles.webGridContainer, isMobileWeb && { justifyContent: 'space-between', gap: 12 }]}>{children}</View>;
    }
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {children}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' && (
        <LinearGradient colors={['#0F2D4D', '#174871']} style={styles.headerGradient}>
          <SafeAreaView>
            <View style={styles.headerContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greetingText}>{getGreeting()}</Text>
                <Text style={styles.userNameText}>{displayName}</Text>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                  <Bell color="#F2F3F4" size={26} />
                  {unreadNotifications > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                {/* --- UPDATED HERE: AVATAR UI --- */}
                <TouchableOpacity style={styles.avatarTouchableOpacity} onPress={handleAvatarPress} disabled={uploading}>
                  <View style={styles.avatarContainer}>
                    {uploading ? (
                      <ActivityIndicator color="#0F2D4D" />
                    ) : profile?.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <User color="#0F2D4D" size={24} />
                    )}
                  </View>
                  {/* Badge is now outside the visible container */}
                  <View style={styles.avatarBadge}><Text style={styles.avatarBadgeText}>+</Text></View>
                </TouchableOpacity>
                
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      )}

      <RefreshableScroll onRefreshAction={fetchDashboardData} style={styles.scrollContainer} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} showsVerticalScrollIndicator={false} alwaysBounceVertical={true}>
        <View style={styles.webMaxWidth}>
        
        {Platform.OS === 'web' && user && !isGuest && (
           <View style={{ marginBottom: 32, marginTop: 40, paddingHorizontal: 24 }}>
             <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#0F2D4D' }}>{getGreeting()}</Text>
             <Text style={{ fontSize: 18, color: '#4B5563', marginTop: 4 }}>Welcome back, {displayName}</Text>
           </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Active Tags</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{totalTags < 10 ? `0${totalTags}` : totalTags}</Text></View>
          </View>
          <TouchableOpacity><Text style={styles.seeAllText}>SEE ALL</Text></TouchableOpacity>
        </View>

        <GridOrScroll>
          {tags.length === 0 ? (
            <View style={[styles.emptyCard, isMobileWeb && { width: '100%' }]}><Text style={styles.emptyCardText}>No tags added yet. Tap + to add!</Text></View>
          ) : (
            tags.map((tag) => (
              <TouchableOpacity key={tag.id} style={[styles.tagCard, tag.is_shared && { borderColor: '#BFDBFE', borderWidth: 1 }, isMobileWeb && { width: '47%', minWidth: 150, padding: 12 }]} onPress={() => navigation.navigate('TagManage', { tagId: tag.id })}>
                <Text style={[styles.tagCategory, tag.is_shared && { color: '#2563EB' }]}>{tag.is_shared ? `SHARED BY ${tag.owner_name?.toUpperCase()}` : 'MY ITEM'}</Text>
                <Text style={styles.tagTitle} numberOfLines={2}>{tag.item_name || 'Unnamed Item'}</Text>
                <View style={styles.tagStatus}>
                  <ShieldCheck color={tag.status === 'active' ? "#10B981" : "#F59E0B"} size={14} />
                  <Text style={[styles.tagStatusText, { color: tag.status === 'active' ? '#10B981' : '#F59E0B' }]}>{tag.status === 'active' ? 'Protected & Active' : 'Reported Lost'}</Text>
                </View>
                <View style={[styles.tagIconWrapper, tag.is_shared && { backgroundColor: '#EFF6FF' }]}>
                  {tag.is_shared ? <Users color="#2563EB" size={20} /> : <Tag color="#0F2D4D" size={20} />}
                </View>
                <TouchableOpacity style={[styles.lostModeBtn, { backgroundColor: tag.status === 'lost' ? '#FEF2F2' : '#F3F4F6' }]} onPress={(e) => { e.stopPropagation(); toggleLostMode(tag); }}>
                  <ShieldAlert color={tag.status === 'lost' ? '#EF4444' : '#9CA3AF'} size={18} />
                  <Text style={[styles.lostModeText, { color: tag.status === 'lost' ? '#EF4444' : '#6B7280' }]}>{tag.status === 'lost' ? 'Lost Mode: ON' : 'Mark as Lost'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </GridOrScroll>

        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
          </View>
          <TouchableOpacity><Text style={styles.seeAllText}>SEE ALL</Text></TouchableOpacity>
        </View>

        <GridOrScroll>
          {alerts.length === 0 && flightOrders.filter(f => f.status !== 'cancelled').length === 0 ? (
             <View style={[styles.emptyCard, isMobileWeb && { width: '100%' }]}><Text style={styles.emptyCardText}>No new alerts.</Text></View>
          ) : (
            <>
            {flightOrders.filter(f => f.status !== 'cancelled').map((flight) => (
              <TouchableOpacity key={`flight-${flight.id}`} style={[styles.alertCard, { borderLeftColor: '#3B82F6', backgroundColor: '#EFF6FF' }, isMobileWeb && { width: '100%' }]} onPress={() => navigation.navigate('FlightDetails', { flight })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.alertCategory, { color: '#2563EB' }]}>FLIGHT BOOKING - {flight.status.toUpperCase()}</Text>
                  <Plane color="#3B82F6" size={16} />
                </View>
                <Text style={styles.alertTitle}>Ref: {flight.pnr}</Text>
                <Text style={styles.alertDetail}>{flight.total_amount} {flight.currency} • Tap to view ticket</Text>
              </TouchableOpacity>
            ))}
            {alerts.map((alert) => (
              <View key={`alert-${alert.id}`} style={[styles.alertCard, { borderLeftColor: alert.alert_type === 'low_battery' ? '#EF4444' : '#F59E0B' }, isMobileWeb && { width: '100%' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.alertCategory}>{alert.alert_type.replace('_', ' ').toUpperCase()}</Text>
                  {alert.alert_type === 'low_battery' ? <BatteryMedium color="#EF4444" size={16} /> : <AlertTriangle color="#F59E0B" size={16} />}
                </View>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={[styles.alertDetail, alert.alert_type === 'low_battery' && { color: '#EF4444', fontWeight: 'bold' }]}>{alert.description}</Text>
              </View>
            ))}
            </>
          )}
        </GridOrScroll>

        {flightOrders.filter(f => f.status === 'cancelled').length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cancelled Tickets & Refunds</Text>
            </View>
            <GridOrScroll>
              {flightOrders.filter(f => f.status === 'cancelled').map((flight) => (
                <TouchableOpacity key={`cancelled-${flight.id}`} style={[styles.alertCard, { borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' }, isMobileWeb && { width: '100%' }]} onPress={() => navigation.navigate('FlightDetails', { flight })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.alertCategory, { color: '#DC2626' }]}>FLIGHT CANCELLED</Text>
                    <Plane color="#EF4444" size={16} />
                  </View>
                  <Text style={styles.alertTitle}>Ref: {flight.pnr}</Text>
                  <Text style={[styles.alertDetail, { color: '#DC2626', fontWeight: '500' }]}>Refund processing in 5-10 days • Tap to view</Text>
                </TouchableOpacity>
              ))}
            </GridOrScroll>
          </>
        )}


        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Friends & Family</Text>
        </View>
        <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
          <TouchableOpacity style={styles.contactCard} activeOpacity={0.7} onPress={() => navigation.navigate('TrustedNetwork')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.contactIconBg, { backgroundColor: '#FCE7F3' }]}><Users color="#DB2777" size={24} /></View>
              <View style={{ marginLeft: 16 }}>
                <Text style={styles.contactCardTitle}>Trusted Network</Text>
                <Text style={styles.contactCardNumber}>{networkMembers} Members</Text>
              </View>
            </View>
            <View style={[styles.addContactBtn, { backgroundColor: '#FDF2F8' }]}>
              <PlusCircle color="#DB2777" size={20} />
              <Text style={[styles.addContactText, { color: '#DB2000' }]}>Manage</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
        </View>

        <GridOrScroll>
          <View style={[styles.overviewCard, { backgroundColor: '#6366F1' }, isMobileWeb && { width: '47%', minWidth: 150, padding: 16, height: 130 }]}>
            <Text style={[styles.overviewCardTitle, isMobileWeb && { fontSize: 14 }]}>Total Tags</Text>
            <Text style={[styles.overviewCardNumber, isMobileWeb && { fontSize: 36 }]}>{totalTags}</Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: '#06B6D4' }, isMobileWeb && { width: '47%', minWidth: 150, padding: 16, height: 130 }]}>
            <Text style={[styles.overviewCardTitle, isMobileWeb && { fontSize: 14 }]}>Found Items</Text>
            <Text style={[styles.overviewCardNumber, isMobileWeb && { fontSize: 36 }]}>{foundItems}</Text>
          </View>
          <TouchableOpacity style={[styles.overviewCard, { backgroundColor: '#F59E0B' }, isMobileWeb && { width: '47%', minWidth: 150, padding: 16, height: 130 }]} activeOpacity={0.8} onPress={() => navigation.navigate('FilteredTags', { filterType: 'paused' })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.overviewCardTitle, isMobileWeb && { fontSize: 14 }]}>Paused Tags</Text>
              {!isMobileWeb && <PauseCircle color="#FFFFFF" size={24} style={{ opacity: 0.8 }} />}
            </View>
            <Text style={styles.overviewCardNumber}>{pausedTagsCount}</Text>
          </TouchableOpacity>
        </GridOrScroll>
        </View>
        <WebFooter />
      </RefreshableScroll>
      
      {showWebPushPrompt && Platform.OS === 'web' && (
        <View style={styles.webPushPrompt}>
          <View style={{ flex: 1 }}>
            <Text style={styles.webPushTitle}>
              {isNotificationsBlocked ? "Notifications Blocked" : "Enable Notifications"}
            </Text>
            <Text style={styles.webPushDesc}>
              {isNotificationsBlocked 
                ? "Click the 🔒 lock icon in your URL bar to allow alerts." 
                : "Get instantly notified when a tag is scanned."}
            </Text>
          </View>
          {!isNotificationsBlocked && (
            <TouchableOpacity style={styles.webPushBtn} onPress={requestWebPush}>
              <Text style={styles.webPushBtnText}>Enable</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => {
            if (Platform.OS === 'web') sessionStorage.setItem('push_prompt_dismissed', 'true');
            setShowWebPushPrompt(false);
          }}>
            <X color="#94A3B8" size={20} />
          </TouchableOpacity>
        </View>
      )}

      {showCompleteProfile && isFocused ? (
        Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, { zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={styles.confirmAccountOverlay}>
              <View style={[styles.confirmAccountModal, { padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', width: 500, maxHeight: '90%', borderRadius: 16 }]}>
                <View style={{ width: '100%', flex: 1 }}>
                  <AuthForm 
                    initialStep={!isFullyRegistered ? "signup_password" : "signup_name"} 
                    forceRegistrationCompletion={!isFullyRegistered}
                    isModal={true}
                    onClose={() => setShowCompleteProfile(false)}
                    onSuccess={() => {
                       setShowCompleteProfile(false);
                       fetchDashboardData();
                    }} 
                  />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={styles.confirmAccountOverlay}>
              <View style={[styles.confirmAccountModal, { padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', width: '100%', flex: 1, borderRadius: 0, marginTop: Platform.OS === 'ios' ? 40 : 0 }]}>
                <View style={{ width: '100%', flex: 1 }}>
                  <AuthForm 
                    initialStep={!isFullyRegistered ? "signup_password" : "signup_name"} 
                    forceRegistrationCompletion={!isFullyRegistered}
                    isModal={true}
                    onClose={() => setShowCompleteProfile(false)}
                    onSuccess={() => {
                       setShowCompleteProfile(false);
                       fetchDashboardData();
                    }} 
                  />
                </View>
              </View>
            </View>
          </Modal>
        )
      ) : null}

      <Modal visible={showConfirmAccount && !showCompleteProfile && !!profile} transparent={true} animationType="fade">
        <View style={styles.confirmAccountOverlay}>
          <View style={[styles.confirmAccountModal, Platform.OS === 'web' && !isMobileWeb ? { width: 400 } : { width: '90%', maxWidth: 400, padding: 24 }]}>
             
             {verifyStep === 'success' ? (
                <>
                  <View style={styles.confirmAccountIconBg}>
                     <CheckCircle color="#10B981" size={32} />
                  </View>
                  <Text style={styles.confirmAccountTitle}>Success!</Text>
                  <Text style={styles.confirmAccountDesc}>{verifyType === 'email' ? 'Email' : 'Phone number'} successfully verified.</Text>
                  <TouchableOpacity style={styles.primaryButtonBlock} onPress={() => { setShowConfirmAccount(false); fetchDashboardData(); }}>
                    <Text style={styles.primaryButtonText}>Continue to Dashboard</Text>
                  </TouchableOpacity>
                </>
             ) : verifyType === 'email' || verifyType === 'phone' ? (
                <>
                  {verifyStep === 'idle' ? (
                     <>
                        <View style={[styles.confirmAccountIconBg, { backgroundColor: '#EFF6FF' }]}>
                           {verifyType === 'email' ? <Mail color="#3B82F6" size={32} /> : <Smartphone color="#3B82F6" size={32} />}
                        </View>
                        <Text style={styles.confirmAccountTitle}>Verify your {verifyType}</Text>
                        <Text style={styles.confirmAccountDesc}>
                           Your {verifyType} ({verifyTarget}) is registered but not verified. Let's secure your account.
                        </Text>
                        {verifyError ? <Text style={{ color: 'red', marginBottom: 12, textAlign: 'center' }}>{verifyError}</Text> : null}
                        <TouchableOpacity style={styles.primaryButtonBlock} onPress={async () => {
                           setVerifyLoading(true); setVerifyError('');
                           
                           if (verifyType === 'email') {
                               // Native Supabase Email Auth
                               const { error } = await supabase_lucifer_core.auth.resend({ 
                                   type: 'signup',
                                   email: verifyTarget,
                               });
                               setVerifyLoading(false);
                               if (error) setVerifyError(error.message);
                               else setVerifyStep('otp');
                           } else {
                               // Custom Go Twilio SMS
                               try {
                                   await apiClient.post('/api/user/phone/send-otp', { phone_number: verifyTarget });
                                   setVerifyLoading(false);
                                   setVerifyStep('otp');
                               } catch (err: any) {
                                   setVerifyLoading(false);
                                   setVerifyError(err.response?.data || err.message || 'Failed to send SMS');
                               }
                           }
                        }}>
                           {verifyLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send Code to {verifyType}</Text>}
                        </TouchableOpacity>
                     </>
                  ) : verifyStep === 'input' ? (
                     <>
                        <View style={[styles.confirmAccountIconBg, { backgroundColor: '#EFF6FF' }]}>
                           {verifyType === 'email' ? <Mail color="#3B82F6" size={32} /> : <Smartphone color="#3B82F6" size={32} />}
                        </View>
                        <Text style={styles.confirmAccountTitle}>Add your {verifyType}</Text>
                        <Text style={styles.confirmAccountDesc}>Enter your {verifyType} below to receive a secure code.</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 56, paddingHorizontal: 16, marginBottom: 16, width: '100%' }}>
                           {verifyType === 'email' ? <Mail color="#9CA3AF" size={20} style={{ marginRight: 12 }} /> : <Smartphone color="#9CA3AF" size={20} style={{ marginRight: 12 }} />}
                           <TextInput 
                              style={{ flex: 1, fontSize: 16, color: '#111827' }}
                              placeholder={verifyType === 'email' ? "Email address" : "Phone number"}
                              value={verifyTarget}
                              onChangeText={setVerifyTarget}
                              autoCapitalize="none"
                              keyboardType={verifyType === 'email' ? "email-address" : "phone-pad"}
                           />
                        </View>
                        {verifyError ? <Text style={{ color: 'red', marginBottom: 12, textAlign: 'center' }}>{verifyError}</Text> : null}
                        <TouchableOpacity style={styles.primaryButtonBlock} onPress={async () => {
                           if (!verifyTarget.trim()) { setVerifyError(`Please enter a valid ${verifyType}`); return; }
                           setVerifyLoading(true); setVerifyError('');
                           
                           if (verifyType === 'email') {
                               // Adding a NEW email requires updateUser
                               const { error } = await supabase_lucifer_core.auth.updateUser({ 
                                   email: verifyTarget
                               });
                               setVerifyLoading(false);
                               if (error) setVerifyError(error.message);
                               else setVerifyStep('otp');
                           } else {
                               // Custom Go Twilio SMS
                               try {
                                   await apiClient.post('/api/user/phone/send-otp', { phone_number: verifyTarget });
                                   setVerifyLoading(false);
                                   setVerifyStep('otp');
                               } catch (err: any) {
                                   setVerifyLoading(false);
                                   setVerifyError(err.response?.data || err.message || 'Failed to send SMS');
                               }
                           }
                        }}>
                           {verifyLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Send Code</Text>}
                        </TouchableOpacity>
                     </>
                  ) : verifyStep === 'otp' ? (
                     <>
                        <Text style={styles.confirmAccountTitle}>Enter Code</Text>
                        <Text style={styles.confirmAccountDesc}>Enter the 6-digit code sent to {verifyTarget}.</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#3B82F6', borderRadius: 12, height: 64, paddingHorizontal: 16, marginBottom: 16, width: '100%' }}>
                           <KeyRound color="#3B82F6" size={24} style={{ marginRight: 16 }} />
                           <TextInput 
                              style={{ flex: 1, fontSize: 24, letterSpacing: 8, fontWeight: 'bold', color: '#1E3A8A' }}
                              placeholder="••••••"
                              placeholderTextColor="#93C5FD"
                              value={verifyOtp}
                              onChangeText={setVerifyOtp}
                              keyboardType="number-pad"
                              maxLength={6}
                           />
                        </View>
                        {verifyError ? <Text style={{ color: 'red', marginBottom: 12, textAlign: 'center' }}>{verifyError}</Text> : null}
                        <TouchableOpacity style={styles.primaryButtonBlock} onPress={async () => {
                           if (verifyOtp.length < 6) { setVerifyError('Please enter a valid 6-digit code'); return; }
                           setVerifyLoading(true); setVerifyError('');
                           
                           if (verifyType === 'email') {
                               // Determine the correct OTP type
                               const isNewTarget = user?.email !== verifyTarget;
                               const otpType = isNewTarget ? 'email_change' : 'signup';

                               const { error } = await supabase_lucifer_core.auth.verifyOtp({ 
                                   email: verifyTarget, 
                                   token: verifyOtp, 
                                   type: otpType as any 
                               });
                               
                               if (error && otpType !== 'signup') {
                                  // Fallback try signup if it was actually a fresh unverified account
                                  const { error: err2 } = await supabase_lucifer_core.auth.verifyOtp({ 
                                      email: verifyTarget, 
                                      token: verifyOtp, 
                                      type: 'signup'
                                  });
                                  if (err2) {
                                     setVerifyLoading(false);
                                     setVerifyError(err2.message);
                                     return;
                                  }
                               } else if (error) {
                                  setVerifyLoading(false);
                                  setVerifyError(error.message);
                                  return;
                               }
                               
                               // Redundant sync for email
                               if (user?.id) {
                                  await supabase_lucifer_core.from('profiles').update({ is_email_verified: true }).eq('id', user.id);
                               }
                           } else {
                               // Custom Go Twilio SMS Verify
                               try {
                                   await apiClient.post('/api/user/phone/verify-otp', { phone_number: verifyTarget, code: verifyOtp });
                                   // The Go backend automatically syncs `profiles` AND `auth.users` for us!
                               } catch (err: any) {
                                   setVerifyLoading(false);
                                   const errorMessage = err.response?.data?.error || err.response?.data || err.message || 'Invalid verification code';
                                   setVerifyError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
                                   return;
                               }
                           }

                           // Force refresh the session to get updated confirmed_at
                           try {
                               await supabase_lucifer_core.auth.refreshSession();
                           } catch (sessionErr: any) {
                               console.warn("Session refresh timed out/failed, but verification succeeded:", sessionErr);
                           }
                           
                           setVerifyLoading(false);
                           setVerifyStep('success');
                        }}>
                           {verifyLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setVerifyStep('input')}>
                           <Text style={styles.linkText}>Wrong {verifyType}? Go back</Text>
                        </TouchableOpacity>
                     </>
                  ) : null}

                  {verifyStep !== 'otp' && (
                     <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setShowConfirmAccount(false)}>
                       <Text style={styles.linkText}>Remind me later</Text>
                     </TouchableOpacity>
                  )}
                </>
             ) : (
                <>
                  <View style={styles.confirmAccountIconBg}>
                     <AlertTriangle color="#F59E0B" size={32} />
                  </View>
                  <Text style={styles.confirmAccountTitle}>Let us know it's really you</Text>
                  <Text style={styles.confirmAccountDesc}>
                    Your account is missing verification. Please verify your email and phone number to secure your account.
                  </Text>
                  
                  <TouchableOpacity style={[styles.primaryButtonBlock, { marginBottom: 8 }]} onPress={() => { setVerifyType('email'); setVerifyStep('input'); }}>
                    <Text style={styles.primaryButtonText}>Verify Email Now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButtonBlock, { backgroundColor: '#F3F4F6' }]} onPress={() => { setVerifyType('phone'); setVerifyStep('input'); }}>
                    <Text style={[styles.primaryButtonText, { color: '#0F2D4D' }]}>Verify Phone Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setShowConfirmAccount(false)}>
                    <Text style={styles.linkText}>Remind me later</Text>
                  </TouchableOpacity>
                </>
             )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  webMaxWidth: { maxWidth: Platform.OS === 'web' ? 1280 : '100%', alignSelf: 'center', width: '100%' },
  webGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, paddingHorizontal: 24, paddingBottom: 16 },
  headerGradient: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 10 },
  greetingText: { fontSize: 14, color: '#DED1C6', marginBottom: 4 },
  userNameText: { fontSize: 24, fontWeight: 'bold', color: '#F2F3F4' },
  notificationBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#0F2D4D' },
  notificationBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  
  // --- UPDATED STYLES FOR AVATAR ---
  avatarTouchableOpacity: {
    width: 50,
    height: 50,
    position: 'relative', // Necessary for absolute badge placement
  },
  avatarContainer: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 25, 
    backgroundColor: '#E0E7FF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#FFFFFF', 
    overflow: 'hidden' // Keep Image/Icon inside the circle
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarBadge: { 
    position: 'absolute', 
    bottom: -5, // Tweak this to move up/down
    right: -5,  // Tweak this to move left/right
    backgroundColor: '#10B981', 
    width: 22, // Slightly bigger
    height: 22, 
    borderRadius: 11, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#0F2D4D', // Match header BG
    zIndex: 10 // Ensure it stays on top
  },
  avatarBadgeText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', lineHeight: Platform.OS === 'ios' ? 16 : 18 },
  // ---------------------------------

  scrollContainer: { flex: 1, paddingTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  badge: { backgroundColor: '#0F2D4D', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  seeAllText: { fontSize: 12, fontWeight: 'bold', color: '#3B82F6' },
  horizontalScroll: { paddingHorizontal: 24, paddingBottom: 16, gap: 16 },
  emptyCard: { width: Platform.OS === 'web' ? '100%' : '85%', padding: 24, backgroundColor: '#FFFFFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  emptyCardText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
  tagCard: { width: Platform.OS === 'web' ? 280 : '85%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tagCategory: { fontSize: 10, fontWeight: 'bold', color: '#6B7280', letterSpacing: 1, marginBottom: 8 },
  tagTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12, height: 40 },
  tagStatus: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  tagStatusText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  tagIconWrapper: { width: 36, height: 36, backgroundColor: '#F3F4F6', borderRadius: 18, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 16, right: 16 },
  alertCard: { width: Platform.OS === 'web' ? 320 : '85%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  alertCategory: { fontSize: 10, fontWeight: 'bold', color: '#6B7280', letterSpacing: 1, marginBottom: 8 },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  alertDetail: { fontSize: 12, color: '#6B7280' },
  contactCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
  contactCardTitle: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  contactCardNumber: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  addContactBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  addContactText: { color: '#3B82F6', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },
  overviewCard: { width: Platform.OS === 'web' ? 280 : '65%', height: Platform.OS === 'web' ? 160 : 180, borderRadius: 24, padding: 24, justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  overviewCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', opacity: 0.9 },
  overviewCardNumber: { fontSize: 56, fontWeight: '900', color: '#FFFFFF' },
  lostModeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 12, alignSelf: 'flex-start', zIndex: 10 },
  lostModeText: { fontSize: 13, fontWeight: 'bold', marginLeft: 6 },
  
  // Guest Landing Page Styles
  heroCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  heroSubtitle: { fontSize: 16, color: '#4B5563', lineHeight: 24, marginBottom: 24 },
  whyCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  serviceCard: { borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  
  // Search Styles
  searchResultsContainer: { flex: 1 },
  mainSearchTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  shopCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 16 },
  shopImage: { width: '100%', height: 160 },
  shopInfo: { padding: 16 },
  shopName: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  shopAddress: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  shopRating: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  webPushPrompt: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: '#0A192F',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: 350,
    zIndex: 9999,
    // @ts-ignore
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  webPushTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  webPushDesc: {
    color: '#94A3B8',
    fontSize: 13,
  },
  webPushBtn: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  webPushBtnText: {
    color: '#0A192F',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmAccountOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  confirmAccountModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: 400,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10
  },
  confirmAccountIconBg: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 24
  },
  confirmAccountTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 12, textAlign: 'center'
  },
  confirmAccountDesc: {
    fontSize: 15, color: '#4B5563', textAlign: 'center', marginBottom: 32, lineHeight: 22
  },
  primaryButtonBlock: {
    backgroundColor: '#0F2D4D', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '100%'
  },
  primaryButtonText: {
    color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'
  },
  linkText: {
    color: '#3B82F6', fontSize: 14, fontWeight: '600'
  }
});