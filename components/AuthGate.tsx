import React, { useState } from 'react';
import { Coins, Shield, Smartphone, Globe, ArrowRight, CloudLightning, LogIn, CheckCircle2 } from 'lucide-react';
import { auth, isConfigured, setAccessToken } from '../src/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface AuthGateProps {
  onAuthSuccess: (user: { uid: string; email: string; isCloud: boolean }) => void;
  appName: string;
}

const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess, appName }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLocalAccess = () => {
    setLoading(true);
    setError(null);
    try {
      // Direct one-click login for completely passwordless offline local ledger
      localStorage.setItem('current_local_user', 'offline-owner@balaji.com');
      onAuthSuccess({
        uid: 'local_admin',
        email: 'offline-owner@balaji.com',
        isCloud: false,
      });
    } catch (err) {
      setError("Failed to initialize security context of your browser local storage.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    if (!isConfigured) {
      setError("Database is not configured yet. Please set up Firebase in settings to enable multi-device synchronization.");
      setLoading(false);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      // Configure popup preference for best iframe support
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || null;
        setAccessToken(token);

        onAuthSuccess({
          uid: result.user.uid,
          email: result.user.email || 'google-user@sync.com',
          isCloud: true,
        });
      }
    } catch (err: any) {
      console.error("Google Auth SignIn Error:", err);
      if (err.code === 'auth/popup-blocked') {
        setError("Sign-In popup blocked by your browser. Please tap again and click 'Allow' or check settings.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError("Sign-In was cancelled. Please try again.");
      } else if (err.code === 'auth/unauthorized-domain') {
        setError("The current domain is unauthorized. Please register your app preview domain under Firebase OAuth console settings.");
      } else {
        setError(err.message || "Could not login with your Google account. Ensure you have an active network.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-gate-root" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 md:p-10 relative overflow-hidden select-none">
      {/* Absolute Ambient Highlights */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-xl bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 md:p-8">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl text-slate-900 shadow-lg mb-4">
            <Coins size={36} className="animate-pulse" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-none">{appName}</h1>
          <p className="text-yellow-500/90 text-xs font-bold uppercase tracking-[0.25em] mt-2">Digital Collateral Ledger & Sync System</p>
        </div>

        {/* Suggestion / Explanation Alert */}
        <div className="bg-slate-950/60 border border-slate-700/50 rounded-2xl p-4 mb-6 space-y-2">
          <h3 className="text-xs font-black text-yellow-500 uppercase tracking-wider flex items-center gap-1.5">
            <CloudLightning size={14} /> Passwordless Ledger System
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            We have completely removed the complex password/registration requirements. You can now use the ledger with 100% passwordless, zero-setup credentials!
          </p>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4">
          
          {/* Card Option A: Local Sandbox Entry */}
          <button
            type="button"
            onClick={handleLocalAccess}
            disabled={loading}
            className="w-full text-left bg-gradient-to-r from-slate-800/40 to-slate-800/80 hover:from-slate-700/50 hover:to-slate-700/90 border border-slate-700/40 rounded-2xl p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 group flex items-start gap-4"
          >
            <div className="p-3 bg-slate-950 text-yellow-500 rounded-xl group-hover:scale-105 transition-transform shrink-0">
              <Smartphone size={22} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white group-hover:text-yellow-400 transition-colors">Direct Offline Ledger</span>
                <ArrowRight size={14} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Start immediately in offline mode. Saves your Girvi books privately in this browser's local sandbox storage. Perfect for instant use.
              </p>
            </div>
          </button>

          {/* Card Option B: Google Cloud Sync Entry */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full text-left bg-gradient-to-r from-slate-800/40 to-slate-800/80 hover:from-slate-700/50 hover:to-slate-700/90 border border-slate-700/40 hover:border-yellow-500/40 rounded-2xl p-4 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 group flex items-start gap-4"
          >
            <div className="p-3 bg-slate-950 text-amber-400 rounded-xl group-hover:scale-105 transition-transform shrink-0">
              <Globe size={22} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">Multiple Device Cloud Sync</span>
                <ArrowRight size={14} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Connect via Google to sync in real-time across your Phone, PC, and Tablet simultaneously. Safeguards your records automatically on the cloud.
              </p>
            </div>
          </button>

        </div>

        {/* Status Indicators or Errors */}
        {error && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3.5 rounded-xl font-bold animate-pulse text-center">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Authenticating Security Context...</span>
          </div>
        )}

        {/* Multiple Devices sync instructions helper footer */}
        <div className="mt-8 pt-5 border-t border-slate-700/40 text-center">
          <p className="text-[10px] text-slate-500 leading-relaxed max-w-sm mx-auto">
            🔒 By choosing Cloud Sync, you can use the exact same Google account to access, edit, and keep records synced on both your desktop computers and mobile devices.
          </p>
        </div>

      </div>
      
      {/* Security lock status bar */}
      <div className="mt-6 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
        <Shield size={12} />
        <span>Military Grade Encryption Secured Local Database</span>
      </div>
    </div>
  );
};

export default AuthGate;
