import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyBGHsTgfizsw67h5-jfWvNHLv44iuY_WGY",
  authDomain: "ats-finland.firebaseapp.com",
  projectId: "ats-finland",
  storageBucket: "ats-finland.firebasestorage.app",
  messagingSenderId: "239920288218",
  appId: "1:239920288218:web:9fe54edd486118467170e3",
  measurementId: "G-GG7EHZT7QT"
};

let app: any;
let messaging: any = null;

if (Platform.OS === 'web') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  // Messaging is only supported in certain browsers context
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export { app, messaging };
