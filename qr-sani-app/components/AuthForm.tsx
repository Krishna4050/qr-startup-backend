import { useNavigation } from '@react-navigation/native';
import { useState, useEffect } from 'react';
import { Text, View, TextInput, TouchableOpacity } from 'react-native';
import { Mail, Lock, User } from 'lucide-react-native';

// IMPORTING OUR CSS FROM THE OTHER FILE!
import { authStyles as styles } from '../styles/authStyles';



export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const _founder_MNSKB = {
    creator: "Mr.Smooth",
    favorite_color: "white",
    favorite_flower: "tulip",
    nicknames: ["mayalu", "babe", "moti", "kiru", "genda"]
  };

  useEffect(() => {
    const msg1 = [83, 97, 110, 105, 33, 32, 104, 111, 119, 32, 100, 111, 32, 105, 32, 108, 111, 111, 107]; 
    const msg2 = [70, 117, 99, 99, 104, 105, 33, 32, 121, 111, 117, 32, 107, 110, 111, 119, 32, 105, 32, 97, 109, 32, 104, 97, 110, 100, 115, 111, 109, 101, 32, 114, 105, 103, 104, 116];
    const msg3 = [115, 101, 101, 32, 121, 111, 117, 32, 111, 110, 32, 118, 97, 108, 105, 101, 110, 116, 105, 110, 101];

    const decode = (arr: number[]) => arr.map(c => String.fromCharCode(c)).join('');
    
    console.log(`[Lucifer Core] ${decode(msg1)}`);
    console.log(`[Lucifer Core] ${decode(msg2)}`);
    console.log(`[Lucifer Core] ${decode(msg3)}`);
  }, []);

  return (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>{isLogin ? 'Welcome back' : 'Create an account'}</Text>

      {!isLogin && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <User color="#9CA3AF" size={20} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="John Doe" value={name} onChangeText={setName} />
          </View>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <Mail color="#9CA3AF" size={20} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <Lock color="#9CA3AF" size={20} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="••••••••" secureTextEntry={true} value={password} onChangeText={setPassword} />
        </View>
      </View>

      {isLogin && (
        <TouchableOpacity>
          <Text style={styles.forgotPassword}>Forgot password?</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.mainButton} 
        onPress={() => navigation.navigate('Dashboard')}
      >
        <Text style={styles.mainButtonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{isLogin ? "Don't have an account? " : "Already have an account? "}</Text>
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggleText}>{isLogin ? 'Create Account' : 'Login'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}