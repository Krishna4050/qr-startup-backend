import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, LayoutGrid, Plus, User, ShoppingBag } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import ServicesScreen from '../screens/ServicesScreen';
import { supabase_lucifer_core } from '../utils/supabase';
import VehicleRepairDirectory from '../screens/VehicleRepairDirectory';

// Import our screens
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ScanScreen from '../screens/ScanScreen';

// Temporary placeholder
const DummyScreen = () => <View style={{flex: 1, backgroundColor: '#F2F3F4'}} />

const Tab = createBottomTabNavigator();

// --- NEW: The Smart Interceptor Button ---
const CustomTabBarButton = ({ children }: any) => {
  const navigation = useNavigation<any>();
  const [isChecking, setIsChecking] = useState(false);

  const handlePress = async () => {
    setIsChecking(true); // Turn on the tiny spinner
    
    try {
      const { data: { user } } = await supabase_lucifer_core.auth.getUser();
      if (!user) return;

      // Check the database for mandatory fields
      const { data: profile } = await supabase_lucifer_core
        .from('profiles')
        .select('first_name, last_name, phone_number')
        .eq('id', user.id)
        .maybeSingle();

      // The Gatekeeper Check
      if (!profile?.first_name || !profile?.last_name || !profile?.phone_number) {
        Alert.alert(
          "Profile Incomplete",
          "You need to add your Name and Phone Number before scanning a tag. This ensures finders can contact you!",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Update Profile", 
              onPress: () => navigation.navigate('EditProfile') 
            }
          ]
        );
      } else {
        // They pass the check! Open the scanner.
        navigation.navigate('Scan');
      }
    } catch (error) {
      console.error("Gatekeeper error:", error);
      // Fallback: If network fails, let them try to scan anyway
      navigation.navigate('Scan'); 
    } finally {
      setIsChecking(false); // Turn off the spinner
    }
  };

  return (
    <TouchableOpacity
      style={{ top: -20, justifyContent: 'center', alignItems: 'center' }}
      onPress={handlePress}
      disabled={isChecking}
    >
      <View style={styles.scanButton}>
        {/* Show a spinner while checking DB, otherwise show the Plus icon */}
        {isChecking ? <ActivityIndicator color="#FFFFFF" /> : children}
      </View>
    </TouchableOpacity>
  );
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#0F2D4D',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        }
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
        options={{ tabBarIcon: ({ color }) => <Home color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Services" 
        component={ServicesScreen} 
        options={{ tabBarIcon: ({ color }) => <LayoutGrid color={color} size={24} /> }} 
      />
      
      {/* THE MIDDLE SCAN BUTTON */}
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen} 
        options={{ 
          tabBarIcon: () => <Plus color="#FFFFFF" size={32} />,
          // We pass our custom button here!
          tabBarButton: (props) => <CustomTabBarButton {...props} />
        }} 
      />

      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({ color }) => <User color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Store" 
        component={DummyScreen} 
        options={{ tabBarIcon: ({ color }) => <ShoppingBag color={color} size={24} /> }} 
      />
      <Tab.Screen name="VehicleRepairDirectory" component={VehicleRepairDirectory} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scanButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0F2D4D', justifyContent: 'center', alignItems: 'center', shadowColor: '#0F2D4D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }
});