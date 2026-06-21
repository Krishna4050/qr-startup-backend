import React from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, View } from 'react-native';
import GradientHeader from '../../components/GradientHeader';
import AuthForm from '../../components/AuthForm';
import ResponsiveWrapper from '../components/ResponsiveWrapper';

export default function LoginScreen({ navigation }: any) {
  return <AuthForm />;
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