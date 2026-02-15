import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { PaymentStatus, Booking, BookingStatus, UserRole } from '../types';
import { Search, CheckCircle, Clock, 
  RefreshCw, ShieldCheck, Loader2, ChevronLeft, ChevronRight,
  ShieldAlert, Lock, Wallet, RotateCcw, Hash
} from 'lucide-react';

const Settlements: React.FC = () => {
  const { bookings, guests, confirmTransfer, completeRefund, refreshData, currentUser } = useHotel();
  
  /** 
   * CHANGE: Added 'refunds' tab to the Settlements workflow 
   * to manage folios in the RefundPending state.
   */
  const [activeTab, setActiveTab] = useState<'queue' | 'history' | 'refunds'>('queue');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  /** 
   * CHANGE: Added state for mandatory transaction reference 
   * required by the new POST /api/bookings/{id}/complete-refund API.
   */
  const [refundRef, setRefundRef] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const [verificationState, setVerificationState] = useState<'idle' | 'committing' | 'success'>('idle');

  const processedData = useMemo(() => {
    return (bookings || [])
      .filter(b => {
        // Exclude cancelled bookings from standard ledger if not refund-related
        if (b.status === BookingStatus.Cancelled && b.paymentStatus !== PaymentStatus.RefundPending && b.paymentStatus !== PaymentStatus.Refunded) return false;
        
        const pStatus = b.paymentStatus;
        
        /** 
         * CHANGE: Updated filter logic to support the new 3-tab view:
         * 1. Queue: Standard payments needing verification.
         * 2. Refunds: Cancelled folios awaiting financial return.
         * 3. History: Fully settled or refunded records.
         */
        if (activeTab === 'queue') {
          return pStatus === PaymentStatus.AwaitingVerification || (![PaymentStatus.Paid, PaymentStatus.RefundPending, PaymentStatus.Refunded].includes(pStatus));
        } else if (activeTab === 'refunds') {
          return pStatus === PaymentStatus.RefundPending;
        } else {
          return pStatus === PaymentStatus.Paid || pStatus === PaymentStatus.Refunded;
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  /** 
   * CHANGE: Unified action execution logic.
   * If in the Refund tab, it triggers completeRefund with the transaction ref.
   * Otherwise, it performs standard transfer verification.
   */
  const executeAction = async () => {
    if (!selectedBooking) return;
    setVerificationState('committing');
    try { 
      if (activeTab === 'refunds') {
        /** CHANGE: Calling the new completeRefund protocol from context */
        await completeRefund(selectedBooking.id, refundRef);
      } else {
        await confirmTransfer(selectedBooking.bookingCode);
      }
      setVerificationState('success');
      setTimeout(() => {
        setVerificationState('idle');
        setIsConfirmModalOpen(false);
        setSelectedBooking(null);
        setRefundRef('');
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
          <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase italic leading-none">Financial Settlements</h2>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={16} /></button>
             <div className="bg-slate-900 border border-amber-500/20 rounded-xl px-4 py-2 flex items-center gap-3">
              <span className="text-[9px] text-slate-500 font-black uppercase">Active Task</span>
              <span className="text-sm font-black text-amber-500 leading-none">
                {bookings.filter(b => b.paymentStatus === PaymentStatus.AwaitingVerification && b.status !== BookingStatus.Cancelled).length}
              </span>
           </div>
        </div>
      </div>

      <div className="flex border-b border-white/5 gap-6 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('queue')} className={`pb-3 adaptive-text-xs font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === 'queue' ? 'text-brand-400' : 'text-slate-600'}`}>Verification Queue {activeTab === 'queue' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"></div>}</button>
          
          {/** CHANGE: Added visual trigger for the new Refunds Pending view */}
          <button onClick={() => setActiveTab('refunds')} className={`pb-3 adaptive-text-xs font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === 'refunds' ? 'text-rose-400' : 'text-slate-600'}`}>Refunds Pending {activeTab === 'refunds' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"></div>}</button>
          
          <button onClick={() => setActiveTab('history')} className={`pb-3 adaptive-text-xs font-black uppercase tracking-widest transition-all relative shrink-0 ${activeTab === 'history' ? 'text-emerald-400' : 'text-slate-600'}`}>Settled History {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>}</button>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-[550px]">
        <div className="px-6 py-4 border-b border-white/5 bg-slate-950/40">
           <div className="relative group max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input type="text" placeholder="Lookup folio by identity..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 adaptive-text-xs text-white outline-none font-bold placeholder:text-slate-700" />
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
                <tr><td colSpan={6} className="py-32 text-center text-slate-700 adaptive-text-base font-black uppercase italic tracking-widest">No accounting telemetry found</td></tr>
              ) : (
                paginatedData.map((folio) => {
                  const isPaid = folio.paymentStatus === PaymentStatus.Paid;
                  const isRefunded = folio.paymentStatus === PaymentStatus.Refunded;
                  const isRefundPending = folio.paymentStatus === PaymentStatus.RefundPending;
                  
                  return (
                    <tr key={folio.id} className="hover:bg-white/[0.02] transition-all border-l-4 border-transparent">
                      <td className="responsive-table-padding">
                        <div>
                          <p className="adaptive-text-sm font-black text-white italic">{new Date(folio.createdAt).toLocaleDateString('en-GB')}</p>
                          <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{new Date(folio.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </td>
                      <td className="responsive-table-padding">
                        <div className="min-w-0">
                          <p className="adaptive-text-sm font-black text-slate-300 uppercase italic truncate leading-none mb-1">{resolveGuestName(folio)}</p>
                          <p className="text-[8px] text-slate-600 font-black uppercase truncate">{folio.guestEmail || 'No Email'}</p>
                        </div>
                      </td>
                      <td className="responsive-table-padding col-priority-med">
                        <p className="text-xs font-black uppercase text-slate-300">{folio.bookingCode}</p>
                        <p className="text-[8px] text-slate-700 font-mono truncate mt-1 italic">{folio.transactionReference || 'REF-PENDING'}</p>
                      </td>
                      <td className="responsive-table-padding text-right">
                         <p className={`adaptive-text-sm font-black italic ${isPaid ? 'text-white' : isRefunded || isRefundPending ? 'text-rose-400' : 'text-emerald-400'}`}>₦{folio.amount.toLocaleString()}</p>
                      </td>
                      <td className="responsive-table-padding text-center">
                         {/** CHANGE: Updated status badge logic to handle the new PaymentStatus enums */}
                         <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border inline-flex items-center gap-1.5 ${
                           isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                           isRefunded ? 'bg-slate-800 text-slate-500 border-white/5' :
                           isRefundPending ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
                           'bg-amber-500/10 text-amber-400 border-amber-500/20'
                         }`}>
                            {isPaid ? <CheckCircle size={10}/> : isRefunded ? <RotateCcw size={10}/> : isRefundPending ? <ShieldAlert size={10}/> : <Clock size={10} className="animate-pulse"/>}
                            {isPaid ? 'Settled' : isRefunded ? 'Refunded' : isRefundPending ? 'Refund Req.' : 'Unverified'}
                         </span>
                      </td>
                      <td className="responsive-table-padding text-right">
                         {(isPaid || isRefunded) ? (
                           <div className="flex items-center justify-end gap-2 text-slate-800 opacity-20 italic pr-2"><Lock size={14} /><span className="text-[8px] font-black uppercase">Sealed</span></div>
                         ) : (
                           /** CHANGE: Integrated the new refund authorization action */
                           <button onClick={() => { setSelectedBooking(folio); setIsConfirmModalOpen(true); }} className={`px-4 py-2 rounded-xl adaptive-text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-20 whitespace-nowrap italic flex items-center justify-center ml-auto ${isRefundPending ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}>
                             {isRefundPending ? <RotateCcw size={12} className="inline mr-1.5" /> : <ShieldCheck size={12} className="inline mr-1.5" />}
                             {isRefundPending ? 'Complete Refund' : 'Verify Settlement'}
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
           <div className="text-[9px] text-slate-600 font-black uppercase italic tracking-widest">Accounting Integrity Secured • {filteredHistory.length} Records</div>
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
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border mb-6 shadow-xl ${activeTab === 'refunds' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    {activeTab === 'refunds' ? <RotateCcw size={32} className="text-rose-500" /> : <ShieldCheck size={32} className="text-emerald-500" />}
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic mb-1">{activeTab === 'refunds' ? 'Refunded' : 'Settled'}</h3>
                  <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${activeTab === 'refunds' ? 'text-rose-400' : 'text-emerald-400'}`}>Ledger Synced Successfully</p>
                </div>
              ) : (
                <>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border ${activeTab === 'refunds' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-brand-500/10 border-brand-500/20'}`}>
                    {verificationState === 'committing' ? <Loader2 size={32} className={`${activeTab === 'refunds' ? 'text-rose-500' : 'text-brand-500'} animate-spin`} /> : activeTab === 'refunds' ? <RotateCcw size={32} className="text-rose-500" /> : <Wallet size={32} className="text-brand-500" />}
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic mb-2 tracking-tighter">
                    {verificationState === 'committing' ? 'Processing...' : activeTab === 'refunds' ? 'Finalize Refund?' : 'Verify Settlement?'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-6">
                    {verificationState === 'committing' 
                      ? 'Commitment to property financial node in progress.' 
                      : activeTab === 'refunds' 
                        ? `Process folio refund for ${selectedBooking ? resolveGuestName(selectedBooking) : ''}. This requires a transaction reference.`
                        : `Authorize manual accounting verification for ${selectedBooking ? resolveGuestName(selectedBooking) : ''}.`}
                  </p>

                  {/** 
                   * CHANGE: Added mandatory transaction reference input field 
                   * for the refund completion protocol.
                   */}
                  {activeTab === 'refunds' && verificationState === 'idle' && (
                    <div className="space-y-2 mb-8 text-left">
                       <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest ml-1 flex items-center gap-2"><Hash size={12}/> Transaction Reference</label>
                       <input 
                         value={refundRef}
                         onChange={(e) => setRefundRef(e.target.value)}
                         placeholder="REF-XXXXXX"
                         className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-5 text-sm text-white focus:border-rose-500/40 outline-none transition-all italic font-bold"
                       />
                    </div>
                  )}
                  
                  {verificationState === 'idle' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => { setIsConfirmModalOpen(false); setRefundRef(''); }} className="py-4 rounded-2xl adaptive-text-xs font-black uppercase text-slate-600 hover:text-white border border-white/5 transition-all italic">Abort</button>
                      <button 
                        onClick={executeAction} 
                        disabled={activeTab === 'refunds' && !refundRef.trim()}
                        className={`py-4 rounded-2xl font-black adaptive-text-xs uppercase flex items-center justify-center gap-2 shadow-lg italic transition-all active:scale-95 ${activeTab === 'refunds' ? 'bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-30' : 'bg-brand-600 hover:bg-brand-700 text-white'}`}
                      >
                        Authorize
                      </button>
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