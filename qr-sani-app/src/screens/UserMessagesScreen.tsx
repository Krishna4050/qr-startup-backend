import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, MessageSquare, ChevronRight, Info, MapPin } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import ChatScreen from './ChatScreen'; 
import apiClient from '../utils/apiClient';

export default function UserMessagesScreen({ route }: any) {
  const { shopId: defaultShopId, shopName: defaultShopName, hostId: defaultHostId } = route.params || {};
  const navigation = useNavigation<any>();
  const { user, session } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024; 
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // For Desktop Split View
  const [activeConversation, setActiveConversation] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user?.id, session?.access_token]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Find all messages involving this user to get unique shops
      const data = await apiClient.get('/api/messages');

      const uniqueShops = new Map();
      
      // If we came from a specific shop, ensure it's at the top of the list even if no messages exist yet
      if (defaultShopId) {
        uniqueShops.set(defaultShopId, {
          shop_id: defaultShopId,
          shop_locations: { id: defaultShopId, shop_name: defaultShopName, city: 'Unknown', owner_id: defaultHostId },
          is_new: true
        });
      }

      if (data) {
        data.forEach((msg: any) => {
          if (msg.shop_locations && !uniqueShops.has(msg.shop_id)) {
            uniqueShops.set(msg.shop_id, msg);
          }
        });
      }

      const convoList = Array.from(uniqueShops.values());
      setConversations(convoList);
      
      // Auto-select first conversation on desktop
      if (isDesktop && convoList.length > 0 && !activeConversation) {
        setActiveConversation(convoList[0]);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (item: any) => {
    if (isDesktop) {
      setActiveConversation(item);
    } else {
      navigation.navigate('ChatScreen', {
        shopId: item.shop_id,
        shopName: item.shop_locations?.shop_name,
        otherUserId: item.shop_locations?.owner_id
      });
    }
  };

  const renderConversation = ({ item }: { item: any }) => {
    const sName = item.shop_locations?.shop_name || "Shop";
    const isActive = activeConversation?.shop_id === item.shop_id;
    
    return (
      <TouchableOpacity 
        style={[styles.chatRow, isActive && isDesktop && styles.chatRowActive]} 
        onPress={() => handleSelectConversation(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{sName.charAt(0)}</Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{sName}</Text>
          <Text style={styles.chatPreview}>{item.is_new ? "Start a conversation..." : "Encrypted Message..."}</Text>
        </View>
        {!isDesktop && <ChevronRight color="#CBD5E1" size={24} />}
      </TouchableOpacity>
    );
  };

  const renderInboxList = () => (
    <View style={isDesktop ? styles.desktopSidebar : styles.fullWidth}>
      <View style={styles.header}>
        {!isDesktop && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft color="#0A192F" size={24} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Inbox</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0A192F" />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageSquare color="#CBD5E1" size={48} />
          <Text style={styles.emptyText}>No messages yet</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.shop_id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );

  const renderDesktopMiddleColumn = () => {
    if (!activeConversation) {
      return (
        <View style={styles.desktopMiddleEmpty}>
          <MessageSquare color="#E5E7EB" size={64} />
          <Text style={styles.desktopEmptyText}>Select a conversation</Text>
        </View>
      );
    }
    
    const sName = activeConversation.shop_locations?.shop_name || "Shop";
    const hostId = activeConversation.shop_locations?.owner_id;
    
    return (
      <View style={styles.desktopMiddle}>
        <View style={styles.middleHeader}>
           <Text style={styles.middleHeaderTitle}>{sName}</Text>
        </View>
        <ChatScreen 
          isEmbedded={true}
          route={{ params: { shopId: activeConversation.shop_id, shopName: sName, otherUserId: hostId } }} 
        />
      </View>
    );
  };

  const renderDesktopRightColumn = () => {
    if (!activeConversation) return <View style={styles.desktopRight} />;
    const sName = activeConversation.shop_locations?.shop_name || "Shop";
    const location = activeConversation.shop_locations?.city || "Location unknown";

    return (
      <View style={styles.desktopRight}>
        <View style={styles.rightHeader}>
          <Text style={styles.rightHeaderTitle}>Shop Details</Text>
        </View>
        <View style={styles.detailsCard}>
          <View style={styles.detailsAvatar}>
            <Text style={styles.detailsAvatarText}>{sName.charAt(0)}</Text>
          </View>
          <Text style={styles.detailsName}>{sName}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.locationRow}>
             <MapPin color="#717171" size={16} style={{marginRight: 8}}/>
             <Text style={styles.detailsShopLocation}>{location}</Text>
          </View>
          
          <View style={styles.infoBox}>
            <Info color="#4A00E0" size={20} />
            <Text style={styles.infoBoxText}>Messages are End-to-End Encrypted. Neither QR-Startup nor anyone else can read them.</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!isDesktop) {
    return <SafeAreaView style={styles.container}>{renderInboxList()}</SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.desktopContainer}>
      <View style={styles.desktopTopNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.desktopBackBtn}>
          <ArrowLeft color="#0A192F" size={24} style={{ marginRight: 8 }} />
          <Text style={styles.desktopBackText}>Back to Details</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.threeColumnLayout}>
        {renderInboxList()}
        {renderDesktopMiddleColumn()}
        {renderDesktopRightColumn()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  fullWidth: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  iconBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0A192F' },
  list: { flexGrow: 1 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  chatRowActive: { backgroundColor: '#F5F3FF', borderLeftWidth: 4, borderLeftColor: '#4A00E0' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#0A192F', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: 'bold', color: '#0A192F', marginBottom: 4 },
  chatPreview: { fontSize: 14, color: '#717171' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#0A192F', marginTop: 16 },
  desktopContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  desktopTopNav: { backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  desktopBackText: { fontSize: 16, fontWeight: '600', color: '#0A192F' },
  threeColumnLayout: { flex: 1, flexDirection: 'row', maxWidth: 1400, alignSelf: 'center', width: '100%', backgroundColor: '#FFFFFF', marginTop: 24, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 40 },
  desktopSidebar: { width: 350, borderRightWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  desktopMiddle: { flex: 1, backgroundColor: '#F9FAFB', flexDirection: 'column' },
  desktopMiddleEmpty: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  desktopEmptyText: { marginTop: 16, fontSize: 18, color: '#9CA3AF', fontWeight: '500' },
  middleHeader: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  middleHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0A192F' },
  desktopRight: { width: 300, borderLeftWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  rightHeader: { padding: 20, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  rightHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0A192F' },
  detailsCard: { padding: 24, alignItems: 'center' },
  detailsAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4A00E0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  detailsAvatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
  detailsName: { fontSize: 20, fontWeight: 'bold', color: '#0A192F', textAlign: 'center' },
  divider: { width: '100%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  locationRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  detailsShopLocation: { fontSize: 15, color: '#717171' },
  infoBox: { flexDirection: 'row', backgroundColor: '#F5F3FF', padding: 16, borderRadius: 12, marginTop: 32, alignItems: 'flex-start' },
  infoBoxText: { flex: 1, marginLeft: 12, fontSize: 13, color: '#4A00E0', lineHeight: 20 }
});
