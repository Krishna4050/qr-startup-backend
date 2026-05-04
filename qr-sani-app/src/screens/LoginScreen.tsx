import { StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import GradientHeader from '../../components/GradientHeader';
import AuthForm from '../../components/AuthForm';

// Notice we added "{ navigation }" here so we can tell it to go to the Dashboard later!
export default function LoginScreen({ navigation }: any) {
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <GradientHeader />
      {/* We will pass the navigation tool into the form next time so the button works */}
      <AuthForm />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});