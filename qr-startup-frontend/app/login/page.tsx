'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ShieldCheck, Loader2, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // SECURITY: Always log out anyone currently logged in when this page loads
  useEffect(() => {
    supabase.auth.signOut();
  }, [supabase.auth]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. PRE-CHECK: Ask the Go Backend if this email is an Admin
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const checkRes = await fetch(`${backendUrl}/api/admin/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        
        // IF NOT ADMIN: Throw an error and STOP immediately. No email sent!
        if (!checkData.isAdmin) {
          setError("Unauthorized: This email does not have administrator access.");
          setIsLoading(false);
          return; 
        }
      } else {
        setError("Failed to verify security credentials.");
        setIsLoading(false);
        return;
      }

      // 2. IF ADMIN: Safe to proceed! Send the 6-digit code.
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }, 
      });

      if (error) {
        setError(error.message);
      } else {
        setStep('otp'); 
      }
    } catch (err) {
      console.error(err);
      setError("Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Verify the 6-digit code
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      // Success! Send them to the locked admin dashboard
      router.push('/admin/settings');
      router.refresh(); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-slate-800 p-3 rounded-2xl shadow-lg">
            <ShieldCheck className="text-green-400" size={32} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-800 tracking-tight">
          Secure Admin Access
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'email' ? 'Enter your authorized admin email.' : 'Enter the 6-digit code sent to your email.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 mb-6">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form className="space-y-6" onSubmit={handleSendCode}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Email Address</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="email"
                    required
                    className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-slate-800"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 focus:outline-none disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyCode}>
              <div>
                <label className="block text-sm font-medium text-gray-700">6-Digit Secure Code</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    className="appearance-none block w-full text-center tracking-widest text-2xl px-3 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Login'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}