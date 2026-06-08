import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image } from 'react-native';
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
  const [otherAvatar, setOtherAvatar] = useState<string | null>(null);

  // Presence States
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const presenceChannelRef = useRef<any>(null);

  const keysRef = useRef<KeyPair | null>(null);
  const hostKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !shopId || !otherUserId) {
      setLoading(false); // Fix: don't hang if params missing
      return;
    }

    setupChat();
    
    const msgSubscription = supabase_lucifer_core
      .channel(`chat_${shopId}_${user.id}`)
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'shop_messages', 
          filter: `shop_id=eq.${shopId}` 
        }, 
        () => {
          if (keysRef.current && hostKeyRef.current) {
             loadMessages(keysRef.current, hostKeyRef.current);
          }
      })
      .subscribe();

    // Presence Channel setup
    const presenceRoomId = `presence_shop_${shopId}_user_${[user.id, otherUserId].sort().join('_')}`;
    const presenceChannel = supabase_lucifer_core.channel(presenceRoomId, {
      config: { presence: { key: user.id } }
    });
    
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const otherUserPresence = state[otherUserId];
        setIsOnline(!!otherUserPresence && otherUserPresence.length > 0);
        
        if (otherUserPresence && otherUserPresence[0]?.typing) {
          setIsTyping(true);
        } else {
          setIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online: true, typing: false });
        }
      });

    return () => {
      supabase_lucifer_core.removeChannel(msgSubscription);
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack();
        supabase_lucifer_core.removeChannel(presenceChannelRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, shopId, otherUserId]);

  const setupChat = async () => {
    setLoading(true);
    try {
      const keys = await getOrCreateKeyPair();
      keysRef.current = keys;

      if (user) {
        await supabase_lucifer_core.from('profiles').update({ chat_public_key: keys.publicKey }).eq('id', user.id);
      }

      if (!shopName && shopId) {
        const { data: shopRes } = await supabase_lucifer_core.from('shop_locations').select('shop_name').eq('id', shopId).single();
        if (shopRes) setShopName(shopRes.shop_name);
      }

      const [otherProfile, settingsRes] = await Promise.all([
        supabase_lucifer_core.from('profiles').select('chat_public_key, avatar_url').eq('id', otherUserId).single(),
        supabase_lucifer_core.from('shop_chat_settings').select('*').eq('shop_id', shopId).maybeSingle()
      ]);

      if (otherProfile.data?.chat_public_key) {
        hostKeyRef.current = otherProfile.data.chat_public_key;
      } else {
        // Host has not activated secure messaging! Gracefully stop loading.
        setLoading(false);
        return;
      }
      
      if (otherProfile.data?.avatar_url) {
        setOtherAvatar(otherProfile.data.avatar_url);
      }
      
      if (settingsRes.data) {
        setShopSettings(settingsRes.data);
      }

      await loadMessages(keysRef.current, hostKeyRef.current);

    } catch (err) {
      console.error("Chat setup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (keys: KeyPair | null, hostKey: string | null) => {
    if (!keys || !hostKey || !user?.id) return;
    
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

  const handleTyping = (text: string) => {
    // Strip carriage returns or complex formatting to prevent accidental media paste bugs
    const plainText = text.replace(/[\r]/g, '');
    setInputText(plainText);
    
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({ online: true, typing: plainText.length > 0 });
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
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({ online: true, typing: false });
      }
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
            {otherAvatar ? (
               <Image source={{ uri: otherAvatar }} style={{width: 28, height: 28, borderRadius: 14}} />
            ) : (
               <Text style={styles.avatarTinyText}>{shopName ? shopName.charAt(0).toUpperCase() : "S"}</Text>
            )}
          </View>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText, item.is_deleted && styles.deletedText]}>
            {item.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[styles.timeText, isMe ? styles.myTime : styles.theirTime]}>
              {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              {item.is_edited && " (edited)"}
            </Text>
            
            {isMe && !item.is_deleted && (
              <View style={styles.actionIcons}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}><Edit2 size={12} color="#E0F2FE" /></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.created_at)} style={styles.iconBtn}><Trash2 size={12} color="#FECACA" /></TouchableOpacity>
                {item.status === 'read' ? <CheckCheck size={14} color="#34D399" /> : <Check size={14} color="#E0F2FE" />}
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
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ArrowLeft color="#111827" size={24} />
            </TouchableOpacity>
            
            <View style={styles.headerAvatar}>
              {otherAvatar ? (
                 <Image source={{ uri: otherAvatar }} style={{width: 40, height: 40, borderRadius: 20}} />
              ) : (
                 <Text style={styles.headerAvatarText}>{shopName ? shopName.charAt(0).toUpperCase() : "S"}</Text>
              )}
            </View>

            <View>
               <Text style={styles.headerTitle}>{shopName}</Text>
               {isTyping ? (
                 <Text style={styles.typingText}>typing...</Text>
               ) : isOnline ? (
                 <Text style={styles.onlineText}>Online</Text>
               ) : (
                 <Text style={styles.offlineText}>Offline</Text>
               )}
            </View>
          </View>
          
          <View style={styles.encryptionBadge}>
             <Lock size={12} color="#10B981" />
             <Text style={styles.encryptionText}>End-to-End Encrypted</Text>
          </View>
        </View>
      )}

      {/* When embedded, still show presence indicator at the top if no header */}
      {isEmbedded && (
        <View style={styles.embeddedHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#9CA3AF' }]} />
            <Text style={styles.embeddedStatusText}>
              {isTyping ? 'typing...' : isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <Lock size={10} color="#10B981" />
             <Text style={[styles.encryptionText, {fontSize: 10, marginLeft: 4}]}>Encrypted</Text>
          </View>
        </View>
      )}

      {!hostKeyRef.current ? (
        <View style={styles.notReadyContainer}>
           <Lock color="#9CA3AF" size={48} />
           <Text style={styles.notReadyTitle}>Shop Offline</Text>
           <Text style={styles.notReadyText}>The host has not set up their secure inbox yet. Check back later.</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          inverted={false} // Typically chat apps map from top to bottom unless inverted, here ascending is used
        />
      )}

      {hostKeyRef.current && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={handleTyping}
              placeholder={editingId ? "Edit message..." : "Secure Message..."}
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} onPress={handleSend} disabled={!inputText.trim()}>
              <Send color="#0084FF" size={24} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Chat styling reflecting ATS branding + WhatsApp functionality
  container: { flex: 1, backgroundColor: '#E4E6EB' }, // Neutral grey background
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#D1D5DB' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12, padding: 4 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0A192F', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerAvatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#050505' },
  
  onlineText: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  offlineText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  typingText: { fontSize: 12, color: '#0084FF', fontWeight: '500', fontStyle: 'italic' },
  
  encryptionBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  encryptionText: { fontSize: 10, color: '#10B981', marginLeft: 4, fontWeight: '600' },

  embeddedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  embeddedStatusText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  
  listContent: { padding: 16, paddingBottom: 40 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  myRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },
  
  avatarTiny: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0A192F', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarTinyText: { fontSize: 12, fontWeight: 'bold', color: '#FFF' },

  messageBubble: { maxWidth: '80%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
  myBubble: { backgroundColor: '#0A192F', borderBottomRightRadius: 4 }, // ATS Dark Blue for self
  theirBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4 },
  
  messageText: { fontSize: 15, lineHeight: 20 },
  myText: { color: '#FFFFFF' },
  theirText: { color: '#050505' },
  deletedText: { fontStyle: 'italic', opacity: 0.8 },
  
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, minWidth: 60 },
  
  timeText: { fontSize: 11, marginLeft: 8 },
  myTime: { color: '#9CA3AF' },
  theirTime: { color: '#9CA3AF' },
  
  actionIcons: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 6 },
  iconBtn: { padding: 2 },
  
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#F0F2F5', alignItems: 'flex-end', paddingBottom: Platform.OS === 'ios' ? 30 : 10 },
  input: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 20, fontSize: 15, marginRight: 10, color: '#050505', maxHeight: 100 },
  sendBtn: { padding: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A192F', borderRadius: 24, width: 44, height: 44, marginBottom: 2 },

  notReadyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  notReadyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginTop: 16, marginBottom: 8 },
  notReadyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 }
});