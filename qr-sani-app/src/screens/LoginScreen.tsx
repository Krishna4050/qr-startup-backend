import React from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, View } from 'react-native';
import GradientHeader from '../../components/GradientHeader';
import AuthForm from '../../components/AuthForm';
import ResponsiveWrapper from '../components/ResponsiveWrapper';

export default function LoginScreen({ navigation }: any) {
  return (
    <ResponsiveWrapper bg="#F3F4F6" maxWidth={480}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {Platform.OS !== 'web' && <GradientHeader />}
        
        <View style={styles.formContainer}>
          <AuthForm />
        </View>

      </KeyboardAvoidingView>
    </ResponsiveWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  formContainer: {
    flex: 1,
  }
});