
import React, { useState, useRef } from 'react';
import { useHotel } from '../store/HotelContext';
import { Shield, Key, Mail, User, Info, AlertCircle, ShieldCheck, ArrowRight, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import RoleBadge from '../components/RoleBadge';
import { api } from '../lib/api';

const Settings: React.FC = () => {
  const { userRole, currentUser, updateCurrentUserProfile, isInitialLoading } = useHotel();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [securityForm, setSecurityForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStatus, setRotationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Fix: Capitalized roles to match UserRole type: 'Admin' | 'Manager' | 'Staff' | 'Client'
  const roles = ['Admin', 'Manager', 'Staff'] as const;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateCurrentUserProfile({ avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRotating(true);
    setRotationStatus('idle');
    setErrorMessage('');

    if (securityForm.newPassword !== securityForm.confirmNewPassword) {
      setRotationStatus('error');
      setErrorMessage("Confirmation password does not match.");
      setIsRotating(false);
      return;
    }

    try {
      await api.post('/api/Profile/rotate-security', {
        oldPassword: securityForm.oldPassword,
        newPassword: securityForm.newPassword,
        confirmNewPassword: securityForm.confirmNewPassword
      });
      setRotationStatus('success');
      setSecurityForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => setRotationStatus('idle'), 5000);
    } catch (err: any) {
      setRotationStatus('error');
      setErrorMessage(err.message || "Credential rotation rejected by property firewall.");
    } finally {
      setIsRotating(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Retrieving Credentials...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em]">Global Configuration</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight italic">System Settings</h2>
          <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest mt-1 opacity-70">Manage your personal identity and security credentials</p>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/10 gap-1.5 shadow-2xl">
           {roles.map(r => (
             <div 
               key={r}
               className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${
                 // Fix: Comparison now works because roles array uses capitalized values
                 userRole === r 
                   ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] ring-1 ring-blue-500/50' 
                   : 'text-slate-600 opacity-40'
               }`}
             >
               {r}
             </div>
           ))}
        </div>
      </div>

      <div className="flex gap-1 bg-black/20 p-1 rounded-xl w-fit border border-white/5 mt-6">
        <button 
          onClick={() => setActiveSubTab('profile')}
          className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
            activeSubTab === 'profile' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <User size={14} /> Profile Information
        </button>
        <button 
          onClick={() => setActiveSubTab('security')}
          className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
            activeSubTab === 'security' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Key size={14} /> Security & Access
        </button>
      </div>

      {activeSubTab === 'profile' && (
        <div className="glass-card p-8 rounded-2xl border border-white/5 space-y-8 mt-4">
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <div 
                onClick={handleAvatarClick}
                className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-3xl text-slate-400 border border-white/10 relative overflow-hidden group shadow-2xl cursor-pointer"
              >
                <img src={currentUser?.avatarUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt=""/>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[8px] font-black uppercase tracking-widest gap-1">
                  <Camera size={14} />
                  Change
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-white tracking-tight italic uppercase">{currentUser?.name || "Authenticating..."}</h3>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 text-[10px] font-black uppercase tracking-widest">
                    {(currentUser?.role || userRole).toUpperCase()}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-dash flex items-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-500" /> Verified Authority
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 flex justify-between">
                  Primary Email
                  <span className="text-[8px] text-emerald-500 flex items-center gap-1 uppercase tracking-tighter">
                    <Shield size={10} /> Account Identity Verified
                  </span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input 
                    readOnly 
                    value={currentUser?.email || ""} 
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[13px] text-slate-500 cursor-not-allowed outline-none" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 flex justify-between">
                  Assigned Authority
                  <span className="text-[8px] text-blue-500 flex items-center gap-1 uppercase tracking-tighter">
                    <Shield size={10} /> Active Permission Level
                  </span>
                </label>
                <div className="relative">
                  <Shield size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input 
                    readOnly 
                    value={(currentUser?.role || userRole).toUpperCase()} 
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-[13px] text-slate-500 cursor-not-allowed outline-none" 
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center gap-4 bg-white/5 p-6 rounded-2xl">
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <ShieldCheck size={24} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[15px] font-black text-white tracking-tight">Enterprise Authentication</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mt-1">Secured via enterprise-grade Identity & Access Management (IAM) Protocol.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'security' && (
        <div className="glass-card p-8 rounded-2xl border border-white/5 space-y-8 mt-4 animate-in slide-in-from-right-4">
          <form onSubmit={handleRotateSecurity} className="space-y-8 max-w-lg">
            <div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Security Credentials</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest">Rotate your password frequently to maintain property-wide data integrity and ledger security.</p>
            </div>

            {rotationStatus === 'success' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in zoom-in-95">
                <CheckCircle2 size={18} />
                <p className="text-[11px] font-black uppercase">Credentials successfully rotated.</p>
              </div>
            )}

            {rotationStatus === 'error' && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 animate-in shake">
                <AlertCircle size={18} />
                <p className="text-[11px] font-black uppercase">{errorMessage}</p>
              </div>
            )}

            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Old System Password</label>
                  <input 
                    type="password" 
                    required
                    value={securityForm.oldPassword}
                    onChange={(e) => setSecurityForm({...securityForm, oldPassword: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-[14px] text-white focus:bg-white/10 outline-none transition-all focus:ring-2 focus:ring-blue-500/30"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">New System Password</label>
                  <input 
                    type="password" 
                    required
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({...securityForm, newPassword: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-[14px] text-white focus:bg-white/10 outline-none transition-all focus:ring-2 focus:ring-blue-500/30"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    required
                    value={securityForm.confirmNewPassword}
                    onChange={(e) => setSecurityForm({...securityForm, confirmNewPassword: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-[14px] text-white focus:bg-white/10 outline-none transition-all focus:ring-2 focus:ring-blue-500/30"
                  />
               </div>
            </div>

            <button 
              type="submit"
              disabled={isRotating}
              className="bg-white text-slate-950 font-black px-10 py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-slate-200 active:scale-95 shadow-2xl shadow-white/5 flex items-center justify-center gap-3"
            >
              {isRotating ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
              Rotate Authorization
            </button>
          </form>
          
          <div className="pt-8 border-t border-white/10">
             <div className="flex items-start gap-4 p-6 bg-rose-500/5 rounded-2xl border border-rose-500/20 shadow-2xl shadow-rose-950/20">
                <AlertCircle size={28} className="text-rose-400 mt-1 shrink-0" />
                <div className="space-y-2">
                   <p className="text-[16px] font-black text-white uppercase italic">Revoke Account Access</p>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest">Requesting deactivation will lock your profile and expire all active sessions immediately. This action requires Admin confirmation and audit logging.</p>
                   <button className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 hover:text-rose-300 transition-all pt-2 flex items-center gap-2">Initiate Deactivation Flow <ArrowRight size={14}/></button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
