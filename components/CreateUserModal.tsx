import React, { useState, useEffect } from 'react';
import { X, UserPlus, ShieldAlert, Save, Loader2, Fingerprint, Mail, Lock, ShieldCheck, Activity, User, KeyRound, Building2 } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { UserRole, StaffUser, ProfileStatus } from '../types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: StaffUser | null;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, editingUser }) => {
  const { addStaff, updateStaff, currentUser } = useHotel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'details' | 'success'>('details');
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: UserRole.Staff, status: ProfileStatus.Active, department: ''
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name, email: editingUser.email, password: '', 
        role: editingUser.role, status: editingUser.status, department: editingUser.department || ''
      });
    } else {
      setFormData({
        name: '', email: '', password: '', role: UserRole.Staff, status: ProfileStatus.Active, department: ''
      });
    }
    setStatus('details');
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const { status, ...updatePayload } = formData;
        await updateStaff(editingUser.id, updatePayload as any);
      } else {
        await addStaff(formData);
      }
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('details');
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch(role) {
      case UserRole.Admin: return "Full system root access. Can modify staff, revenue protocols, and property architecture.";
      case UserRole.Manager: return "Operational oversight. Access to analytics, reports, and junior registry management.";
      case UserRole.Staff: return "Standard desk protocol. Can manage bookings, residents, and asset status.";
      default: return "Limited read-only access to assigned assets.";
    }
  };

  const getAllowedRoles = () => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.Admin) {
      return [UserRole.Admin, UserRole.Manager, UserRole.Staff, UserRole.Client];
    }
    if (currentUser.role === UserRole.Manager) {
      return [UserRole.Staff, UserRole.Client];
    }
    return [];
  };

  const allowedRoles = getAllowedRoles();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-[#020617]/95 backdrop-blur-2xl animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row glass-card rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(59,130,246,0.15)] animate-in zoom-in-95 duration-300 min-h-[500px] lg:h-[720px] my-4 sm:my-8 max-h-[95vh] sm:max-h-[92vh]">
        
        {status === 'success' ? (
          <div className="flex-1 bg-[#05080f] flex flex-col items-center justify-center text-center p-12 space-y-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.2)]">
              <ShieldCheck size={48} className="text-brand-500" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Identity Provisions Set</h2>
              <p className="text-[11px] text-brand-400 font-black uppercase tracking-[0.3em] mt-3">
                {editingUser ? 'Account Authorization Updated' : 'New Personnel Enrolled Successfully'}
              </p>
            </div>
            <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest italic max-w-md">Access credentials and hierarchical permissions have been committed to the security ledger.</p>
          </div>
        ) : (
          <>
            {/* Left Visual Sidebar */}
            <div className={`flex lg:w-80 bg-gradient-to-br p-6 sm:p-10 lg:p-12 flex-col justify-between shrink-0 ${editingUser ? 'from-indigo-600 to-blue-900' : 'from-brand-600 to-emerald-900'}`}>
               <div className="space-y-4 sm:space-y-12">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-2xl backdrop-blur-md">
                    {editingUser ? <Activity size={24}/> : <Fingerprint size={24}/>}
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white uppercase italic leading-[0.85] tracking-tighter">
                      {editingUser ? 'MODIFY\nNODE\nAUTH' : 'NEW\nIDENTITY\nPROV'}
                    </h2>
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/20 rounded-lg border border-white/10 w-fit">
                       <KeyRound size={12} className="text-white/60" />
                       <span className="text-[8px] font-black uppercase tracking-widest text-white/70">Auth: {currentUser?.role}</span>
                    </div>
                  </div>
               </div>

               <div className="bg-black/30 p-5 sm:p-8 rounded-xl sm:rounded-[2rem] border border-white/15 space-y-2 sm:space-y-4 backdrop-blur-md mt-6 lg:mt-0">
                  <p className="text-[9px] text-white/50 font-black uppercase tracking-[0.2em]">Impact Analysis</p>
                  <div className="flex items-center gap-2 sm:gap-3">
                     <ShieldCheck size={16} className="text-white" />
                     <span className="text-[10px] sm:text-[11px] text-white font-black uppercase tracking-widest">{formData.role} Level</span>
                  </div>
                  <p className="text-[8px] leading-relaxed text-white/60 font-bold uppercase tracking-tight">
                    {getRoleDescription(formData.role)}
                  </p>
               </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 bg-[#05080f] p-6 sm:p-10 lg:p-12 flex flex-col overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-6 sm:mb-12">
                  <div className="flex items-center gap-3">
                     <span className="w-6 h-[1.5px] bg-brand-500 hidden sm:block"></span>
                     <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Provisioning Protocol Secure</span>
                  </div>
                  <button onClick={onClose} disabled={isSubmitting} type="button" className="p-2 sm:p-3 hover:bg-white/5 rounded-xl sm:rounded-2xl text-slate-600 transition-all active:scale-90"><X size={20}/></button>
               </div>

               <div className="flex-1 space-y-6 sm:space-y-10">
                  <div className="space-y-4 sm:space-y-6">
                      <h4 className="text-[10px] font-black text-brand-500 uppercase tracking-widest flex items-center gap-2">
                        <User size={14} /> Legal Identity Enrollment
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <label className="text-[8px] text-slate-600 font-black uppercase tracking-widest ml-1">Full Legal Name</label>
                          <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl py-3 px-4 sm:px-6 text-sm text-white focus:bg-white/10 transition-all outline-none italic font-bold" placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] text-slate-600 font-black uppercase tracking-widest ml-1">Enterprise Email</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                            <input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:bg-white/10 transition-all outline-none font-bold" placeholder="name@moorehotels.com" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] text-slate-600 font-black uppercase tracking-widest ml-1">Allocated Department</label>
                        <div className="relative">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={16} />
                          <select required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:bg-white/10 transition-all outline-none appearance-none cursor-pointer font-bold">
                            <option value="" disabled className="bg-[#0a0f1d]">Select Department</option>
                            <option value="Housekeeping" className="bg-[#0a0f1d]">Housekeeping</option>
                            <option value="Reception" className="bg-[#0a0f1d]">Reception</option>
                            <option value="FrontDesk" className="bg-[#0a0f1d]">Front Desk</option>
                            <option value="Concierge" className="bg-[#0a0f1d]">Concierge</option>
                          </select>
                        </div>
                      </div>
                  </div>

                  {!editingUser && (
                    <div className="space-y-4 sm:space-y-6">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                          <Lock size={14} /> Temporary Authorization
                        </h4>
                        <div className="space-y-2">
                          <label className="text-[8px] text-slate-600 font-black uppercase tracking-widest ml-1">Initial Secret</label>
                          <input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} type="password" className="w-full bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl py-3 px-4 text-sm text-white focus:bg-white/10 outline-none transition-all tracking-widest" placeholder="••••••••" />
                        </div>
                    </div>
                  )}

                  <div className="space-y-4 sm:space-y-6">
                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                      <ShieldAlert size={14} /> Authority Configuration
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <label className="text-[8px] text-slate-600 font-black uppercase tracking-widest ml-1">Role Allocation</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-indigo-400 font-black uppercase tracking-widest outline-none appearance-none cursor-pointer hover:bg-white/10 transition-all">
                          {allowedRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col justify-center bg-white/5 p-4 rounded-xl border border-white/5">
                         <p className="text-[7px] text-slate-500 font-black uppercase mb-1">Status Protocol</p>
                         <p className="text-[9px] text-slate-400 font-bold italic">Managed via personnel ledger security controls.</p>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-3 sm:py-5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-white transition-all border border-white/5">Abort</button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-black py-3 sm:py-5 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-3xl flex items-center justify-center gap-3 active:scale-95 italic"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Synchronizing Ledger...
                      </>
                    ) : (
                      <>
                        {editingUser ? <Save size={18} /> : <UserPlus size={18} strokeWidth={3} />}
                        {editingUser ? 'Authorize Update' : 'Provision Access'}
                      </>
                    )}
                  </button>
               </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateUserModal;