import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Mail, Plus, Trash2, Clock, CheckCircle, ChevronRight } from 'lucide-react-native';
import { supabase_lucifer_core } from '../utils/supabase';

import { useAuth } from '../context/AuthContext';

export default function TrustedNetworkScreen() {
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [network, setNetwork] = useState<any[]>([]);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchNetwork();
  }, [currentUser?.id]);

  const fetchNetwork = async () => {
    setLoading(true);
    try {
      if (!currentUser) return;

      const { data, error } = await supabase_lucifer_core.from('trusted_network').select('*').or(`owner_id.eq.${currentUser.id},member_email.ilike.${currentUser.email}`).order('created_at', { ascending: false });
      if (error) throw error;

      const enrichedData = await Promise.all((data || []).map(async (member) => {
        if (member.owner_id !== currentUser.id) {
          const { data: ownerEmail } = await supabase_lucifer_core.rpc('get_email_by_user_id', { target_id: member.owner_id });
          return { ...member, friend_id: member.owner_id, friend_name: ownerEmail || 'Connected Friend' };
        } else {
          const { data: profile } = await supabase_lucifer_core.from('profiles').select('id').ilike('username', member.member_email).maybeSingle();
          let targetId = profile?.id;
          if (!targetId) {
            const { data: rpcId } = await supabase_lucifer_core.rpc('get_user_id_by_email', { lookup_email: member.member_email });
            targetId = rpcId;
          }
          return { ...member, friend_id: targetId || null, friend_name: member.member_email };
        }
      }));

      setNetwork(enrichedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    const emailToInvite = inviteEmail.toLowerCase().trim();
    if (!emailToInvite || !emailToInvite.includes('@')) { Alert.alert("Invalid Email", "Please enter a valid email address."); return; }
    setIsInviting(true);
    try {
      if (!currentUser) throw new Error("Not logged in");
      if (emailToInvite === currentUser.email?.toLowerCase()) { Alert.alert("Error", "You cannot invite yourself."); setIsInviting(false); return; }

      const { data: targetUserId, error: rpcError } = await supabase_lucifer_core.rpc('get_user_id_by_email', { lookup_email: emailToInvite });
      if (rpcError) throw rpcError;
      const userExists = !!targetUserId; 

      let orQuery = `and(owner_id.eq.${currentUser.id},member_email.ilike.${emailToInvite})`;
      if (userExists && targetUserId) {
          orQuery += `,and(member_email.ilike.${currentUser.email},owner_id.eq.${targetUserId})`;
      }

      const { data: existingConnection } = await supabase_lucifer_core.from('trusted_network').select('status').or(orQuery).maybeSingle();
      if (existingConnection) { Alert.alert("Already Connected", `You already have a ${existingConnection.status} connection with this person.`); setIsInviting(false); return; }

      if (!userExists) {
        setIsInviting(false);
        Alert.alert("Account Not Found", `${emailToInvite} does not have an account yet. Send invite anyway?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Send", onPress: () => finalizeInvite(emailToInvite, currentUser.id, false, null) }
        ]);
        return;
      } else {
        await finalizeInvite(emailToInvite, currentUser.id, true, targetUserId);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
      setIsInviting(false);
    }
  };

  const finalizeInvite = async (email: string, ownerId: string, userExists: boolean, targetUserId: string | null) => {
    setIsInviting(true);
    try {
      const { data: inviteData, error: inviteError } = await supabase_lucifer_core.from('trusted_network').insert({ owner_id: ownerId, member_email: email, status: 'pending' }).select().single();
      if (inviteError) {
        if (inviteError.code === '23505') throw new Error("This person is already invited.");
        throw inviteError;
      }

      const { data: profile } = await supabase_lucifer_core.from('profiles').select('display_name, username').eq('id', ownerId).maybeSingle();
      const inviterName = profile?.display_name || profile?.username || 'A friend';

      if (userExists && targetUserId) {
          await supabase_lucifer_core.from('notifications').insert({
            user_id: targetUserId,
            title: "New Network Invite",
            body: `${inviterName} wants to add you to their trusted network!`,
            category: "invite", 
            action_data: { invite_id: inviteData.id }
          });
      }

      // --- RESTORED: SEND THE ACTUAL EMAIL ---
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (backendUrl) {
        await fetch(`${backendUrl}/api/invite`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ email: email, inviter_name: inviterName, is_registered: userExists }) 
        });
      }

      Alert.alert("Invite Sent!", `An invitation was sent to ${email}.`);
      setInviteEmail('');
      fetchNetwork();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not send the invite right now.");
    } finally {
      setIsInviting(false);
    }
  };

  const removeMember = (id: string, friendId: string | null) => {
    Alert.alert("Remove Connection", "Are you sure you want to remove this person? All tags shared between you will be unshared.", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
          try {
            await supabase_lucifer_core.from('trusted_network').delete().eq('id', id);
            if (friendId && currentUser) {
              await supabase_lucifer_core.from('shared_tags').delete().match({ owner_id: currentUser.id, shared_with_id: friendId });
              await supabase_lucifer_core.from('shared_tags').delete().match({ owner_id: friendId, shared_with_id: currentUser.id });
            }
            fetchNetwork();
          } catch (error) {
            Alert.alert("Error", "Could not remove member completely.");
          }
        }
      }
    ]);
  };

  const handleOpenSharing = (member: any) => {
    if (member.status !== 'accepted') { Alert.alert("Pending", "They must accept your invite before you can share tags."); return; }
    if (!member.friend_id) { Alert.alert("Connection Error", `We couldn't find the ID for ${member.friend_name}. Try refreshing.`); return; }
    navigation.navigate('SharedTags', { friendId: member.friend_id, friendName: member.friend_name });
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><ArrowLeft color="#111827" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Trusted Network</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBanner}>
          <View style={styles.heroIconBg}><Users color="#DB2777" size={32} /></View>
          <Text style={styles.heroTitle}>Family & Friends</Text>
          <Text style={styles.heroSub}>Invite trusted people to see your tags and help track your items.</Text>
        </View>

        <Text style={styles.sectionHeading}>Invite a Member</Text>
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <Mail color="#9CA3AF" size={20} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Enter their email address" keyboardType="email-address" autoCapitalize="none" value={inviteEmail} onChangeText={setInviteEmail} />
          </View>
          <TouchableOpacity style={[styles.primaryBtn, !inviteEmail.trim() && { backgroundColor: '#FBCFE8' }]} onPress={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
            {isInviting ? <ActivityIndicator color="#FFF" /> : <><Plus color="#FFF" size={20} /><Text style={styles.primaryBtnText}>Send Invitation</Text></>}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>My Network</Text>
          <Text style={styles.counterText}>{network.length} Connections</Text>
        </View>

        {loading ? <ActivityIndicator size="large" color="#DB2777" style={{ marginTop: 24 }} /> : network.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyText}>You haven't connected with anyone yet.</Text></View>
        ) : (
          <View style={styles.card}>
            {network.map((member, index) => (
              <TouchableOpacity key={member.id} style={[styles.memberRow, index !== network.length - 1 && styles.borderBottom]} onPress={() => handleOpenSharing(member)} activeOpacity={0.7}>
                <View style={styles.memberLeft}>
                  {member.status === 'accepted' ? <CheckCircle color="#10B981" size={20} /> : <Clock color="#F59E0B" size={20} />}
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.memberEmail}>{member.friend_name}</Text>
                    <Text style={[styles.memberStatus, { color: member.status === 'accepted' ? '#10B981' : '#F59E0B' }]}>{member.status === 'accepted' ? 'Active Member' : 'Invite Pending'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {member.status === 'accepted' && <ChevronRight color="#9CA3AF" size={20} style={{ marginRight: 12 }} />}
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => removeMember(member.id, member.friend_id)}>
                    <Trash2 color="#EF4444" size={18} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
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