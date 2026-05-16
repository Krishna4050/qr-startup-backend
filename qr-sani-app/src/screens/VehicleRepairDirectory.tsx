import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Star, Search, Heart } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import RefreshableScroll from '../components/RefreshableScroll';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 24;
const CARD_WIDTH = width - (CARD_MARGIN * 2); 

const ShopCard = ({ item, onPress }: { item: any, onPress: () => void }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / CARD_WIDTH);
    setActiveIndex(index);
  };

  return (
    <TouchableOpacity style={styles.shopCard} activeOpacity={1} onPress={onPress}>
      
      {/* 1. THE PERFECT IMAGE CAROUSEL */}
      <View style={styles.imageContainer}>
        {item.photos.length > 0 ? (
          <>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {item.photos.map((url: string, index: number) => (
                <Image key={index} source={{ uri: url }} style={styles.shopImage} />
              ))}
            </ScrollView>

            {/* Airbnb-style Pagination Dots */}
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

        {/* Favorite Heart - Top Right */}
        <TouchableOpacity style={styles.heartButton} onPress={() => setIsFavorite(!isFavorite)}>
          <Heart 
            color={isFavorite ? "#FF715B" : "#FFFFFF"} 
            fill={isFavorite ? "#FF715B" : "rgba(0,0,0,0.25)"} 
            size={24} 
            strokeWidth={1.5} 
          />
        </TouchableOpacity>
      </View>

      {/* 2. AIRBNB PIXEL-PERFECT TYPOGRAPHY STACK */}
      <View style={styles.infoContainer}>
        {/* Line 1: Title and Rating (Same Line, Space Between) */}
        <View style={styles.titleRow}>
          <Text style={styles.shopCity} numberOfLines={1}>{item.city?.toUpperCase()}, FINLAND</Text>
          <View style={styles.ratingRow}>
            <Star color="#0A192F" fill="#0A192F" size={12} />
            <Text style={styles.ratingText}>{item.average_rating}</Text>
          </View>
        </View>
        
        {/* Line 2 & 3: Details (Gray, Tight Line Height) */}
        <Text style={styles.subtitleText} numberOfLines={1}>{item.shop_name}</Text>
        <Text style={styles.subtitleText} numberOfLines={1}>{item.street}</Text>
        
        {/* Line 4: Price (Bold number, regular unit) */}
        <View style={styles.priceContainer}>
          <Text style={styles.priceBold}>€50</Text>
          <Text style={styles.priceRegular}> per repair</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function VehicleRepairDirectory() {
  const navigation = useNavigation<any>();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Helsinki', 'Espoo', 'Vantaa', 'Tampere'];

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const { data: shopsData, error } = await supabase_lucifer_core
        .from('shop_locations')
        .select(`*, shop_photos ( photo_url ), shop_reviews ( rating )`)
        .eq('is_active', true);

      if (error) throw error;

      if (shopsData) {
        const formattedShops = shopsData.map((shop: any) => {
          const reviews = shop.shop_reviews || [];
          const avgRating = reviews.length > 0 
            ? (reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) / reviews.length).toFixed(2)
            : 'New';

          return {
            ...shop,
            average_rating: avgRating,
            photos: shop.shop_photos?.map((p: any) => p.photo_url) || []
          };
        });
        setShops(formattedShops);
      }
    } catch (err) {
      console.error("Error fetching shops:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = activeFilter === 'All' 
    ? shops 
    : shops.filter(shop => shop.city.toLowerCase() === activeFilter.toLowerCase());

  return (
    <View style={styles.container}>
      
      {/* 1. TOP ROW: Back Button & Search Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#0A192F" size={24} strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBar}>
          <Search color="#4A00E0" size={18} strokeWidth={2.5} />
          <Text style={styles.searchText}>Discover Finland</Text>
        </TouchableOpacity>
      </View>

      {/* 2. SECOND ROW: The Host Banner (Now outside the header!) */}
      <TouchableOpacity 
        style={styles.hostBanner} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('PartnerOnboardingIntro')}
      >
        <View style={styles.hostBannerTextContainer}>
          <Text style={styles.hostBannerTitle}>Own a repair shop?</Text>
          <Text style={styles.hostBannerSub}>Partner with us and list your services.</Text>
        </View>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&q=80&w=150&h=150' }} 
          style={styles.hostBannerImage} 
        />
      </TouchableOpacity>

      {/* 3. THIRD ROW: The Filters */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((filter) => (
            <TouchableOpacity 
              key={filter} 
              style={[styles.filterPill, activeFilter === filter && styles.activeFilterPill]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 4. THE SHOP LIST */}
      {loading ? (
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color="#4A00E0" />
        </View>
      ) : (
        <RefreshableScroll 
          onRefreshAction={fetchShops} 
          style={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredShops.length === 0 ? (
            <View style={styles.centerScreen}>
              <Text style={styles.emptyText}>No repair shops found.</Text>
            </View>
          ) : (
            filteredShops.map((item) => (
              <ShopCard 
                key={item.id} 
                item={item} 
                onPress={() => navigation.navigate('ShopDetails', { shopData: item })} 
              />
            ))
          )}
          <View style={{ height: 60 }} />
        </RefreshableScroll>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: CARD_MARGIN, paddingBottom: 16 },
  backButton: { marginRight: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, height: 48, borderRadius: 24, shadowColor: '#4A00E0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  searchText: { marginLeft: 12, color: '#0A192F', fontSize: 14, fontWeight: '600' },
  
  filterScroll: { paddingHorizontal: CARD_MARGIN, paddingVertical: 12, gap: 16 },
  filterPill: { paddingBottom: 8, borderBottomWidth: 3, borderColor: 'transparent' },
  activeFilterPill: { borderColor: '#4A00E0' },
  filterText: { color: '#8892B0', fontSize: 14, fontWeight: '600' },
  activeFilterText: { color: '#0A192F', fontWeight: '800' },

  listContent: { paddingHorizontal: CARD_MARGIN, paddingTop: 16 },
  
  // CARD STYLES - PIXEL PERFECT
  shopCard: { marginBottom: 36 },
  imageContainer: { width: CARD_WIDTH, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#E2E8F0', position: 'relative' },
  shopImage: { width: CARD_WIDTH, height: '100%', resizeMode: 'cover' },
  noImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  heartButton: { position: 'absolute', top: 14, right: 14, padding: 2 },
  
  dotsContainer: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.6)' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },

  // TEXT LAYOUT - TIGHT AND UNIFORM
  infoContainer: { marginTop: 12, paddingHorizontal: 2 }, // Slight inset to match Airbnb's optical alignment
  
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  shopCity: { fontSize: 15, fontWeight: '600', color: '#0A192F', flex: 1, paddingRight: 8 }, 
  
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 4, fontWeight: '400', color: '#0A192F', fontSize: 14 },
  
  subtitleText: { fontSize: 15, color: '#8892B0', fontWeight: '400', lineHeight: 21 }, // LineHeight creates the tight stacking
  
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
});