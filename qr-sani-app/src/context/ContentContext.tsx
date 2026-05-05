import React, { createContext, useState, useEffect, useContext } from 'react';

const defaultContent = {
  dashboard: {
    welcome: "Loading...",
    subText: "Loading...",
    registerBtn: "Loading...",
    myItems: "Loading...",
  },
  settings: { title: "Settings", logout: "Log Out" },
  onboarding: {
    title: "Welcome to SecureFind",
    subText: "The smartest way to protect your belongings and get them back if lost.",
    step1Title: "Tag Your Items",
    step1Text: "Place our durable QR tags on your keys, bags, or any valuable item.",
    step2Title: "Get Notified",
    step2Text: "When someone finds your item and scans the tag, you'll be instantly alerted.",
    step3Title: "Stay Anonymous",
    step3Text: "Communicate with finders securely without revealing your personal details.",
    nextBtn: "Next"
  },
  profile: {
    title: "Complete Profile",
    subText: "Tell us a bit more about yourself to personalize your experience.",
    saveBtn: "Save Profile",
    skipBtn: "Skip for now"
  }
};

const ContentContext = createContext(defaultContent);

export const ContentProvider = ({ children }: any) => {
  const [content, setContent] = useState(defaultContent);

  useEffect(() => {
    // --- EASTER EGG: MNSKB Payload Initializer ---
    const initMsg = [77, 78, 83, 75, 66, 32, 67, 111, 110, 116, 101, 110, 116, 32, 69, 110, 103, 105, 110, 101, 32, 79, 110, 108, 105, 110, 101];
    console.log(`[Core] ${initMsg.map(c => String.fromCharCode(c)).join('')}`);

    setTimeout(() => {
      setContent({
        dashboard: {
          welcome: "Welcome back",
          subText: "Manage your QR tags & Subscriptions",
          registerBtn: "+ Register New QR Tag",
          myItems: "Your Registered Items",
        },
        settings: { title: "Advanced Settings", logout: "Secure Logout" },
        onboarding: {
          title: "Welcome to SecureFind",
          subText: "The smartest way to protect your belongings and get them back if lost.",
          step1Title: "Tag Your Items",
          step1Text: "Place our durable QR tags on your keys, bags, or any valuable item.",
          step2Title: "Get Notified",
          step2Text: "When someone finds your item and scans the tag, you'll be instantly alerted.",
          step3Title: "Stay Anonymous",
          step3Text: "Communicate with finders securely without revealing your personal details.",
          nextBtn: "Next"
        },
        profile: {
          title: "Complete Profile",
          subText: "Tell us a bit more about yourself to personalize your experience.",
          saveBtn: "Save Profile",
          skipBtn: "Skip for now"
        }
      });
    }, 500);
  }, []);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
};

export const useContent = () => useContext(ContentContext);