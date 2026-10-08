import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  User,
  Key,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Code2,
  Eye,
  EyeOff,
  Globe,
  Laptop,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import {
  ClientDeviceInfo,
  getCachedClientDeviceInfo,
  fetchClientDeviceInfo,
  refreshClientDeviceLocation,
} from '../../utils/clientDevice';

export const LoginScreen: React.FC = () => {
  const { language, login, companySettings } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<ClientDeviceInfo>(() => getCachedClientDeviceInfo());
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    // Attempt automatic device & GPS location discovery
    let isMounted = true;
    fetchClientDeviceInfo(true).then((info) => {
      if (isMounted) setDeviceInfo(info);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestLiveLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const refreshed = await refreshClientDeviceLocation();
      setDeviceInfo(refreshed);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError(language === 'bn' ? 'অনুগ্রহ করে আপনার ইউজার আইডি লিখুন!' : 'Please enter your username / User ID!');
      return;
    }

    const success = login(username.trim(), password);
    if (!success) {
      setError(language === 'bn' ? 'ভুল পাসওয়ার্ড অথবা ইউজার আইডি!' : 'Invalid password or username!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10 p-6 sm:p-8 space-y-5">
        
        {/* Logout Status Banner */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="font-bold">
              {language === 'bn' ? 'লগআউট অবস্থা (Logged Out)' : 'Session Status: Logged Out'}
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
            {language === 'bn' ? 'সাইট এক্সিট / সুরক্ষিত' : 'Secure Exit'}
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl mx-auto flex items-center justify-center text-blue-400 shadow-lg shadow-blue-900/40">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            {companySettings.name || 'Enterprise POS & ERP'}
          </h1>
          <p className="text-xs text-slate-400">
            {language === 'bn' ? 'আপনার অ্যাকাউন্টে প্রবেশ করতে আইডি ও পাসওয়ার্ড দিন' : 'Enter your User ID and Password to Log In'}
          </p>
        </div>

        {/* Live Device & Location Card (Request 5 Requirement) */}
        <div className="p-3.5 bg-slate-850/80 rounded-2xl border border-slate-800 text-xs space-y-2 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{language === 'bn' ? 'ডিভাইস লোকেশন ও সিকিউরিটি' : 'Device Location & Audit'}</span>
            </div>
            {deviceInfo.isGps ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{language === 'bn' ? 'GPS চালু' : 'Live GPS'}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestLiveLocation}
                disabled={isDetectingLocation}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/80 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                title={language === 'bn' ? 'ডিভাইসের লাইভ জিপিএস লোকেশন চালু করুন' : 'Enable device live GPS location'}
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                <span>{language === 'bn' ? 'GPS চালু করুন' : 'Enable GPS'}</span>
              </button>
            )}
          </div>

          {/* Location Value */}
          <div className="space-y-1">
            <div className="flex items-start gap-1.5 text-slate-300 font-semibold text-[11px]">
              <Navigation className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-slate-400 font-normal">{language === 'bn' ? 'বর্তমান লোকেশন: ' : 'Location: '}</span>
                <span className="text-white font-bold">{deviceInfo.location || 'Dhaka, Bangladesh'}</span>
                {deviceInfo.latitude && deviceInfo.longitude && (
                  <span className="block text-[10px] font-mono text-emerald-400/90 mt-0.5">
                    📍 {deviceInfo.latitude.toFixed(4)}° N, {deviceInfo.longitude.toFixed(4)}° E
                  </span>
                )}
              </div>
            </div>

            {/* IP and Device */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded font-mono text-blue-300 border border-slate-700/80">
                <Globe className="w-2.5 h-2.5 text-blue-400" />
                IP: {deviceInfo.ip || '103.145.74.22'}
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700/80 truncate max-w-[200px]" title={deviceInfo.device}>
                <Laptop className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                <span className="truncate">{deviceInfo.device}</span>
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          
          {/* Manual Username / User ID Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              {language === 'bn' ? 'ইউজার আইডি / ইউজারনেম (User ID)' : 'Username / User ID'}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  setError('');
                }}
                autoFocus
                placeholder={language === 'bn' ? 'ইউজার আইডি লিখুন (যেমন: admin)' : 'Enter User ID (e.g. admin)'}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                {language === 'bn' ? 'পাসওয়ার্ড (Password)' : 'Password'}
              </label>
            </div>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={language === 'bn' ? 'পাসওয়ার্ড লিখুন...' : 'Enter password...'}
                className="w-full pl-10 pr-10 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
          >
            <span>{language === 'bn' ? 'লগইন করুন' : 'Log In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

        <div className="pt-4 border-t border-slate-800 text-center space-y-2.5">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-left text-xs shadow-inner">
            <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 font-bold text-slate-300 text-[11px]">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Developer By : Md. Tarikul Islam</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Phone- <a href="tel:01312305225" className="text-slate-200 font-semibold hover:text-blue-400 hover:underline">01312305225</a></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                <span>Sherpur, Sadar, Sherpur</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 font-mono">
            DokanPro Enterprise v4.5 • Secure Access Control
          </p>
        </div>

      </div>
    </div>
  );
};
