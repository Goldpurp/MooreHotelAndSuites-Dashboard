import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { PaymentStatus, Booking, BookingStatus, UserRole } from '../types';
import { 
  CreditCard, Search, CheckCircle, Clock, 
  RefreshCw, ShieldCheck, Loader2, FileCheck, ChevronLeft, ChevronRight,
  ShieldAlert, Lock, ArrowRight, Wallet
} from 'lucide-react';
import PermissionWrapper from '../components/PermissionWrapper';

const Settlements: React.FC = () => {
  const { bookings, guests, confirmTransfer, refreshData, currentUser } = useHotel();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const [verificationState, setVerificationState] = useState<'idle' | 'committing' | 'success'>('idle');

  const processedData = useMemo(() => {
    return (bookings || []).filter(b => {
      const method = (b.paymentMethod || '').toLowerCase();
      const isTransfer = method.includes('transfer') || method.includes('bank') || method.includes('direct');
      const isPaid = b.paymentStatus === PaymentStatus.Paid;
      
      if (activeTab === 'queue') {
        if (isPaid) return false;
        return isTransfer || method === '';
      } else {
        return isPaid;
      }
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings, activeTab]);

  const resolveGuestName = (b: Booking) => {
    if (b.guestFirstName && b.guestLastName) return `${b.guestFirstName} ${b.guestLastName}`;
    const g = guests.find(guest => guest.id === b.guestId || guest.email === b.guestEmail);
    return g ? `${g.firstName} ${g.lastName}` : b.guestEmail || "Guest";
  };

  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return processedData.filter(b => {
      const name = resolveGuestName(b).toLowerCase();
      const code = (b.bookingCode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [processedData, searchQuery]);

  const totalPages = Math.ceil(filteredHistory.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredHistory.slice(start, start + PAGE_SIZE);
  }, [filteredHistory, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const executeConfirmation = async () => {
    if (!selectedBooking) return;
    const code = selectedBooking.bookingCode;
    setVerificationState('committing');
    try { 
      await confirmTransfer(code); 
      setVerificationState('success');
      setTimeout(() => {
        setVerificationState('idle');
        setIsConfirmModalOpen(false);
        setSelectedBooking(null);
      }, 2000);
    } 
    catch (err) { 
      console.error("Accounting ledger commit failed", err); 
      setVerificationState('idle');
    } 
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-brand-500 rounded-full"></span>
            <p className="adaptive-text-xs text-brand-400 font-black uppercase tracking-widest leading-none">Yield Management</p>
          </div>
          <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase leading-none">Financial Settlements</h2>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
           <div className="bg-slate-900 border border-amber-500/20 rounded-xl px-4 py-2 flex items-center gap-3">
              <span className="text-[9px] text-slate-500 font-black uppercase">Pending</span>
              <span className="text-sm font-black text-amber-500 leading-none">{bookings.filter(b => b.paymentStatus.toLowerCase() !== 'paid' && b.status !== BookingStatus.Cancelled).length}</span>
           </div>
        </div>
      </div>

      <div className="flex border-b border-white/5 gap-6 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('queue')} className={`pb-3 adaptive-text-xs font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === 'queue' ? 'text-brand-400' : 'text-slate-600'}`}>Verification Queue {activeTab === 'queue' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"></div>}</button>
          <button onClick={() => setActiveTab('history')} className={`pb-3 adaptive-text-xs font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-600'}`}>Settled History {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>}</button>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-[550px]">
        <div className="px-6 py-4 border-b border-white/5 bg-slate-950/40">
           <div className="relative group max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input type="text" placeholder="Lookup settlement by Guest or Folio..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 adaptive-text-xs text-white outline-none font-bold placeholder:text-slate-700" />
           </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5 bg-slate-900/20">
                <th className="responsive-table-padding">Entry Date</th>
                <th className="responsive-table-padding">Guest Folio</th>
                <th className="responsive-table-padding col-priority-med">Dossier Code</th>
                <th className="responsive-table-padding text-right">Amount (₦)</th>
                <th className="responsive-table-padding text-center">Accounting State</th>
                <th className="responsive-table-padding text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="py-32 text-center text-slate-700 adaptive-text-base font-black uppercase tracking-widest">No accounting telemetry found</td></tr>
              ) : (
                paginatedData.map((folio) => {
                  const isPaid = folio.paymentStatus.toLowerCase() === 'paid';
                  return (
                    <tr key={folio.id} className="hover:bg-white/[0.02] transition-all border-l-4 border-transparent">
                      <td className="responsive-table-padding">
                        <div>
                          <p className="adaptive-text-sm font-black text-white">{new Date(folio.createdAt).toLocaleDateString('en-GB')}</p>
                          <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{new Date(folio.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </td>
                      <td className="responsive-table-padding">
                        <div className="min-w-0">
                          <p className="adaptive-text-sm font-black text-slate-300 uppercase truncate leading-none mb-1">{resolveGuestName(folio)}</p>
                          <p className="text-[8px] text-slate-600 font-black uppercase truncate">{folio.guestEmail || 'No Email'}</p>
                        </div>
                      </td>
                      <td className="responsive-table-padding col-priority-med">
                        <p className="text-xs font-black uppercase text-slate-300">{folio.bookingCode}</p>
                        <p className="text-[8px] text-slate-700 font-mono truncate mt-1">{folio.transactionReference || 'REF-PENDING'}</p>
                      </td>
                      <td className="responsive-table-padding text-right">
                         <p className={`adaptive-text-sm font-black ${isPaid ? 'text-white' : 'text-emerald-400'}`}>₦{folio.amount.toLocaleString()}</p>
                      </td>
                      <td className="responsive-table-padding text-center">
                         <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border inline-flex items-center gap-1.5 ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {isPaid ? <CheckCircle size={10}/> : <Clock size={10} className="animate-pulse"/>}
                            {isPaid ? 'Settled' : 'Unverified'}
                         </span>
                      </td>
                      <td className="responsive-table-padding text-right">
                         {isPaid ? (
                           <div className="flex items-center justify-end gap-2 text-slate-800 opacity-20 pr-2"><Lock size={14} /><span className="text-[8px] font-black uppercase">Sealed</span></div>
                         ) : (
                           <button onClick={() => { setSelectedBooking(folio); setIsConfirmModalOpen(true); }} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl adaptive-text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-20 whitespace-nowrap flex items-center justify-center ml-auto">
                             <ShieldCheck size={12} className="inline mr-1.5" /> Verify Settlement
                           </button>
                         )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-950/40 border-t border-white/5 flex items-center justify-between">
           <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Forensic Ledger Active • {filteredHistory.length} Records</div>
           <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={16} /></button>
              <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[10px] font-black text-white">{currentPage} / {totalPages || 1}</span></div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={16} /></button>
           </div>
        </div>
      </div>

      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#0a0f1d] border border-white/10 rounded-[2.5rem] p-8 shadow-3xl text-center overflow-hidden">
              {verificationState === 'success' ? (
                <div className="py-6 animate-in zoom-in-95 duration-500 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                    <ShieldCheck size={32} className="text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase mb-1">Settled</h3>
                  <p className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em]">Ledger Synced Successfully</p>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-6 border border-brand-500/20">
                    {verificationState === 'committing' ? <Loader2 size={32} className="text-brand-500 animate-spin" /> : <Wallet size={32} className="text-brand-500" />}
                  </div>
                  <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tighter">
                    {verificationState === 'committing' ? 'Processing...' : 'Verify Settlement?'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8">
                    {verificationState === 'committing' 
                      ? 'Commitment to property financial node in progress. Do not refresh page.' 
                      : `Authorize manual accounting verification for ${selectedBooking ? resolveGuestName(selectedBooking) : ''}.`}
                  </p>
                  
                  {verificationState === 'idle' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setIsConfirmModalOpen(false)} className="py-4 rounded-2xl adaptive-text-xs font-black uppercase text-slate-600 hover:text-white border border-white/5 transition-all">Abort</button>
                      <button onClick={executeConfirmation} className="py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black adaptive-text-xs uppercase flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">Authorize</button>
                    </div>
                  )}
                </>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlements;