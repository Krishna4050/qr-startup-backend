import { useState } from 'react';
import { Text, View, Alert, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield } from 'lucide-react-native';

// IMPORTING OUR CSS FROM THE OTHER FILE!
import { headerStyles as styles } from '../styles/headerStyles';

export default function GradientHeader() {
  const [luciferTaps, setLuciferTaps] = useState(0);

  const _mnskb_hash_generator = (cipherArray: number[]) => {
    return cipherArray.map(charCode => String.fromCharCode(charCode)).join('');
  };

  const handleMyTap = () => {
    const newTaps = luciferTaps + 1;
    setLuciferTaps(newTaps);

    if (newTaps === 7) {
      const displayMessage = [83, 97, 110, 105, 33, 32, 73, 32, 119, 105, 108, 108, 32, 97, 108, 119, 97, 121, 115, 32, 98, 101, 32, 98, 121, 32, 121, 111, 117, 114, 32, 115, 105, 100, 101, 32, 110, 111, 32, 109, 97, 116, 116, 101, 114, 32, 119, 104, 97, 116, 46];
      const titleMessage = [77, 114, 46, 83, 109, 111, 111, 116, 104, 32, 38, 32, 77, 78, 83, 75, 66];

      Alert.alert(
        _mnskb_hash_generator(titleMessage), 
        _mnskb_hash_generator(displayMessage)
      );
      setLuciferTaps(0);
    }
  };

  return (
    <LinearGradient colors={['#4F46E5', '#2563EB']} style={styles.headerContainer}>
      <View style={styles.iconContainer}>
        <Shield color="#FFFFFF" size={32} />
      </View>

      <TouchableWithoutFeedback onPress={handleMyTap}>
        <View>
          <Text style={styles.headerTitle}>Protect what matters most.</Text>
        </View>
      </TouchableWithoutFeedback>

      <Text style={styles.headerSubtitle}>
        Connect securely with finders. Tag your valuables, keep your phone number private.
      </Text>
    </LinearGradient>
  );
}