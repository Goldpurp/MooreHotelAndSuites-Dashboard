import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowRight, ShieldAlert, AlertCircle, Loader2, WifiOff, RefreshCw, ChevronLeft } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import Logo from '../components/Logo';
import { api } from '../lib/api';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://api.moorehotelandsuites.com';

const Auth: React.FC = () => {
  const { login } = useHotel();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isBackendLive, setIsBackendLive] = useState<boolean | null>(null);

  useEffect(() => {
    const probe = async () => {
      try {
        const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        const res = await fetch(`${base}/api/rooms`, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        }).catch(() => null);
        setIsBackendLive(res !== null && res.status !== 404);
      } catch {
        setIsBackendLive(false);
      }
    };
    probe();
    const interval = setInterval(probe, 30000); 
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBackendLive === false) {
      setError(`Connectivity Fault: Enterprise API node at ${API_BASE_URL} is unreachable.`);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
    } catch (err: any) {
      setError(err.message || "Access Denied: Could not verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans text-slate-50">
      <div className="w-full max-w-6xl h-[700px] flex overflow-hidden rounded-[3rem] glass-card shadow-2xl animate-in zoom-in-95 duration-700">
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 to-indigo-800 p-16 flex-col justify-between relative border-r border-white/5">
          <div className="relative z-10">
            <Logo size="xl" className="mb-8" />
            <h1 className="text-5xl font-black text-white tracking-tight leading-tight uppercase italic">Moore Hotels <br /> & Suites</h1>
            <p className="text-blue-100/80 text-lg mt-6 font-medium max-w-sm leading-relaxed">Enterprise Property Management interface. Requires valid node authorization.</p>
          </div>
          <div className="relative z-10">
             <div className="flex items-center gap-4 p-4 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-md">
                <ShieldAlert size={24} className="text-blue-300" />
                <p className="text-blue-200 text-xs font-black uppercase tracking-widest leading-relaxed">Authentication strictly depends on real-time API connectivity.</p>
             </div>
          </div>
        </div>

        <div className="flex-1 bg-slate-900/40 p-12 lg:p-20 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase italic mb-2">Authorize Access</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-10">Secured Personnel Entry</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Account identifier</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input type="email" required placeholder="name@moorehotels.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Secret PIN</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="password" 
                      required 
                      autoComplete="current-password"
                      placeholder="••••••••" 
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" 
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400">
                    <AlertCircle size={18} />
                    <p className="text-[11px] font-black uppercase tracking-tight leading-snug">{error}</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mt-10 shadow-2xl active:scale-95"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <>Authorize Session <ArrowRight size={18} /></>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;