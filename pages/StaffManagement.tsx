
import React, { useState, useMemo } from 'react';
import { useHotel } from '../store/HotelContext';
import { 
  UserPlus, Search, ShieldAlert, 
  ShieldCheck, ShieldOff, Users, Activity, 
  Fingerprint, RefreshCw, Mail, Calendar, 
  Lock, ChevronLeft, ChevronRight, Database, 
  SearchX, UserMinus, Filter,
  UserCheck, Building2
} from 'lucide-react';
import RoleBadge from '../components/RoleBadge';
import PermissionWrapper from '../components/PermissionWrapper';
import CreateUserModal from '../components/CreateUserModal';
import StaffSuspensionModal from '../components/StaffSuspensionModal';
import { StaffUser, UserRole, ProfileStatus } from '../types';

const StaffManagement: React.FC = () => {
  const { staff, toggleStaffStatus, refreshData, currentUser } = useHotel();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuspensionOpen, setIsSuspensionOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<StaffUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  /**
   * REGISTRY RESOLUTION
   * Includes internal roles only (Admin, Manager, Staff).
   * Excludes Clients for role-based segregation.
   */
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const allStaff = (staff || []).filter(s => s && s.role !== UserRole.Client);
    
    return allStaff.filter(s => {
      const matchesSearch = (s.name || '').toLowerCase().includes(q) || 
                            (s.email || '').toLowerCase().includes(q) ||
                            (s.role || '').toLowerCase().includes(q) ||
                            (s.department || '').toLowerCase().includes(q);
      
      const sStatus = String(s.status).toLowerCase();
      const matchesStatus = statusFilter === 'All' || 
                            (statusFilter === 'Active' && sStatus === 'active') ||
                            (statusFilter === 'Suspended' && sStatus === 'suspended');
      
      return matchesSearch && matchesStatus;
    });
  }, [staff, searchQuery, statusFilter]);

  /**
   * SECURITY PROTOCOL: SUSPENSION ELIGIBILITY
   * 1. Only Admins can perform activation/deactivation.
   * 2. Admins CANNOT be suspended (including oneself).
   */
  const canPerformSuspension = (targetUser: StaffUser) => {
    if (!currentUser || currentUser.role !== UserRole.Admin) return false;
    // Admins are immune to suspension protocols
    if (targetUser.role === UserRole.Admin) return false;
    return true;
  };

  const handleCreate = () => {
    setIsModalOpen(true);
  };

  const handleToggleAccessRequest = (user: StaffUser) => {
    if (!canPerformSuspension(user)) return;
    setUserToToggle(user);
    setIsSuspensionOpen(true);
  };

  const isAdminActor = currentUser?.role === UserRole.Admin;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[2px] bg-brand-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"></span>
            <p className="text-[10px] text-brand-400 font-black uppercase tracking-[0.25em]">Personnel Protocol Registry</p>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight uppercase italic leading-none">Internal Staff Ledger</h2>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-3 italic">Administrative Oversight — Personnel Hierarchy Only</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleManualRefresh}
            className={`p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl active:scale-95 ${isRefreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={20} />
          </button>
          <PermissionWrapper allowedRoles={[UserRole.Admin, UserRole.Manager]}>
            <button 
              onClick={handleCreate}
              className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 transition-all shadow-3xl shadow-brand-950/40 active:scale-95 italic"
            >
              <UserPlus size={18} strokeWidth={3} /> Onboard Personnel
            </button>
          </PermissionWrapper>
        </div>
      </div>

      {/* Statistical Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Verified Staff', value: (staff || []).filter(s => s.role !== UserRole.Client && String(s.status).toLowerCase() === 'active').length, color: 'text-emerald-400', icon: ShieldCheck, sub: 'Active Nodes' },
          { label: 'Internal Reach', value: (staff || []).filter(s => s.role !== UserRole.Client).length, color: 'text-brand-400', icon: Users, sub: 'Total Registry' },
          { label: 'Revoked Access', value: (staff || []).filter(s => s.role !== UserRole.Client && String(s.status).toLowerCase() === 'suspended').length, color: 'text-rose-400', icon: ShieldOff, sub: 'Locked Nodes' }
        ].map((node) => (
          <div key={node.label} className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group bg-slate-900/20">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <node.icon size={100} />
             </div>
             <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 shadow-inner">
                   <node.icon size={20} className={node.color} />
                </div>
                <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Internal Scan</span>
             </div>
             <div>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] block mb-1">{node.label}</span>
                <div className="flex items-baseline gap-2">
                   <h4 className={`text-4xl font-black italic tracking-tighter ${node.color}`}>{node.value}</h4>
                   <span className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">{node.sub}</span>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Registry Table */}
      <div className="glass-card rounded-[2.5rem] flex flex-col overflow-hidden border border-white/5 shadow-3xl bg-slate-900/10 backdrop-blur-3xl">
        <div className="px-8 py-6 border-b border-white/5 flex flex-wrap justify-between items-center gap-6 bg-slate-950/60">
          <div className="relative flex-1 max-w-xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search Personnel Identity or Department..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-2xl py-4.5 pl-14 pr-6 text-[13px] text-slate-200 outline-none focus:bg-slate-950 transition-all font-black uppercase tracking-tight placeholder:text-slate-700"
            />
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 overflow-hidden">
                {(['All', 'Active', 'Suspended'] as const).map(f => (
                  <button 
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === f 
                        ? 'bg-brand-600 text-white shadow-lg' 
                        : 'text-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
             </div>
             <div className="hidden lg:flex items-center gap-4 px-6 py-3 rounded-2xl border border-white/5 bg-black/40">
                <Fingerprint size={16} className="text-brand-500" />
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Personnel Compliance</p>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">
                <th className="px-10 py-6 border-b border-white/10">Authorized Personnel</th>
                <th className="px-10 py-6 border-b border-white/10">Hierarchy Level</th>
                <th className="px-10 py-6 border-b border-white/10">Enrollment Date</th>
                <th className="px-10 py-6 border-b border-white/10 text-center">Status</th>
                <th className="px-10 py-6 border-b border-white/10 text-right">Administrative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-48 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                       <SearchX size={64} className="text-slate-700" />
                       <p className="text-[15px] font-black uppercase tracking-[0.5em] text-slate-600 italic">No personnel records detected</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user) => {
                  if (!user) return null;
                  const isActive = String(user.status).toLowerCase() === 'active';
                  const isSelf = user.id === currentUser?.id;
                  const suspensionAllowed = canPerformSuspension(user);
                  
                  return (
                    <tr key={user.id} className="hover:bg-brand-500/[0.04] transition-all group border-l-4 border-transparent hover:border-brand-500">
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=020617&color=fff`} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-brand-500/40 transition-all shadow-xl" alt=""/>
                            {isActive && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-slate-950 shadow-sm animate-pulse"></div>}
                          </div>
                          <div>
                            <p className="text-[16px] font-black text-white group-hover:text-brand-400 transition-colors uppercase italic tracking-tight">
                              {user.name} {isSelf && <span className="ml-2 text-[9px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded italic not-uppercase font-bold tracking-normal border border-brand-500/20 shadow-sm">(You)</span>}
                            </p>
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1">
                               <div className="flex items-center gap-2">
                                  <Mail size={10} className="text-slate-600" />
                                  <p className="text-[10px] text-slate-500 font-bold tracking-tight lowercase">{user.email}</p>
                               </div>
                               {user.department && (
                                 <div className="flex items-center gap-1.5">
                                    <Building2 size={10} className="text-brand-500/60" />
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest italic">{user.department}</p>
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-2.5">
                           <Calendar size={14} className="text-slate-600" />
                           <p className="text-[12px] font-black text-slate-300 uppercase italic tracking-tighter">
                             {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'SYS-ENTRY'}
                           </p>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex justify-center">
                          <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all flex items-center gap-2.5 ${
                            isActive 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                          }`}>
                            {isActive ? <ShieldCheck size={10} /> : <ShieldOff size={10} />}
                            {isActive ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <div className="flex justify-end gap-3" onClick={e => e.stopPropagation()}>
                           {isAdminActor ? (
                             <button 
                               onClick={() => handleToggleAccessRequest(user)}
                               disabled={!suspensionAllowed}
                               className={`p-4 rounded-2xl border transition-all active:scale-90 flex items-center justify-center ${
                                 !suspensionAllowed 
                                   ? 'bg-slate-900/40 text-slate-700 border-white/5 cursor-not-allowed opacity-30 shadow-none'
                                   : isActive 
                                      ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white border-rose-500/20 shadow-xl shadow-rose-950/20' 
                                      : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white border-emerald-500/20 shadow-xl shadow-emerald-950/20'
                               }`}
                               title={!suspensionAllowed ? 'Administrative Immunity Active' : isActive ? 'Authorize Deactivation' : 'Authorize Activation'}
                             >
                               {isActive ? <UserMinus size={22} strokeWidth={2.5} /> : <UserCheck size={22} strokeWidth={2.5} />}
                             </button>
                           ) : (
                             <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-slate-800 opacity-20" title="Administrative Access Required">
                               <Lock size={20} />
                             </div>
                           )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        <div className="px-10 py-8 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <Database size={20} className="text-brand-500" />
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.35em] italic">Personnel Registry Node • Operational Mode Active</p>
           </div>
           <div className="flex gap-4">
              <button onClick={handleManualRefresh} className="p-4 border border-white/10 rounded-2xl text-slate-600 hover:text-white transition-all bg-white/5 hover:bg-white/10">
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center px-8 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[12px] font-black text-white tracking-widest uppercase italic pt-1 leading-none">Node Alpha</span>
              </div>
              <button onClick={handleManualRefresh} className="p-4 border border-white/10 rounded-2xl text-slate-600 hover:text-white transition-all bg-white/5 hover:bg-white/10">
                <ChevronRight size={20} />
              </button>
           </div>
        </div>
      </div>

      <CreateUserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <StaffSuspensionModal
        isOpen={isSuspensionOpen}
        onClose={() => setIsSuspensionOpen(false)}
        onConfirm={toggleStaffStatus}
        user={userToToggle}
      />
    </div>
  );
};

export default StaffManagement;
