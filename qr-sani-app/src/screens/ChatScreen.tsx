import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { ArrowLeft, Send, Trash2, Edit2, Check, CheckCheck } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { getOrCreateKeyPair, encryptMessage, decryptMessage, KeyPair } from '../utils/crypto';

export default function ChatScreen({ route, navigation, isEmbedded = false }: any) {
  const { shopId, shopName, otherUserId } = route?.params || {};
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [hostPublicKey, setHostPublicKey] = useState<string | null>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);

  useEffect(() => {
    setupChat();
    
    // Subscribe to realtime messages
    const subscription = supabase_lucifer_core
      .channel('public:shop_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_messages', filter: `shop_id=eq.${shopId}` }, payload => {
         loadMessages(keyPair, hostPublicKey);
      })
      .subscribe();

    return () => {
      supabase_lucifer_core.removeChannel(subscription);
    };
  }, []);

  const setupChat = async () => {
    try {
      // 1. Get/Generate our own keys
      const keys = await getOrCreateKeyPair();
      setKeyPair(keys);

      // Ensure our public key is saved to our profile
      if (user) {
        await supabase_lucifer_core
          .from('profiles')
          .update({ chat_public_key: keys.publicKey })
          .eq('id', user.id);
      }

      // 2. Get Other User's public key and shop settings
      const [otherProfile, settingsRes] = await Promise.all([
        supabase_lucifer_core.from('profiles').select('chat_public_key').eq('id', otherUserId).single(),
        supabase_lucifer_core.from('shop_chat_settings').select('*').eq('shop_id', shopId).single()
      ]);

      if (otherProfile.data?.chat_public_key) {
        setHostPublicKey(otherProfile.data.chat_public_key);
      }
      if (settingsRes.data) {
        setShopSettings(settingsRes.data);
      }

      // 3. Load messages
      await loadMessages(keys, otherProfile.data?.chat_public_key);

    } catch (err) {
      console.error("Chat setup error:", err);
    }
  };

  const loadMessages = async (keys: KeyPair | null, hostKey: string | null) => {
    if (!keys || !hostKey) return;
    
    const { data } = await supabase_lucifer_core
      .from('shop_messages')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true });

    if (data) {
      const decryptedMessages = data.map(msg => {
        // If it's deleted, don't show content
        if (msg.is_deleted) return { ...msg, content: "This message was deleted" };
        
        // Decrypt
        // If I am the sender, I decrypt with MY secret key and receiver's public key (Wait, tweetnacl box can be opened symmetrically by sender too?)
        // Actually, tweetnacl box.open requires (encrypted, nonce, OTHER_PUB, MY_SECRET).
        // If I sent it, OTHER_PUB is Host, MY_SECRET is Mine.
        // If Host sent it, OTHER_PUB is Host, MY_SECRET is Mine.
        const decryptedContent = decryptMessage(
          msg.encrypted_content, 
          msg.content_nonce, 
          hostKey, 
          keys.secretKey
        );
        return { ...msg, content: decryptedContent || "[Encryption Error]" };
      });
      setMessages(decryptedMessages);
    }
  };

  const checkBusinessHours = (): boolean => {
    if (!shopSettings) return true; // Default allow if no settings

    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = day === 0 || day === 6;

    if (!shopSettings.allow_weekend_messages && isWeekend) {
      Alert.alert("Shop Closed", shopSettings.auto_reply_message || "This shop does not accept messages on weekends.");
      return false;
    }

    // Check time
    const currentTime = now.toTimeString().split(' ')[0]; // "14:30:00"
    if (currentTime < shopSettings.business_hours_start || currentTime > shopSettings.business_hours_end) {
      Alert.alert("Shop Closed", shopSettings.auto_reply_message || "This shop is currently outside business hours.");
      return false;
    }

    return true;
  };

  const containsForbiddenContent = (text: string) => {
    // Basic regex to block URLs
    const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9]+\.[a-zA-Z]{2,})/g;
    return urlPattern.test(text);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !keyPair) return;
    
    if (!hostPublicKey) {
      Alert.alert(
        "Shop Not Ready", 
        "This shop has not activated their messaging inbox yet. The host must log in at least once to receive encrypted messages."
      );
      return;
    }
    
    if (containsForbiddenContent(inputText)) {
      Alert.alert("Security Warning", "For security reasons, links and URLs are not allowed in messages.");
      return;
    }

    if (!checkBusinessHours()) return;

    try {
      const { nonce, encrypted } = encryptMessage(inputText.trim(), hostPublicKey, keyPair.secretKey);

      if (editingId) {
        // Edit existing
        await supabase_lucifer_core
          .from('shop_messages')
          .update({ 
            content_nonce: nonce, 
            encrypted_content: encrypted, 
            is_edited: true, 
            edited_at: new Date().toISOString() 
          })
          .eq('id', editingId);
        setEditingId(null);
      } else if (user) {
        // Send new
        await supabase_lucifer_core.from('shop_messages').insert({
          shop_id: shopId,
          sender_id: user.id,
          receiver_id: otherUserId,
          content_nonce: nonce,
          encrypted_content: encrypted,
          status: 'sent'
        });
      }

      setInputText('');
    } catch (err) {
      console.error("Send error", err);
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
          <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
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

  return (
    <View style={styles.container}>
      {!isEmbedded && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#111827" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{shopName}</Text>
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
            placeholder={editingId ? "Edit message..." : "End-to-End Encrypted Message"}
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
  theirBubble: { backgroundColor: '#E4E6EB', borderBottomLeftRadius: 4 },
  
  messageText: { fontSize: 15, lineHeight: 20 },
  myText: { color: '#FFFFFF' },
  theirText: { color: '#050505' },
  
  messageFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  footerRight: { justifyContent: 'flex-end' },
  footerLeft: { justifyContent: 'flex-start' },
  
  timeText: { fontSize: 11 },
  myTime: { color: '#BAE6FD' },
  theirTime: { color: '#65676B' },
  
  actionIcons: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  iconBtn: { padding: 2 },
  
  inputArea: { flexDirection: 'row', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E4E6EB', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 30 : 12 },
  input: { flex: 1, backgroundColor: '#F0F2F5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, fontSize: 15, marginRight: 12, color: '#050505' },
  sendBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' }
});
