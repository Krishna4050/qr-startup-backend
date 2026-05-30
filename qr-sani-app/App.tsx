import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Conditionally require the URL polyfill so it doesn't break Web APIs
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

// Providers
import { ContentProvider } from './src/context/ContentContext';
import { AuthProvider, useAuth } from './src/context/AuthContext'; 

// Screens
import WebLayout from './src/components/WebLayout';
import MainTabs from './src/navigation/MainTabs';
import LoginScreen from './src/screens/LoginScreen';

if (Platform.OS === 'web') {
  document.title = 'ATS finland';
}

import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import VerificationWaitingScreen from './src/screens/VerificationWaitingScreen';
import OtpVerificationScreen from './src/screens/OtpVerificationScreen';
import TagRegistrationScreen from './src/screens/TagRegistrationScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import TrustedNetworkScreen from './src/screens/TrustedNetworkScreen';
import FilteredTagsScreen from './src/screens/FilteredTagsScreen';
import ContactManagerScreen from './src/screens/ContactManagerScreen';
import TagManageScreen from './src/screens/TagManageScreen';
import HostShopDetailsScreen from './src/screens/HostShopDetailsScreen';
import SharedTagsScreen from './src/screens/SharedTagsScreen';
import VehicleRepairDirectory from './src/screens/VehicleRepairDirectory';
import BikeRepairDirectory from './src/screens/BikeRepairDirectory';
import ParkingMap from './src/screens/ParkingMap';
import HotelSearch from './src/screens/HotelSearch';
import TransitPass from './src/screens/TransitPass';
import TrainSearch from './src/screens/TrainSearch';
import FlightSearch from './src/screens/FlightSearch';
import ShopDetailsScreen from './src/screens/ShopDetailsScreen';
import PartnerOnboardingIntroScreen from './src/screens/PartnerOnboardingIntroScreen';
import PartnerOnboardingStep1Screen from './src/screens/PartnerOnboardingStep1Screen';
import PartnerOnboardingVerificationScreen from './src/screens/PartnerOnboardingVerificationScreen';
import PartnerOnboardingStep2Screen from './src/screens/PartnerOnboardingStep2Screen';
import PartnerOnboardingStep3Screen from './src/screens/PartnerOnboardingStep3Screen';
import PartnerOnboardingStep4Screen from './src/screens/PartnerOnboardingStep4Screen';
import HostDashboardScreen from './src/screens/HostDashboardScreen';

// Chat Screens
import ChatScreen from './src/screens/ChatScreen';
import UserMessagesScreen from './src/screens/UserMessagesScreen';
import HostMessagesScreen from './src/screens/HostMessagesScreen';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: ['https://ats.krishnaadhikari.com', 'qr-sani-app://'],
  config: {
    initialRouteName: Platform.OS === 'web' ? 'Dashboard' : ('Onboarding' as any),
    screens: {
      Login: 'login',
      Dashboard: {
        path: 'dashboard',
        screens: {
          Home: 'Home',
          Services: 'Services',
          Scan: 'Scan',
          Profile: 'Profile',
          Store: 'Store'
        }
      },
      ServiceDirectory: 'directory',
      BikeRepairDirectory: 'bike-repair',
      ParkingMap: 'parking',
      HotelSearch: 'hotels',
      TransitPass: 'transit',
      TrainSearch: 'trains',
      FlightSearch: 'flights',
      ShopDetails: 'shop/:id',
      ChatScreen: 'chat/:shopId/:otherUserId',
      HostDashboard: 'host',
      HostShopDetails: 'host/shop/:id',
      Onboarding: 'welcome',
      UserMessages: 'messages',
      HostMessages: 'host/messages',
      PartnerOnboardingIntro: 'partner/start',
      Settings: 'settings',
    }
  }
};

// --- DECLARATIVE ROUTING IMPLEMENTATION ---
const GuestStack = () => (
  <Stack.Navigator initialRouteName={Platform.OS === 'web' ? 'Dashboard' : 'Onboarding'}>
    <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="Dashboard" component={MainTabs} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="ServiceDirectory" component={VehicleRepairDirectory} options={{ headerShown: false }} />
    <Stack.Screen name="BikeRepairDirectory" component={BikeRepairDirectory} options={{ headerShown: false }} />
    <Stack.Screen name="ParkingMap" component={ParkingMap} options={{ headerShown: false }} />
    <Stack.Screen name="HotelSearch" component={HotelSearch} options={{ headerShown: false }} />
    <Stack.Screen name="TransitPass" component={TransitPass} options={{ headerShown: false }} />
    <Stack.Screen name="TrainSearch" component={TrainSearch} options={{ headerShown: false }} />
    <Stack.Screen name="FlightSearch" component={FlightSearch} options={{ headerShown: false }} />
    <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PartnerOnboardingIntro" component={PartnerOnboardingIntroScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator initialRouteName="Dashboard">
    <Stack.Screen name="Dashboard" component={MainTabs} options={{ headerShown: false, gestureEnabled: false }} />
    <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{ headerShown: false }} />
    <Stack.Screen name="VerificationWaiting" component={VerificationWaitingScreen} options={{ headerShown: false }} />
    <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TagRegistration" component={TagRegistrationScreen} options={{ headerShown: false }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TrustedNetwork" component={TrustedNetworkScreen} options={{ headerShown: false }} />
    <Stack.Screen name="FilteredTags" component={FilteredTagsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ContactManager" component={ContactManagerScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TagManage" component={TagManageScreen} options={{ headerShown: false }} />
    <Stack.Screen name="HostShopDetails" component={HostShopDetailsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="SharedTags" component={SharedTagsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ServiceDirectory" component={VehicleRepairDirectory} options={{ headerShown: false }} />
    <Stack.Screen name="BikeRepairDirectory" component={BikeRepairDirectory} options={{ headerShown: false }} />
    <Stack.Screen name="ParkingMap" component={ParkingMap} options={{ headerShown: false }} />
    <Stack.Screen name="HotelSearch" component={HotelSearch} options={{ headerShown: false }} />
    <Stack.Screen name="TransitPass" component={TransitPass} options={{ headerShown: false }} />
    <Stack.Screen name="TrainSearch" component={TrainSearch} options={{ headerShown: false }} />
    <Stack.Screen name="FlightSearch" component={FlightSearch} options={{ headerShown: false }} />
    <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PartnerOnboardingIntro" component={PartnerOnboardingIntroScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PartnerOnboardingStep1" component={PartnerOnboardingStep1Screen} options={{ headerShown: false }} />
    <Stack.Screen name="PartnerOnboardingVerification" component={PartnerOnboardingVerificationScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PartnerOnboardingStep2" component={PartnerOnboardingStep2Screen} options={{ headerShown: false }} />
    <Stack.Screen name="PartnerOnboardingStep3" component={PartnerOnboardingStep3Screen} options={{ headerShown: false }} />
    <Stack.Screen name="PartnerOnboardingStep4" component={PartnerOnboardingStep4Screen} options={{ headerShown: false }} />
    <Stack.Screen name="HostDashboard" component={HostDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />
    <Stack.Screen name="UserMessages" component={UserMessagesScreen} options={{ headerShown: false }} />
    <Stack.Screen name="HostMessages" component={HostMessagesScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const Router = () => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    // Optionally render a global splash screen here
    return null; 
  }

  return user ? <AuthStack /> : <GuestStack />;
};

export default function App() {
  console.log("[DEBUG] App component rendering!");
  const handleNavigationReady = () => {
    console.log(`[Core] Routing Initialized for ${Platform.OS}`);
  };

  return (
    <AuthProvider>
      <ContentProvider>
        <NavigationContainer linking={linking} onReady={handleNavigationReady}>
          <WebLayout>
            <Router />
          </WebLayout>
        </NavigationContainer>
      </ContentProvider>
    </AuthProvider>
  );
}