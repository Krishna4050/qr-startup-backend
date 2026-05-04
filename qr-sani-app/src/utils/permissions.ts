import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';

export const requestScannerPermissions = async () => {
  // Ask for Camera
  const cameraStatus = await Camera.requestCameraPermissionsAsync();
  if (cameraStatus.status !== 'granted') {
    Alert.alert("Permission Needed", "We need camera access to scan QR tags.");
    return false;
  }

  // Ask for Location (To log where the tag was registered)
  const locationStatus = await Location.requestForegroundPermissionsAsync();
  if (locationStatus.status !== 'granted') {
    Alert.alert("Permission Needed", "Location helps secure your tag's starting point.");
    return false;
  }

  // Ask for Audio
  const audioStatus = await Audio.requestPermissionsAsync();
  
  return true; // All critical permissions granted!
};