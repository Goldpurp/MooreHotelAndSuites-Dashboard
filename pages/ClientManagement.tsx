import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { 
  Search, ShieldCheck, RefreshCw, Mail, Phone, ChevronLeft, ChevronRight, 
  Fingerprint, X, UserPlus, Shield
} from 'lucide-react';
import RoleBadge from '../components/RoleBadge';
import StaffSuspensionModal from '../components/StaffSuspensionModal';
import { StaffUser, UserRole } from '../types';

const ClientManagement: React.FC = () => {
  const { staff, toggleStaffStatus, refreshData, currentUser, setSelectedGuestId, setActiveTab } = useHotel();
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
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const allClients = (staff || []).filter(s => s && s.role === UserRole.Client);
    return allClients
      .filter(s => {
        const matchesSearch = (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
        const sStatus = String(s.status).toLowerCase();
        const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' && sStatus === 'active') || (statusFilter === 'Suspended' && sStatus === 'suspended');
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [staff, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (paginatedClients.length > 0 && !selectedStaffId) setSelectedStaffId(paginatedClients[0].id);
  }, [paginatedClients, selectedStaffId]);

  const selectedClient = useMemo(() => staff.find(s => s.id === selectedStaffId), [staff, selectedStaffId]);

  return (
    <div className="flex flex-row gap-6 h-[calc(100vh-120px)] animate-in fade-in duration-700 overflow-hidden pb-4">
      <div className="split-main flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-[2px] bg-emerald-500 rounded-full"></span>
              <p className="adaptive-text-xs text-emerald-400 font-black uppercase tracking-widest leading-none">Global Residency Registry</p>
            </div>
            <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase italic leading-none">Client Management</h2>
          </div>
          <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
        </div>

        <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40">
          <div className="px-6 py-4 border-b border-white/5 bg-slate-950/60 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={14} />
              <input type="text" placeholder="Lookup Guest Identity..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 adaptive-text-xs text-white outline-none font-bold placeholder:text-slate-800" />
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
               {(['All', 'Active', 'Suspended'] as const).map(f => (
                 <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === f ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>{f}</button>
               ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5 bg-slate-950/40">
                  <th className="responsive-table-padding">Guest Profile</th>
                  <th className="responsive-table-padding col-priority-med">Enrolled Date</th>
                  <th className="responsive-table-padding text-center">Protocol Status</th>
                  <th className="responsive-table-padding text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedClients.length === 0 ? (
                  <tr><td colSpan={4} className="py-32 text-center text-slate-700 adaptive-text-sm font-black uppercase italic tracking-widest">No guest identities detected</td></tr>
                ) : (
                  paginatedClients.map((client) => {
                    const isActive = String(client.status).toLowerCase() === 'active';
                    return (
                      <tr key={client.id} onClick={() => setSelectedStaffId(client.id)} className={`hover:bg-white/[0.02] transition-all group border-l-4 ${selectedStaffId === client.id ? 'bg-white/[0.04] border-emerald-500' : 'border-transparent'} cursor-pointer`}>
                        <td className="responsive-table-padding">
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                               <img src={client.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=020617&color=fff`} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/5 transition-all" alt=""/>
                               {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse"></div>}
                            </div>
                            <div className="min-w-0">
                              <p className="adaptive-text-sm font-black text-white group-hover:text-emerald-400 transition-colors uppercase italic truncate leading-none mb-1.5">{client.name}</p>
                              <p className="text-[9px] text-slate-600 font-bold lowercase truncate">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="responsive-table-padding col-priority-med">
                           <p className="text-[11px] font-black text-slate-500 uppercase italic whitespace-nowrap">{client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-GB') : 'SYS-ENTRY'}</p>
                        </td>
                        <td className="responsive-table-padding text-center">
                          <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase border tracking-widest transition-all ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{isActive ? 'Verified' : 'Locked'}</span>
                        </td>
                        <td className="responsive-table-padding text-right">
                           <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                             {currentUser?.role === UserRole.Admin ? (
                               <button onClick={() => { setUserToToggle(client); setIsSuspensionOpen(true); }} className={`p-2.5 rounded-xl border transition-all active:scale-90 ${isActive ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-600' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600 hover:text-white'}`}><Shield size={16} /></button>
                             ) : <Shield size={16} className="text-slate-800 opacity-20 mr-2" />}
                           </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between">
             <div className="text-[9px] text-slate-700 font-black uppercase italic tracking-widest">Active Identity Cloud Sync • {filteredClients.length} Guests</div>
             <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={16} /></button>
                <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[10px] font-black text-white">{currentPage} / {totalPages || 1}</span></div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={16} /></button>
             </div>
          </div>
        </div>
      </div>

      {selectedClient && (
        <div className="split-side flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 h-full overflow-hidden shrink-0">
          <div className="glass-card rounded-2xl p-8 flex flex-col h-full border border-white/10 bg-[#0a0f1a] shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-1">
                 <h3 className="adaptive-text-xl font-black text-white tracking-tighter uppercase italic leading-none">Guest Persona</h3>
                 <p className="text-[9px] text-brand-500 font-black tracking-widest uppercase">Registry Dossier</p>
              </div>
              <button onClick={() => setSelectedStaffId(null)} className="p-2 bg-white/5 rounded-xl text-slate-600 hover:text-rose-500 transition-all"><X size={18}/></button>
            </div>

            <div className="flex flex-col items-center mb-10 pt-4">
              <div className="relative mb-6">
                 <img src={selectedClient.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.name)}&background=020617&color=fff`} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/10 shadow-2xl" alt=""/>
                 {String(selectedClient.status).toLowerCase() === 'active' && <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-600 rounded-xl border-4 border-slate-950 text-white shadow-xl animate-pulse"><ShieldCheck size={16} /></div>}
              </div>
              <h3 className="adaptive-text-lg font-black text-white italic uppercase text-center leading-tight tracking-tighter px-2 mb-2">{selectedClient.name}</h3>
              <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2"><Fingerprint size={12} className="text-slate-600" /><p className="text-[8px] text-slate-600 font-black uppercase tracking-widest truncate max-w-[120px]">{selectedClient.id}</p></div>
            </div>

            <div className="space-y-8 flex-1">
              <div className="bg-[#0d131f] p-6 rounded-2xl space-y-4 border border-white/5 shadow-inner">
                 <div className="flex items-center gap-4 text-slate-400">
                    <div className="p-2 bg-black rounded-xl border border-white/10 text-slate-700 shrink-0"><Mail size={16}/></div>
                    <span className="adaptive-text-sm font-bold truncate leading-none lowercase italic">{selectedClient.email}</span>
                 </div>
                 <div className="flex items-center gap-4 text-slate-400 pt-5 border-t border-white/5">
                    <div className="p-2 bg-black rounded-xl border border-white/10 text-slate-700 shrink-0"><Phone size={16}/></div>
                    {/* <span className="adaptive-text-sm font-black uppercase italic leading-none">{selectedClient.phone || 'No Secure Line'}</span> */}
                 </div>
              </div>

              <div className="p-6 bg-brand-600/5 rounded-2xl border border-brand-500/10 space-y-4 shadow-xl">
                 <div className="flex justify-between items-center"><p className="text-[9px] text-brand-500 font-black uppercase tracking-widest leading-none">Authority Level</p><RoleBadge role={selectedClient.role} /></div>
                 <p className="text-[10px] leading-relaxed text-slate-500 italic font-bold uppercase tracking-tight opacity-70">Resident profile authorized for portal access and ledger telemetry only.</p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10">
              <button onClick={() => { setSelectedGuestId(selectedClient.id); setActiveTab('bookings'); }} className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl adaptive-text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 italic flex items-center justify-center gap-3"><UserPlus size={20} strokeWidth={3}/> PROVISION NEW FOLIO</button>
            </div>
          </div>
        </div>
      )}

      <StaffSuspensionModal
        isOpen={isSuspensionOpen}
        onClose={() => setIsSuspensionOpen(false)}
        onConfirm={toggleStaffStatus}
        user={userToToggle}
      />
    </div>
  );
};

export default ClientManagement;