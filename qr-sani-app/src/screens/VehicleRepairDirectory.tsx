import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { ArrowLeft, Star, Search, Heart, Clock, Settings } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import RefreshableScroll from '../components/RefreshableScroll';
import WebFooter from '../components/WebFooter';
import WebLink from '../components/WebLink';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 24;
const CARD_WIDTH = width - (CARD_MARGIN * 2); 

const ShopCard = ({ item, onPress, cardWidth }: { item: any, onPress: () => void, cardWidth?: number }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const actualCardWidth = cardWidth || (Platform.OS === 'web' ? 300 : CARD_WIDTH);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / actualCardWidth);
    setActiveIndex(index);
  };

  return (
    <TouchableOpacity style={[styles.shopCard, { width: actualCardWidth }]} activeOpacity={1} onPress={onPress}>
      <View style={[styles.imageContainer, { width: actualCardWidth }]}>
        {item.photos.length > 0 ? (
          <>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
              {item.photos.map((url: string, index: number) => (
                <Image key={index} source={{ uri: url }} style={[styles.shopImage, { width: actualCardWidth }]} />
              ))}
            </ScrollView>
            {item.photos.length > 1 && (
              <View style={styles.dotsContainer}>
                {item.photos.map((_: any, i: number) => (
                  <View key={i} style={[styles.dot, i === activeIndex && styles.activeDot]} />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Text style={{ color: '#8892B0', fontSize: 13, fontWeight: '600', letterSpacing: 1 }}>NO IMAGES</Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartButton} onPress={() => setIsFavorite(!isFavorite)}>
          <Heart color={isFavorite ? "#FF715B" : "#FFFFFF"} fill={isFavorite ? "#FF715B" : "rgba(0,0,0,0.25)"} size={24} strokeWidth={1.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.shopCity} numberOfLines={1}>{item.city?.toUpperCase()}, FINLAND</Text>
          <View style={styles.ratingRow}>
            <Star color="#0A192F" fill="#0A192F" size={12} />
            <Text style={styles.ratingText}>{item.average_rating}</Text>
          </View>
        </View>
        <Text style={styles.subtitleText} numberOfLines={1}>{item.shop_name}</Text>
        <Text style={styles.subtitleText} numberOfLines={1}>{item.street}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function VehicleRepairDirectory() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused(); // Triggers a re-check when returning to this screen
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  
  const initialLocation = route.params?.location;
  const targetService = route.params?.service || 'Vehicle Repair';

  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(initialLocation || 'All');
  
  // Reactively track auth state instead of one-time fetch
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isGuest, setIsGuest] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // STATE TO TRACK IF THEY ARE A HOST
  const [hostStatus, setHostStatus] = useState<'none' | 'pending' | 'active'>('none');

  // Dynamically create filters based on data (with hardcoded fallbacks until loaded)
  const uniqueCities = Array.from(new Set(shops.map(shop => shop.city?.toUpperCase() || 'UNKNOWN')));
  const loadedFilters = uniqueCities.map(c => c.charAt(0) + c.slice(1).toLowerCase());
  const filters = ['All', ...(loadedFilters.length > 0 ? loadedFilters : ['Helsinki', 'Espoo', 'Vantaa', 'Tampere'])];

  const isMobileWeb = Platform.OS === 'web' && width < 768;
  const webGridGap = 24;
  const horizontalPadding = CARD_MARGIN * 2;
  const webCardWidth = isMobileWeb 
    ? (width - horizontalPadding - webGridGap) / 2 
    : 300;

  // Reactive effect for auth state
  useEffect(() => {
    if (!isAuthLoading) {
      if (user) {
        setIsGuest(false);
        checkUserHostStatus(user.id);
      } else {
        setIsGuest(true);
        setHostStatus('none');
        setUserProfile(null);
      }
    }
  }, [user, isAuthLoading]);

  // Initial fetch for shops
  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (route.params?.location) {
      setActiveFilter(route.params.location);
    } else {
      setActiveFilter('All');
    }
  }, [route.params?.location]);

  useEffect(() => {
    if (isFocused && !loading) {
      fetchShops();
    }
  }, [isFocused]);

  const checkUserHostStatus = async (userId: string) => {
    try {
      const res = await apiClient.get('/api/shops/status');
      setHostStatus(res.data.status);
    } catch (err) {
      console.error("Error checking host status:", err);
      setHostStatus('none');
    }
  };

  const fetchShops = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      
      if (!backendUrl) {
        throw new Error('EXPO_PUBLIC_BACKEND_URL is not set in your .env file');
      }

      const response = await fetch(`${backendUrl}/api/public/shops`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch shops from backend');
      }
      
      const shopsData = await response.json();

      if (shopsData) {
        const formattedShops = shopsData.map((shop: any) => {
          // The backend already falls back to verification_doc_url if photos are empty.
          // We just need to resolve them into fully qualified URLs if they aren't already.
          const processedPhotos = (shop.photos || []).map((pUrl: string) => {
            if (pUrl.startsWith('http')) return pUrl;
            return supabase_lucifer_core.storage.from('shop_assets').getPublicUrl(pUrl).data.publicUrl;
          });

          return {
            ...shop,
            photos: processedPhotos
          };
        });
        setShops(formattedShops);
      }
    } catch (err) {
      console.error("Error fetching shops securely:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter by service type (assuming legacy shops without service_type are Vehicle Repair)
  const serviceFilteredShops = shops.filter(shop => (shop.service_type || 'Vehicle Repair') === targetService);

  const filteredShops = activeFilter === 'All' 
    ? serviceFilteredShops 
    : serviceFilteredShops.filter(shop => shop.city?.toLowerCase() === activeFilter.toLowerCase());

  // Group shops by city for 'All' view
  const groupedShops: { [city: string]: any[] } = {};
  if (activeFilter === 'All') {
    serviceFilteredShops.forEach(shop => {
      const city = shop.city.charAt(0).toUpperCase() + shop.city.slice(1).toLowerCase();
      if (!groupedShops[city]) groupedShops[city] = [];
      groupedShops[city].push(shop);
    });
  }

  return (
    <View style={styles.container}>
      {/* TOP ROW: Back Button & Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#0A192F" size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        {Platform.OS !== 'web' && (
          <TouchableOpacity style={styles.searchBar}>
            <Search color="#4A00E0" size={18} strokeWidth={2.5} />
            <Text style={styles.searchText}>Discover Finland</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* DYNAMIC HOST BANNER */}
      {hostStatus === 'none' && (
        <TouchableOpacity style={styles.hostBanner} activeOpacity={0.8} onPress={() => isGuest ? navigation.navigate('Login') : navigation.navigate('PartnerOnboardingIntro')}>
          <View style={styles.hostBannerTextContainer}>
            <Text style={styles.hostBannerTitle}>Own a repair shop?</Text>
            <Text style={styles.hostBannerSub}>{isGuest ? 'Sign in or create an account to host your shop.' : 'Partner with us and list your services.'}</Text>
          </View>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&q=80&w=150&h=150' }} style={styles.hostBannerImage} />
        </TouchableOpacity>
      )}

      {hostStatus === 'pending' && (
        <TouchableOpacity style={[styles.hostBanner, { backgroundColor: '#FEF3C7', shadowColor: '#D97706' }]} activeOpacity={0.8} onPress={() => navigation.navigate('HostDashboard')}>
          <View style={styles.hostBannerTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Clock color="#D97706" size={16} style={{ marginRight: 6 }} />
              <Text style={[styles.hostBannerTitle, { color: '#D97706', marginBottom: 0 }]}>Verification Pending</Text>
            </View>
            <Text style={styles.hostBannerSub}>We are reviewing your documents. Tap to view dashboard.</Text>
          </View>
        </TouchableOpacity>
      )}

      {hostStatus === 'active' && (
        <TouchableOpacity style={[styles.hostBanner, { backgroundColor: '#F8FAFC' }]} activeOpacity={0.8} onPress={() => navigation.navigate('HostDashboard')}>
          <View style={styles.hostBannerTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Settings color="#0A192F" size={16} style={{ marginRight: 6 }} />
              <Text style={[styles.hostBannerTitle, { marginBottom: 0 }]}>Manage Your Shops</Text>
            </View>
            <Text style={styles.hostBannerSub}>Go to your Host Dashboard to view bookings.</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* FILTERS */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((filter) => (
            <TouchableOpacity key={filter} style={[styles.filterPill, activeFilter === filter && styles.activeFilterPill]} onPress={() => setActiveFilter(filter)}>
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* SHOP LIST */}
      {loading ? (
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color="#4A00E0" />
        </View>
      ) : (
        <RefreshableScroll onRefreshAction={fetchShops} style={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredShops.length === 0 ? (
            <View style={styles.centerScreen}>
              <Text style={styles.emptyText}>No {targetService.toLowerCase()} found.</Text>
            </View>
          ) : activeFilter === 'All' ? (
            <View>
              {Object.keys(groupedShops).map((city) => (
                <View key={city} style={styles.citySection}>
                  <Text style={styles.citySectionTitle}>{city} Shops</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCityScroll}>
                    {groupedShops[city].map((item) => (
                      <WebLink key={item.id} screen="ShopDetails" params={{ id: item.id }} style={{ marginRight: 24 }}>
                        <ShopCard item={item} onPress={() => navigation.navigate('ShopDetails', { id: item.id })} cardWidth={300} />
                      </WebLink>
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>
          ) : (
            <View style={Platform.OS === 'web' ? styles.webGridContainer : {}}>
              {filteredShops.map((item) => (
                <WebLink key={item.id} screen="ShopDetails" params={{ id: item.id }} style={Platform.OS === 'web' ? { width: webCardWidth } : {}}>
                  <ShopCard item={item} onPress={() => navigation.navigate('ShopDetails', { id: item.id })} cardWidth={Platform.OS === 'web' ? webCardWidth : undefined} />
                </WebLink>
              ))}
            </View>
          )}
          <View style={{ height: 60 }} />
          <WebFooter />
        </RefreshableScroll>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 16, paddingHorizontal: CARD_MARGIN, paddingBottom: 16 },
  backButton: { marginRight: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, height: 48, borderRadius: 24, shadowColor: '#4A00E0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  searchText: { marginLeft: 12, color: '#0A192F', fontSize: 14, fontWeight: '600' },
  
  filterScroll: { paddingHorizontal: CARD_MARGIN, paddingVertical: 12, gap: 16 },
  filterPill: { paddingBottom: 8, borderBottomWidth: 3, borderColor: 'transparent' },
  activeFilterPill: { borderColor: '#4A00E0' },
  filterText: { color: '#8892B0', fontSize: 14, fontWeight: '600' },
  activeFilterText: { color: '#0A192F', fontWeight: '800' },

  listContent: { paddingHorizontal: CARD_MARGIN, paddingTop: 16 },
  
  citySection: { marginBottom: 32 },
  citySectionTitle: { fontSize: 22, fontWeight: '800', color: '#0A192F', marginBottom: 16 },
  horizontalCityScroll: { paddingRight: 24, paddingBottom: 16 },
  
  shopCard: { marginBottom: 20 },
  imageContainer: { width: CARD_WIDTH, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E2E8F0', position: 'relative' },
  shopImage: { width: CARD_WIDTH, height: '100%', resizeMode: 'cover' },
  noImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heartButton: { position: 'absolute', top: 14, right: 14, padding: 2 },
  dotsContainer: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.6)' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },

  infoContainer: { marginTop: 12, paddingHorizontal: 2 }, 
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  shopCity: { fontSize: 15, fontWeight: '600', color: '#0A192F', flex: 1, paddingRight: 8 }, 
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 4, fontWeight: '400', color: '#0A192F', fontSize: 14 },
  subtitleText: { fontSize: 15, color: '#8892B0', fontWeight: '400', lineHeight: 21 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
  priceBold: { fontSize: 15, fontWeight: '600', color: '#0A192F' },
  priceRegular: { fontSize: 15, color: '#0A192F', fontWeight: '400' },

  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#8892B0', fontSize: 15, fontWeight: '600' },
  hostBanner: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: CARD_MARGIN, marginTop: 4, marginBottom: 12, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#4A00E0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  hostBannerTextContainer: { flex: 1, paddingRight: 16 },
  hostBannerTitle: { fontSize: 16, fontWeight: '700', color: '#0A192F', marginBottom: 4 },
  hostBannerSub: { fontSize: 14, color: '#8892B0', lineHeight: 20 },
  hostBannerImage: { width: 60, height: 60, borderRadius: 12 },
  webGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 }
});