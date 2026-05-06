import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Tag, User, PauseCircle, Trash2, ShieldAlert, Save, ShieldCheck } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

export default function TagManageScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tagId = route.params?.tagId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tag, setTag] = useState<any>(null);

  // Editable Form State
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('item'); // 'item', 'person', 'pet'
  const [assignedTo, setAssignedTo] = useState('');

  useEffect(() => {
    fetchTagDetails();
  }, []);

  const fetchTagDetails = async () => {
    try {
      const { data, error } = await supabase_lucifer_core
        .from('qr_tags')
        .select('*')
        .eq('id', tagId)
        .single();

      if (error) throw error;
      
      setTag(data);
      setItemName(data.item_name || '');
      setCategory(data.category || 'item');
      setAssignedTo(data.assigned_to || '');
    } catch (err) {
      Alert.alert("Error", "Could not load tag details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // --- SAVE LABEL CHANGES ---
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const { error } = await supabase_lucifer_core
        .from('qr_tags')
        .update({
          item_name: itemName,
          category: category,
          assigned_to: category === 'person' ? assignedTo : null
        })
        .eq('id', tagId);

      if (error) throw error;
      Alert.alert("Success", "Tag details updated!");
      fetchTagDetails();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- STATUS UPDATES (The Engine) ---
  const updateStatus = async (newStatus: string, confirmMessage: string) => {
    Alert.alert(
      "Confirm Action",
      confirmMessage,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, do it", 
          style: newStatus === 'archived' ? 'destructive' : 'default',
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase_lucifer_core
                .from('qr_tags')
                .update({ status: newStatus })
                .eq('id', tagId);

              if (error) throw error;
              
              if (newStatus === 'archived') {
                Alert.alert("Tag Removed", "This tag has been archived.");
                navigation.navigate('Home'); // Kick them back to dashboard
              } else {
                fetchTagDetails(); // Just refresh the page
              }
            } catch (err: any) {
              Alert.alert("Error", err.message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0F2D4D" /></View>;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Tag</Text>
        <TouchableOpacity onPress={handleSaveChanges} disabled={saving}>
          {saving ? <ActivityIndicator color="#10B981" /> : <Save color="#10B981" size={24} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Status Banner */}
        <View style={[styles.statusBanner, tag.status === 'paused' && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
          {tag.status === 'active' && <ShieldCheck color="#10B981" size={28} />}
          {tag.status === 'paused' && <PauseCircle color="#D97706" size={28} />}
          {tag.status === 'lost' && <ShieldAlert color="#EF4444" size={28} />}
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.statusTitle}>
              Status: {tag.status.toUpperCase()}
            </Text>
            <Text style={styles.statusSub}>Code: {tag.tag_code}</Text>
          </View>
        </View>

        {/* DETAILS SECTION */}
        <Text style={styles.sectionHeading}>Tag Details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item / Tag Name</Text>
          <View style={styles.inputContainer}>
            <Tag color="#9CA3AF" size={18} style={styles.inputIcon} />
            <TextInput style={styles.input} value={itemName} onChangeText={setItemName} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>What is this attached to?</Text>
          <View style={styles.categoryRow}>
            <TouchableOpacity 
              style={[styles.categoryBtn, category === 'item' && styles.categoryBtnActive]}
              onPress={() => setCategory('item')}>
              <Text style={[styles.categoryText, category === 'item' && {color: '#FFF'}]}>Valuable Item</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.categoryBtn, category === 'person' && styles.categoryBtnActive]}
              onPress={() => setCategory('person')}>
              <Text style={[styles.categoryText, category === 'person' && {color: '#FFF'}]}>Child / Person</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Child Input */}
        {category === 'person' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Who is carrying this?</Text>
            <View style={styles.inputContainer}>
              <User color="#9CA3AF" size={18} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="e.g. Tommy" value={assignedTo} onChangeText={setAssignedTo} />
            </View>
            <Text style={styles.helperText}>If scanned, the UI will adapt for a lost person.</Text>
          </View>
        )}

        {/* ACTIONS SECTION */}
        <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          {/* Pause Button */}
          {tag.status === 'paused' ? (
            <TouchableOpacity style={styles.actionCard} onPress={() => updateStatus('active', 'Unpause this tag and make it public again?')}>
              <ShieldCheck color="#10B981" size={28} />
              <Text style={styles.actionCardTitle}>Unpause Tag</Text>
              <Text style={styles.actionCardSub}>Reactivate protection</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionCard} onPress={() => updateStatus('paused', 'Pause this tag? If someone scans it, your profile will be hidden.')}>
              <PauseCircle color="#F59E0B" size={28} />
              <Text style={styles.actionCardTitle}>Pause Tag</Text>
              <Text style={styles.actionCardSub}>Temporarily hide profile</Text>
            </TouchableOpacity>
          )}

          {/* Soft Delete / Remove Button */}
          <TouchableOpacity style={[styles.actionCard, { borderColor: '#FECACA' }]} onPress={() => updateStatus('archived', 'Are you sure? This removes the tag from your dashboard. It cannot be registered by anyone else.')}>
            <Trash2 color="#EF4444" size={28} />
            <Text style={[styles.actionCardTitle, { color: '#991B1B' }]}>Remove Tag</Text>
            <Text style={styles.actionCardSub}>Archive to history</Text>
          </TouchableOpacity>
        </View>

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
  scrollContent: { padding: 20 },
  
  statusBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 24 },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: '#065F46' },
  statusSub: { fontSize: 12, color: '#047857', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  sectionHeading: { fontSize: 16, fontWeight: 'bold', color: '#0F2D4D', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 52, paddingHorizontal: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  helperText: { fontSize: 12, color: '#6B7280', marginTop: 6, marginLeft: 4 },

  categoryRow: { flexDirection: 'row', gap: 12 },
  categoryBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#FFF' },
  categoryBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  categoryText: { fontWeight: '600', color: '#4B5563' },

  actionGrid: { flexDirection: 'row', gap: 16 },
  actionCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  actionCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginTop: 12 },
  actionCardSub: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 4 }
});