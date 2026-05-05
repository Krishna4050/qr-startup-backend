import { useState, useEffect } from 'react';
import { View, Text, Alert, TouchableWithoutFeedback, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Plus, Key, Briefcase, Bike, Edit2, CheckCircle2, Settings, AlertCircle, UserX, ArrowRight } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { supabase_lucifer_core } from '../utils/supabase';
import { useContent } from '../context/ContentContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from '../../styles/dashboardStyles';

const MY_ITEMS = [{ id: '1', title: 'House Keys', icon: 'key' }];

export default function DashboardScreen() {
  const { user } = useAuth();
  const content = useContent(); 
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // Track if profile was skipped
  const [is_sani_profile_complete, set_is_sani_profile_complete] = useState(true);

  useEffect(() => {
    if (route.params?.sani_profile_skipped) {
      set_is_sani_profile_complete(false);
    }
  }, [route.params]);

  const resendVerification = async () => {
    if (!user?.email) return;
    const { error } = await supabase_lucifer_core.auth.resend({ type: 'signup', email: user.email });
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Sent!", "Check your inbox for a new link.");
  };

  // THE ULTIMATE GATEKEEPER FOR THE QR BUTTON
  const handleRegisterNewTag = () => {
    if (user && !user.email_confirmed_at) {
      Alert.alert("Hold on!", "Please verify your email address to register a tag.");
      return;
    }
    if (!is_sani_profile_complete) {
      Alert.alert("Profile Required", "Please complete your profile to register tags.");
      navigation.navigate('ProfileSetup');
      return;
    }
    Alert.alert("Success", "Camera and Location permissions will launch here next!");
  };

  const [luciferTaps, setLuciferTaps] = useState(0);
  const _mnskb_hash_generator = (cipherArray: number[]) => cipherArray.map(c => String.fromCharCode(c)).join('');

  const handleSecretTap = () => {
    const newTaps = luciferTaps + 1;
    setLuciferTaps(newTaps);
    if (newTaps === 7) {
      const secretMessage = [83, 97, 110, 105, 44, 32, 121, 111, 117, 32, 97, 114, 101, 32, 109, 121, 32, 106, 97, 97, 110, 46, 32, 72, 101, 114, 101, 32, 105, 115, 32, 97, 32, 119, 104, 105, 116, 101, 32, 116, 117, 108, 105, 112, 32, 102, 111, 114, 32, 121, 111, 117, 46];
      const titleMessage = [76, 117, 99, 105, 102, 101, 114, 32, 38, 32, 77, 97, 121, 97, 108, 117];
      Alert.alert(_mnskb_hash_generator(titleMessage), _mnskb_hash_generator(secretMessage));
      setLuciferTaps(0);
    }
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      <LinearGradient colors={['#4F46E5', '#9333EA']} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerContent}>
            <View style={styles.profileCircle}><User color="#4F46E5" size={32} /></View>
            <View>
              <TouchableWithoutFeedback onPress={handleSecretTap}>
                <View><Text style={styles.welcomeText}>{content.dashboard.welcome}, {user?.user_metadata?.full_name || 'Guest'}!</Text></View>
              </TouchableWithoutFeedback>
              <Text style={styles.subText}>{content.dashboard.subText}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
             <Settings color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>

        {/* VERIFICATION BANNER PLACED DIRECTLY BELOW WELCOME BACK */}
        {user && !user.email_confirmed_at && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
            <AlertCircle color="#FCA5A5" size={20} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>Verify Email Address</Text>
              <TouchableOpacity onPress={resendVerification}>
                <Text style={{ color: '#E0E7FF', fontSize: 12, textDecorationLine: 'underline', marginTop: 4 }}>Not received? Resend link</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* FLOATING REGISTER BUTTON CONNECTED TO GATEKEEPER */}
      <View style={styles.actionButtonContainer}>
        <TouchableOpacity style={styles.registerButton} onPress={handleRegisterNewTag}>
          <Plus color="#2563EB" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.registerButtonText}>{content.dashboard.registerBtn}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {/* PROFILE COMPLETION BANNER IF SKIPPED */}
        {!is_sani_profile_complete && (
          <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')} style={{ backgroundColor: '#FFFBEB', padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FDE68A' }}>
            <UserX color="#D97706" size={24} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#92400E', fontWeight: 'bold' }}>Complete Your Profile</Text>
              <Text style={{ color: '#B45309', fontSize: 12, marginTop: 2 }}>Unlock all features by finishing your setup.</Text>
            </View>
            <ArrowRight color="#D97706" size={20} />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>{content.dashboard.myItems}</Text>
        {MY_ITEMS.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemIconContainer}><Key color="#3B82F6" size={24} /></View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <View style={styles.statusRow}>
                <CheckCircle2 color="#10B981" size={14} style={{ marginRight: 4 }} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}><Edit2 color="#6B7280" size={20} /></TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}