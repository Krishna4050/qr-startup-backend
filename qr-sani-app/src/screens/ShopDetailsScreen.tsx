import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Platform, Linking, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { ArrowLeft, Star, MapPin, Phone, MessageSquare, ShieldCheck, Heart, CheckCircle2, Share, Calendar, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { supabase_lucifer_core } from '../utils/supabase';
import { useResponsive } from '../hooks/useResponsive';

export default function ShopDetailsScreen({ route, navigation }: any) {
  const { shopData: initialShopData, id } = route?.params || {};
  const isValidShopData = initialShopData && initialShopData.shop_name;
  const [shopData, setShopData] = useState<any>(isValidShopData ? initialShopData : null);
  const [isLoading, setIsLoading] = useState(!isValidShopData);
  
  const [isFavorite, setIsFavorite] = useState(false);
  const { user } = useAuth();
  const { width, isMobile } = useResponsive();
  
  // Breakpoint for Desktop vs Mobile
  const isDesktop = !isMobile; 
  
  useEffect(() => {
    if (!isValidShopData && id) {
      const fetchShop = async () => {
        try {
          const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
          if (!backendUrl) throw new Error("Backend URL not configured");

          const response = await fetch(`${backendUrl}/api/public/shops`);
          const shopsData = await response.json();
          const data = shopsData.find((s: any) => s.id === id);

          if (data) {
            const processedPhotos = (data.photos || []).map((pUrl: string) => {
              if (pUrl.startsWith('http')) return pUrl;
              return supabase_lucifer_core.storage.from('shop_assets').getPublicUrl(pUrl).data.publicUrl;
            });

            data.photos = processedPhotos;
            setShopData(data);
          }
        } catch (e) {
          console.error("Error fetching shop data:", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchShop();
    } else if (!isValidShopData && !id) {
      setIsLoading(false);
    }
  }, [id, isValidShopData]);

  // Reservation State
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationDate, setReservationDate] = useState('');
  const [reservationMessage, setReservationMessage] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const safeAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const ensureProfileComplete = async (onSuccess: () => void) => {
    if (!user) {
      safeAlert("Sign In Required", "Please sign in to proceed.");
      return;
    }
    
    try {
      setIsLoading(true);
      const { data: profile } = await supabase_lucifer_core.from('profiles').select('first_name, last_name, phone_number').eq('id', user.id).single();
      
      const hasBasicInfo = !!(profile?.first_name && profile?.last_name);
      const hasPhone = !!profile?.phone_number;

      if (!hasBasicInfo && !hasPhone) {
        safeAlert("Profile Required", "You must complete your profile and verify your phone number before proceeding.");
        navigation.navigate("EditProfile", { requirePhoneVerification: true });
        setIsLoading(false);
        return;
      }
      
      if (!hasBasicInfo) {
        safeAlert("Profile Required", "You must provide your first and last name before proceeding.");
        navigation.navigate("EditProfile");
        setIsLoading(false);
        return;
      }

      if (!hasPhone) {
        safeAlert("Verification Required", "You must verify your phone number before proceeding.");
        navigation.navigate("ContactManager");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onSuccess();
    } catch (e) {
      setIsLoading(false);
      safeAlert("Error", "Could not verify profile status.");
    }
  };

  const handleDirections = () => {
    if (!user) {
      safeAlert("Sign In Required", "Please sign in to get directions.");
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
    ensureProfileComplete(() => {
      if (isDesktop) {
        navigation.navigate("UserMessages", {
          shopId: shopData.id,
          shopName: shopData.shop_name,
          hostId: shopData.owner_id
        });
      } else {
        navigation.navigate("ChatScreen", {
          shopId: shopData.id,
          shopName: shopData.shop_name,
          otherUserId: shopData.owner_id
        });
      }
    });
  };

  const handleCall = async () => {
    ensureProfileComplete(async () => {
      try {
        const { data: tags, error } = await supabase_lucifer_core.from('qr_tags').select('id').eq('owner_id', user.id).limit(1);
        if (error) throw error;

        if (!tags || tags.length === 0) {
          safeAlert("Premium Feature", "You must be an active member of our QR System to use the proxy calling service.");
          return;
        }

        const { data: profile } = await supabase_lucifer_core.from('profiles').select('phone_number').eq('id', user.id).single();
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
        if (!backendUrl) throw new Error("Backend URL missing");

        safeAlert("Connecting...", "You will receive a call from our system shortly connecting you to the shop.");
        
        await fetch(`${backendUrl}/api/call-shop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shop_id: shopData.id, phone_number: profile.phone_number })
        });

      } catch (err) {
        console.error(err);
        safeAlert("Error", "Something went wrong while initiating the call.");
      }
    });
  };

  const handleBookReservation = async () => {
    if (!reservationDate) {
      safeAlert("Missing Info", "Please provide a valid date.");
      return;
    }

    ensureProfileComplete(async () => {
      setIsBooking(true);
      try {
        // 1. Create Reservation
        const { error } = await supabase_lucifer_core.from('shop_reservations').insert({
          shop_id: shopData.id,
          user_id: user!.id,
          reservation_date: reservationDate,
          message: reservationMessage,
          status: 'pending'
        });

        if (error) throw error;

        // 2. Trigger Notification Email via Go Backend
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
        if (backendUrl) {
          // Fetch host email to notify them
          const { data: hostProfile } = await supabase_lucifer_core.from('profiles').select('email').eq('id', shopData.owner_id).single();
          if (hostProfile?.email) {
            await fetch(`${backendUrl}/api/host/message-notification-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shop_name: shopData.shop_name, email: hostProfile.email })
            }).catch(console.error); // Ignore failures, it's just an email
          }
        }

        safeAlert("Success", "Reservation requested! The host will review it soon.");
        setShowReservationModal(false);
        setReservationDate('');
        setReservationMessage('');
      } catch (e: any) {
        safeAlert("Error", e.message);
      } finally {
        setIsBooking(false);
      }
    });
  };

  const renderDesktopPhotos = () => {
    if (photos.length === 0) return <View style={styles.noPhoto}><Text>No Photos Available</Text></View>;
    if (photos.length === 1) return <Image source={{ uri: photos[0] }} style={[styles.heroImage, { borderRadius: 16 }] as any} />;

    return (
      <View style={styles.desktopGrid}>
        {/* Large Left Image */}
        <View style={styles.gridLeft}>
          <Image source={{ uri: photos[0] }} style={[styles.gridImage, styles.roundedLeft] as any} />
        </View>
        
        {/* Smaller Right Images */}
        <View style={styles.gridRight}>
          <View style={styles.gridRightCol}>
            <Image source={{ uri: photos[1] }} style={[styles.gridImage, styles.marginBottom] as any} />
            <Image source={{ uri: photos[2] || photos[0] }} style={styles.gridImage as any} />
          </View>
          <View style={styles.gridRightCol}>
            <Image source={{ uri: photos[3] || photos[0] }} style={[styles.gridImage, styles.marginBottom, styles.roundedTopRight] as any} />
            <Image source={{ uri: photos[4] || photos[1] }} style={[styles.gridImage, styles.roundedBottomRight] as any} />
          </View>
        </View>
      </View>
    );
  };

  const renderMobilePhotos = () => (
    <View style={styles.mobilePhotoContainer}>
      {photos.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {photos.map((url: string, index: number) => (
            <Image key={index} source={{ uri: url }} style={{ width, height: width * 0.8, resizeMode: 'cover' }} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.noPhoto}><Text>No Photos Available</Text></View>
      )}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#0A192F" size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconCircle} onPress={() => setIsFavorite(!isFavorite)}>
          <Heart color={isFavorite ? "#EF4444" : "#0A192F"} fill={isFavorite ? "#EF4444" : "transparent"} size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ContactCard = () => (
    <View style={styles.contactCard}>
      <Text style={styles.cardPriceTitle}>Reach Out</Text>
      <Text style={styles.cardSubText}>Connect instantly via secure systems.</Text>
      
      <View style={styles.divider} />
      
      {/* @ts-ignore */}
      <TouchableOpacity style={[styles.btnPrimary, { cursor: Platform.OS === 'web' ? 'pointer' : 'auto' }]} onPress={() => {
        ensureProfileComplete(() => {
          setShowReservationModal(true);
        });
      }}>
        <Calendar color="#FFFFFF" size={20} style={styles.btnIcon} />
        <Text style={styles.btnPrimaryText}>Book a Reservation</Text>
      </TouchableOpacity>
      
      {/* @ts-ignore */}
      <TouchableOpacity style={[styles.btnOutline, { cursor: Platform.OS === 'web' ? 'pointer' : 'auto', marginBottom: 12 }]} onPress={handleCall}>
        <Phone color="#FFFFFF" size={20} style={styles.btnIcon} />
        <Text style={styles.btnOutlineText}>Secure Proxy Call</Text>
      </TouchableOpacity>
      
      {/* @ts-ignore */}
      <TouchableOpacity style={[styles.btnSecondary, { cursor: Platform.OS === 'web' ? 'pointer' : 'auto' }]} onPress={handleMessage}>
        <MessageSquare color="#0A192F" size={20} style={styles.btnIcon} />
        <Text style={styles.btnSecondaryText}>E2E Encrypted Chat</Text>
      </TouchableOpacity>
      
      {/* @ts-ignore */}
      <TouchableOpacity style={[styles.btnOutline, { cursor: Platform.OS === 'web' ? 'pointer' : 'auto' }]} onPress={handleDirections}>
        <MapPin color="#0A192F" size={20} style={styles.btnIcon} />
        <Text style={styles.btnOutlineText}>Get Directions</Text>
      </TouchableOpacity>

      <Text style={styles.cardFooterText}>You won't be charged for chatting.</Text>
    </View>
  );

  if (isLoading) {
    return <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><ActivityIndicator size="large" color="#4A00E0" /></View>;
  }

  if (!shopData) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF'}}>
         <Text>Shop not found.</Text>
         <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.btnPrimary, { marginTop: 16 }]}><Text style={styles.btnPrimaryText}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const photos = shopData.photos || [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={isDesktop ? styles.scrollContentDesktop : styles.scrollContentMobile}>
      
      {isDesktop && (
        <View style={styles.desktopNav}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#0A192F" size={24} />
          </TouchableOpacity>
          <View style={styles.navActions}>
            <TouchableOpacity style={styles.navActionBtn}>
              <Share size={18} color="#0A192F" /><Text style={styles.navActionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navActionBtn} onPress={() => setIsFavorite(!isFavorite)}>
              <Heart size={18} color={isFavorite ? "#EF4444" : "#0A192F"} fill={isFavorite ? "#EF4444" : "transparent"} /><Text style={styles.navActionText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Title block (Desktop shows it above photos, Mobile shows it below photos) */}
      {isDesktop && (
        <View style={styles.desktopTitleBlock}>
          <Text style={styles.shopName}>{shopData.shop_name}</Text>
          <View style={styles.titleSubRow}>
            <Star color="#111827" fill="#111827" size={16} />
            <Text style={styles.ratingText}>{shopData.average_rating}</Text>
            <Text style={styles.dotSeparator}>·</Text>
            <Text style={styles.locationLinkText} onPress={handleDirections}>{shopData.city}</Text>
          </View>
        </View>
      )}

      {isDesktop ? renderDesktopPhotos() : renderMobilePhotos()}

      <View style={[styles.bodyLayout, isDesktop ? styles.bodyLayoutDesktop : styles.bodyLayoutMobile]}>
        
        {/* Left Column (Main Content) */}
        <View style={isDesktop ? styles.leftColumn : styles.fullWidth}>
          {!isDesktop && (
            <View style={styles.mobileTitleBlock}>
              <Text style={styles.shopName}>{shopData.shop_name}</Text>
              <View style={styles.titleSubRow}>
                <Star color="#111827" fill="#111827" size={16} />
                <Text style={styles.ratingText}>{shopData.average_rating}</Text>
                <Text style={styles.dotSeparator}>·</Text>
                <Text style={styles.locationLinkText}>{shopData.city}</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.hostRow}>
            <View style={styles.hostInfo}>
              <Text style={styles.hostedByTitle}>Hosted by QR-Startup Partner</Text>
              <View style={styles.verifyRow}>
                <ShieldCheck color="#10B981" size={16} />
                <Text style={styles.verifyText}>Identity verified</Text>
              </View>
            </View>
            <View style={styles.hostAvatar}>
              <Text style={styles.avatarText}>{shopData.shop_name?.charAt(0) || 'S'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>What this shop offers</Text>
          <View style={styles.amenitiesGrid}>
            {(shopData.shop_types || []).map((type: string, idx: number) => (
              <View key={`type-${idx}`} style={styles.amenityItem}>
                <CheckCircle2 color="#0A192F" size={24} />
                <Text style={styles.amenityLabel}>{type}</Text>
              </View>
            ))}
            {(shopData.amenities || []).map((amenity: string, idx: number) => (
              <View key={`amenity-${idx}`} style={styles.amenityItem}>
                <CheckCircle2 color="#0A192F" size={24} />
                <Text style={styles.amenityLabel}>{amenity}</Text>
              </View>
            ))}
          </View>

          {/* Map/Location Section */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Where you'll be</Text>
          <Text style={styles.locationTextMap}>{shopData.street}, {shopData.city}</Text>
          <View style={styles.mapPlaceholder}>
            <MapPin color="#0A192F" size={32} />
            <Text style={styles.mapText}>Map Area</Text>
            <Text style={styles.mapSubtext}>Coordinates mapping integration coming soon.</Text>
          </View>

        </View>

        {/* Right Column (Sticky Card) OR Mobile Footer */}
        {isDesktop ? (
          <View style={styles.rightColumn}>
            <View style={styles.stickyWrapper}>
              <ContactCard />
            </View>
          </View>
        ) : (
          <View style={styles.mobileContactSection}>
            <View style={styles.divider} />
            <ContactCard />
          </View>
        )}

      </View>

      {/* Reservation Modal */}
      <Modal visible={showReservationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#0A192F' }}>Request Booking</Text>
              <TouchableOpacity onPress={() => setShowReservationModal(false)}>
                <X color="#0A192F" size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Date (YYYY-MM-DD) *</Text>
              <TextInput 
                style={styles.modalInput} 
                placeholder="e.g. 2026-05-26" 
                value={reservationDate} 
                onChangeText={setReservationDate} 
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Message to Host (Optional)</Text>
              <TextInput 
                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]} 
                placeholder="Describe the issue with your vehicle..." 
                multiline 
                value={reservationMessage} 
                onChangeText={setReservationMessage} 
              />
            </View>

            <TouchableOpacity 
              style={[styles.btnPrimary, { marginBottom: 0 }]} 
              onPress={handleBookReservation}
              disabled={isBooking}
            >
              {isBooking ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnPrimaryText}>Confirm Booking Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContentDesktop: { paddingHorizontal: '5%', maxWidth: 1200, alignSelf: 'center', width: '100%', paddingBottom: 100 },
  scrollContentMobile: { paddingBottom: 40 },
  
  // Desktop Nav & Title
  desktopNav: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 20 },
  backBtn: { padding: 8, marginLeft: -8 },
  navActions: { flexDirection: 'row', gap: 16 },
  // @ts-ignore
  navActionBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8, cursor: Platform.OS === 'web' ? 'pointer' : 'auto' },
  navActionText: { fontSize: 14, fontWeight: '600', textDecorationLine: 'underline', color: '#0A192F' },
  
  desktopTitleBlock: { marginBottom: 24 },
  mobileTitleBlock: { paddingHorizontal: 24, paddingTop: 24 },
  shopName: { fontSize: 32, fontWeight: '700', color: '#0A192F', marginBottom: 8, letterSpacing: -0.5 },
  titleSubRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 15, fontWeight: '600', marginLeft: 4, color: '#111827' },
  dotSeparator: { marginHorizontal: 8, fontSize: 15, color: '#4B5563' },
  // @ts-ignore
  locationLinkText: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline', color: '#0A192F', cursor: Platform.OS === 'web' ? 'pointer' : 'auto' },

  // Photo Grids
  noPhoto: { height: 300, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  heroImage: { width: '100%', height: 400, resizeMode: 'cover' },
  
  desktopGrid: { flexDirection: 'row', height: 400, borderRadius: 16, overflow: 'hidden', gap: 8 },
  gridLeft: { flex: 1 },
  gridRight: { flex: 1, flexDirection: 'row', gap: 8 },
  gridRightCol: { flex: 1, gap: 8 },
  gridImage: { flex: 1, width: '100%', resizeMode: 'cover' },
  roundedLeft: { borderTopLeftRadius: 16, borderBottomLeftRadius: 16, overflow: 'hidden' },
  roundedTopRight: { borderTopRightRadius: 16, overflow: 'hidden' },
  roundedBottomRight: { borderBottomRightRadius: 16, overflow: 'hidden' },
  marginBottom: { marginBottom: 0 },

  mobilePhotoContainer: { position: 'relative' },
  floatingHeader: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },

  // Body Layouts
  bodyLayout: { flexDirection: 'row', paddingTop: 32 },
  bodyLayoutDesktop: { justifyContent: 'space-between' },
  bodyLayoutMobile: { flexDirection: 'column' },
  leftColumn: { flex: 0.58 },
  rightColumn: { flex: 0.35, position: 'relative' },
  fullWidth: { width: '100%' },

  // Host Details
  hostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: Platform.OS === 'web' ? 0 : 24 },
  hostInfo: { flex: 1 },
  hostedByTitle: { fontSize: 22, fontWeight: '600', color: '#0A192F', marginBottom: 4 },
  verifyRow: { flexDirection: 'row', alignItems: 'center' },
  verifyText: { color: '#717171', fontSize: 14, marginLeft: 6 },
  hostAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#4A00E0', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 32, marginHorizontal: Platform.OS === 'web' ? 0 : 24 },
  
  sectionTitle: { fontSize: 22, fontWeight: '600', color: '#0A192F', marginBottom: 24, paddingHorizontal: Platform.OS === 'web' ? 0 : 24 },
  
  // Amenities
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Platform.OS === 'web' ? 0 : 24 },
  amenityItem: { width: '50%', flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingRight: 16 },
  amenityLabel: { fontSize: 16, color: '#222222', marginLeft: 16 },

  // Map
  locationTextMap: { fontSize: 16, color: '#222222', marginBottom: 24, paddingHorizontal: Platform.OS === 'web' ? 0 : 24 },
  mapPlaceholder: { height: 300, backgroundColor: '#F3F4F6', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginHorizontal: Platform.OS === 'web' ? 0 : 24 },
  mapText: { fontSize: 18, fontWeight: 'bold', color: '#0A192F', marginTop: 12 },
  mapSubtext: { fontSize: 14, color: '#717171', marginTop: 4 },

  // Sticky Contact Card
  // @ts-ignore
  stickyWrapper: { position: Platform.OS === 'web' ? 'sticky' : 'relative', top: 32 },
  contactCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  mobileContactSection: { padding: 24 },
  
  cardPriceTitle: { fontSize: 22, fontWeight: '700', color: '#0A192F' },
  cardSubText: { fontSize: 15, color: '#717171', marginTop: 4 },
  
  btnPrimary: { backgroundColor: '#4A00E0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  
  btnSecondary: { backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
  btnSecondaryText: { color: '#0A192F', fontSize: 16, fontWeight: 'bold' },
  
  btnOutline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0A192F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  btnOutlineText: { color: '#0A192F', fontSize: 16, fontWeight: 'bold' },
  
  btnIcon: { marginRight: 10 },
  cardFooterText: { textAlign: 'center', color: '#717171', fontSize: 13, marginTop: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 500, backgroundColor: '#FFF', borderRadius: 16, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16 }
});