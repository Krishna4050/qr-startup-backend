import TagRegistrationScreen from './src/screens/TagRegistrationScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import TrustedNetworkScreen from './src/screens/TrustedNetworkScreen';
import FilteredTagsScreen from './src/screens/FilteredTagsScreen';
import ContactManagerScreen from './src/screens/ContactManagerScreen';
import TagManageScreen from './src/screens/TagManageScreen';
import 'react-native-url-polyfill/auto';
import MainTabs from './src/navigation/MainTabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SharedTagsScreen from './src/screens/SharedTagsScreen';

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

  return (
    <AuthProvider>
      <ContentProvider>
        <NavigationContainer onReady={handleNavigationReady}>
          <Stack.Navigator initialRouteName="Login">
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
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} options={{ headerShown: false, gestureEnabled: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </ContentProvider>
    </AuthProvider>
  );
}