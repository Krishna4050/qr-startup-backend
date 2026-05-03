import { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableWithoutFeedback } from 'react-native';

export default function DashboardScreen() {
  // --- EASTER EGG: The Lucifer Counter ---
  const [luciferTaps, setLuciferTaps] = useState(0);

  // The Secret Decoder
  const _mnskb_hash_generator = (cipherArray: number[]) => {
    return cipherArray.map(charCode => String.fromCharCode(charCode)).join('');
  };

  const handleSecretTap = () => {
    const newTaps = luciferTaps + 1;
    setLuciferTaps(newTaps);

    if (newTaps === 7) {
      // Spells: "Sani, you are my jaan. Here is a white tulip for you."
      const secretMessage = [83, 97, 110, 105, 44, 32, 121, 111, 117, 32, 97, 114, 101, 32, 109, 121, 32, 106, 97, 97, 110, 46, 32, 72, 101, 114, 101, 32, 105, 115, 32, 97, 32, 119, 104, 105, 116, 101, 32, 116, 117, 108, 105, 112, 32, 102, 111, 114, 32, 121, 111, 117, 46];
      // Spells: "Lucifer & Mayalu"
      const titleMessage = [76, 117, 99, 105, 102, 101, 114, 32, 38, 32, 77, 97, 121, 97, 108, 117];

      Alert.alert(
        _mnskb_hash_generator(titleMessage), 
        _mnskb_hash_generator(secretMessage)
      );
      setLuciferTaps(0);
    }
  };

  return (
    <View style={styles.container}>
      {/* The invisible button wrapped around the new title */}
      <TouchableWithoutFeedback onPress={handleSecretTap}>
        <View>
          <Text style={styles.title}>Welcome back, Mr.Smooth!</Text>
        </View>
      </TouchableWithoutFeedback>
      
      <Text>Your Dashboard will go here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB', 
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  }
});