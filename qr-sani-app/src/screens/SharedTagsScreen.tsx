import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Alert, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Tag, Share2, ShieldCheck, Lock } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

import { useAuth } from '../context/AuthContext';

export default function SharedTagsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  const friendId = route.params?.friendId;
  const friendName = route.params?.friendName || 'Friend';

  const [loading, setLoading] = useState(true);
  const [myTags, setMyTags] = useState<any[]>([]);
  const [sharedTagIds, setSharedTagIds] = useState<Set<string>>(new Set());
  const [theirTags, setTheirTags] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!friendId) {
      Alert.alert("Error", "Friend ID is missing.");
      navigation.goBack();
      return;
    }
    fetchSharingData();
  }, []);

  const fetchSharingData = async () => {
    setLoading(true);
    try {
      if (!user) return;

      // 1. Fetch My Tags
      const { data: myTagsData } = await supabase_lucifer_core
        .from('qr_tags')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      setMyTags(myTagsData || []);

      // 2. Fetch which of my tags I am currently sharing with this friend
      const { data: mySharedData } = await supabase_lucifer_core
        .from('shared_tags')
        .select('tag_id')
        .eq('owner_id', user.id)
        .eq('shared_with_id', friendId);

      const sharedSet = new Set((mySharedData || []).map(row => row.tag_id));
      setSharedTagIds(sharedSet);

      // 3. Fetch tags THEY own and have shared with ME
      // First, get the IDs of tags shared with me by them
      const { data: sharedWithMeData } = await supabase_lucifer_core
        .from('shared_tags')
        .select('tag_id')
        .eq('owner_id', friendId)
        .eq('shared_with_id', user.id);

      const theirSharedTagIds = (sharedWithMeData || []).map(row => row.tag_id);

      // Then, fetch the actual tag details for those IDs
      if (theirSharedTagIds.length > 0) {
        const { data: theirTagsData } = await supabase_lucifer_core
          .from('qr_tags')
          .select('*')
          .in('id', theirSharedTagIds);
        setTheirTags(theirTagsData || []);
      } else {
        setTheirTags([]);
      }

    } catch (error: any) {
      Alert.alert("Error fetching data", error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleShare = async (tagId: string, isCurrentlyShared: boolean) => {
    try {
      if (!user) return;

      if (isCurrentlyShared) {
        // Unshare: Delete the record
        const { error } = await supabase_lucifer_core
          .from('shared_tags')
          .delete()
          .eq('tag_id', tagId)
          .eq('shared_with_id', friendId);
        
        if (error) throw error;
        
        setSharedTagIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(tagId);
          return newSet;
        });

      } else {
        // Share: Insert a new record
        const { error } = await supabase_lucifer_core
          .from('shared_tags')
          .insert({
            tag_id: tagId,
            owner_id: user.id,
            shared_with_id: friendId
          });

        if (error) throw error;

        setSharedTagIds(prev => {
          const newSet = new Set(prev);
          newSet.add(tagId);
          return newSet;
        });
      }
    } catch (error: any) {
      Alert.alert("Error updating share settings", error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#DB2777" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friendName}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.infoBox}>
          <Share2 color="#DB2777" size={24} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.infoTitle}>Tag Sharing</Text>
            <Text style={styles.infoSub}>Choose which of your tags {friendName} can see and track if they get lost.</Text>
          </View>
        </View>

        {/* SECTION: MY TAGS */}
        <Text style={styles.sectionHeading}>My Tags</Text>
        {myTags.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>You haven't registered any tags yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {myTags.map((tag, index) => {
              const isShared = sharedTagIds.has(tag.id);
              return (
                <View key={tag.id} style={[styles.tagRow, index !== myTags.length - 1 && styles.borderBottom]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={styles.iconBg}>
                      <Tag color={isShared ? "#10B981" : "#9CA3AF"} size={18} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.tagTitle}>{tag.item_name || 'Unnamed Item'}</Text>
                      <Text style={styles.tagSub}>{isShared ? 'Shared with them' : 'Private'}</Text>
                    </View>
                  </View>
                  <Switch 
                    value={isShared} 
                    onValueChange={() => toggleShare(tag.id, isShared)}
                    trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              );
            })}
          </View>
        )}

        {/* SECTION: THEIR TAGS */}
        <Text style={[styles.sectionHeading, { marginTop: 32 }]}>Shared With Me</Text>
        {theirTags.length === 0 ? (
          <View style={styles.emptyCard}>
            <Lock color="#9CA3AF" size={24} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>{friendName} hasn't shared any tags with you yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {theirTags.map((tag, index) => (
              <View key={tag.id} style={[styles.tagRow, index !== theirTags.length - 1 && styles.borderBottom]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={[styles.iconBg, { backgroundColor: '#EFF6FF' }]}>
                    <ShieldCheck color="#3B82F6" size={18} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.tagTitle}>{tag.item_name || 'Unnamed Item'}</Text>
                    <Text style={[styles.tagSub, { color: '#3B82F6' }]}>Status: {tag.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  
  infoBox: { flexDirection: 'row', backgroundColor: '#FDF2F8', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FCE7F3', marginBottom: 24, alignItems: 'center' },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#831843' },
  infoSub: { fontSize: 13, color: '#BE185D', marginTop: 4, lineHeight: 18 },

  sectionHeading: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12, marginLeft: 4 },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  
  iconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  tagTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  tagSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  emptyCard: { backgroundColor: '#FFF', padding: 32, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' }
});