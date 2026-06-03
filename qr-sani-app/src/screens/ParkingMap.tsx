import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Dimensions, Platform, TextInput, TouchableOpacity } from 'react-native';
import { Map, MapMarker } from '../components/MapComponent';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import apiClient from '../utils/apiClient';
import ParkingDetailsSheet from '../components/ParkingDetailsSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Supercluster from 'supercluster';
import type { BBox } from 'geojson';
import * as Location from 'expo-location';

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
  const mapRef = useRef<any>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  
  // Advanced Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [showFreeParking, setShowFreeParking] = useState(true);
  const [showPaidParking, setShowPaidParking] = useState(true);
  const [filterCity, setFilterCity] = useState('');
  const [filterStreet, setFilterStreet] = useState('');
  const [filterZip, setFilterZip] = useState('');

  // Supercluster State
  const [zoom, setZoom] = useState(13);
  const [bbox, setBBox] = useState<BBox>([24.7, 60.0, 25.1, 60.3]); // Default roughly Helsinki area
  const [clusters, setClusters] = useState<any[]>([]);

  const filteredSpaces = spaces.filter(space => {
    // We remove the text search filter here, because search now moves the map!
    // We only filter by Free/Paid toggles.
    if (!showFreeParking && space.is_free) return false;
    if (!showPaidParking && !space.is_free) return false;
    return true;
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

  const handleSearch = async (customQuery?: string) => {
    const query = customQuery || searchQuery;
    if (!query.trim()) return;
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        mapRef.current?.animateToRegion({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 1000);
      } else {
        alert("Location not found. Please try a different search.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to search location.");
    }
  };

  const handleUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 1000);
    } catch (e) {
      console.error(e);
      alert("Failed to get current location.");
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    let advancedQuery = [];
    if (filterStreet) advancedQuery.push(filterStreet);
    if (filterCity) advancedQuery.push(filterCity);
    if (filterZip) advancedQuery.push(filterZip);
    
    if (advancedQuery.length > 0) {
      handleSearch(advancedQuery.join(', '));
    }
  };

  return (
    <View style={styles.container}>
      {loading && spaces.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading mapping clusters...</Text>
        </View>
      ) : (
        <Map
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          mapType="mutedStandard"
          onRegionChangeComplete={(region: any) => {
            const latDelta = region.latitudeDelta;
            const lngDelta = region.longitudeDelta;
            
            // Critical: Update zoom state so supercluster knows we zoomed in!
            if (lngDelta) {
              const newZoom = Math.round(Math.log2(360 / lngDelta));
              setZoom(newZoom);
            }

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
                  onPress={() => {
                    const expansionZoom = supercluster.getClusterExpansionZoom(cluster.id as number);
                    const zoomLevelToDelta = 360 / Math.pow(2, expansionZoom);
                    
                    if (mapRef.current?.animateToRegion) {
                      mapRef.current.animateToRegion({
                        latitude,
                        longitude,
                        latitudeDelta: zoomLevelToDelta,
                        longitudeDelta: zoomLevelToDelta,
                      }, 500);
                    }
                  }}
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
            onSubmitEditing={() => handleSearch()}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={[styles.filterButton, showFilters && styles.filterButtonActive]} 
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={18} color={showFilters ? "#fff" : "#000"} />
          </TouchableOpacity>
        </BlurView>

        {showFilters && (
          <View style={styles.filterDropdown}>
            <Text style={styles.filterTitle}>Advanced Filters</Text>
            
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={[styles.filterToggle, showFreeParking && styles.filterToggleActive]}
                onPress={() => setShowFreeParking(!showFreeParking)}
              >
                <Text style={[styles.filterToggleText, showFreeParking && styles.filterToggleTextActive]}>Free Parking</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterToggle, showPaidParking && styles.filterToggleActive]}
                onPress={() => setShowPaidParking(!showPaidParking)}
              >
                <Text style={[styles.filterToggleText, showPaidParking && styles.filterToggleTextActive]}>Paid Parking</Text>
              </TouchableOpacity>
            </View>

            <TextInput 
              style={[styles.filterInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} 
              placeholder="City (e.g. Helsinki)" 
              placeholderTextColor="#94a3b8"
              value={filterCity}
              onChangeText={setFilterCity}
            />
            <TextInput 
              style={[styles.filterInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} 
              placeholder="Street Name" 
              placeholderTextColor="#94a3b8"
              value={filterStreet}
              onChangeText={setFilterStreet}
            />
            <TextInput 
              style={[styles.filterInput, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} 
              placeholder="Zip Code" 
              placeholderTextColor="#94a3b8"
              value={filterZip}
              onChangeText={setFilterZip}
            />

            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* My Location Button */}
      <TouchableOpacity 
        style={[styles.locationButton, { top: Math.max(insets.top + 80, 90) }]} 
        onPress={handleUserLocation}
      >
        <Ionicons name="navigate" size={24} color="#0f172a" />
      </TouchableOpacity>

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
  filterDropdown: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterToggle: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  filterToggleActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterToggleText: {
    color: '#64748b',
    fontWeight: '600',
  },
  filterToggleTextActive: {
    color: '#fff',
  },
  filterInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    color: '#0f172a',
  },
  applyButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  locationButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
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
