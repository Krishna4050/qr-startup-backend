import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Dimensions, Platform, TextInput, TouchableOpacity } from 'react-native';
import { Map, MapMarker } from '../components/MapComponent';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import apiClient from '../utils/apiClient';
import ParkingDetailsSheet from '../components/ParkingDetailsSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Supercluster from 'supercluster';
import type { BBox } from 'geojson';

interface ParkingSpace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  is_free: boolean;
  pricing_info: string;
  source?: string;
}

export default function ParkingMap() {
  const insets = useSafeAreaInsets();
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  
  // Supercluster State
  const [zoom, setZoom] = useState(13);
  const [bbox, setBBox] = useState<BBox>([24.7, 60.0, 25.1, 60.3]); // Default roughly Helsinki area
  const [clusters, setClusters] = useState<any[]>([]);

  const filteredSpaces = spaces.filter(space => {
    const matchesSearch = space.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = showFreeOnly ? space.is_free : true;
    return matchesSearch && matchesFilter;
  });

  // Initialize Supercluster Engine
  const supercluster = React.useMemo(() => {
    const sc = new Supercluster({
      radius: 50,
      maxZoom: 16,
    });
    
    const points = filteredSpaces.map(space => ({
      type: 'Feature' as const,
      properties: { cluster: false, spaceId: space.id, ...space },
      geometry: { type: 'Point' as const, coordinates: [space.longitude, space.latitude] }
    }));
    
    sc.load(points as any);
    return sc;
  }, [filteredSpaces]);

  // Update visible clusters when map moves
  useEffect(() => {
    if (supercluster) {
      setClusters(supercluster.getClusters(bbox, zoom));
    }
  }, [supercluster, bbox, zoom]);

  // Default to Helsinki Center
  const initialRegion = {
    latitude: 60.1699,
    longitude: 24.9384,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    fetchParkingSpaces();
  }, []);

  const fetchParkingSpaces = async () => {
    try {
      const response = await apiClient.get('/api/parking');
      if (response.data && response.data.status === 'success') {
        setSpaces(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch parking spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading && spaces.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Finding parking spaces...</Text>
        </View>
      ) : (
        <Map
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          mapType="mutedStandard"
          onRegionChangeComplete={(region: any) => {
            const latDelta = region.latitudeDelta;
            const lngDelta = region.longitudeDelta;
            setBBox([
              region.longitude - lngDelta / 2,
              region.latitude - latDelta / 2,
              region.longitude + lngDelta / 2,
              region.latitude + latDelta / 2,
            ] as BBox);
          }}
        >
          {clusters.map((cluster) => {
            const [longitude, latitude] = cluster.geometry.coordinates;
            const { cluster: isCluster, point_count: pointCount } = cluster.properties;

            if (isCluster) {
              return (
                <MapMarker
                  key={`cluster-${cluster.id}`}
                  coordinate={{ latitude, longitude }}
                  tracksViewChanges={false}
                >
                  <View style={styles.clusterMarker}>
                    <Text style={styles.clusterText}>{pointCount}</Text>
                  </View>
                </MapMarker>
              );
            }

            // Individual Point
            const space = cluster.properties;
            const isStreet = space.source === 'osm';
            const isHelsinki = space.source === 'helsinki';
            
            let markerStyle = space.is_free ? styles.markerFree : styles.markerPaid;
            let textStyle = space.is_free ? styles.markerTextFree : styles.markerTextPaid;
            let iconColor = space.is_free ? '#166534' : '#1e3a8a';
            let label = space.is_free ? 'Free' : 'Pay';
            
            if (isStreet) {
              markerStyle = styles.markerStreet;
              textStyle = styles.markerTextStreet;
              iconColor = '#854d0e';
              label = 'Street';
            } else if (isHelsinki) {
              markerStyle = styles.markerHelsinki;
              textStyle = styles.markerTextHelsinki;
              iconColor = '#9a3412';
              label = 'Hel';
            }

            return (
              <MapMarker
                key={`point-${space.spaceId}`}
                coordinate={{ latitude, longitude }}
                onPress={() => setSelectedSpace(space as any)}
                tracksViewChanges={false}
              >
                <View style={[styles.customMarker, markerStyle]}>
                  <Ionicons 
                    name={isStreet || isHelsinki ? "car-sport" : "car"} 
                    size={14} 
                    color={iconColor} 
                  />
                  <Text style={[styles.markerText, textStyle]}>
                    {label}
                  </Text>
                </View>
              </MapMarker>
            );
          })}
        </Map>
      )}

      <View style={[styles.searchContainer, { top: Math.max(insets.top + 10, 20) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchText, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} 
            placeholder="Find parking in Finland..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={[styles.filterButton, showFreeOnly && styles.filterButtonActive]} 
            onPress={() => setShowFreeOnly(!showFreeOnly)}
          >
            <Ionicons name="options-outline" size={18} color={showFreeOnly ? "#fff" : "#000"} />
          </TouchableOpacity>
        </BlurView>
      </View>

      <ParkingDetailsSheet 
        space={selectedSpace} 
        onClose={() => setSelectedSpace(null)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  map: {
    width: Dimensions.get('window').width,
    height: (Platform.OS === 'web' ? '100dvh' : Dimensions.get('window').height) as any,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  searchContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: 10,
    marginLeft: 4,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  filterButton: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  filterButtonActive: {
    backgroundColor: '#0f172a',
  },
  clusterMarker: {
    backgroundColor: '#0f172a',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  clusterText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  customMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  markerFree: {
    backgroundColor: '#bbf7d0',
    borderColor: '#4ade80',
  },
  markerPaid: {
    backgroundColor: '#bfdbfe',
    borderColor: '#60a5fa',
  },
  markerStreet: {
    backgroundColor: '#fef08a',
    borderColor: '#facc15',
  },
  markerHelsinki: {
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  markerTextFree: {
    color: '#166534',
  },
  markerTextPaid: {
    color: '#1e3a8a',
  },
  markerTextStreet: {
    color: '#854d0e',
  },
  markerTextHelsinki: {
    color: '#9a3412',
  },
});
