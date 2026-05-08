import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Mail, Plus, Trash2, Clock, CheckCircle } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

export default function TrustedNetworkScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [network, setNetwork] = useState<any[]>([]);

  useEffect(() => {
    fetchNetwork();
  }, []);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase_lucifer_core
        .from('trusted_network')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNetwork(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    const emailToInvite = inviteEmail.toLowerCase().trim();
    if (!emailToInvite || !emailToInvite.includes('@')) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setIsInviting(true);
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) throw new Error("Not logged in");

      if (emailToInvite === user.email?.toLowerCase()) {
        Alert.alert("Error", "You cannot invite yourself.");
        setIsInviting(false);
        return;
      }

      // --- 1. THE ACCOUNT CHECK ---
      // Call our secure Postgres function to see if the user exists
      const { data: userExists, error: rpcError } = await supabase_lucifer_core
        .rpc('check_email_exists', { lookup_email: emailToInvite });

      if (rpcError) throw rpcError;

      if (!userExists) {
        // --- 2. PATH B: USER DOES NOT EXIST ---
        setIsInviting(false);
        Alert.alert(
          "Account Not Found",
          `${emailToInvite} does not have an account yet. Would you like to send them an email invitation to download the app?`,
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Send Anyway", 
              onPress: () => finalizeInvite(emailToInvite, user.id, false) 
            }
          ]
        );
        return;
      } else {
        // --- 3. PATH A: USER EXISTS ---
        await finalizeInvite(emailToInvite, user.id, true);
      }

    } catch (err: any) {
      Alert.alert("Error", err.message);
      setIsInviting(false);
    }
  };

 
  // The helper function that actually saves the invite
  const finalizeInvite = async (email: string, ownerId: string, userExists: boolean) => {
    setIsInviting(true);
    try {
      // Create the pending connection in the database
      const { data: inviteData, error: inviteError } = await supabase_lucifer_core
        .from('trusted_network')
        .insert({
          owner_id: ownerId,
          member_email: email,
          status: 'pending'
        })
        .select()
        .single();

      if (inviteError) {
        if (inviteError.code === '23505') throw new Error("This person is already invited.");
        throw inviteError;
      }

      // Fetch YOUR name so we can put it in the email
      const { data: profile } = await supabase_lucifer_core
        .from('profiles')
        .select('display_name, username')
        .eq('id', ownerId)
        .maybeSingle();
        
      const inviterName = profile?.display_name || profile?.username || 'A friend';

      // If they exist, send them an In-App Notification!
      if (userExists) {
        const { data: targetProfile } = await supabase_lucifer_core
          .from('profiles') 
          .select('id')
          .eq('username', email) 
          .maybeSingle();

        if (targetProfile) {
          await supabase_lucifer_core.from('notifications').insert({
            user_id: targetProfile.id,
            title: "New Network Invite",
            body: `${inviterName} added you to their network!`,
            type: "invite",
            action_data: { invite_id: inviteData.id }
          });
        }
      }

      // Tell the Go backend to fire the Resend Email!
      const backendUrl = 'http://192.168.1.95:8080'; // Note: Change to local IP if testing on a physical phone
      
      await fetch(`${backendUrl}/api/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          inviter_name: inviterName,
          is_registered: userExists
        })
      });

      // Show the correct success message
      if (userExists) {
        Alert.alert("Network Updated!", `An email and in-app notification were sent to ${email}.`);
      } else {
        Alert.alert("Invite Emailed!", `We sent an email to ${email} asking them to download the app and join your network.`);
      }

      setInviteEmail('');
      fetchNetwork();

    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err.message || "Could not send the email invite right now.");
    } finally {
      setIsInviting(false);
    }
  };

  const removeMember = (id: string, email: string) => {
    Alert.alert("Remove Member", `Are you sure you want to remove ${email} from your trusted network? They will lose access to view your tags.`, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Remove", 
        style: "destructive", 
        onPress: async () => {
          try {
            await supabase_lucifer_core.from('trusted_network').delete().eq('id', id);
            fetchNetwork();
          } catch (err: any) {
            Alert.alert("Error", "Could not remove member.");
          }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft color="#111827" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trusted Network</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HERO BANNER */}
        <View style={styles.heroBanner}>
          <View style={styles.heroIconBg}>
            <Users color="#DB2777" size={32} />
          </View>
          <Text style={styles.heroTitle}>Family & Friends</Text>
          <Text style={styles.heroSub}>Invite trusted people to see your tags and help track your items.</Text>
        </View>

        {/* INVITE FORM */}
        <Text style={styles.sectionHeading}>Invite a Member</Text>
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Mail color="#9CA3AF" size={20} style={styles.inputIcon} />
            <TextInput 
              style={styles.input} 
              placeholder="Enter their email address" 
              keyboardType="email-address" 
              autoCapitalize="none"
              value={inviteEmail} 
              onChangeText={setInviteEmail} 
            />
          </View>
          <TouchableOpacity 
            style={[styles.primaryBtn, !inviteEmail.trim() && { backgroundColor: '#FBCFE8' }]} 
            onPress={handleInvite}
            disabled={isInviting || !inviteEmail.trim()}
          >
            {isInviting ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Plus color="#FFF" size={20} />
                <Text style={styles.primaryBtnText}>Send Invitation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* NETWORK LIST */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>My Network</Text>
          <Text style={styles.counterText}>{network.length} Members</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#DB2777" style={{ marginTop: 24 }} />
        ) : network.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You haven't invited anyone yet.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {network.map((member, index) => (
              <View key={member.id} style={[styles.memberRow, index !== network.length - 1 && styles.borderBottom]}>
                <View style={styles.memberLeft}>
                  {member.status === 'accepted' ? (
                    <CheckCircle color="#10B981" size={20} />
                  ) : (
                    <Clock color="#F59E0B" size={20} />
                  )}
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.memberEmail}>{member.member_email}</Text>
                    <Text style={[styles.memberStatus, { color: member.status === 'accepted' ? '#10B981' : '#F59E0B' }]}>
                      {member.status === 'accepted' ? 'Active Member' : 'Invite Pending'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => removeMember(member.id, member.member_email)}>
                  <Trash2 color="#EF4444" size={18} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  iconBtn: { padding: 4 },
  scrollContent: { padding: 24, paddingBottom: 100 },
  
  heroBanner: { backgroundColor: '#FDF2F8', padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#FCE7F3' },
  heroIconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FBCFE8', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#831843', marginBottom: 8 },
  heroSub: { fontSize: 14, color: '#BE185D', textAlign: 'center', lineHeight: 20 },

  sectionHeading: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 32, marginBottom: 12 },
  counterText: { fontSize: 14, fontWeight: 'bold', color: '#6B7280' },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 56, paddingHorizontal: 16, marginBottom: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  
  primaryBtn: { flexDirection: 'row', backgroundColor: '#DB2777', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  emptyState: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: '#6B7280', fontSize: 15 },

  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  memberLeft: { flexDirection: 'row', alignItems: 'center' },
  memberEmail: { fontSize: 15, fontWeight: '600', color: '#111827' },
  memberStatus: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  deleteBtn: { padding: 8, backgroundColor: '#FEF2F2', borderRadius: 8 },
});