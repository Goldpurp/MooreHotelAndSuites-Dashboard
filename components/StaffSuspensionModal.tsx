import React, { useState } from 'react';
import { X, ShieldCheck, Lock, Activity, Loader2, ShieldOff, ShieldAlert } from 'lucide-react';
import { StaffUser, ProfileStatus } from '../types';

interface StaffSuspensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => Promise<void>;
  user: StaffUser | null;
}

const StaffSuspensionModal: React.FC<StaffSuspensionModalProps> = ({ isOpen, onClose, onConfirm, user }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'details' | 'success'>('details');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isActive = String(user.status).toLowerCase() === 'active';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(user.id);
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('details');
      }, 2500);
    } catch (err: any) {
      console.error("Suspension Protocol Fault:", err);
      setError(err.message || "Credential lifecycle update rejected by API node.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-2xl animate-in fade-in duration-300">
      <div className={`glass-card w-full max-w-md rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 shadow-3xl ${
        isActive ? 'shadow-rose-950/20' : 'shadow-emerald-950/20'
      }`}>
        
        {status === 'success' ? (
          <div className="p-16 flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-500">
             <div className={`w-24 h-24 rounded-full border flex items-center justify-center shadow-2xl ${
               isActive ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
             }`}>
                {isActive ? <ShieldOff size={48} /> : <ShieldCheck size={48} />}
             </div>
             <div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Protocol Confirmed</h2>
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-3 ${isActive ? 'text-rose-400' : 'text-emerald-400'}`}>
                   {isActive ? 'System Privileges Revoked' : 'Personnel Access Restored'}
                </p>
             </div>
             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest italic max-w-xs leading-relaxed">Identity node updated across all operation sectors.</p>
          </div>
        ) : (
          <>
            <div className={`px-8 md:px-10 py-6 md:py-8 border-b border-white/5 flex items-center justify-between ${
              isActive ? 'bg-rose-500/5' : 'bg-emerald-500/5'
            }`}>
              <div className="flex items-center gap-3 md:gap-4">
                <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl border ${isActive ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                  {isActive ? <ShieldOff size={24} /> : <ShieldCheck size={24} />}
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-white tracking-tight uppercase italic leading-none">
                    {isActive ? 'Deactivate' : 'Activate'}
                  </h2>
                  <p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1.5 ${isActive ? 'text-rose-400' : 'text-emerald-400'}`}>
                    Personnel ID: {user.id.slice(0, 8)}...
                  </p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 md:p-2.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all active:scale-90">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 md:p-10 space-y-6 md:space-y-8">
              <div className="text-center space-y-3">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">
                  {isActive ? 'Confirm Deactivation?' : 'Confirm Activation?'}
                </h3>
                <p className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  {isActive 
                    ? `You are about to revoke all system privileges for ${user.name}. All active sessions will be invalidated.`
                    : `You are restoring enterprise access for ${user.name}. Their credentials will be valid immediately.`
                  }
                </p>
              </div>

              <div className="bg-white/5 p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 space-y-4 shadow-inner">
                 <div className="flex items-center gap-4">
                    <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=020617&color=fff`} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10" alt="" />
                    <div className="min-w-0">
                       <p className="text-sm md:text-[14px] font-black text-white uppercase italic tracking-tight truncate">{user.name}</p>
                       <p className="text-[8px] md:text-[9px] text-slate-500 font-bold tracking-widest uppercase">{user.role}</p>
                    </div>
                 </div>
                 <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[9px] text-slate-600 font-black uppercase">Identity Status</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest italic ${isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {isActive ? 'Verified / Live' : 'Suspended / Locked'}
                    </span>
                 </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl md:rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-tight flex items-center gap-3 animate-in shake">
                   <ShieldAlert size={16} /> {error}
                </div>
              )}
            </div>

            <div className="px-8 md:px-10 py-6 md:py-8 border-t border-white/5 flex flex-col gap-3 bg-slate-950/40">
              <button onClick={handleConfirm} disabled={isSubmitting} className={`w-full py-4 md:py-5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 italic ${isActive ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/40' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/40'}`}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> 
                    Synchronizing...
                  </>
                ) : (
                  <>
                    {isActive ? <Lock size={18} /> : <Activity size={18} />}
                    {isActive ? 'Authorize Deactivation' : 'Authorize Activation'}
                  </>
                )}
              </button>
              <button onClick={onClose} disabled={isSubmitting} className="w-full py-3 md:py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all italic">Abort Protocol</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffSuspensionModal;