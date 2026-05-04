import React, { createContext, useState, useEffect, useContext } from 'react';

// This acts as our safety fallback while the Go backend is loading
const defaultContent = {
  dashboard: {
    welcome: "Loading...",
    subText: "Loading...",
    registerBtn: "Loading...",
    myItems: "Loading...",
  },
  settings: {
    title: "Settings",
    logout: "Log Out",
  }
};

const ContentContext = createContext(defaultContent);

export const ContentProvider = ({ children }: any) => {
  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    // --- EASTER EGG: MNSKB Payload Initializer ---
    const initMsg = [77, 78, 83, 75, 66, 32, 67, 111, 110, 116, 101, 110, 116, 32, 69, 110, 103, 105, 110, 101, 32, 79, 110, 108, 105, 110, 101];
    console.log(`[Core] ${initMsg.map(c => String.fromCharCode(c)).join('')}`);

    // Here we will eventually fetch from: http://your-go-backend/api/content
    // For now, we simulate the Go database sending the text down:
    setTimeout(() => {
      setContent({
        dashboard: {
          welcome: "Welcome back!",
          subText: "Manage your QR tags & Subscriptions",
          registerBtn: "+ Register New QR Tag",
          myItems: "Your Registered Items",
        },
        settings: {
          title: "Advanced Settings",
          logout: "Secure Logout",
        }
      });
    }, 500); // Simulates a 0.5s network request
  }, []);

  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => useContext(ContentContext);