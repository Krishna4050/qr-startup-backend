import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

// Reusable List Row Component (To match the Airbnb screenshot style)
const EditRow = ({ title, value, hasImage, imageUrl, onPress }: any) => (
  <TouchableOpacity style={styles.editRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.editRowLeft}>
      <Text style={styles.editRowTitle}>{title}</Text>
      {value && <Text style={styles.editRowValue} numberOfLines={2}>{value}</Text>}
    </View>
    <View style={styles.editRowRight}>
      {hasImage && imageUrl && <Image source={{ uri: imageUrl }} style={styles.rowThumbnail} />}
      <ChevronRight color="#A1A1AA" size={20} />
    </View>
  </TouchableOpacity>
);

export default function HostShopDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { shopData: initialShopData, id } = route.params || {};
  const [shopData, setShopData] = useState<any>(initialShopData);
  const [loading, setLoading] = useState(!initialShopData);

  useEffect(() => {
    if (!initialShopData && id) {
      const fetchShop = async () => {
        try {
          const { data, error } = await supabase_lucifer_core
            .from('shop_locations')
            .select('*, shop_photos(photo_url)')
            .eq('id', id)
            .single();
          if (error) throw error;
          if (data) setShopData(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchShop();
    } else if (!initialShopData && !id) {
      setLoading(false);
    }
  }, [id, initialShopData]);

  const handlePreview = () => {
    // This will open the shop in the exact same view that normal users see it!
    navigation.navigate('ShopDetails', { id: shopData.id });
  };

  const showUnderConstruction = () => {
    Alert.alert("Coming Soon", "The edit form for this section will be built next!");
  };

  const coverPhoto = shopData?.shop_photos?.[0]?.photo_url || 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?auto=format&fit=crop&q=80&w=150&h=150';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color="#0A192F" /></View>
      </SafeAreaView>
    );
  }

  if (!shopData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft color="#0A192F" size={24} />
          </TouchableOpacity>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text>Listing not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#0A192F" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listing details</Text>
        <TouchableOpacity onPress={handlePreview}>
          <Text style={styles.previewText}>Preview</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <Image source={{ uri: coverPhoto }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <View style={[styles.statusBadge, shopData.verification_status === 'pending' ? styles.statusPending : styles.statusActive]}>
              {shopData.verification_status === 'pending' ? (
                <Clock color="#B45309" size={14} style={{ marginRight: 6 }} />
              ) : (
                <CheckCircle color="#15803D" size={14} style={{ marginRight: 6 }} />
              )}
              <Text style={[styles.statusText, shopData.verification_status === 'active' && { color: '#15803D' }]}>
                {shopData.verification_status === 'pending' ? 'Review Pending' : 'Listed & Active'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.mainShopTitle}>{shopData.shop_name}</Text>

        {/* DETAILS LIST */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <EditRow 
            title="Messages" 
            value="View customer inquiries" 
            onPress={() => navigation.navigate('HostMessages', { shopId: shopData.id })} 
          />
          <EditRow 
            title="Photos" 
            hasImage={true} 
            imageUrl={coverPhoto} 
            onPress={showUnderConstruction} 
          />
          <EditRow 
            title="Shop title" 
            value={shopData.shop_name} 
            onPress={showUnderConstruction} 
          />
          <EditRow 
            title="Services offered" 
            value={shopData.shop_types?.join(', ') || 'No services selected'} 
            onPress={showUnderConstruction} 
          />
          <EditRow 
            title="Amenities" 
            value={shopData.amenities?.join(', ') || 'No amenities selected'} 
            onPress={showUnderConstruction} 
          />
          <EditRow 
            title="Location" 
            value={`${shopData.street}, ${shopData.city}`} 
            onPress={showUnderConstruction} 
          />
          <EditRow 
            title="Contact Info" 
            value={`${shopData.contact_phone}\n${shopData.contact_email}`} 
            onPress={showUnderConstruction} 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 24 : 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconBtn: { padding: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0A192F' },
  previewText: { fontSize: 16, fontWeight: '600', color: '#0A192F', textDecorationLine: 'underline', paddingRight: 8 },
  
  scrollContent: { paddingBottom: 60 },
  
  heroSection: { width: '100%', height: 220, position: 'relative' },
  heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', top: 16, left: 16 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusText: { color: '#B45309', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  mainShopTitle: { fontSize: 26, fontWeight: '800', color: '#0A192F', padding: 24, paddingBottom: 16, letterSpacing: -0.5 },

  section: { paddingHorizontal: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0A192F', marginBottom: 16, marginTop: 8 },

  editRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  editRowLeft: { flex: 1, paddingRight: 16 },
  editRowTitle: { fontSize: 16, color: '#0A192F', marginBottom: 4 },
  editRowValue: { fontSize: 15, color: '#717171', lineHeight: 22 },
  editRowRight: { flexDirection: 'row', alignItems: 'center' },
  rowThumbnail: { width: 48, height: 48, borderRadius: 8, marginRight: 12, backgroundColor: '#F3F4F6' },
});