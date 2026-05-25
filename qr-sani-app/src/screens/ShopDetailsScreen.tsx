import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, ScrollView, Platform, Linking, Alert } from 'react-native';
import { ArrowLeft, Star, MapPin, Phone, MessageSquare, ShieldCheck, Heart, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RefreshableScroll from '../components/RefreshableScroll';
import { useAuth } from '../context/AuthContext';
import { supabase_lucifer_core } from '../utils/supabase';

const { width } = Dimensions.get('window');

export default function ShopDetailsScreen({ route, navigation }: any) {
  const { shopData } = route.params;
  const [isFavorite, setIsFavorite] = useState(false);
  const { user } = useAuth();

  // We add RefreshableScroll here as well so users can pull down for fresh review stats!
  const handleRefresh = async () => {
    console.log("Fetching latest shop data...");
    // Future: Re-fetch shop details from Supabase here
  };

  const handleDirections = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to get directions.");
      return;
    }
    const fullAddress = `${shopData.street}, ${shopData.city}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(fullAddress)}`,
      android: `geo:0,0?q=${encodeURIComponent(fullAddress)}`,
      web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    });
    if (url) Linking.openURL(url);
  };

  const handleMessage = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to message this shop.");
      return;
    }
    navigation.navigate("ChatScreen", {
      shopId: shopData.id,
      shopName: shopData.shop_name,
      hostId: shopData.owner_id
    });
  };

  const handleCall = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to call this shop.");
      return;
    }

    try {
      // 1. Check Membership (Must have at least one registered QR Tag)
      const { data: tags, error } = await supabase_lucifer_core
        .from('qr_tags')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      if (error) throw error;

      if (!tags || tags.length === 0) {
        Alert.alert(
          "Premium Feature", 
          "You must be an active member of our QR System to use the proxy calling service. Please message the shop owner instead, or register a QR tag to unlock calling."
        );
        return;
      }

      // 2. Check if user profile has a phone number
      const { data: profile } = await supabase_lucifer_core
        .from('profiles')
        .select('phone_number')
        .eq('id', user.id)
        .single();

      if (!profile?.phone_number) {
        Alert.alert("Profile Incomplete", "Please add a verified phone number to your profile to make calls.");
        return;
      }

      // 3. Trigger Backend Call Shop Endpoint
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (!backendUrl) throw new Error("Backend URL missing");

      Alert.alert("Connecting...", "You will receive a call from our system shortly connecting you to the shop.");
      
      await fetch(`${backendUrl}/api/call-shop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shop_id: shopData.id, 
          phone_number: profile.phone_number 
        })
      });

    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong while initiating the call.");
    }
  };

  return (
    <View style={styles.container}>
      <RefreshableScroll onRefreshAction={handleRefresh} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.webWrapper}>
        
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
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Phone color="#0F2D4D" size={24} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
              <MessageSquare color="#0F2D4D" size={24} />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
              <MapPin color="#0F2D4D" size={24} />
              <Text style={styles.actionText}>Directions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* DYNAMIC SHOP TAGS */}
          <Text style={styles.sectionTitle}>Services & Amenities</Text>
          
          <View style={styles.tagsContainer}>
            {shopData.shop_types && shopData.shop_types.length > 0 ? (
              shopData.shop_types.map((type: string, idx: number) => (
                <View key={`type-${idx}`} style={styles.tagPill}>
                  <Text style={styles.tagText}>{type}</Text>
                </View>
              ))
            ) : null}

            {shopData.amenities && shopData.amenities.length > 0 ? (
              shopData.amenities.map((amenity: string, idx: number) => (
                <View key={`amenity-${idx}`} style={styles.amenityRow}>
                  <CheckCircle2 color="#10B981" size={16} style={{ marginRight: 6 }} />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))
            ) : null}
          </View>

        </View>
        </View>
      </RefreshableScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#F3F4F6' : '#FFFFFF' },
  webWrapper: { 
    width: '100%', 
    maxWidth: Platform.OS === 'web' ? 800 : '100%', 
    alignSelf: 'center', 
    backgroundColor: '#FFFFFF',
    minHeight: '100%',
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'web' ? 0.05 : 0,
    shadowRadius: 20,
  },
  imageHeaderContainer: { width: '100%', height: Platform.OS === 'web' ? 400 : width * 0.8, position: 'relative' },
  headerImage: { width: Platform.OS === 'web' ? 800 : width, height: '100%', resizeMode: 'cover' },
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
  
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill: { backgroundColor: '#F5F3FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE' },
  tagText: { color: '#4A00E0', fontWeight: '600', fontSize: 14 },
  
  amenityRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 8 },
  amenityText: { color: '#4B5563', fontSize: 15 },
});