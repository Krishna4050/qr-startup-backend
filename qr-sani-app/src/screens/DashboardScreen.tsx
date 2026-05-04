import { useState } from 'react';
import { View, Text, Alert, TouchableWithoutFeedback, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Plus, Key, Briefcase, Bike, Edit2, CheckCircle2, Settings } from 'lucide-react-native';

// Importing our Text Engine, Router, and STYLES!
import { useContent } from '../context/ContentContext';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../../styles/dashboardStyles';

// Dummy data (until we fetch items from Go)
const MY_ITEMS = [
  { id: '1', title: 'House Keys', icon: 'key' },
  { id: '2', title: 'Work Bag', icon: 'bag' },
  { id: '3', title: 'Bicycle', icon: 'bike' },
];

export default function DashboardScreen() {
  const content = useContent(); 
  const navigation = useNavigation<any>();
  
  // --- The main Counter ---
  const [luciferTaps, setLuciferTaps] = useState(0);

  const _mnskb_hash_generator = (cipherArray: number[]) => {
    return cipherArray.map(charCode => String.fromCharCode(charCode)).join('');
  };

  const handleSecretTap = () => {
    const newTaps = luciferTaps + 1;
    setLuciferTaps(newTaps);

    if (newTaps === 7) {
      const secretMessage = [83, 97, 110, 105, 44, 32, 121, 111, 117, 32, 97, 114, 101, 32, 109, 121, 32, 106, 97, 97, 110, 46, 32, 72, 101, 114, 101, 32, 105, 115, 32, 97, 32, 119, 104, 105, 116, 101, 32, 116, 117, 108, 105, 112, 32, 102, 111, 114, 32, 121, 111, 117, 46];
      const titleMessage = [76, 117, 99, 105, 102, 101, 114, 32, 38, 32, 77, 97, 121, 97, 108, 117];

      Alert.alert(
        _mnskb_hash_generator(titleMessage), 
        _mnskb_hash_generator(secretMessage)
      );
      setLuciferTaps(0);
    }
  };

  const renderIcon = (iconName: string) => {
    switch(iconName) {
      case 'key': return <Key color="#3B82F6" size={24} />;
      case 'bag': return <Briefcase color="#3B82F6" size={24} />;
      case 'bike': return <Bike color="#3B82F6" size={24} />;
      default: return <Key color="#3B82F6" size={24} />;
    }
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      
      {/* THE PURPLE HEADER */}
      <LinearGradient
        colors={['#4F46E5', '#9333EA']} 
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerContent}>
            <View style={styles.profileCircle}>
              <User color="#4F46E5" size={32} />
            </View>
            <View>
              <TouchableWithoutFeedback onPress={handleSecretTap}>
                <View>
                  <Text style={styles.welcomeText}>{content.dashboard.welcome}</Text>
                </View>
              </TouchableWithoutFeedback>
              <Text style={styles.subText}>{content.dashboard.subText}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
             <Settings color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* THE FLOATING REGISTER BUTTON */}
      <View style={styles.actionButtonContainer}>
        <TouchableOpacity style={styles.registerButton}>
          <Plus color="#2563EB" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.registerButtonText}>{content.dashboard.registerBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* THE ITEMS LIST */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>{content.dashboard.myItems}</Text>

        {MY_ITEMS.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemIconContainer}>
              {renderIcon(item.icon)}
            </View>
            
            <View style={styles.itemDetails}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <View style={styles.statusRow}>
                <CheckCircle2 color="#10B981" size={14} style={{ marginRight: 4 }} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.editButton}>
              <Edit2 color="#6B7280" size={20} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}