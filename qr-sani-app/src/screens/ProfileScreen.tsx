import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { User, LogOut, ChevronRight, ShieldCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase_lucifer_core } from '../utils/supabase';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    const { error } = await supabase_lucifer_core.auth.signOut();
    if (error) {
      Alert.alert('Logout Error', error.message);
    } else {
      // Send them all the way back to the Login screen
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* USER INFO CARD (Mocked for now, we will connect DB later) */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={styles.avatarPlaceholder}>
              <User color="#0F2D4D" size={32} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.userName}>Alan Matthew</Text>
              <Text style={styles.userEmail}>alan.matthew@securefind.com</Text>
              <Text style={styles.userPhone}>+1 555-0198</Text>
            </View>
          </View>
          <View style={styles.badgeContainer}>
            <ShieldCheck color="#10B981" size={16} />
            <Text style={styles.badgeText}>Premium Member</Text>
          </View>
        </View>

        {/* BASIC INFORMATIONS */}
        <Text style={styles.sectionTitle}>Basic Informations</Text>
        <View style={styles.row}>
          <View style={[styles.card, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.cardTitle}>Completion Status</Text>
            <Text style={styles.statLarge}>60%</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '60%' }]} />
            </View>
          </View>
          <View style={[styles.card, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.cardTitle}>Contacts Added</Text>
            <Text style={styles.statLarge}>04</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>+ Add Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT BUTTON (At the bottom as requested) */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#DC2626" size={20} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F3F4' },
  header: { backgroundColor: '#0F2D4D', paddingTop: 60, paddingBottom: 20, alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#0F2D4D' },
  userEmail: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  userPhone: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { marginLeft: 6, color: '#065F46', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F2D4D', marginBottom: 12, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 8 },
  statLarge: { fontSize: 32, fontWeight: 'bold', color: '#0F2D4D', marginBottom: 12 },
  progressBarBg: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progressBarFill: { height: 4, backgroundColor: '#F59E0B', borderRadius: 2 },
  linkText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 14 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, marginTop: 32, borderWidth: 1, borderColor: '#FCA5A5' },
  logoutText: { color: '#DC2626', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});