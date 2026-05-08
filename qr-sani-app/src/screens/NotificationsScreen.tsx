import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { ArrowLeft, ShieldAlert, Bell, Info, Megaphone, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase_lucifer_core } from '../utils/supabase';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase_lucifer_core
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase_lucifer_core.auth.getUser();
    if (!user) return;

    await supabase_lucifer_core
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const deleteNotification = async (id: string) => {
    await supabase_lucifer_core.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Helper to pick the right icon and color based on Category & Priority
  const getNotificationStyle = (category: string, priority: string) => {
    if (priority === 'urgent' || category === 'security') {
      return { icon: <ShieldAlert color="#EF4444" size={24} />, bg: '#FEF2F2', border: '#F87171' };
    }
    if (category === 'marketing') {
      return { icon: <Megaphone color="#8B5CF6" size={24} />, bg: '#F5F3FF', border: '#C4B5FD' };
    }
    if (category === 'invite') {
      return { icon: <Bell color="#10B981" size={24} />, bg: '#ECFDF5', border: '#6EE7B7' };
    }
    return { icon: <Info color="#3B82F6" size={24} />, bg: '#EFF6FF', border: '#93C5FD' };
  };

  const renderItem = ({ item }: { item: any }) => {
    const style = getNotificationStyle(item.category, item.priority);

    return (
      <View style={[styles.card, { borderLeftColor: style.border, borderLeftWidth: 4 }]}>
        <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
          {style.icon}
        </View>
        <View style={styles.content}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={styles.title}>{item.title}</Text>
            {item.priority === 'urgent' && <Text style={styles.urgentBadge}>URGENT</Text>}
          </View>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
        </View>
        <TouchableOpacity onPress={() => deleteNotification(item.id)} style={styles.deleteBtn}>
          <Trash2 color="#9CA3AF" size={20} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0F2D4D" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell color="#D1D5DB" size={48} />
              <Text style={styles.emptyText}>You're all caught up!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  list: { padding: 16 },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  urgentBadge: { fontSize: 10, fontWeight: 'bold', color: '#EF4444', backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  body: { fontSize: 14, color: '#4B5563', marginBottom: 8, lineHeight: 20 },
  time: { fontSize: 12, color: '#9CA3AF' },
  deleteBtn: { paddingLeft: 12, justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#6B7280' }
});