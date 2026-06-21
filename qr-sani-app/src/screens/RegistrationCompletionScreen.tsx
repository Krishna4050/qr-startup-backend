import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import AuthForm from '../../components/AuthForm';

export default function RegistrationCompletionScreen() {
  return <AuthForm forceRegistrationCompletion={true} initialStep="signup_password" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
});
