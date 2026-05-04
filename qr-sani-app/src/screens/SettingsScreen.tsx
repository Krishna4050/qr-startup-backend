import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TouchableWithoutFeedback } from 'react-native';
import { useContent } from '../context/ContentContext';

export default function SettingsScreen({ navigation }: any) {
  const content = useContent();
  const [taps, setTaps] = useState(0);

  // --- Deep Settings ---
  const handleVersionTap = () => {
    const newTaps = taps + 1;
    setTaps(newTaps);
    if (newTaps === 7) {
      
      const secret = [83, 97, 110, 105, 44, 32, 101, 118, 101, 110, 32, 104, 105, 100, 100, 101, 110, 32, 100, 101, 101, 112, 32, 105, 110, 32, 116, 104, 101, 32, 115, 101, 116, 116, 105, 110, 103, 115, 44, 32, 109, 121, 32, 108, 111, 118, 101, 32, 102, 111, 114, 32, 121, 111, 117, 32, 105, 115, 32, 97, 108, 119, 97, 121, 115, 32, 97, 99, 116, 105, 118, 101, 46, 32, 45, 32, 89, 111, 117, 114, 32, 76, 117, 99, 105, 102, 101, 114];
      Alert.alert("Lucifer & Mayalu", secret.map(c => String.fromCharCode(c)).join(''));
      setTaps(0);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{content.settings.title}</Text>
      
      {/* Spacer to push logout to the very bottom */}
      <View style={{ flex: 1 }} /> 

      <TouchableOpacity 
        style={styles.logoutBtn}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
      >
        <Text style={styles.logoutText}>{content.settings.logout}</Text>
      </TouchableOpacity>

      <TouchableWithoutFeedback onPress={handleVersionTap}>
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>App Version 1.0.0 (MNSKB Build)</Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { padding: 16, backgroundColor: '#FEE2E2', borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#EF4444', fontWeight: 'bold' },
  versionContainer: { marginTop: 24, alignItems: 'center' },
  versionText: { color: '#9CA3AF', fontSize: 12 }
});