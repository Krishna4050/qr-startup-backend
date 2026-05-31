importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBGHsTgfizsw67h5-jfWvNHLv44iuY_WGY",
  authDomain: "ats-finland.firebaseapp.com",
  projectId: "ats-finland",
  storageBucket: "ats-finland.firebasestorage.app",
  messagingSenderId: "239920288218",
  appId: "1:239920288218:web:9fe54edd486118467170e3",
  measurementId: "G-GG7EHZT7QT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico' // Or path to your app's icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
