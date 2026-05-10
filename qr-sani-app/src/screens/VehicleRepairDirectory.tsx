import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Star, Search, Heart } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import RefreshableScroll from '../components/RefreshableScroll';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48; // Standard padding of 24 on each side

// --- THE STYLE CARD COMPONENT ---
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
      {/* THE IMAGE CAROUSEL */}
      <View style={styles.imageContainer}>
        {item.photos.length > 0 ? (
          <>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16} // Smooth scrolling detection
            >
              {item.photos.map((url: string, index: number) => (
                <Image key={index} source={{ uri: url }} style={styles.shopImage} />
              ))}
            </ScrollView>

            {/* Pagination Dots */}
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
            <Text style={{ color: '#9CA3AF' }}>No Photos</Text>
          </View>
        )}

        {/* Favorite Heart Button */}
        <TouchableOpacity 
          style={styles.heartButton} 
          onPress={() => setIsFavorite(!isFavorite)}
        >
          <Heart 
            color={isFavorite ? "#FF385C" : "#FFFFFF"} // Airbnb Red
            fill={isFavorite ? "#FF385C" : "rgba(0,0,0,0.3)"} 
            size={24} 
            strokeWidth={1.5} 
          />
        </TouchableOpacity>
      </View>

      {/*TYPOGRAPHY */}
      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.shopCity}>{item.city}, Finland</Text>
          <View style={styles.ratingRow}>
            <Star color="#222222" fill="#222222" size={13} />
            <Text style={styles.ratingText}>{item.average_rating}</Text>
          </View>
        </View>
        
        <Text style={styles.subtitleText} numberOfLines={1}>{item.shop_name}</Text>
        <Text style={styles.subtitleText} numberOfLines={1}>{item.street}</Text>
        
        <Text style={styles.priceLine}>
          <Text style={styles.priceBold}>From €50</Text> <Text style={styles.priceRegular}>/ repair</Text>
        </Text>
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
            ? (reviews.reduce((acc: number, curr: any) => acc + curr.rating, 0) / reviews.length).toFixed(2) // Airbnb uses 2 decimal places usually!
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
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#222222" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBar}>
          <Search color="#222222" size={18} />
          <Text style={styles.searchText}>Search services in Finland</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER PILLS */}
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

      {/* SHOP LIST */}
      {loading ? (
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color="#FF385C" />
        </View>
      ) : (
        <RefreshableScroll 
          onRefreshAction={fetchShops} 
          style={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredShops.length === 0 ? (
            <View style={styles.centerScreen}>
              <Text style={styles.emptyText}>No repair shops found in this area.</Text>
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
          <View style={{ height: 40 }} />
        </RefreshableScroll>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 24, paddingBottom: 10 },
  backButton: { marginRight: 16 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, height: 48, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  searchText: { marginLeft: 12, color: '#222222', fontSize: 14, fontWeight: '500' },
  
  // Filters
  filterScroll: { paddingHorizontal: 24, paddingVertical: 16, gap: 12 },
  filterPill: { paddingHorizontal: 0, paddingVertical: 8, borderBottomWidth: 2, borderColor: 'transparent' },
  activeFilterPill: { borderColor: '#222222' },
  filterText: { color: '#717171', fontSize: 14, fontWeight: '500' },
  activeFilterText: { color: '#222222', fontWeight: 'bold' },

  listContent: { paddingHorizontal: 24, paddingTop: 10 },
  
  // CARD STYLES
  shopCard: { marginBottom: 36 },
  imageContainer: { width: CARD_WIDTH, height: CARD_WIDTH * 0.95, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F3F4F6', position: 'relative' },
  shopImage: { width: CARD_WIDTH, height: '100%', resizeMode: 'cover' },
  noImagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  heartButton: { position: 'absolute', top: 12, right: 12, padding: 4 },
  
  dotsContainer: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  activeDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FFFFFF' },

  infoContainer: { marginTop: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shopCity: { fontSize: 15, fontWeight: '600', color: '#222222', flex: 1 },
  
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 4, fontWeight: '400', color: '#222222', fontSize: 14 },
  
  subtitleText: { fontSize: 15, color: '#717171', marginTop: 2 },
  
  priceLine: { marginTop: 6 },
  priceBold: { fontSize: 15, fontWeight: '600', color: '#222222' },
  priceRegular: { fontSize: 15, color: '#222222' },

  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#717171', fontSize: 15 }
});