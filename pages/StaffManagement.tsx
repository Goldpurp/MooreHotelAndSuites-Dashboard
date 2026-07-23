import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { 
  UserPlus, Search, ShieldCheck, ShieldOff, Activity, 
  Fingerprint, RefreshCw, Mail, Lock, ChevronLeft, ChevronRight, 
  X, Phone
} from 'lucide-react';
import { sileo } from 'sileo';
import RoleBadge from '../components/RoleBadge';
import PermissionWrapper from '../components/PermissionWrapper';
import CreateUserModal from '../components/CreateUserModal';
import StaffSuspensionModal from '../components/StaffSuspensionModal';
import { StaffUser, UserRole } from '../types';

const StaffManagement: React.FC = () => {
  const { staff, toggleStaffStatus, refreshData, currentUser, selectedProfileId, setSelectedProfileId } = useHotel();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuspensionOpen, setIsSuspensionOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<StaffUser | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    sileo.success({
      title: 'Staff List Updated',
      description: 'The staff list has been updated.'
    });
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const allStaff = (staff || []).filter(s => s && s.role !== UserRole.Client);
    return allStaff
      .filter(s => {
        const matchesSearch = (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.department || '').toLowerCase().includes(q) || (s.phone || '').toLowerCase().includes(q);
        const sStatus = String(s.status).toLowerCase();
        const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' && sStatus === 'active') || (statusFilter === 'Suspended' && sStatus === 'suspended');
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [staff, searchQuery, statusFilter]);

  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredStaff.slice(start, start + PAGE_SIZE);
  }, [filteredStaff, currentPage]);

  const totalPages = Math.ceil(filteredStaff.length / PAGE_SIZE);

  useEffect(() => {
    if (!selectedProfileId) return;
    const resultIndex = filteredStaff.findIndex((profile) => profile.id === selectedProfileId);
    if (resultIndex < 0) return;
    setCurrentPage(Math.floor(resultIndex / PAGE_SIZE) + 1);
    setSelectedStaffId(selectedProfileId);
    setSelectedProfileId(null);
  }, [filteredStaff, selectedProfileId, setSelectedProfileId]);

  useEffect(() => {
    if (paginatedStaff.length > 0 && !selectedStaffId) {
      setSelectedStaffId(paginatedStaff[0].id);
    }
  }, [paginatedStaff, selectedStaffId]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  const selectedStaff = useMemo(() => staff.find(s => s.id === selectedStaffId), [staff, selectedStaffId]);

  const canPerformSuspension = (targetUser: StaffUser) => {
    if (!currentUser || currentUser.role !== UserRole.Admin) return false;
    if (targetUser.role === UserRole.Admin) return false;
    return true;
  };

  const handleToggleAccessRequest = (user: StaffUser) => {
    if (!canPerformSuspension(user)) return;
    setUserToToggle(user);
    setIsSuspensionOpen(true);
  };

  const getRoleDescription = (role: string) => {
    switch(role?.toLowerCase()) {
      case 'admin': return "Full access to all system settings and tools.";
      case 'manager': return "Can manage bookings, payments, and staff.";
      case 'staff': return "Can manage bookings and guests.";
      default: return "Staff member.";
    }
  };

  return (
    <div className="master-detail-workspace flex h-full min-h-0 flex-row gap-6 overflow-hidden">
      <div className="split-main flex min-h-0 flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-[2px] bg-brand-500 rounded-full"></span>
              <p className="adaptive-text-xs text-brand-400 font-black uppercase tracking-widest leading-none">Staff</p>
            </div>
            <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase leading-none">Staff</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
            <PermissionWrapper allowedRoles={[UserRole.Admin, UserRole.Manager]}>
              <button onClick={() => setIsModalOpen(true)} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl adaptive-text-xs font-black uppercase flex items-center gap-2 transition-all shadow-lg whitespace-nowrap"><UserPlus size={16} /> Add Staff</button>
            </PermissionWrapper>
          </div>
        </div>

        <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40">
          <div className="px-6 py-4 border-b border-white/5 bg-slate-950/60 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input type="text" placeholder="Search for staff..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 adaptive-text-xs text-white outline-none font-medium" />
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
               {(['All', 'Active', 'Suspended'] as const).map(f => (
                 <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === f ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>{f}</button>
               ))}
            </div>
          </div>

          <div className="scroll-pane min-h-0 flex-1 overflow-auto">
            <table className="mobile-card-table w-full text-left min-w-[700px]">
              <thead className="sticky top-0 bg-slate-950/90 z-10 border-b border-white/10">
                <tr className="text-slate-500 adaptive-text-xs font-black uppercase tracking-widest">
                  <th className="responsive-table-padding">Name</th>
                  <th className="responsive-table-padding">Role</th>
                  <th className="responsive-table-padding col-priority-med">Joined</th>
                  <th className="responsive-table-padding text-center">Status</th>
                  <th className="responsive-table-padding text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedStaff.length === 0 ? (
                  <tr><td colSpan={5} className="py-32 text-center text-slate-700 adaptive-text-xs font-black uppercase tracking-widest">No staff found</td></tr>
                ) : (
                  paginatedStaff.map((user) => {
                    const isActive = String(user.status).toLowerCase() === 'active';
                    return (
                      <tr key={user.id} onClick={() => setSelectedStaffId(user.id)} className={`hover:bg-brand-500/[0.02] transition-all group border-l-4 ${selectedStaffId === user.id ? 'bg-white/[0.04] border-brand-500' : 'border-transparent'}`}>
                        <td data-label="Name" className="responsive-table-padding">
                          <div className="flex items-center gap-4">
                            <img src={user.avatarUrl} className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl object-cover ring-2 ring-white/5" alt=""/>
                            <div className="min-w-0">
                              <p className="adaptive-text-sm font-black text-white uppercase truncate leading-none mb-1.5">{user.name}</p>
                              <p className="text-[8px] text-slate-600 font-bold lowercase truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td data-label="Role" className="responsive-table-padding"><RoleBadge role={user.role} /></td>
                        <td data-label="Joined" className="responsive-table-padding col-priority-med">
                           <p className="text-[11px] font-black text-slate-500 uppercase whitespace-nowrap">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}</p>
                        </td>
                        <td data-label="Status" className="responsive-table-padding text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{isActive ? 'Active' : 'Suspended'}</span>
                        </td>
                        <td data-label="Actions" className="responsive-table-padding text-right">
                           <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                             {currentUser?.role === UserRole.Admin && user.role !== UserRole.Admin ? (
                               <button onClick={() => handleToggleAccessRequest(user)} className={`p-2.5 rounded-xl border transition-all active:scale-90 ${isActive ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{isActive ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}</button>
                             ) : <Lock size={16} className="text-slate-800 opacity-20 mr-2" />}
                           </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-8 py-4 border-t border-white/5 bg-slate-950/60 flex items-center justify-between">
             <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{filteredStaff.length} Total</div>
             <div className="flex gap-2">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={18} /></button>
                <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[11px] font-black text-white">{currentPage} / {totalPages || 1}</span></div>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={18} /></button>
             </div>
          </div>
        </div>
      </div>

      {selectedStaff && (
        <div className="split-side flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 h-full overflow-hidden shrink-0">
          <div className="glass-card scroll-pane rounded-2xl p-8 flex flex-col h-full border border-white/10 bg-[#0a0f1a] shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-1">
                 <h3 className="adaptive-text-xl font-black text-white tracking-tighter uppercase leading-none">Staff Details</h3>
                 <p className="text-[9px] text-brand-500 font-black tracking-widest uppercase">Details</p>
              </div>
              <button onClick={() => setSelectedStaffId(null)} className="p-2 bg-white/5 rounded-xl text-slate-600 hover:text-rose-500 transition-all"><X size={18}/></button>
            </div>

            <div className="flex flex-col items-center mb-10 pt-4">
              <div className="relative mb-6">
                 <img src={selectedStaff.avatarUrl} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/10 shadow-2xl" alt=""/>
                 {String(selectedStaff.status).toLowerCase() === 'active' && <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-600 rounded-xl border-4 border-slate-950 text-white shadow-xl animate-pulse"><ShieldCheck size={16} /></div>}
              </div>
              <h3 className="adaptive-text-lg font-black text-white uppercase text-center leading-[1.1] tracking-tighter px-2 mb-2">{selectedStaff.name}</h3>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-4">{selectedStaff.department || 'General Operations'}</p>
              <div className="px-4 py-1.5 bg-white/5 border border-white/5 rounded-xl flex items-center gap-2"><Fingerprint size={12} className="text-slate-600" /><p className="text-[8px] text-slate-600 font-black uppercase tracking-widest truncate max-w-[120px]">{selectedStaff.id}</p></div>
            </div>

            <div className="space-y-8 flex-1">
              <div className="bg-[#0d131f] p-6 rounded-3xl space-y-5 border border-white/5 shadow-inner">
                 <div className="flex items-center gap-4 text-slate-400">
                    <div className="p-2 bg-black rounded-xl border border-white/5 text-slate-700 shrink-0"><Mail size={16}/></div>
                    <span className="adaptive-text-sm font-bold truncate leading-none lowercase">{selectedStaff.email}</span>
                 </div>
                 <div className="flex items-center gap-4 text-slate-400 pt-5 border-t border-white/5">
                    <div className="p-2 bg-black rounded-xl border border-white/10 text-slate-700 shrink-0"><Phone size={16}/></div>
                    <span className="adaptive-text-sm font-black uppercase leading-none">{selectedStaff.phone || 'No Phone'}</span>
                 </div>
              </div>

              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                 <div className="flex justify-between items-center"><p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Role</p><RoleBadge role={selectedStaff.role} /></div>
                 <p className="text-[11px] leading-relaxed text-slate-500 font-medium">{getRoleDescription(selectedStaff.role)}</p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10">
              <PermissionWrapper allowedRoles={[UserRole.Admin]}>
                {selectedStaff.role !== UserRole.Admin ? (
                  <button onClick={() => handleToggleAccessRequest(selectedStaff)} className={`w-full py-5 rounded-2xl adaptive-text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl ${String(selectedStaff.status).toLowerCase() === 'active' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                    {String(selectedStaff.status).toLowerCase() === 'active' ? <ShieldOff size={20}/> : <Activity size={20}/>} {String(selectedStaff.status).toLowerCase() === 'active' ? 'SUSPEND' : 'ACTIVATE'}
                  </button>
                ) : <div className="p-5 bg-slate-900/50 rounded-2xl text-center border border-white/5"><p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.2em]">SYSTEM ADMIN</p></div>}
              </PermissionWrapper>
            </div>
          </div>
        </div>
      )}

      <CreateUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <StaffSuspensionModal isOpen={isSuspensionOpen} onClose={() => setIsSuspensionOpen(false)} onConfirm={toggleStaffStatus} user={userToToggle} />
    </div>
  );
};

export default StaffManagement;
