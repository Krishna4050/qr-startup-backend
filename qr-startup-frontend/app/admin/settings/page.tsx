'use client';

import { useState, useEffect } from 'react';
import { Settings, MessageSquare, PhoneCall, ShieldAlert, Loader2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    twilio_sms_enabled: false,
    twilio_call_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  

  // Fetch current settings from Go Backend on load
  useEffect(() => {
    // DEFINE the function INSIDE the useEffect
    const fetchSettings = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const response = await fetch(`${backendUrl}/api/admin/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings({
            twilio_sms_enabled: data.twilio_sms_enabled || false,
            twilio_call_enabled: data.twilio_call_enabled || false,
          });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // CALL the function immediately
    fetchSettings();
  }, []); // 
  // SECURITY: Automatically log out if the browser or tab is closed
  useEffect(() => {
    const handleUnload = () => {
      // Force Supabase to clear the session securely
      const backendUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (backendUrl) {
        // We use synchronous navigator.sendBeacon or localStorage clearing
        // so it fires reliably before the tab dies
        localStorage.clear();
        sessionStorage.clear();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  // Flip the switch and tell the Go Backend
  const toggleSetting = async (key: string, currentValue: boolean) => {
    setIsSaving(key);
    const newValue = !currentValue;

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/admin/update-setting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: key,
          settingValue: newValue,
        }),
      });

      if (response.ok) {
        // Update the UI instantly if successful
        setSettings(prev => ({ ...prev, [key]: newValue }));
      } else {
        alert("Failed to update setting. Please try again.");
      }
    } catch (error) {
      console.error("Error updating setting:", error);
      alert("Network error.");
    } finally {
      setIsSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <Settings className="text-blue-600" size={32} />
            System Control Panel
          </h1>
          <p className="text-gray-500 mt-2">Manage global killswitches and third-party integrations.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-slate-800 p-4 border-b border-gray-200 flex items-center gap-2">
            <ShieldAlert className="text-yellow-400" size={20} />
            <h2 className="text-white font-semibold">Twilio Proxy Architecture</h2>
          </div>

          <div className="p-6 space-y-6">
            
            {/* SMS TOGGLE */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${settings.twilio_sms_enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">SMS OTP Verification</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    When active, the system sends real texts via Twilio. When paused, texts are intercepted and printed to the server terminal to save credits (Mock Mode).
                  </p>
                </div>
              </div>

              <button
                onClick={() => toggleSetting('twilio_sms_enabled', settings.twilio_sms_enabled)}
                disabled={isSaving === 'twilio_sms_enabled'}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                  settings.twilio_sms_enabled ? 'bg-green-500' : 'bg-gray-300'
                } ${isSaving === 'twilio_sms_enabled' ? 'opacity-50 cursor-wait' : ''}`}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                  settings.twilio_sms_enabled ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

            {/* CALL TOGGLE */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${settings.twilio_call_enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                  <PhoneCall size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Anonymous Proxy Calls</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    When active, Finders and Owners are bridged together via live phone call. When paused, users hear a maintenance message and the call drops immediately.
                  </p>
                </div>
              </div>

              <button
                onClick={() => toggleSetting('twilio_call_enabled', settings.twilio_call_enabled)}
                disabled={isSaving === 'twilio_call_enabled'}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                  settings.twilio_call_enabled ? 'bg-green-500' : 'bg-gray-300'
                } ${isSaving === 'twilio_call_enabled' ? 'opacity-50 cursor-wait' : ''}`}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${
                  settings.twilio_call_enabled ? 'translate-x-6' : ''
                }`} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}