import TagRegistrationScreen from './src/screens/TagRegistrationScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import TrustedNetworkScreen from './src/screens/TrustedNetworkScreen';
import FilteredTagsScreen from './src/screens/FilteredTagsScreen';
import ContactManagerScreen from './src/screens/ContactManagerScreen';
import TagManageScreen from './src/screens/TagManageScreen';
import 'react-native-url-polyfill/auto';
import MainTabs from './src/navigation/MainTabs';
import HostShopDetailsScreen from './src/screens/HostShopDetailsScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SharedTagsScreen from './src/screens/SharedTagsScreen';
import VehicleRepairDirectory from './src/screens/VehicleRepairDirectory';
import ShopDetailsScreen from './src/screens/ShopDetailsScreen';
import PartnerOnboardingIntroScreen from './src/screens/PartnerOnboardingIntroScreen';
import PartnerOnboardingStep1Screen from './src/screens/PartnerOnboardingStep1Screen';
import PartnerOnboardingVerificationScreen from './src/screens/PartnerOnboardingVerificationScreen';
import PartnerOnboardingStep2Screen from './src/screens/PartnerOnboardingStep2Screen';
import PartnerOnboardingStep3Screen from './src/screens/PartnerOnboardingStep3Screen';
import PartnerOnboardingStep4Screen from './src/screens/PartnerOnboardingStep4Screen';
import HostDashboardScreen from './src/screens/HostDashboardScreen';
import HostSettingsScreen from './src/screens/HostSettingsScreen';
import ChatScreen from './src/screens/ChatScreen';
import HostMessagesScreen from './src/screens/HostMessagesScreen';
import UserMessagesScreen from './src/screens/UserMessagesScreen';
//import ServicesScreen from './src/screens/ServicesScreen';

// Providers
import { ContentProvider } from './src/context/ContentContext';
import { AuthProvider } from './src/context/AuthContext'; 

// Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import VerificationWaitingScreen from './src/screens/VerificationWaitingScreen'; // NEW!
import OtpVerificationScreen from './src/screens/OtpVerificationScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const handleNavigationReady = () => {
    const routeMsg = [77, 78, 83, 75, 66, 32, 82, 111, 117, 116, 105, 110, 103, 32, 73, 110, 105, 116, 105, 97, 108, 105, 122, 101, 100, 46];
    const decode = (arr: number[]) => arr.map(c => String.fromCharCode(c)).join('');
    console.log(`[Core] ${decode(routeMsg)}`);
  };

  const linking = {
    prefixes: ['http://app.krishnaadhikari.com', 'http://localhost:8081', 'exp://'],
    config: {
      screens: {
        Dashboard: '',
        Login: 'login',
        VehicleRepairDirectory: 'repair-directory',
        ShopDetails: 'shop/:id',
      },
    },
  };

  return (
    <AuthProvider>
      <ContentProvider>
        <NavigationContainer linking={linking} onReady={handleNavigationReady}>
          <Stack.Navigator initialRouteName="Dashboard">
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            
            {/* THE LOCKDOWN SCREEN - gestureEnabled: false kills the iOS swipe back! */}
            <Stack.Screen 
              name="VerificationWaiting" 
              component={VerificationWaitingScreen} 
              options={{ headerShown: false, gestureEnabled: false }} 
            />

            {/* ONBOARDING IS ALSO LOCKED DOWN */}
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="TrustedNetwork" component={TrustedNetworkScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Dashboard" component={MainTabs} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="TagRegistration" component={TagRegistrationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="FilteredTags" component={FilteredTagsScreen} options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="TagManage" component={TagManageScreen} options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="ContactManager" component={ContactManagerScreen} options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="SharedTags" component={SharedTagsScreen} options={{ headerShown: false, presentation: 'modal'}} />
            <Stack.Screen name="HostShopDetails" component={HostShopDetailsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="PartnerOnboardingIntro" component={PartnerOnboardingIntroScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PartnerOnboardingStep1" component={PartnerOnboardingStep1Screen} options={{ headerShown: false }} />
            <Stack.Screen name="PartnerOnboardingStep3" component={PartnerOnboardingStep3Screen} options={{ headerShown: false }} />
            <Stack.Screen name="PartnerOnboardingVerification" component={PartnerOnboardingVerificationScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PartnerOnboardingStep2" component={PartnerOnboardingStep2Screen} options={{ headerShown: false }} />
            <Stack.Screen name="PartnerOnboardingStep4" component={PartnerOnboardingStep4Screen} options={{ headerShown: false }} />
            <Stack.Screen name="HostDashboard" component={HostDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HostSettings" component={HostSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HostMessages" component={HostMessagesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="UserMessages" component={UserMessagesScreen} options={{ headerShown: false }} />
            
          </Stack.Navigator>
        </NavigationContainer>
      </ContentProvider>
    </AuthProvider>
  );
}