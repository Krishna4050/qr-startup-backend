import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useContent } from '../context/ContentContext';
import { styles } from '../../styles/profileStyles';
import { useNavigation } from '@react-navigation/native';

export default function ProfileSetupScreen() {
  const content = useContent();
  const navigation = useNavigation<any>();

  // In the future, this will push data to Supabase. For now, it advances the UI.
  const handleComplete = () => navigation.navigate('Dashboard', { sani_profile_skipped: false });
  const handleSkip = () => navigation.navigate('Dashboard', { sani_profile_skipped: true });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{content.profile.title}</Text>
        <Text style={styles.subTitle}>{content.profile.subText}</Text>
      </View>
      
      <ScrollView style={styles.form}>
        <Text style={styles.sectionTitle}>PERSONAL INFO</Text>
        <TextInput style={styles.input} placeholder="First Name" />
        <TextInput style={styles.input} placeholder="Last Name" />
        
        <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
        <TextInput style={styles.input} placeholder="Username" />
        <TextInput style={styles.input} placeholder="Contact Number" keyboardType="phone-pad" />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleComplete}>
          <Text style={styles.saveBtnText}>{content.profile.saveBtn}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>{content.profile.skipBtn}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}