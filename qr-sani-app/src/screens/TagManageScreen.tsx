import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Tag, User, PauseCircle, Trash2, ShieldAlert, Save, ShieldCheck, Share2, RefreshCw, Clock } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';
import apiClient from '../utils/apiClient';

import { useAuth } from '../context/AuthContext';

export default function TagManageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tagId = route.params?.tagId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tag, setTag] = useState<any>(null);
  
  const { user: currentUser } = useAuth();
  const [isOwner, setIsOwner] = useState(true);

  // --- NEW: Pending Request States ---
  const [pendingRequest, setPendingRequest] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string>('the owner');

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('item'); 
  const [assignedTo, setAssignedTo] = useState('');

  const [network, setNetwork] = useState<any[]>([]);
  const [sharedWithIds, setSharedWithIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTagAndNetwork();
  }, [currentUser?.id]);

  const fetchTagAndNetwork = async () => {
    setLoading(true);
    try {
      if (!currentUser) return;
      const res = await apiClient.get(`/api/tags/manage/${tagId}`);
      const data = res.data;
      
      setTag(data.tag);
      setItemName(data.tag.item_name || '');
      setCategory(data.tag.category || 'item');
      setAssignedTo(data.tag.assigned_to || '');

      setIsOwner(data.is_owner);
      if (data.is_owner) {
        setNetwork(data.network || []);
        setSharedWithIds(new Set(data.shared_with_ids || []));
      } else {
        setOwnerName(data.owner_name);
        setPendingRequest(data.pending_request || null);
      }
    } catch (err: any) {
      Alert.alert("Error", "Could not load details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!isOwner) { Alert.alert("Permission Denied", "Only the owner can change its name."); return; }
    setSaving(true);
    try {
      await apiClient.post(`/api/tags/${tagId}/update`, { item_name: itemName, category: category, assigned_to: category === 'person' ? assignedTo : null });
      Alert.alert("Success", "Tag details updated!");
    } catch (err: any) {
      Alert.alert("Error", err.response?.data || err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleShare = async (friendId: string, isCurrentlyShared: boolean) => {
    try {
      if (!isOwner) return; 
      await apiClient.post(`/api/tags/${tagId}/share`, { friend_id: friendId, is_currently_shared: isCurrentlyShared });
      if (isCurrentlyShared) {
        setSharedWithIds(prev => { const newSet = new Set(prev); newSet.delete(friendId); return newSet; });
      } else {
        setSharedWithIds(prev => { const newSet = new Set(prev); newSet.add(friendId); return newSet; });
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data || error.message);
    }
  };

  const requestOrUpdateStatus = async (newStatus: string, actionName: string) => {
    if (!isOwner) {
      Alert.alert("Request Permission", `You don't own this tag. Would you like to request the owner to mark it as ${newStatus.toUpperCase()}?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Send Request", onPress: async () => {
              setSaving(true);
              try {
                await supabase_lucifer_core.from('notifications').insert({
                  user_id: tag.owner_id,
                  title: "Tag Action Request",
                  body: `${currentUser?.email || 'A user'} thinks ${tag.item_name} should be marked as ${newStatus.toUpperCase()}.`,
                  category: "security",
                  action_data: { request_type: 'tag_status', requested_status: newStatus, tag_id: tag.id, requester_id: currentUser?.id }
                });
                
                // --- THE FIX: Instantly lock the UI into "Pending" mode ---
                setPendingRequest(newStatus);
                Alert.alert("Request Sent!", "The owner has been notified. Please wait for their approval.");
              } catch (err) {
                Alert.alert("Error", "Could not send request.");
              } finally {
                setSaving(false);
              }
            } 
          }
        ]);
      return;
    }

    Alert.alert("Confirm Action", `Are you sure you want to ${actionName.toLowerCase()} this tag?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", style: newStatus === 'archived' ? 'destructive' : 'default', onPress: async () => {
            setSaving(true);
            try {
              // Note: using the same toggle endpoint for active/lost toggles. 
              // If we need a specific 'set' endpoint, we should create one. For now, since Dashboard toggles active/lost, we can just use toggle-status if it's active/lost.
              // Actually we need to set the status precisely, so we will use the Supabase JS for this specifically unless we build a set-status endpoint.
              // Wait, since we know Supabase JS freezes, let's use apiClient.post! We'll just call the new /set-status API.
              await apiClient.post(`/api/tags/${tagId}/set-status`, { status: newStatus });
              if (newStatus === 'archived') {
                Alert.alert("Tag Removed", "This tag has been archived.");
                navigation.navigate('Home'); 
              } else if (tag.status === 'archived' && newStatus === 'active') {
                Alert.alert("Tag Restored", "This tag is now active again!");
                fetchTagAndNetwork(); 
              } else {
                fetchTagAndNetwork(); 
              }
            } catch (err: any) {
              Alert.alert("Error", err.response?.data || err.message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0F2D4D" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><ArrowLeft color="#111827" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Tag</Text>
        <TouchableOpacity onPress={handleSaveChanges} disabled={saving || !isOwner || tag.status === 'archived'}>
          {saving ? <ActivityIndicator color="#10B981" /> : <Save color={(isOwner && tag.status !== 'archived') ? "#10B981" : "#D1D5DB"} size={24} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={[styles.statusBanner, tag.status === 'paused' && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }, tag.status === 'archived' && { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }]}>
          {tag.status === 'active' && <ShieldCheck color="#10B981" size={28} />}
          {tag.status === 'paused' && <PauseCircle color="#D97706" size={28} />}
          {tag.status === 'lost' && <ShieldAlert color="#EF4444" size={28} />}
          {tag.status === 'archived' && <Trash2 color="#6B7280" size={28} />}
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.statusTitle, tag.status === 'archived' && { color: '#4B5563' }]}>Status: {tag.status.toUpperCase()}</Text>
            <Text style={[styles.statusSub, tag.status === 'archived' && { color: '#6B7280' }]}>Code: {tag.tag_code}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>Tag Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item / Tag Name</Text>
          <View style={[styles.inputContainer, (!isOwner || tag.status === 'archived') && { backgroundColor: '#F3F4F6' }]}>
            <Tag color="#9CA3AF" size={18} style={styles.inputIcon} />
            <TextInput style={styles.input} value={itemName} onChangeText={setItemName} editable={isOwner && tag.status !== 'archived'} />
          </View>
        </View>

        {isOwner && tag.status !== 'archived' && network.length > 0 && (
          <View style={{ marginTop: 16, marginBottom: 24 }}>
            <Text style={styles.sectionHeading}>Share this Tag</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>Allow trusted friends to track this item.</Text>
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' }}>
              {network.map((friend, index) => {
                const isShared = sharedWithIds.has(friend.friend_id);
                return (
                  <View key={friend.friend_id} style={[styles.shareRow, index !== network.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isShared ? '#ECFDF5' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                        <Share2 color={isShared ? "#10B981" : "#9CA3AF"} size={16} />
                      </View>
                      <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '500', color: '#111827' }}>{friend.friend_name}</Text>
                    </View>
                    <Switch value={isShared} onValueChange={() => toggleShare(friend.friend_id, isShared)} trackColor={{ false: '#D1D5DB', true: '#10B981' }} />
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Quick Actions</Text>

        {/* --- THE FIX: PENDING REQUEST UI --- */}
        {!isOwner && pendingRequest ? (
          <View style={styles.pendingCard}>
            <Clock color="#D97706" size={32} style={{ marginBottom: 12 }} />
            <Text style={styles.pendingTitle}>Request Pending</Text>
            <Text style={styles.pendingDesc}>
              You requested to mark this tag as {pendingRequest.toUpperCase()}. Please wait until {ownerName} reviews the request.
            </Text>
          </View>
        ) : (
          /* NORMAL ACTION UI */
          tag.status === 'archived' ? (
            isOwner ? (
              <View style={styles.actionGrid}>
                <TouchableOpacity style={[styles.actionCard, { borderColor: '#A7F3D0' }]} onPress={() => requestOrUpdateStatus('active', 'Restore')}>
                  <RefreshCw color="#10B981" size={28} />
                  <Text style={[styles.actionCardTitle, { color: '#065F46' }]}>Restore Tag</Text>
                  <Text style={styles.actionCardSub}>Move back to active</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 16, fontSize: 13 }}>Archived tags can only be restored by the original owner.</Text>
            )
          ) : (
            <View style={styles.actionGrid}>
              {tag.status === 'paused' ? (
                <TouchableOpacity style={styles.actionCard} onPress={() => requestOrUpdateStatus('active', 'Unpause')}>
                  <ShieldCheck color="#10B981" size={28} />
                  <Text style={styles.actionCardTitle}>Unpause Tag</Text>
                  <Text style={styles.actionCardSub}>Reactivate</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionCard} onPress={() => requestOrUpdateStatus('paused', 'Pause')}>
                  <PauseCircle color="#F59E0B" size={28} />
                  <Text style={styles.actionCardTitle}>Pause Tag</Text>
                  <Text style={styles.actionCardSub}>Hide profile</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[styles.actionCard, { borderColor: '#FECACA' }]} onPress={() => requestOrUpdateStatus('archived', 'Remove')}>
                <Trash2 color="#EF4444" size={28} />
                <Text style={[styles.actionCardTitle, { color: '#991B1B' }]}>Remove Tag</Text>
                <Text style={styles.actionCardSub}>Archive history</Text>
              </TouchableOpacity>
            </View>
          )
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 24 },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: '#065F46' },
  statusSub: { fontSize: 12, color: '#047857', marginTop: 2 },
  sectionHeading: { fontSize: 16, fontWeight: 'bold', color: '#0F2D4D', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 52, paddingHorizontal: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  shareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  actionGrid: { flexDirection: 'row', gap: 16 },
  actionCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  actionCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginTop: 12 },
  actionCardSub: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  
  // New Styles for Pending State
  pendingCard: { backgroundColor: '#FEF3C7', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#FDE68A', alignItems: 'center' },
  pendingTitle: { fontSize: 16, fontWeight: 'bold', color: '#B45309', marginBottom: 8 },
  pendingDesc: { fontSize: 14, color: '#92400E', textAlign: 'center', lineHeight: 20 }
});