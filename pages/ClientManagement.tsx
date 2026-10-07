import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useHotel } from '../store/HotelContext';
import { 
  Search, ShieldCheck, RefreshCw, Mail, Phone, ChevronLeft, ChevronRight, 
  Fingerprint, X, UserPlus, Shield
} from 'lucide-react';
import { sileo } from 'sileo';
import RoleBadge from '../components/RoleBadge';
import StaffSuspensionModal from '../components/StaffSuspensionModal';
import { StaffUser, UserRole } from '../types';
import { api } from '../lib/api';
import { parseClientAccounts } from '../lib/clientAccounts';

const ClientManagement: React.FC = () => {
  const { toggleStaffStatus, currentUser, setBookingGuestRequest, setActiveTab, selectedProfileId, setSelectedProfileId } = useHotel();
  const [isSuspensionOpen, setIsSuspensionOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<StaffUser | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [clients, setClients] = useState<StaffUser[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const loadClients = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const result = parseClientAccounts(await api.get<unknown>('/api/admin/management/clients'));
      if (sequence !== requestSequence.current) return false;
      setClients(result);
      setSelectedStaffId(current => current === undefined ? result[0]?.id ?? null : result.some(client => client.id === current) ? current : null);
      return true;
    } catch (error) {
      if (sequence === requestSequence.current) setLoadError(error instanceof Error ? error.message : 'Client accounts could not be loaded.');
      return false;
    } finally {
      if (sequence === requestSequence.current) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();
    return () => { requestSequence.current++; };
  }, [loadClients]);

  const handleManualRefresh = async () => {
    if (await loadClients()) sileo.success({ title: 'Clients updated', description: 'Client accounts have been refreshed.' });
  };

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clients
      .filter(s => {
        const matchesSearch = (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
        const sStatus = String(s.status).toLowerCase();
        const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' && sStatus === 'active') || (statusFilter === 'Suspended' && sStatus === 'suspended');
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [clients, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(1, totalPages)));
  }, [totalPages]);

  useEffect(() => {
    if (!selectedProfileId) return;
    const resultIndex = filteredClients.findIndex((profile) => profile.id === selectedProfileId);
    if (resultIndex < 0) return;
    setCurrentPage(Math.floor(resultIndex / PAGE_SIZE) + 1);
    setSelectedStaffId(selectedProfileId);
    setSelectedProfileId(null);
  }, [filteredClients, selectedProfileId, setSelectedProfileId]);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (selectedStaffId && paginatedClients.length > 0 && !paginatedClients.some(item => item.id === selectedStaffId)) setSelectedStaffId(paginatedClients[0].id);
  }, [paginatedClients, selectedStaffId]);

  const selectedClient = useMemo(() => paginatedClients.find(s => s.id === selectedStaffId), [paginatedClients, selectedStaffId]);

  return (
    <div className="master-detail-workspace flex h-full min-h-0 flex-row gap-6 overflow-hidden">
      <div className="split-main flex min-h-0 flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-[2px] bg-emerald-500 rounded-full"></span>
              <p className="adaptive-text-xs text-emerald-400 font-black uppercase tracking-widest leading-none">Accounts</p>
            </div>
            <h1 className="adaptive-text-2xl font-black text-white tracking-tight uppercase leading-none">Clients</h1>
          </div>
          <button aria-label="Refresh clients" disabled={isRefreshing} onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
        </div>

        <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40">
          <div className="px-6 py-4 border-b border-white/5 bg-slate-950/60 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={14} />
              <input type="text" placeholder="Search for clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 adaptive-text-xs text-white outline-none font-bold placeholder:text-slate-800" />
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
               {(['All', 'Active', 'Suspended'] as const).map(f => (
                 <button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === f ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>{f}</button>
               ))}
            </div>
          </div>

          <div className="scroll-pane min-h-0 flex-1 overflow-auto" aria-busy={isRefreshing}>
            {isRefreshing && <p role="status" className="p-6 text-sm text-slate-300">Loading client accounts…</p>}
            {loadError && <p role="alert" className="m-4 rounded-xl border border-rose-500/30 p-4 text-sm text-rose-300">{loadError} Use Refresh to try again.</p>}
            <table className="mobile-card-table w-full text-left min-w-[700px]">
              <thead>
                <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5 bg-slate-950/40">
                  <th className="responsive-table-padding">Client Name</th>
                  <th className="responsive-table-padding col-priority-med">Joined</th>
                  <th className="responsive-table-padding text-center">Status</th>
                  <th className="responsive-table-padding text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!isRefreshing && !loadError && paginatedClients.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-24 text-center">
                    <p className="adaptive-text-sm font-black uppercase tracking-widest text-slate-400">{clients.length ? 'No matching clients' : 'No client accounts yet'}</p>
                    <p className="mt-3 text-sm text-slate-500">{clients.length ? 'Try another name, email or status filter.' : 'Registered online accounts appear here. Booking guests are listed in Guests.'}</p>
                    {!clients.length && <button type="button" onClick={() => setActiveTab('guests')} className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-brand-400 hover:bg-white/5">View guests</button>}
                  </td></tr>
                ) : (
                  paginatedClients.map((client) => {
                    const isActive = String(client.status).toLowerCase() === 'active';
                    return (
                      <tr key={client.id} onClick={() => setSelectedStaffId(client.id)} className={`hover:bg-white/[0.02] transition-all group border-l-4 ${selectedStaffId === client.id ? 'bg-white/[0.04] border-emerald-500' : 'border-transparent'} cursor-pointer`}>
                        <td data-label="Guest" className="responsive-table-padding">
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                               <img src={client.avatarUrl || "/avatar-placeholder.svg"} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/5 transition-all" alt=""/>
                               {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse"></div>}
                            </div>
                            <div className="min-w-0">
                              <p className="adaptive-text-sm font-black text-white group-hover:text-emerald-400 transition-colors uppercase truncate leading-none mb-1.5">{client.name}</p>
                              <p className="text-[9px] text-slate-600 font-bold lowercase truncate">{client.email}</p>
                            </div>
                          </div>
                        </td>
                        <td data-label="Joined" className="responsive-table-padding col-priority-med">
                           <p className="text-[11px] font-black text-slate-500 uppercase whitespace-nowrap">{client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-GB') : 'SYS-ENTRY'}</p>
                        </td>
                        <td data-label="Status" className="responsive-table-padding text-center">
                          <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase border tracking-widest transition-all ${isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{isActive ? 'Active' : 'Suspended'}</span>
                        </td>
                        <td data-label="Actions" className="responsive-table-padding text-right">
                           <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                             {currentUser?.role === UserRole.Admin ? (
                               <button aria-label={`${isActive ? 'Suspend' : 'Activate'} ${client.name}`} disabled={isRefreshing || Boolean(loadError)} onClick={() => { setUserToToggle(client); setIsSuspensionOpen(true); }} className={`p-2.5 rounded-xl border transition-all active:scale-90 ${isActive ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-600' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600 hover:text-white'}`}><Shield size={16} /></button>
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
             <div className="text-[9px] text-slate-700 font-black uppercase tracking-widest">{isRefreshing ? 'Loading accounts…' : loadError ? 'Client accounts unavailable' : `Client accounts • ${filteredClients.length}`}</div>
             <div className="flex gap-2">
                <button aria-label="Previous page" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={16} /></button>
                <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[10px] font-black text-white">{currentPage} / {totalPages || 1}</span></div>
                <button aria-label="Next page" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={16} /></button>
             </div>
          </div>
        </div>
      </div>

      {selectedClient && (
        <div className="split-side flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 h-full overflow-hidden shrink-0">
          <div className="glass-card scroll-pane rounded-2xl p-8 flex flex-col h-full border border-white/10 bg-[#0a0f1a] shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-1">
                 <h3 className="adaptive-text-xl font-black text-white tracking-tighter uppercase leading-none">Client Details</h3>
                 <p className="text-[9px] text-brand-500 font-black tracking-widest uppercase">Account details</p>
              </div>
              <button aria-label="Close details" onClick={() => setSelectedStaffId(null)} className="p-2 bg-white/5 rounded-xl text-slate-600 hover:text-rose-500 transition-all"><X size={18}/></button>
            </div>

            <div className="flex flex-col items-center mb-10 pt-4">
              <div className="relative mb-6">
                 <img src={selectedClient.avatarUrl || "/avatar-placeholder.svg"} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white/10 shadow-2xl" alt=""/>
                 {String(selectedClient.status).toLowerCase() === 'active' && <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-600 rounded-xl border-4 border-slate-950 text-white shadow-xl animate-pulse"><ShieldCheck size={16} /></div>}
              </div>
              <h3 className="adaptive-text-lg font-black text-white uppercase text-center leading-tight tracking-tighter px-2 mb-2">{selectedClient.name}</h3>
              <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2"><Fingerprint size={12} className="text-slate-600" /><p className="text-[8px] text-slate-600 font-black uppercase tracking-widest truncate max-w-[120px]">{selectedClient.id}</p></div>
            </div>

            <div className="space-y-8 flex-1">
              <div className="bg-[#0d131f] p-6 rounded-2xl space-y-4 border border-white/5 shadow-inner">
                 <div className="flex items-center gap-4 text-slate-400">
                    <div className="p-2 bg-black rounded-xl border border-white/10 text-slate-700 shrink-0"><Mail size={16}/></div>
                    <span className="adaptive-text-sm font-bold truncate leading-none lowercase">{selectedClient.email}</span>
                 </div>
                 <div className="flex items-center gap-4 text-slate-400 pt-5 border-t border-white/5">
                    <div className="p-2 bg-black rounded-xl border border-white/10 text-slate-700 shrink-0"><Phone size={16}/></div>
                    <span className="adaptive-text-sm font-black uppercase leading-none">{selectedClient.phone || 'No Secure Line'}</span>
                 </div>
              </div>

              <div className="p-6 bg-brand-600/5 rounded-2xl border border-brand-500/10 space-y-4 shadow-xl">
                 <div className="flex justify-between items-center"><p className="text-[9px] text-brand-500 font-black uppercase tracking-widest leading-none">Role</p><RoleBadge role={selectedClient.role} /></div>
                 <p className="text-[10px] leading-relaxed text-slate-500 font-bold uppercase tracking-tight opacity-70">Guest account for app access only.</p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10">
              <button onClick={() => { setBookingGuestRequest({ guestFirstName: selectedClient.name.split(' ')[0] || '', guestLastName: selectedClient.name.split(' ').slice(1).join(' '), guestEmail: selectedClient.email, guestPhone: selectedClient.phone || '' }); setActiveTab('bookings'); }} className="w-full py-5 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-2xl adaptive-text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"><UserPlus size={20} strokeWidth={3}/> NEW BOOKING</button>
            </div>
          </div>
        </div>
      )}

      <StaffSuspensionModal
        isOpen={isSuspensionOpen}
        onClose={() => setIsSuspensionOpen(false)}
        onConfirm={async (id) => { await toggleStaffStatus(id); await loadClients(); }}
        user={userToToggle}
      />
    </div>
  );
};

export default ClientManagement;
