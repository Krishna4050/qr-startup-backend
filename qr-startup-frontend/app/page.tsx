'use client';

import { useState, useEffect } from 'react';
import { Phone, MessageCircle, ShieldCheck, Backpack, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function FinderPage() {
  const [step, setStep] = useState('initial'); 
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [messageText, setMessageText] = useState(''); 
  const [resendTimer, setResendTimer] = useState(30);
  
  // New state to handle loading spinners while waiting for the backend
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // The REAL Send OTP Function
  const handleSendOTP = async () => {
    if (!phoneNumber) return alert("Please enter a valid phone number.");
    
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/verify/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          turnstile_token: 'dummy-token-for-testing' // In production, this comes from the real Cloudflare widget
        }),
      });

      if (!response.ok) throw new Error("Failed to send OTP");

      setStep('otp');
      setResendTimer(30);
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please check your backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  //Verify & Call Function
  const handleVerifyAndCall = async () => {
    if (otpCode.length !== 6) return alert("Please enter the 6-digit code.");
    
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/verify/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          code: otpCode,
          tag_id: 'fake-tag-123' // In production, we read this from the website URL!
        }),
      });

      if (!response.ok) throw new Error("Invalid Code");

      setStep('success');
    } catch (error) {
      console.error(error);
      alert("Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    setStep('success');
  };

  const BackButton = () => (
    <button 
      onClick={() => setStep('initial')}
      className="flex items-center text-gray-500 hover:text-gray-800 mb-4 transition-colors text-sm font-medium"
      disabled={isLoading}
    >
      <ArrowLeft size={16} className="mr-1" />
      Back
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col items-center py-12 px-4 font-sans text-slate-800">
      
      <h1 className="text-3xl font-extrabold mb-8 text-center tracking-tight">
        Help returning this item!
      </h1>

      <div className="w-full max-w-md space-y-4">
        
        {/* ITEM CARD */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-4 rounded-xl text-red-500">
            <Backpack size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Lost Backpack</h2>
            <p className="text-gray-500 text-sm font-medium mt-1">Reported missing</p>
            <p className="text-gray-400 text-xs mt-1">Tag ID: #QR-4829</p>
          </div>
        </div>

        {/* PRIVACY SHIELD */}
        <div className="bg-[#EEFBF1] p-5 rounded-2xl border border-green-200 flex gap-3">
          <ShieldCheck className="text-green-600 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-green-900 mb-1">Your Privacy is Protected</h3>
            <p className="text-green-800 text-sm leading-relaxed">
              Phone numbers are completely hidden and secure. Our system connects you without revealing personal contact information to either party.
            </p>
          </div>
        </div>

        {/* DYNAMIC ACTION AREA */}
        <div className="pt-4">
          
          {step === 'initial' && (
            <div className="space-y-3">
              <button 
                onClick={() => setStep('phone')}
                className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold py-4 rounded-xl flex justify-center items-center gap-2 transition-colors shadow-md"
              >
                <Phone size={20} />
                Call Owner Securely
              </button>
              
              <button 
                onClick={() => setStep('message')}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 rounded-xl flex justify-center items-center gap-2 transition-colors border-2 border-gray-200 shadow-sm"
              >
                <MessageCircle size={20} />
                Send a Message
              </button>
            </div>
          )}

          {step === 'phone' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
              <BackButton />
              <h3 className="font-bold text-lg mb-2">Verify your device</h3>
              <p className="text-sm text-gray-500 mb-4">We'll text you a code to prevent spam calls.</p>
              
              <input 
                type="tel" 
                placeholder="+1 (555) 000-0000"
                className="w-full p-4 border border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
              />

              <div className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl mb-4 flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" disabled checked /> 
                  Verify you are human
                </div>
                <span className="font-bold text-xs">Cloudflare</span>
              </div>

              <button 
                onClick={handleSendOTP}
                disabled={isLoading}
                className="w-full bg-[#2563EB] disabled:bg-blue-400 text-white font-semibold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send Code'} <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4">
              <button 
                onClick={() => setStep('phone')}
                className="flex items-center text-gray-500 hover:text-gray-800 mb-4 transition-colors text-sm font-medium"
                disabled={isLoading}
              >
                <ArrowLeft size={16} className="mr-1" />
                Change Number
              </button>

              <h3 className="font-bold text-lg mb-2">Enter Verification Code</h3>
              <p className="text-sm text-gray-500 mb-4">Sent to {phoneNumber}</p>
              
              <input 
                type="number" 
                placeholder="123456"
                className="w-full p-4 border border-gray-300 rounded-xl mb-4 text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength={6}
                disabled={isLoading}
              />

              <button 
                onClick={handleVerifyAndCall}
                disabled={isLoading || otpCode.length !== 6}
                className="w-full bg-green-600 disabled:bg-green-400 text-white font-semibold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-green-700 mb-4 transition-colors"
              >
                {isLoading ? 'Verifying...' : 'Verify & Connect Call'}
              </button>

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend code in <span className="font-semibold">{resendTimer}s</span>
                  </p>
                ) : (
                  <button 
                    onClick={handleSendOTP}
                    disabled={isLoading}
                    className="text-sm text-[#2563EB] font-semibold hover:underline"
                  >
                    Didn't receive it? Resend Code
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'message' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
              <BackButton />
              <h3 className="font-bold text-lg mb-2">Send a Message</h3>
              <p className="text-sm text-gray-500 mb-4">Your message will be securely forwarded to the owner.</p>
              
              <textarea 
                placeholder="Hi, I found your backpack at the coffee shop. I gave it to the barista at the front counter."
                className="w-full p-4 border border-gray-300 rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-30 resize-none"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <button 
                onClick={handleSendMessage}
                className="w-full bg-[#2563EB] text-white font-semibold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-blue-700"
              >
                Send Secure Message <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200 text-center animate-in zoom-in-95">
              <CheckCircle2 className="text-green-500 mx-auto mb-3" size={48} />
              <h3 className="font-bold text-xl text-green-900 mb-2">Request Sent!</h3>
              <p className="text-green-800 text-sm">
                Thank you for being a great human. The owner has been notified.
              </p>
              <button 
                onClick={() => setStep('initial')}
                className="mt-6 text-green-700 font-semibold text-sm hover:underline"
              >
                Return to home
              </button>
            </div>
          )}

        </div>
      </div>

      <p className="mt-12 text-sm text-gray-400 font-medium">
        Powered by Krishna
      </p>
    </div>
  );
}