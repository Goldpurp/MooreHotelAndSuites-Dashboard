import React, { useState } from 'react';
import { useHotel } from '../store/HotelContext';
import { UserPlus, Search, ShieldAlert, UserCog, MoreHorizontal, ShieldCheck, ShieldOff } from 'lucide-react';
import RoleBadge from '../components/RoleBadge';
import PermissionWrapper from '../components/PermissionWrapper';
import CreateUserModal from '../components/CreateUserModal';
import { StaffUser } from '../types';

const StaffManagement: React.FC = () => {
  const { staff, toggleStaffStatus } = useHotel();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStaff = (staff || []).filter(s => 
    s && (
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleEdit = (user: StaffUser) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleToggleAccess = (userId: string) => {
    toggleStaffStatus(userId);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-[1.5px] bg-blue-500 rounded-full"></span>
            <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Personnel & Access</p>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Staff Management</h2>
          <p className="text-slate-400 text-[11px] font-medium">Configure property-wide roles and authorization profiles</p>
        </div>
        
        <PermissionWrapper allowedRoles={['Admin']}>
          <button 
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
          >
            <UserPlus size={16} /> Add New User
          </button>
        </PermissionWrapper>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-md border border-white/5">
          <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Active Accounts</span>
          <h4 className="text-2xl font-black text-white mt-1">{(staff || []).filter(s => s && s.status === 'Active').length}</h4>
        </div>
        <div className="glass-card p-4 rounded-md border border-white/5">
          <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Total Staff Count</span>
          <h4 className="text-2xl font-black text-blue-400 mt-1">{(staff || []).length}</h4>
        </div>
        <div className="glass-card p-4 rounded-md border border-white/5">
          <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Access Suspended</span>
          <h4 className="text-2xl font-black text-rose-400 mt-1">{(staff || []).filter(s => s && s.status === 'Suspended').length}</h4>
        </div>
      </div>

      <div className="glass-card rounded-md flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 flex justify-between items-center bg-slate-900/40">
          <div className="relative flex-1 max-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Filter by name or email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-md py-2 pl-9 pr-3 text-[12px] text-slate-300 outline-none focus:bg-white/10 transition-all focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-900 z-10">
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5 bg-slate-900/20">
                <th className="px-4 py-3">Personnel Profile</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Onboarding Date</th>
                <th className="px-4 py-3">Access Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-700 font-black uppercase text-[10px] tracking-[0.4em]">No personnel records found</td>
                </tr>
              ) : (
                filteredStaff.map((user) => {
                  if (!user) return null;
                  return (
                    <tr key={user.id} className="hover:bg-white/5 transition-all group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=020617&color=fff`} className="w-8 h-8 rounded-md object-cover ring-1 ring-white/10" alt=""/>
                          <div>
                            <p className="text-[13px] font-black text-white">{user.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium tracking-tight">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[12px] font-bold text-white">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border transition-colors ${
                          user.status === 'Active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <PermissionWrapper allowedRoles={['Admin']}>
                            <button 
                              onClick={() => handleEdit(user)}
                              className="p-2 bg-white/5 text-slate-500 hover:text-white hover:bg-white/10 rounded-md border border-white/5 transition-all" 
                              title="Modify Role"
                            >
                              <UserCog size={14} />
                            </button>
                            <button 
                              onClick={() => handleToggleAccess(user.id)}
                              className={`p-2 rounded-md border transition-all ${
                                user.status === 'Active' 
                                  ? 'bg-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border-white/5' 
                                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                              }`}
                              title={user.status === 'Active' ? 'Revoke Access' : 'Restore Access'}
                            >
                              {user.status === 'Active' ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                            </button>
                          </PermissionWrapper>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingUser={editingUser}
      />
    </div>
  );
};

export default StaffManagement;