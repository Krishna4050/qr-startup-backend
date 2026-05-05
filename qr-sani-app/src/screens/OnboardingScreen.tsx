import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, QrCode, Bell, ShieldCheck, ArrowRight } from 'lucide-react-native';
import { useContent } from '../context/ContentContext';
import { styles } from '../../styles/onboardingStyles';

export default function OnboardingScreen({ navigation }: any) {
  const content = useContent();

  return (
    <View style={styles.container}>
      <ScrollView bounces={false}>
        <LinearGradient colors={['#7C3AED', '#C026D3']} style={styles.headerGradient}>
          <View style={styles.iconWrapper}><Shield color="#FFFFFF" size={32} /></View>
          <Text style={styles.title}>{content.onboarding.title}</Text>
          <Text style={styles.subTitle}>{content.onboarding.subText}</Text>
        </LinearGradient>

        <View style={styles.featuresContainer}>
          <Text style={styles.howItWorks}>How it works</Text>
          
          <View style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: '#E0E7FF' }]}><QrCode color="#4F46E5" size={24} /></View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{content.onboarding.step1Title}</Text>
              <Text style={styles.featureDesc}>{content.onboarding.step1Text}</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: '#FAE8FF' }]}><Bell color="#C026D3" size={24} /></View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{content.onboarding.step2Title}</Text>
              <Text style={styles.featureDesc}>{content.onboarding.step2Text}</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIconBox, { backgroundColor: '#D1FAE5' }]}><ShieldCheck color="#059669" size={24} /></View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{content.onboarding.step3Title}</Text>
              <Text style={styles.featureDesc}>{content.onboarding.step3Text}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={() => navigation.navigate('ProfileSetup')}>
          <Text style={styles.nextBtnText}>{content.onboarding.nextBtn}</Text>
          <ArrowRight color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
}