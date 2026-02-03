
import React, { useState, useEffect } from 'react';
import { X, UserPlus, ShieldAlert, Save, Loader2 } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { UserRole, StaffUser } from '../types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser?: StaffUser | null;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, editingUser }) => {
  const { userRole, addStaff, updateStaff } = useHotel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    // Fix: Using 'Staff' instead of 'staff' to match UserRole type definition
    role: 'Staff' as UserRole,
    status: 'Active' as 'Active' | 'Suspended'
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name,
        email: editingUser.email,
        password: '', 
        role: editingUser.role,
        status: editingUser.status
      });
    } else {
      setFormData({
        // Fix: Using 'Staff' instead of 'staff' to match UserRole type definition
        name: '', email: '', password: '', role: 'Staff', status: 'Active'
      });
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateStaff(editingUser.id, formData);
      } else {
        await addStaff(formData);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-md rounded-[2rem] shadow-3xl overflow-hidden border border-white/15 animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/60">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">{editingUser ? 'Modify Credentials' : 'Onboard Personnel'}</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">Identity Authorization Protocol</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/10 text-slate-500 hover:text-white rounded-xl transition-all border border-white/5"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Full Legal Name</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-sm text-white focus:bg-white/10 outline-none transition-all" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Enterprise Email</label>
            <input required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-sm text-white focus:bg-white/10 outline-none transition-all" />
          </div>

          {!editingUser && (
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Initial PIN / Secret</label>
              <input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} type="password" placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-sm text-white focus:bg-white/10 outline-none transition-all" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Role Access</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-sm text-white outline-none appearance-none">
                {/* Fix: Capitalized option values to match UserRole type */}
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1">Protocol Status</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-sm text-white outline-none appearance-none">
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editingUser ? <Save size={18} /> : <UserPlus size={18} />)}
              {editingUser ? 'Authorize Update' : 'Provision Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
