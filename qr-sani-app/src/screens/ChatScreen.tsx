import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Send, Trash2, Edit2, Check, CheckCheck, Lock } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { getOrCreateKeyPair, encryptMessage, decryptMessage, KeyPair } from '../utils/crypto';

export default function ChatScreen({ route, navigation, isEmbedded = false }: any) {
  const { shopId, shopName: initialShopName, otherUserId } = route?.params || {};
  const [shopName, setShopName] = useState(initialShopName);
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopSettings, setShopSettings] = useState<any>(null);

  // FIX: We must use Refs for the keys so the Realtime Listener always has the freshest keys!
  const keysRef = useRef<KeyPair | null>(null);
  const hostKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !shopId || !otherUserId) return;

    setupChat();
    
    // Subscribe to realtime messages specifically for this shop
    const subscription = supabase_lucifer_core
      .channel(`chat_${shopId}_${user.id}`)
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'shop_messages', 
          filter: `shop_id=eq.${shopId}` 
        }, 
        () => {
          // Because we use Refs, these are never null when a new message arrives!
          if (keysRef.current && hostKeyRef.current) {
             loadMessages(keysRef.current, hostKeyRef.current);
          }
      })
      .subscribe();

    return () => {
      supabase_lucifer_core.removeChannel(subscription);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, shopId, otherUserId]);

  const setupChat = async () => {
    setLoading(true);
    try {
      // 1. Get/Generate our own keys
      const keys = await getOrCreateKeyPair();
      keysRef.current = keys;

      if (user) {
        await supabase_lucifer_core
          .from('profiles')
          .update({ chat_public_key: keys.publicKey })
          .eq('id', user.id);
      }

      if (!shopName && shopId) {
        const { data: shopRes } = await supabase_lucifer_core.from('shop_locations').select('shop_name').eq('id', shopId).single();
        if (shopRes) setShopName(shopRes.shop_name);
      }

      // 2. Get Other User's public key and shop settings
      const [otherProfile, settingsRes] = await Promise.all([
        supabase_lucifer_core.from('profiles').select('chat_public_key').eq('id', otherUserId).single(),
        supabase_lucifer_core.from('shop_chat_settings').select('*').eq('shop_id', shopId).single()
      ]);

      if (otherProfile.data?.chat_public_key) {
        hostKeyRef.current = otherProfile.data.chat_public_key;
      }
      if (settingsRes.data) {
        setShopSettings(settingsRes.data);
      }

      // 3. Load messages
      await loadMessages(keysRef.current, hostKeyRef.current);

    } catch (err) {
      console.error("Chat setup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (keys: KeyPair | null, hostKey: string | null) => {
    if (!keys || !hostKey || !user?.id) return;
    
    // CRITICAL FIX: Only fetch messages between YOU and the OTHER USER.
    const { data } = await supabase_lucifer_core
      .from('shop_messages')
      .select('*')
      .eq('shop_id', shopId)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) {
      const decryptedMessages = data.map(msg => {
        if (msg.is_deleted) return { ...msg, content: "This message was deleted." };
        if (!msg.encrypted_content || !msg.content_nonce) return { ...msg, content: "[Corrupted Message]" };
        
        try {
          const decryptedContent = decryptMessage(msg.encrypted_content, msg.content_nonce, hostKey, keys.secretKey);
          return { ...msg, content: decryptedContent || "[Decryption Failed]" };
        } catch (e) {
          return { ...msg, content: "[Decryption Failed]" };
        }
      });
      setMessages(decryptedMessages);
    }
  };

  const checkBusinessHours = (): boolean => {
    if (!shopSettings) return true; 

    const now = new Date();
    const day = now.getDay(); 
    const isWeekend = day === 0 || day === 6;

    if (!shopSettings.allow_weekend_messages && isWeekend) {
      Alert.alert("Shop Closed", shopSettings.auto_reply_message || "This shop does not accept messages on weekends.");
      return false;
    }

    const currentTime = now.toTimeString().split(' ')[0]; 
    if (shopSettings.business_hours_start && shopSettings.business_hours_end) {
        if (currentTime < shopSettings.business_hours_start || currentTime > shopSettings.business_hours_end) {
        Alert.alert("Shop Closed", shopSettings.auto_reply_message || "This shop is currently outside business hours.");
        return false;
        }
    }

    return true;
  };

  const containsForbiddenContent = (text: string) => {
    const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9]+\.[a-zA-Z]{2,})/g;
    return urlPattern.test(text);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !keysRef.current) return;
    
    if (!hostKeyRef.current) {
      Alert.alert(
        "Shop Not Ready", 
        "This shop has not activated their secure messaging inbox yet. They must log in to generate their encryption keys."
      );
      return;
    }
    
    if (containsForbiddenContent(inputText)) {
      Alert.alert("Security Warning", "For security reasons, links and URLs are not allowed in encrypted messages.");
      return;
    }

    if (!checkBusinessHours()) return;

    try {
      const { nonce, encrypted } = encryptMessage(inputText.trim(), hostKeyRef.current, keysRef.current.secretKey);

      if (editingId) {
        // Edit existing
        const { error: editError } = await supabase_lucifer_core
          .from('shop_messages')
          .update({ 
            content_nonce: nonce, 
            encrypted_content: encrypted, 
            is_edited: true, 
            edited_at: new Date().toISOString() 
          })
          .eq('id', editingId);
          
        if (editError) throw editError;
        setEditingId(null);
      } else if (user) {
        // Send new
        const { error: insertError } = await supabase_lucifer_core.from('shop_messages').insert({
          shop_id: shopId,
          sender_id: user.id,
          receiver_id: otherUserId,
          content_nonce: nonce,
          encrypted_content: encrypted,
          status: 'sent'
        });
        
        if (insertError) throw insertError;
      }

      setInputText('');
      // Optimistically reload messages for instant UI feedback
      loadMessages(keysRef.current, hostKeyRef.current);
    } catch (err: any) {
      console.error("Send error", err);
      Alert.alert("Failed to Send", err.message || "An unknown error occurred.");
    }
  };

  const handleDelete = async (msgId: string, createdAt: string) => {
    const msgDate = new Date(createdAt);
    const now = new Date();
    const diffMins = (now.getTime() - msgDate.getTime()) / 60000;
    
    if (diffMins > 5) {
      Alert.alert("Cannot Delete", "Messages can only be deleted within 5 minutes of sending.");
      return;
    }

    Alert.alert("Delete Message", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase_lucifer_core
          .from('shop_messages')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', msgId);
          
        loadMessages(keysRef.current, hostKeyRef.current);
      }}
    ]);
  };

  const handleEdit = (msg: any) => {
    const msgDate = new Date(msg.created_at);
    const now = new Date();
    const diffMins = (now.getTime() - msgDate.getTime()) / 60000;
    
    if (diffMins > 5) {
      Alert.alert("Cannot Edit", "Messages can only be edited within 5 minutes of sending.");
      return;
    }

    setEditingId(msg.id);
    setInputText(msg.content);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = user ? item.sender_id === user.id : false;

    return (
      <View style={[styles.messageRow, isMe ? styles.myRow : styles.theirRow]}>
        {!isMe && (
          <View style={styles.avatarTiny}>
            <Text style={styles.avatarTinyText}>{shopName ? shopName.charAt(0) : "S"}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText, item.is_deleted && styles.deletedText]}>
            {item.content}
          </Text>
          
          <View style={[styles.messageFooter, isMe ? styles.footerRight : styles.footerLeft]}>
            <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
              {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              {item.is_edited && " (edited)"}
            </Text>
            
            {isMe && !item.is_deleted && (
              <View style={styles.actionIcons}>
                {item.status === 'read' ? <CheckCheck size={12} color="#E0F2FE" /> : <Check size={12} color="#BAE6FD" />}
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}><Edit2 size={12} color="#E0F2FE" /></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.created_at)} style={styles.iconBtn}><Trash2 size={12} color="#FECACA" /></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
         <ActivityIndicator size="large" color="#0A192F" />
         <Text style={{marginTop: 10, color: '#717171'}}>Decrypting connection...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!isEmbedded && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <View>
             <Text style={styles.headerTitle}>{shopName}</Text>
             <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                <Lock size={10} color="#10B981" />
                <Text style={{fontSize: 10, color: '#10B981', marginLeft: 4}}>End-to-End Encrypted</Text>
             </View>
          </View>
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={editingId ? "Edit message..." : "Secure Message..."}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Send color="#0084FF" size={24} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E4E6EB' },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#050505' },
  
  listContent: { padding: 16, paddingBottom: 40 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  myRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  
  avatarTiny: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E4E6EB', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarTinyText: { fontSize: 12, fontWeight: 'bold', color: '#050505' },

  messageBubble: { maxWidth: '75%', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  myBubble: { backgroundColor: '#0084FF', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  
  messageText: { fontSize: 15, lineHeight: 20 },
  myText: { color: '#FFFFFF' },
  theirText: { color: '#050505' },
  deletedText: { fontStyle: 'italic', opacity: 0.8 },
  
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  footerRight: { justifyContent: 'flex-end' },
  footerLeft: { justifyContent: 'flex-start' },
  
  timeText: { fontSize: 11 },
  myTime: { color: '#BAE6FD' },
  theirTime: { color: '#9CA3AF' },
  
  actionIcons: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  iconBtn: { padding: 2 },
  
  inputArea: { flexDirection: 'row', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E4E6EB', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 30 : 12 },
  input: { flex: 1, backgroundColor: '#F0F2F5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, fontSize: 15, marginRight: 12, color: '#050505' },
  sendBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' }
});