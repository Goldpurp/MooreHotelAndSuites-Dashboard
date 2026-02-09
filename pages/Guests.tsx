import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { Guest, Booking, Room, PaymentStatus } from '../types';
import { 
  Search, Phone, LogOut, UserCheck, RefreshCw, 
  Archive, Mail, CreditCard, Bed, ShieldCheck, History, 
  User, ArrowRight, Calendar, ExternalLink, AlertCircle, Zap, Users, Fingerprint, X, ChevronLeft, ChevronRight,
  ArrowLeftRight
} from 'lucide-react';
import CheckOutModal from '../components/CheckOutModal';

const Guests: React.FC = () => {
  const { 
    guests, bookings, rooms, checkOutBooking, setActiveTab, selectedGuestId, setSelectedGuestId, setSelectedBookingId, refreshData 
  } = useHotel();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setLocalActiveTab] = useState<'in-house' | 'history'>('in-house');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;
  const [activeCheckOutData, setActiveCheckOutData] = useState<{ guest: Guest | null; booking: Booking | null; room: Room | null; }>({ guest: null, booking: null, room: null });

  const handleManualRefresh = async () => { setIsRefreshing(true); await refreshData(); setTimeout(() => setIsRefreshing(false), 800); };

  const unifiedResidentList = useMemo(() => {
    const registry = new Map<string, any>();
    (bookings || []).forEach(b => {
      const bStatus = b.status?.toLowerCase();
      const isActive = bStatus === 'checkedin' || bStatus === 'inhouse';
      if (isActive) {
        const identityKey = `ACT-${b.bookingCode}`;
        const match = (guests || []).find(g => b.guestId && g.id === b.guestId);
        registry.set(identityKey, {
          id: b.bookingCode || b.id, 
          registryId: b.guestId || null,
          firstName: b.guestFirstName || match?.firstName || 'Guest',
          lastName: b.guestLastName || match?.lastName || '',
          email: b.guestEmail || match?.email || '',
          phone: b.guestPhone || match?.phone || '',
          avatarUrl: match?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((b.guestFirstName || 'G') + ' ' + (b.guestLastName || ''))}&background=020617&color=fff`,
          activeStay: { booking: b, room: rooms.find(r => r.id === b.roomId) || null },
          history: [], totalSpent: b.amount || 0, createdAt: b.createdAt
        });
      }
    });
    (bookings || []).forEach(b => {
      if (b.status?.toLowerCase() !== 'checkedout') return;
      const identityKey = b.guestId || b.guestEmail?.toLowerCase() || `HIST-${b.bookingCode}`;
      if (!registry.has(identityKey)) {
        registry.set(identityKey, {
          id: b.bookingCode || b.guestId || identityKey, registryId: b.guestId || null,
          firstName: b.guestFirstName || 'Guest', lastName: b.guestLastName || '', email: b.guestEmail || '', phone: b.guestPhone || '',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent((b.guestFirstName || 'G') + ' ' + (b.guestLastName || ''))}&background=020617&color=fff`,
          activeStay: null, history: [], totalSpent: 0, createdAt: b.createdAt
        });
      }
      const profile = registry.get(identityKey);
      profile.history.push(b);
      profile.totalSpent += (b.amount || 0);
    });
    return Array.from(registry.values());
  }, [guests, bookings, rooms]);

  const filteredResidents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return unifiedResidentList
      .filter(r => {
        const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(q) || r.email.toLowerCase().includes(q) || String(r.id).toLowerCase().includes(q);
        if (activeTab === 'in-house') return matchesSearch && !!r.activeStay;
        return matchesSearch && !r.activeStay && r.history.length > 0;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [unifiedResidentList, searchQuery, activeTab]);

  const paginatedResidents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredResidents.slice(start, start + PAGE_SIZE);
  }, [filteredResidents, currentPage]);

  const totalPages = Math.ceil(filteredResidents.length / PAGE_SIZE);

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (selectedGuestId) { 
      const target = unifiedResidentList.find(r => r.id === selectedGuestId || r.registryId === selectedGuestId);
      if (target) { setLocalActiveTab(target.activeStay ? 'in-house' : 'history'); setLocalSelectedId(target.id); }
    } else if (filteredResidents.length > 0 && !localSelectedId) { setLocalSelectedId(filteredResidents[0].id); }
  }, [selectedGuestId, filteredResidents, unifiedResidentList]);

  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);

  const selectedResident = useMemo(() => filteredResidents.find(r => r.id === localSelectedId), [filteredResidents, localSelectedId]);

  return (
    <div className="flex flex-row gap-6 h-[calc(100vh-120px)] animate-in fade-in duration-700 overflow-hidden">
      <div className="split-main flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-[2px] bg-emerald-500 rounded-full"></span>
              <p className="adaptive-text-xs text-emerald-400 font-black uppercase tracking-widest leading-none">Guest Relations Registry</p>
            </div>
            <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase leading-none">{activeTab === 'in-house' ? 'In-House Guests' : 'Guest History'}</h2>
          </div>
          <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
        </div>

        <div className="flex border-b border-white/5 gap-6 overflow-x-auto no-scrollbar">
            <button onClick={() => setLocalActiveTab('in-house')} className={`pb-3 adaptive-text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'in-house' ? 'text-emerald-400' : 'text-slate-600'}`}>
              In-House ({unifiedResidentList.filter(r => !!r.activeStay).length})
              {activeTab === 'in-house' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-emerald-500/50"></div>}
            </button>
            <button onClick={() => setLocalActiveTab('history')} className={`pb-3 adaptive-text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'history' ? 'text-blue-400' : 'text-slate-600'}`}>
              History ({unifiedResidentList.filter(r => !r.activeStay && r.history.length > 0).length})
              {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-blue-500/50"></div>}
            </button>
        </div>

        <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40">
           <div className="px-6 py-4 border-b border-white/5 bg-slate-950/40">
              <div className="relative group max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14}/>
                 <input type="text" placeholder="Lookup Guest Identity..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 adaptive-text-xs text-white outline-none focus:border-emerald-500/30 transition-all" />
              </div>
           </div>
           
           <div className="overflow-y-auto flex-1">
              <table className="w-full text-left min-w-[500px]">
                 <thead className="sticky top-0 bg-slate-950 z-20 border-b border-white/10">
                    <tr className="text-slate-500 adaptive-text-xs font-black uppercase tracking-widest">
                       <th className="responsive-table-padding">Guest Profile</th>
                       <th className="responsive-table-padding text-center col-priority-med">Occupancy Status</th>
                       <th className="responsive-table-padding col-priority-low">Stay Cycle</th>
                       <th className="responsive-table-padding text-right">Lifetime Billing</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {paginatedResidents.length === 0 ? (
                      <tr><td colSpan={4} className="py-32 text-center text-slate-700 font-black uppercase adaptive-text-sm">No guest records found in this view</td></tr>
                    ) : (
                      paginatedResidents.map((resident) => {
                        const active = resident.activeStay;
                        const activeIsPaid = (active?.booking?.paymentStatus || '').toLowerCase() === 'paid';
                        return (
                          <tr key={resident.id} onClick={() => setLocalSelectedId(resident.id)} className={`hover:bg-white/[0.02] transition-all cursor-pointer group border-l-4 ${localSelectedId === resident.id ? 'bg-white/[0.04] border-brand-500' : 'border-transparent'}`}>
                             <td className="responsive-table-padding">
                                <div className="flex items-center gap-4">
                                   <div className="relative shrink-0">
                                      <img src={resident.avatarUrl} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/5 shadow-lg" alt=""/>
                                      {active && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></div>}
                                   </div>
                                   <div className="min-w-0">
                                      <p className="adaptive-text-sm font-black text-white group-hover:text-brand-400 transition-colors uppercase truncate leading-none mb-1.5">{resident.firstName} {resident.lastName}</p>
                                      <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest truncate">ID: {resident.id}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="responsive-table-padding text-center col-priority-med">
                                <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 justify-center w-fit mx-auto border ${active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-900 text-slate-600 border-white/5'}`}>
                                   {active ? <Zap size={10} fill="currentColor"/> : <History size={10}/>} {active ? 'ACTIVE' : 'CYCLED'}
                                </span>
                             </td>
                             <td className="responsive-table-padding col-priority-low">
                                <div className="flex items-center gap-2 adaptive-text-xs font-bold text-slate-600">
                                   <span>{active ? new Date(active.booking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '---'}</span>
                                   <ArrowRight size={10} className="opacity-20" />
                                   <span className="uppercase">{active ? 'PRESENT' : 'PAST STAY'}</span>
                                </div>
                             </td>
                             <td className="responsive-table-padding text-right">
                                <div className="min-w-0">
                                   <p className={`adaptive-text-sm font-black tracking-tighter truncate ${active ? (activeIsPaid ? 'text-emerald-400' : 'text-rose-500') : 'text-slate-400'}`}>
                                      ₦{(active ? active.booking.amount : resident.totalSpent).toLocaleString()}
                                   </p>
                                   <p className="text-[8px] text-slate-700 font-black uppercase mt-1">{active ? (activeIsPaid ? 'Billing Paid' : 'Billing Due') : 'Total Spend'}</p>
                                </div>
                             </td>
                          </tr>
                        );
                      })
                    )}
                 </tbody>
              </table>
           </div>
           <div className="px-8 py-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{filteredResidents.length} Registered Guests</span>
              <div className="flex gap-2">
                 <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={18} /></button>
                 <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[11px] font-black text-white">{currentPage} / {totalPages || 1}</span></div>
                 <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={18} /></button>
              </div>
           </div>
        </div>
      </div>

      {selectedResident && (
        <div className="split-side flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 h-full overflow-hidden shrink-0">
           <div className="glass-card rounded-2xl p-8 flex flex-col border border-white/10 bg-[#0a0f1a] shadow-2xl h-full overflow-y-auto">
             <div className="flex justify-between items-start mb-3">
               <div className="space-y-1">
                  <h3 className="adaptive-text-xl font-black text-white tracking-tighter uppercase leading-none">Guest Profile</h3>
                  <p className="text-[9px] text-brand-500 font-black tracking-widest uppercase">System Dossier</p>
               </div>
               <button onClick={() => setSelectedGuestId(null)} className="p-2 bg-white/5 rounded-xl text-slate-600 hover:text-rose-500 transition-all"><X size={18}/></button>
             </div>

             <div className="flex flex-col items-center mb-10 pt-4">
                <div className="relative mb-6">
                   <img src={selectedResident.avatarUrl} className="w-20 h-20 rounded-2xl object-cover ring-2 ring-white/10 shadow-2xl" alt=""/>
                   {selectedResident.activeStay && (
                     <div className="absolute -bottom-1 -right-1 p-1.5 bg-emerald-600 rounded-lg border-2 border-slate-950 text-white shadow-xl"><ShieldCheck size={14} /></div>
                   )}
                </div>
                <h3 className="adaptive-text-lg font-black text-white uppercase text-center leading-[1] tracking-tighter truncate w-full px-2 mb-2">{selectedResident.firstName} <br/> {selectedResident.lastName}</h3>
                <div className="px-4 py-1.5 bg-white/5 border border-white/5 rounded-xl flex items-center gap-2"><Fingerprint size={12} className="text-slate-600" /><p className="text-[8px] text-slate-600 font-black uppercase tracking-widest truncate max-w-[120px]">{selectedResident.id}</p></div>
             </div>

             <div className="space-y-6 flex-1 pr-1">
                <div className="bg-[#0d131f] p-5 rounded-2xl space-y-4 border border-white/5 shadow-inner">
                   <div className="flex items-center gap-4 text-slate-500"><Mail size={14} className="shrink-0"/><span className="adaptive-text-sm font-bold truncate leading-none">{selectedResident.email || 'No Email Record'}</span></div>
                   <div className="flex items-center gap-4 text-slate-500 pt-4 border-t border-white/5"><Phone size={14} className="shrink-0"/><span className="adaptive-text-sm font-bold leading-none">{selectedResident.phone || 'No Phone Record'}</span></div>
                </div>

                {selectedResident.activeStay && (
                  <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/20 space-y-4 shadow-xl">
                     <div className="flex justify-between items-center"><span className="text-[9px] text-emerald-500/60 font-black uppercase tracking-widest">Active Stay</span><span className={`px-2 py-1 text-[8px] font-black uppercase rounded border ${(selectedResident.activeStay.booking.paymentStatus || '').toLowerCase() === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>{selectedResident.activeStay.booking.paymentStatus}</span></div>
                     <div className="flex items-center gap-4"><div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 shrink-0"><Bed size={20}/></div><div className="min-w-0"><p className="adaptive-text-base font-black text-white tracking-tighter leading-none mb-1">Room {selectedResident.activeStay.room?.roomNumber}</p><p className="text-[8px] text-slate-600 font-bold uppercase truncate">{selectedResident.activeStay.room?.category}</p></div></div>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                   <div className="flex items-center justify-between px-1"><h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><History size={12}/> STAY HISTORY</h4><span className="text-[9px] font-black text-slate-700 bg-white/5 px-2 py-0.5 rounded border border-white/5">{selectedResident.history.length} CYCLES</span></div>
                   <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                      {selectedResident.history.length === 0 ? <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10 opacity-30"><p className="text-[9px] text-slate-600 uppercase font-black">No history recorded</p></div> : 
                        selectedResident.history.map((stay: Booking) => (
                          <div key={stay.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-all group flex items-center justify-between gap-2">
                             <div className="min-w-0"><p className="text-[11px] font-black text-white uppercase tracking-tighter leading-none mb-1.5">Room {rooms.find(r => r.id === stay.roomId)?.roomNumber || '---'}</p><p className="text-[8px] text-slate-700 font-bold uppercase truncate">{new Date(stay.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                             <button onClick={() => { setSelectedGuestId(selectedResident.id); setActiveTab('bookings'); setSelectedBookingId(stay.id); }} className="text-brand-500 hover:text-brand-400 opacity-0 group-hover:opacity-100 transition-all font-black shrink-0"><ExternalLink size={12}/></button>
                          </div>
                        ))
                      }
                   </div>
                </div>
             </div>

             <div className="mt-8 pt-6 border-t border-white/10">
               {selectedResident.activeStay ? (
                 <button onClick={() => { if (selectedResident && selectedResident.activeStay) { setActiveCheckOutData({ guest: selectedResident, booking: selectedResident.activeStay.booking, room: selectedResident.activeStay.room || null }); setIsCheckOutModalOpen(true); } }} className="w-full bg-rose-600 hover:bg-rose-700 py-5 rounded-2xl adaptive-text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"><LogOut size={20} strokeWidth={3}/> CHECK-OUT GUEST</button>
               ) : (
                 <button onClick={() => { setSelectedGuestId(selectedResident.id); setActiveTab('bookings'); }} className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 rounded-2xl adaptive-text-sm font-black uppercase tracking-widest text-white transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"><Users size={20}/> NEW RESERVATION</button>
               )}
             </div>
           </div>
        </div>
      )}
      
      <CheckOutModal isOpen={isCheckOutModalOpen} onClose={() => setIsCheckOutModalOpen(false)} onConfirm={checkOutBooking} guest={activeCheckOutData.guest} booking={activeCheckOutData.booking} room={activeCheckOutData.room} />
    </div>
  );
};

export default Guests;