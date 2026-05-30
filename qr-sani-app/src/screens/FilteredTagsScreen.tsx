import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { ArrowLeft, Tag, PauseCircle, Archive, Users } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

import { useAuth } from '../context/AuthContext';

export default function FilteredTagsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  
  const filterType = route.params?.filterType || 'paused'; 
  const title = filterType === 'paused' ? 'Paused Tags' : 'Archived Tags';

  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (isFocused) fetchTags();
  }, [isFocused, user?.id]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      if (!user) return;

      // 1. My Tags
      const { data: myTags } = await supabase_lucifer_core.from('qr_tags').select('*').eq('owner_id', user.id).eq('status', filterType);

      // 2. Shared Tags
      const { data: sharedIdsData } = await supabase_lucifer_core.from('shared_tags').select('tag_id, owner_id').eq('shared_with_id', user.id);

      let sharedTags: any[] = [];
      if (sharedIdsData && sharedIdsData.length > 0) {
        const sharedIds = sharedIdsData.map(row => row.tag_id);
        const { data: sharedTagsData } = await supabase_lucifer_core.from('qr_tags').select('*').in('id', sharedIds).eq('status', filterType);
        
        if (sharedTagsData) {
          const ownerIds = [...new Set(sharedIdsData.map(row => row.owner_id))];
          const { data: owners } = await supabase_lucifer_core.from('profiles').select('id, display_name, username').in('id', ownerIds);

          sharedTags = sharedTagsData.map(tag => {
            const shareRecord = sharedIdsData.find(s => s.tag_id === tag.id);
            const owner = owners?.find((o: any) => o.id === shareRecord?.owner_id);
            return {
              ...tag,
              is_shared: true,
              owner_name: owner?.display_name || owner?.username || 'A Friend'
            };
          });
        }
      }

      // Combine and Sort
      const combinedTags = [...(myTags || []), ...sharedTags].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTags(combinedTags);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderTag = ({ item }: any) => (
    <TouchableOpacity style={[styles.tagCard, item.is_shared && { borderColor: '#BFDBFE' }]} onPress={() => navigation.navigate('TagManage', { tagId: item.id })}>
      <View style={[styles.iconContainer, item.is_shared && { backgroundColor: '#EFF6FF' }]}>
        {item.is_shared ? <Users color="#2563EB" size={24} /> : (filterType === 'paused' ? <PauseCircle color="#F59E0B" size={24} /> : <Archive color="#6B7280" size={24} />)}
      </View>
      <View style={styles.tagInfo}>
        <Text style={styles.tagTitle}>{item.item_name}</Text>
        <Text style={styles.tagSub}>{item.is_shared ? `Shared by ${item.owner_name}` : `Code: ${item.tag_code}`}</Text>
      </View>
      <View style={styles.actionBadge}>
        <Text style={styles.actionText}>Manage</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#0F2D4D" /></View>
      ) : tags.length === 0 ? (
        <View style={styles.center}>
          <Tag color="#D1D5DB" size={48} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyText}>No {filterType} tags found.</Text>
        </View>
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(item) => item.id}
          renderItem={renderTag}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  listContent: { padding: 20, gap: 16 },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center', fontWeight: '500' },
  
  tagCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  tagInfo: { flex: 1 },
  tagTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  tagSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  actionBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  actionText: { color: '#3B82F6', fontSize: 12, fontWeight: 'bold' }
});