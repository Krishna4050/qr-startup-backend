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
  live_occupancy?: number;
  pricing_zone?: string;
  hourly_rate?: number;
  weekend_rate?: number;
  is_residential?: boolean;
}

export default function ParkingMap() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<ParkingSpace | null>(null);
  
  // Advanced Filter State
  const [showFilters, setShowFilters] = useState(false);
  const [showFreeParking, setShowFreeParking] = useState(true);
  const [showPaidParking, setShowPaidParking] = useState(true);
  const [showResidentialParking, setShowResidentialParking] = useState(true);
  const [showP2PParking, setShowP2PParking] = useState(true);
  const [showP2PModal, setShowP2PModal] = useState(false);
  const [p2pForm, setP2PForm] = useState({ name: '', capacity: '1', hourlyRate: '2', weekendRate: '2' });
  const [p2pSubmitting, setP2PSubmitting] = useState(false);
  const [p2pFeatureEnabled, setP2PFeatureEnabled] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [filterStreet, setFilterStreet] = useState('');
  const [filterZip, setFilterZip] = useState('');

  // Supercluster State
  const [zoom, setZoom] = useState(13);
  const [bbox, setBBox] = useState<BBox>([24.7, 60.0, 25.1, 60.3]); // Default roughly Helsinki area
  const [clusters, setClusters] = useState<any[]>([]);

  const filteredSpaces = spaces.filter(space => {
    let matchesType = false;
    
    // Check specific categories first
    if (space.is_residential) {
      if (showResidentialParking) matchesType = true;
    } else if (space.source === 'p2p') {
      if (showP2PParking) matchesType = true;
    } else {
      // General free/paid for commercial and street parking
      if (space.is_free && showFreeParking) matchesType = true;
      if (!space.is_free && showPaidParking) matchesType = true;
    }

    if (!matchesType) return false;

    if (filterCity && !space.name.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (filterStreet && !space.name.toLowerCase().includes(filterStreet.toLowerCase())) return false;
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
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const resp = await apiClient.get('/api/admin/settings');
      if (resp.data) {
        setP2PFeatureEnabled(resp.data.p2p_parking_enabled === true);
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  };

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

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`);
        const data = await response.json();
        if (data && data.features) {
          setSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Photon API error:", error);
      }
    }, 500); // 500ms debounce
  };

  const handleSelectSuggestion = (feature: any) => {
    const { coordinates } = feature.geometry;
    const { name, city, country } = feature.properties;
    
    setSearchQuery(`${name || ''} ${city || ''}`.trim());
    setShowSuggestions(false);
    
    if (coordinates && coordinates.length === 2) {
      mapRef.current?.animateToRegion({
        latitude: coordinates[1],
        longitude: coordinates[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 1000);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&lat=60.1699&lon=24.9384&limit=1`);
      const data = await resp.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lon, lat] = feature.geometry.coordinates;
        mapRef.current?.animateToRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setSearchQuery('');
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const submitP2PSpot = async () => {
    if (!p2pForm.name) {
      alert("Please enter an address or name for your spot");
      return;
    }
    
    // Default to map center if we don't have a way to pick on map yet for MVP
    const lat = bbox[1] + (bbox[3] - bbox[1]) / 2;
    const lon = bbox[0] + (bbox[2] - bbox[0]) / 2;

    setP2PSubmitting(true);
    try {
      // Find the auth token from cookies or local storage if needed.
      // We assume cookies are sent automatically for same-origin if running in browser
      const response = await fetch('/api/parking/p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: p2pForm.name,
          latitude: lat,
          longitude: lon,
          capacity: parseInt(p2pForm.capacity) || 1,
          hourly_rate: parseFloat(p2pForm.hourlyRate) || 2,
          weekend_rate: parseFloat(p2pForm.weekendRate) || 2,
        })
      });
      
      if (response.ok) {
        alert("Your spot has been listed successfully!");
        setShowP2PModal(false);
        fetchParkingSpaces(); // Refresh the map
      } else {
        alert("Failed to list spot. Please ensure you are logged in.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred.");
    } finally {
      setP2PSubmitting(false);
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
      handleSearch();
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
            if (region.zoom !== undefined) {
              setZoom(Math.round(region.zoom));
            } else if (lngDelta) {
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
            const isP2P = space.source === 'p2p';
            
            let markerStyle = space.is_free ? styles.markerFree : styles.markerPaid;
            let textStyle = space.is_free ? styles.markerTextFree : styles.markerTextPaid;
            let iconColor = space.is_free ? '#166534' : '#1e3a8a';
            let label = space.is_free ? 'Free' : 'Pay';
            
            const isResidential = space.is_residential;
            
            if (isP2P) {
              markerStyle = styles.markerP2P;
              textStyle = styles.markerTextP2P;
              iconColor = '#6b21a8'; // Purple
              label = 'Private';
            } else if (isResidential) {
              markerStyle = styles.markerResidential;
              textStyle = styles.markerTextResidential;
              iconColor = '#9a3412'; // Orange
              label = 'Resident';
            } else if (isStreet) {
              markerStyle = styles.markerStreet;
              textStyle = styles.markerTextStreet;
              iconColor = '#854d0e';
              label = 'Street';
            } else if (isHelsinki) {
              markerStyle = styles.markerHelsinki;
              textStyle = styles.markerTextHelsinki;
              iconColor = '#1e40af';
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

      <View style={[styles.searchContainerOuter, { top: Math.max(insets.top + 10, 20) }]} pointerEvents="box-none">
        <BlurView intensity={80} tint="light" style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput 
            style={[styles.searchText, Platform.OS === 'web' && { outlineStyle: 'none' } as any]} 
            placeholder="Find parking in Finland..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => handleSearch()}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={[styles.filterButton, showFilters && styles.filterButtonActive]} 
            onPress={() => { setShowFilters(!showFilters); setShowSuggestions(false); }}
          >
            <Ionicons name="options-outline" size={18} color={showFilters ? "#fff" : "#000"} />
          </TouchableOpacity>
        </BlurView>

        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map((s, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(s)}
              >
                <Text style={styles.suggestionName}>
                  {s.properties.name || s.properties.street || s.properties.city}
                </Text>
                <Text style={styles.suggestionAddress}>
                  {[s.properties.city, s.properties.state, s.properties.country].filter(Boolean).join(', ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showFilters && (
          <View style={styles.filterDropdown}>
            <Text style={styles.filterTitle}>Advanced Filters</Text>
            
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={[styles.filterToggle, showFreeParking && styles.filterToggleActive]}
                onPress={() => setShowFreeParking(!showFreeParking)}
              >
                <Text style={[styles.filterToggleText, showFreeParking && styles.filterToggleTextActive]}>Free</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.filterToggle, showPaidParking && styles.filterToggleActive]}
                onPress={() => setShowPaidParking(!showPaidParking)}
              >
                <Text style={[styles.filterToggleText, showPaidParking && styles.filterToggleTextActive]}>Commercial</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={[styles.filterToggle, showResidentialParking && styles.filterToggleActive]}
                onPress={() => setShowResidentialParking(!showResidentialParking)}
              >
                <Text style={[styles.filterToggleText, showResidentialParking && styles.filterToggleTextActive]}>Residential</Text>
              </TouchableOpacity>
              
              {p2pFeatureEnabled && (
                <TouchableOpacity 
                  style={[styles.filterToggle, showP2PParking && styles.filterToggleActive]}
                  onPress={() => setShowP2PParking(!showP2PParking)}
                >
                  <Text style={[styles.filterToggleText, showP2PParking && styles.filterToggleTextActive]}>Private (P2P)</Text>
                </TouchableOpacity>
              )}
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
      
      {p2pFeatureEnabled && (
        <TouchableOpacity 
          style={[styles.listSpotButton, { bottom: Math.max(insets.bottom + 20, 40) }]}
          onPress={() => setShowP2PModal(true)}
        >
          <Ionicons name="home" size={24} color="#fff" />
          <Text style={styles.listSpotText}>List My Spot</Text>
        </TouchableOpacity>
      )}

      {showP2PModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>List Private Parking</Text>
            <Text style={styles.modalDesc}>Earn money by renting out your driveway. To ensure security, all spots require verification.</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Spot Name or Address"
              value={p2pForm.name}
              onChangeText={v => setP2PForm({...p2pForm, name: v})}
            />
            <View style={{flexDirection: 'row', gap: 10}}>
              <TextInput
                style={[styles.modalInput, {flex: 1}]}
                placeholder="Hourly Rate (€)"
                keyboardType="numeric"
                value={p2pForm.hourlyRate}
                onChangeText={v => setP2PForm({...p2pForm, hourlyRate: v})}
              />
              <TextInput
                style={[styles.modalInput, {flex: 1}]}
                placeholder="Capacity (cars)"
                keyboardType="numeric"
                value={p2pForm.capacity}
                onChangeText={v => setP2PForm({...p2pForm, capacity: v})}
              />
            </View>

            <TouchableOpacity style={styles.uploadButton}>
              <Ionicons name="camera-outline" size={20} color="#6366f1" />
              <Text style={styles.uploadButtonText}>Upload Spot Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.uploadButton}>
              <Ionicons name="document-text-outline" size={20} color="#6366f1" />
              <Text style={styles.uploadButtonText}>Upload Proof of Ownership</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowP2PModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={submitP2PSpot} disabled={p2pSubmitting}>
                <Text style={styles.modalSubmitText}>{p2pSubmitting ? 'Submitting...' : 'Submit for Review'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  searchContainerOuter: {
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,1)',
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
    color: '#0f172a',
    fontWeight: '500',
  },
  searchButton: {
    backgroundColor: '#0EA5E9',
    padding: 8,
    borderRadius: 8,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxHeight: 250,
    overflow: 'hidden',
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  listSpotButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#9333ea',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 100,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 20,
  },
  listSpotText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderStyle: 'dashed',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  uploadButtonText: {
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  modalCancelText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmit: {
    backgroundColor: '#9333ea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  suggestionName: {
    fontWeight: '600',
    color: '#0A192F',
    fontSize: 15,
  },
  suggestionAddress: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
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
  markerP2P: {
    backgroundColor: '#f3e8ff',
    borderColor: '#d8b4fe',
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
  markerResidential: {
    backgroundColor: '#ffedd5',
    borderColor: '#fdba74',
  },
  markerTextResidential: {
    color: '#9a3412',
  },
  markerTextHelsinki: {
    color: '#1e40af',
  },
  markerTextP2P: {
    color: '#6b21a8',
  },
});
