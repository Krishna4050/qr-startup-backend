import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, MessageSquare, ChevronRight } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export default function HostMessagesScreen({ route }: any) {
  const { shopData } = route.params;
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      // Find all unique users who have sent a message to this shop
      const { data, error } = await supabase_lucifer_core
        .from('shop_messages')
        .select('sender_id, created_at, profiles!shop_messages_sender_id_fkey(first_name, display_name)')
        .eq('shop_id', shopData.id)
        .eq('receiver_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by sender to get unique conversations
      const uniqueSenders = new Map();
      if (data) {
        data.forEach((msg: any) => {
          if (!uniqueSenders.has(msg.sender_id)) {
            uniqueSenders.set(msg.sender_id, msg);
          }
        });
      }

      setConversations(Array.from(uniqueSenders.values()));
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderConversation = ({ item }: { item: any }) => {
    const senderName = item.profiles?.first_name || item.profiles?.display_name || "User";
    
    return (
      <TouchableOpacity 
        style={styles.chatRow} 
        onPress={() => navigation.navigate('ChatScreen', {
          shopId: shopData.id,
          shopName: senderName, // Display user's name in header
          otherUserId: item.sender_id // The user we are talking to
        })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{senderName.charAt(0)}</Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{senderName}</Text>
          <Text style={styles.chatPreview}>Tap to view messages...</Text>
        </View>
        <ChevronRight color="#CBD5E1" size={24} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#0A192F" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages - {shopData.shop_name}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0A192F" />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageSquare color="#CBD5E1" size={48} />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubText}>When users message your shop, they will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.sender_id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0A192F' },
  
  list: { padding: 16 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0F2D4D', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: 'bold', color: '#0A192F', marginBottom: 4 },
  chatPreview: { fontSize: 14, color: '#717171' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#0A192F', marginTop: 16, marginBottom: 8 },
  emptySubText: { fontSize: 15, color: '#717171', textAlign: 'center' }
});
