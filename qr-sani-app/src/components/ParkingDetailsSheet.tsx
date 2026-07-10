import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

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

interface Props {
  space: ParkingSpace | null;
  onClose: () => void;
}

export default function ParkingDetailsSheet({ space, onClose }: Props) {
  if (!space) return null;

  const handleNavigate = () => {
    const lat = space.latitude;
    const lng = space.longitude;
    const label = encodeURI(space.name);

    let url = '';

    if (Platform.OS === 'ios') {
      url = `maps://app?saddr=Current+Location&daddr=${lat},${lng}&q=${label}`;
    } else if (Platform.OS === 'android') {
      url = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to browser if native map app is missing
        Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
      }
    });
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <BlurView intensity={90} tint="light" style={styles.sheet}>
        <View style={styles.handleBar} />
        
        <View style={styles.header}>
          <Text style={styles.title}>{space.name}</Text>
          <View style={[styles.badge, space.is_free ? styles.badgeFree : styles.badgePaid]}>
            <Text style={styles.badgeText}>{space.is_free ? 'FREE' : 'PAID'}</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#64748b" />
            <Text style={styles.detailText}>
              {new Date().toLocaleDateString('en-FI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={20} color="#64748b" />
            <Text style={styles.detailText}>
              {space.live_occupancy !== undefined ? `${space.live_occupancy} / ${space.capacity} spots taken` : `${space.capacity} spots total capacity`}
            </Text>
            {space.live_occupancy !== undefined && (
              <View style={[styles.liveBadge, (space.live_occupancy / space.capacity) > 0.85 ? styles.liveBadgeFull : styles.liveBadgeAvailable]}>
                <Text style={styles.liveBadgeText}>Live</Text>
              </View>
            )}
          </View>

          {space.is_residential && (
            <View style={styles.detailRow}>
              <Ionicons name="home-outline" size={20} color="#d97706" />
              <Text style={[styles.detailText, { color: '#d97706', fontWeight: '500' }]}>Residential Parking Permit Required</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color="#64748b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.detailText}>
                {space.pricing_info === 'PARK_AND_RIDE_247_FREE' ? '24/7 Free Park & Ride' : 
                 space.pricing_info === 'FREE_12H' ? 'Free for 12 hours' : 
                 space.pricing_info}
              </Text>
              {!space.is_free && space.hourly_rate !== undefined && (
                <Text style={styles.subDetailText}>
                  {space.hourly_rate}€ / hour • {space.weekend_rate === 0 ? 'Free on weekends' : `${space.weekend_rate}€ / hr weekends`}
                </Text>
              )}
            </View>
          </View>
          
          {space.source === 'p2p' && (
            <TouchableOpacity style={styles.reportButton} onPress={() => alert("Spot reported to admin for manual review.")}>
              <Ionicons name="warning-outline" size={16} color="#ef4444" />
              <Text style={styles.reportButtonText}>Report Fake/Invalid Spot</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate}>
          <Ionicons name="navigate" size={20} color="#fff" style={styles.navigateIcon} />
          <Text style={styles.navigateButtonText}>Navigate Here</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    padding: 24,
    paddingTop: 12,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeFree: {
    backgroundColor: '#dcfce7',
  },
  badgePaid: {
    backgroundColor: '#dbeafe',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  detailsContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 15,
    color: '#334155',
    marginLeft: 12,
    flex: 1,
  },
  subDetailText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  liveBadgeFull: {
    backgroundColor: '#fee2e2',
  },
  liveBadgeAvailable: {
    backgroundColor: '#dcfce7',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#000',
  },
  navigateButton: {
    backgroundColor: '#0EA5E9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  navigateIcon: {
    marginRight: 8,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  reportButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  }
});
