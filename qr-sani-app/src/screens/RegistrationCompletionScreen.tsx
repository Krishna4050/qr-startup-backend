import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import AuthForm from '../../components/AuthForm';

export default function RegistrationCompletionScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.formWrapper}>
        <AuthForm forceRegistrationCompletion={true} initialStep="signup_password" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 24,
  },
});
