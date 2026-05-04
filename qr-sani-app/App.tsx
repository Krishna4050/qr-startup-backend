import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Context Provider
import { ContentProvider } from './src/context/ContentContext';

// Separated Screens
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  
  // ---MNSKB Routing Log ---
  const handleNavigationReady = () => {
    // "MNSKB Routing Initialized."
    const routeMsg = [77, 78, 83, 75, 66, 32, 82, 111, 117, 116, 105, 110, 103, 32, 73, 110, 105, 116, 105, 97, 108, 105, 122, 101, 100, 46];
    const decode = (arr: number[]) => arr.map(c => String.fromCharCode(c)).join('');
    console.log(`[Core] ${decode(routeMsg)}`);
  };

  return (
    <ContentProvider>
      <NavigationContainer onReady={handleNavigationReady}>
        <Stack.Navigator 
          initialRouteName="Login"
          
        >
          
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />

          {/* Hidden Header for the Custom UI */}
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen} 
            options={{ headerShown: false }} 
          />

          {/* Deep Settings with automatic Native Back Button */}
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ title: 'Settings' }} 
          />

        </Stack.Navigator>
      </NavigationContainer>
    </ContentProvider>
  );
}