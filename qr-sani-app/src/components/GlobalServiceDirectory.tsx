import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Dimensions, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { ArrowLeft, Star, Search, Heart, MapPin, Filter } from 'lucide-react-native';
import apiClient from '../utils/apiClient';
import RefreshableScroll from '../components/RefreshableScroll';
import WebFooter from '../components/WebFooter';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 24;
const CARD_WIDTH = width - (CARD_MARGIN * 2);

interface GlobalService {
  id: string;
  service_type: string;
  title: string;
  subtitle: string;
  city: string;
  country: string;
  price_indicator: string;
  rating: number;
  photos: string[];
  metadata: any;
}

const ServiceCard = ({ item, onPress, cardWidth }: { item: GlobalService, onPress: () => void, cardWidth?: number }) => {
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
        {item.photos && item.photos.length > 0 ? (
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
            <Text style={{ color: '#0A192F', fontSize: 13, fontWeight: 'bold' }}>NO IMAGE</Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartButton} onPress={() => setIsFavorite(!isFavorite)}>
          <Heart color={isFavorite ? "#00E5FF" : "#FFFFFF"} fill={isFavorite ? "#00E5FF" : "rgba(0,0,0,0.25)"} size={24} strokeWidth={1.5} />
        </TouchableOpacity>
        
        {item.price_indicator && (
           <View style={styles.pricePill}>
             <Text style={styles.pricePillText}>{item.price_indicator}</Text>
           </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.shopCity} numberOfLines={1}>{item.city?.toUpperCase()}</Text>
          <View style={styles.ratingRow}>
            <Star color="#00E5FF" fill="#00E5FF" size={12} />
            <Text style={styles.ratingText}>{item.rating?.toFixed(1)}</Text>
          </View>
        </View>
        <Text style={styles.subtitleText} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.descText} numberOfLines={1}>{item.subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function GlobalServiceDirectory({ serviceType, pageTitle }: { serviceType: string, pageTitle: string }) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();

  const [services, setServices] = useState<GlobalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const uniqueCities = Array.from(new Set(services.map(s => s.city?.toUpperCase() || 'UNKNOWN')));
  const loadedFilters = uniqueCities.map(c => c.charAt(0) + c.slice(1).toLowerCase());
  const filters = ['All', ...(loadedFilters.length > 0 ? loadedFilters : ['Helsinki', 'Espoo', 'Vantaa', 'Tampere'])];

  const isMobileWeb = Platform.OS === 'web' && width < 768;
  const webGridGap = 24;
  const horizontalPadding = CARD_MARGIN * 2;
  const webCardWidth = isMobileWeb 
    ? width - horizontalPadding 
    : (width > 1200 ? (1200 - horizontalPadding - (webGridGap * 3)) / 4 : 
      (width > 900 ? (width - horizontalPadding - (webGridGap * 2)) / 3 : 
      (width - horizontalPadding - webGridGap) / 2));

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/directory?type=${serviceType}`);
      setServices(res.data || []);
    } catch (err) {
      console.error(`Error loading ${serviceType} services:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadServices();
    }
  }, [isFocused, serviceType]);

  const filteredServices = activeFilter === 'All' 
    ? services 
    : services.filter(s => s.city?.toLowerCase() === activeFilter.toLowerCase());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Services')} style={styles.backButton}>
            <ArrowLeft color="#E2E8F0" size={24} />
          </TouchableOpacity>
          
          <View style={styles.searchBar}>
            <Search color="#94A3B8" size={20} />
            <Text style={styles.searchPlaceholder}>Where to next?</Text>
            <View style={styles.searchDivider} />
            <Filter color="#94A3B8" size={20} />
          </View>
        </View>

        <Text style={styles.pageTitle}>{pageTitle}</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {filters.map(filter => (
            <TouchableOpacity 
              key={filter} 
              style={[styles.filterButton, activeFilter === filter && styles.activeFilterButton]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <RefreshableScroll onRefreshAction={loadServices} style={styles.listContainer}>
        {loading ? (
          <View style={{ marginTop: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#00E5FF" />
            <Text style={{ marginTop: 12, color: '#94A3B8' }}>Scanning directory...</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.cardsContainer, Platform.OS === 'web' && { maxWidth: 1200, width: '100%' }]}>
              {filteredServices.length > 0 ? (
                filteredServices.map(item => (
                  <ServiceCard 
                    key={item.id} 
                    item={item} 
                    onPress={() => console.log('Item pressed')}
                    cardWidth={Platform.OS === 'web' ? webCardWidth : undefined}
                  />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <MapPin color="#00E5FF" size={48} opacity={0.5} />
                  <Text style={styles.emptyTitle}>No locations found</Text>
                  <Text style={styles.emptyText}>Try adjusting your filters or search area.</Text>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={{height: 60}} />
        <WebFooter />
      </RefreshableScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F', // Midnight Glass dark blue
  },
  header: {
    backgroundColor: 'rgba(10, 25, 47, 0.95)',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
    backdropFilter: 'blur(10px)' as any,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 12,
    color: '#94A3B8',
    fontSize: 16,
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#F8FAFC',
    paddingHorizontal: 24,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeFilterButton: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  filterText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#0A192F',
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
  },
  cardsContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: Platform.OS === 'web' ? 'wrap' : 'nowrap',
    gap: 24,
    padding: 24,
  },
  shopCard: {
    marginBottom: 16,
  },
  imageContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#112240',
  },
  shopImage: {
    height: '100%',
    resizeMode: 'cover',
  },
  noImagePlaceholder: {
    flex: 1,
    backgroundColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
  },
  heartButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
  },
  pricePill: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(10, 25, 47, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(4px)',
  },
  pricePillText: {
    color: '#00E5FF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shopCity: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: 0.5,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  descText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 8,
  }
});
