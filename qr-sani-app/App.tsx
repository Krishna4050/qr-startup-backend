import React, { Component } from 'react';
import { View, Text, ScrollView, Platform, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

class GlobalErrorBoundary extends Component<any, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: 'red', padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>APP CRASHED!</Text>
          <ScrollView>
            <Text style={{ color: 'white', marginTop: 10 }}>{this.state.error?.toString()}</Text>
            <Text style={{ color: 'white', marginTop: 10 }}>{this.state.error?.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

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
import CookieConsentModal from './components/CookieConsentModal';
import LoginScreen from './src/screens/LoginScreen';
import RegistrationCompletionScreen from './src/screens/RegistrationCompletionScreen';

if (Platform.OS === 'web') {
  document.title = 'Aicrett';
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
import FlightCheckoutScreen from './src/screens/FlightCheckout';
import FlightDetailsScreen from './src/screens/FlightDetailsScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import ShopDetailsScreen from './src/screens/ShopDetailsScreen';
import PartnerOnboardingIntroScreen from './src/screens/PartnerOnboardingIntroScreen';
import PartnerOnboardingStep1Screen from './src/screens/PartnerOnboardingStep1Screen';
import PartnerOnboardingVerificationScreen from './src/screens/PartnerOnboardingVerificationScreen';
import PartnerOnboardingStep2Screen from './src/screens/PartnerOnboardingStep2Screen';
import PartnerOnboardingStep3Screen from './src/screens/PartnerOnboardingStep3Screen';
import PartnerOnboardingStep4Screen from './src/screens/PartnerOnboardingStep4Screen';
import HostDashboardScreen from './src/screens/HostDashboardScreen';
import PricingScreen from './src/screens/PricingScreen';
import LegalScreen from './src/screens/LegalScreen';

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
      FlightCheckout: 'flights/checkout',
      FlightDetails: 'flights/details',
      ShopDetails: 'shop/:id',
      ChatScreen: 'chat/:shopId/:otherUserId',
      HostDashboard: 'host',
      HostShopDetails: 'host/shop/:id',
      Onboarding: 'welcome',
      UserMessages: 'messages',
      HostMessages: 'host/messages',
      PartnerOnboardingIntro: 'partner/start',
      Settings: 'settings',
      Pricing: 'pricing',
      Legal: 'legal/:type',
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
    <Stack.Screen name="FlightCheckout" component={FlightCheckoutScreen} options={{ headerShown: false }} />
    <Stack.Screen name="FlightDetails" component={FlightDetailsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Services" component={ServicesScreen} options={{ headerShown: false }} />

    <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PartnerOnboardingIntro" component={PartnerOnboardingIntroScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Pricing" component={PricingScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Legal" component={LegalScreen} options={{ headerShown: false }} />
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
    <Stack.Screen name="Pricing" component={PricingScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ParkingMap" component={ParkingMap} options={{ headerShown: false }} />
    <Stack.Screen name="HotelSearch" component={HotelSearch} options={{ headerShown: false }} />
    <Stack.Screen name="TransitPass" component={TransitPass} options={{ headerShown: false }} />
    <Stack.Screen name="TrainSearch" component={TrainSearch} options={{ headerShown: false }} />
    <Stack.Screen name="FlightCheckout" component={FlightCheckoutScreen} options={{ headerShown: false }} />
    <Stack.Screen name="FlightDetails" component={FlightDetailsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Services" component={ServicesScreen} options={{ headerShown: false }} />

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
    <Stack.Screen name="Legal" component={LegalScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const Router = () => {
  const { user, isLoading, isFullyRegistered } = useAuth();
  
  if (isLoading) {
    // Optionally render a global splash screen here
    return null; 
  }

  // 🔒 HARDCORE SECURITY LOCKOUT: Guests and incomplete registrations stay in GuestStack
  if (!user || !isFullyRegistered) {
    return <GuestStack />;
  }

  return <AuthStack />;
};

export default function App() {
  console.log("[DEBUG] App component rendering!");
  const handleNavigationReady = () => {
    console.log(`[Core] Routing Initialized for ${Platform.OS}`);
  };

  return (
    <AuthProvider>
      <ContentProvider>
        <NavigationContainer 
          linking={linking} 
          onReady={handleNavigationReady}
          documentTitle={{
            formatter: (options, route) => options?.title ?? 'Aicrett'
          }}
        >
          <WebLayout>
            <GlobalErrorBoundary>
              <Router />
              <CookieConsentModal />
            </GlobalErrorBoundary>
          </WebLayout>
        </NavigationContainer>
      </ContentProvider>
    </AuthProvider>
  );
}