import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Star, MapPin, Phone, MessageSquare, ShieldCheck, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RefreshableScroll from '../components/RefreshableScroll';

const { width } = Dimensions.get('window');

export default function ShopDetailsScreen({ route, navigation }: any) {
  const { shopData } = route.params;
  const [isFavorite, setIsFavorite] = useState(false);

  // We add RefreshableScroll here as well so users can pull down for fresh review stats!
  const handleRefresh = async () => {
    console.log("Fetching latest shop data...");
    // Future: Re-fetch shop details from Supabase here
  };

  return (
    <View style={styles.container}>
      <RefreshableScroll onRefreshAction={handleRefresh} showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* TOP IMAGE HEADER */}
        <View style={styles.imageHeaderContainer}>
          {shopData.photos && shopData.photos.length > 0 ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {shopData.photos.map((url: string, index: number) => (
                <Image key={index} source={{ uri: url }} style={styles.headerImage} />
              ))}
            </ScrollView>
          ) : (
             <View style={[styles.headerImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
               <Text style={{ color: '#9CA3AF' }}>No Photos</Text>
             </View>
          )}

          {/* FLOATING HEADER BUTTONS */}
          <View style={styles.floatingHeader}>
            <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
              <ArrowLeft color="#111827" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => setIsFavorite(!isFavorite)}>
              <Heart color={isFavorite ? "#EF4444" : "#111827"} fill={isFavorite ? "#EF4444" : "transparent"} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SHOP INFO CONTENT */}
        <View style={styles.contentContainer}>
          
          <View style={styles.titleRow}>
            <Text style={styles.shopName}>{shopData.shop_name}</Text>
            <View style={styles.ratingBadge}>
              <Star color="#FFFFFF" fill="#FFFFFF" size={14} />
              <Text style={styles.ratingBadgeText}>{shopData.average_rating}</Text>
            </View>
          </View>

          <View style={styles.verifyRow}>
            <ShieldCheck color="#10B981" size={18} />
            <Text style={styles.verifyText}>Official QR-Startup Partner</Text>
          </View>

          <View style={styles.locationRow}>
            <MapPin color="#6B7280" size={18} />
            <Text style={styles.locationText}>{shopData.street}, {shopData.city}</Text>
          </View>

          <View style={styles.divider} />

          {/* ACTION BUTTONS */}
          <Text style={styles.sectionTitle}>Contact Shop</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Phone color="#0F2D4D" size={24} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MessageSquare color="#0F2D4D" size={24} />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MapPin color="#0F2D4D" size={24} />
              <Text style={styles.actionText}>Directions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* SUBSCRIPTION / BOOKING */}
          <Text style={styles.sectionTitle}>Available Services</Text>
          
          <LinearGradient colors={['#0F2D4D', '#174871']} style={styles.subscriptionCard}>
            <Text style={styles.subTitle}>Car Wash Subscription</Text>
            <Text style={styles.subDesc}>Unlimited exterior washes for 1 month at this location.</Text>
            <View style={styles.subPriceRow}>
              <Text style={styles.subPrice}>€29.99<Text style={{ fontSize: 14 }}>/mo</Text></Text>
              <TouchableOpacity style={styles.subscribeBtn}>
                <Text style={styles.subscribeBtnText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <TouchableOpacity style={styles.serviceItem}>
             <Text style={styles.serviceName}>Standard Towing Service</Text>
             <Text style={styles.servicePrice}>From €80</Text>
          </TouchableOpacity>

        </View>
      </RefreshableScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  imageHeaderContainer: { width: '100%', height: width * 0.8, position: 'relative' },
  headerImage: { width: width, height: '100%', resizeMode: 'cover' },
  floatingHeader: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  
  contentContainer: { padding: 24, paddingBottom: 60, marginTop: -20, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  shopName: { fontSize: 26, fontWeight: 'bold', color: '#111827', flex: 1, marginRight: 16 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  ratingBadgeText: { color: '#FFFFFF', fontWeight: 'bold', marginLeft: 4, fontSize: 14 },
  
  verifyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  verifyText: { color: '#10B981', fontWeight: 'bold', marginLeft: 6 },
  
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  locationText: { marginLeft: 8, fontSize: 15, color: '#4B5563', flex: 1 },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 24 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionButton: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginHorizontal: 6 },
  actionText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#0F2D4D' },
  
  subscriptionCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  subTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subDesc: { fontSize: 14, color: '#D1D5DB', marginBottom: 16, lineHeight: 20 },
  subPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  subPrice: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subscribeBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  subscribeBtnText: { color: '#0F2D4D', fontWeight: 'bold' },

  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  serviceName: { fontSize: 16, color: '#374151', fontWeight: '500' },
  servicePrice: { fontSize: 16, color: '#111827', fontWeight: 'bold' }
});