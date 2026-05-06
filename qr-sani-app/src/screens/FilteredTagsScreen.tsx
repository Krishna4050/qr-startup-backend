import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { ArrowLeft, Tag, PauseCircle, Archive, ShieldCheck } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

export default function FilteredTagsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  
  // Gets the filter from the navigation route ('paused' or 'archived')
  const filterType = route.params?.filterType || 'paused'; 
  const title = filterType === 'paused' ? 'Paused Tags' : 'Archived Tags';

  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) fetchTags();
  }, [isFocused]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase_lucifer_core
        .from('qr_tags')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', filterType) // Only fetch the requested status!
        .order('status_updated_at', { ascending: false });

      if (error) throw error;
      setTags(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderTag = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.tagCard} 
      onPress={() => navigation.navigate('TagManage', { tagId: item.id })}
    >
      <View style={styles.iconContainer}>
        {filterType === 'paused' ? <PauseCircle color="#F59E0B" size={24} /> : <Archive color="#6B7280" size={24} />}
      </View>
      <View style={styles.tagInfo}>
        <Text style={styles.tagTitle}>{item.item_name}</Text>
        <Text style={styles.tagSub}>Code: {item.tag_code}</Text>
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