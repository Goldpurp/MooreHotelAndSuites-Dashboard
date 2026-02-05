
import React, { useState, useMemo } from 'react';
import { useHotel } from '../store/HotelContext';
import { PaymentStatus, Booking, Guest, BookingStatus } from '../types';
import { 
  CreditCard, Search, CheckCircle, Clock, 
  RefreshCw, ShieldCheck, Loader2, User, 
  Info, FileCheck, Hash, Lock, Banknote,
  RotateCcw, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';

const Settlements: React.FC = () => {
  const { bookings, guests, confirmTransfer, refreshData } = useHotel();
  const [activeTab, setActiveTab] = useState<'queue' | 'refunds'>('queue');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // LOGIC: Filter bookings based on active operational mode
  const processedData = useMemo(() => {
    return (bookings || []).filter(b => {
      const method = (b.paymentMethod || '').toLowerCase();
      const isTransfer = method.includes('transfer') || method.includes('bank') || method.includes('direct');
      const isPaid = b.paymentStatus === PaymentStatus.Paid;
      const isCancelled = b.status === BookingStatus.Cancelled;

      if (activeTab === 'queue') {
        // QUEUE PROTOCOL:
        // 1. Must be a Direct Transfer.
        // 2. Must NOT be cancelled (unless already paid, but standard queue focuses on active/confirmed).
        // 3. User specifically asked to hide cancelled if NOT confirmed.
        if (isCancelled && !isPaid) return false;
        return isTransfer;
      } else {
        // REFUND PROTOCOL:
        // 1. Must be Cancelled.
        // 2. Must have been Paid (requires liquidity return).
        return isCancelled && isPaid;
      }
    }).sort((a, b) => {
      if (activeTab === 'queue') {
        // Priority for Unpaid/Awaiting in Queue
        const aPending = a.paymentStatus !== PaymentStatus.Paid;
        const bPending = b.paymentStatus !== PaymentStatus.Paid;
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [bookings, activeTab]);

  const resolveGuestName = (b: Booking) => {
    if (b.guestFirstName && b.guestLastName) return `${b.guestFirstName} ${b.guestLastName}`;
    const g = guests.find(guest => guest.id === b.guestId || guest.email === b.guestEmail);
    if (g) return `${g.firstName} ${g.lastName}`;
    return b.guestEmail || "Direct Resident";
  };

  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return processedData.filter(b => {
      const name = resolveGuestName(b).toLowerCase();
      const code = (b.bookingCode || '').toLowerCase();
      const ref = (b.transactionReference || '').toLowerCase();
      return name.includes(q) || code.includes(q) || ref.includes(q);
    });
  }, [processedData, searchQuery]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const executeConfirmation = async () => {
    if (!selectedBooking) return;
    const code = selectedBooking.bookingCode;
    setIsConfirmModalOpen(false);
    setVerifyingId(code);
    try {
      await confirmTransfer(code);
    } catch (err) {
      console.error("Ledger commit failed", err);
    } finally {
      setVerifyingId(null);
      setSelectedBooking(null);
    }
  };

  const getStatusConfig = (b: Booking) => {
    const s = b.paymentStatus.toLowerCase();
    if (b.status === BookingStatus.Cancelled && b.paymentStatus === PaymentStatus.Paid) {
      return {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/20',
        icon: <RotateCcw size={10} />,
        label: 'REFUND REQ.'
      };
    }
    if (s === 'paid') return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: <CheckCircle size={10} />,
      label: 'CONFIRMED'
    };
    if (s === 'awaitingverification') return {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      icon: <Clock size={10} className="animate-pulse" />,
      label: 'PENDING SYNC'
    };
    return {
      bg: 'bg-slate-800',
      text: 'text-slate-400',
      border: 'border-white/5',
      icon: <Clock size={10} />,
      label: 'UNPAID'
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-brand-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
            <p className="text-[10px] text-brand-400 font-black uppercase tracking-[0.2em]">Liquidity Ledger Node</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Financial Settlements</h2>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Manual Verification & Capital Return Hub</p>
        </div>
        
        <div className="flex gap-2">
           <button onClick={handleManualRefresh} className={`p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>
           <div className="bg-slate-900 border border-amber-500/20 rounded-xl px-6 py-3 flex items-center gap-4 shadow-2xl">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Pending Verification</span>
              <span className="text-2xl font-black text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                {processedData.filter(b => b.paymentStatus.toLowerCase() !== 'paid').length}
              </span>
           </div>
        </div>
      </div>

      <div className="flex border-b border-white/5 gap-8">
          <button 
            onClick={() => setActiveTab('queue')}
            className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'queue' ? 'text-brand-400' : 'text-slate-600 hover:text-slate-400'}`}
          >
            Settlement Queue
            {activeTab === 'queue' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('refunds')}
            className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'refunds' ? 'text-rose-400' : 'text-slate-600 hover:text-slate-400'}`}
          >
            Refund Protocol
            {activeTab === 'refunds' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>}
          </button>
      </div>

      <div className="glass-card rounded-3xl border border-white/5 overflow-hidden shadow-3xl bg-slate-900/20 backdrop-blur-3xl">
        <div className="px-8 py-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
           <div className="relative w-full md:w-[500px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input 
                type="text" 
                placeholder={`Search ${activeTab === 'queue' ? 'Settlements' : 'Refunds'}...`} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-[14px] text-white outline-none focus:bg-slate-950 focus:border-brand-500/30 transition-all font-medium"
              />
           </div>
           <div className={`flex items-center gap-4 px-6 py-2 rounded-2xl border ${activeTab === 'queue' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
              {activeTab === 'queue' ? <Info size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-rose-500" />}
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                {activeTab === 'queue' ? 'Active transfers awaiting ledger confirmation' : 'Paid dossiers awaiting capital liquidation'}
              </p>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/50">
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Timestamp</th>
                <th className="px-8 py-6">Resident Profile</th>
                <th className="px-8 py-6">Reference ID</th>
                <th className="px-8 py-6 text-right">Value (₦)</th>
                <th className="px-8 py-6 text-center">Status</th>
                <th className="px-8 py-6 text-right">Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-48 text-center opacity-30">
                    <div className="flex flex-col items-center gap-6">
                      <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                        <Banknote size={40} className="text-slate-700" />
                      </div>
                      <p className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-500 italic">No {activeTab} Records Detected</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((log) => {
                  const isPaid = log.paymentStatus.toLowerCase() === 'paid';
                  const statusCfg = getStatusConfig(log);
                  
                  return (
                    <tr key={log.id} className={`hover:bg-brand-500/[0.03] transition-all group ${!isPaid && activeTab === 'queue' ? 'bg-amber-500/[0.02]' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 bg-black rounded-xl border border-white/5 ${!isPaid ? 'text-amber-500 border-amber-500/20' : 'text-slate-600'}`}>
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-[14px] font-black text-white italic tracking-tight">{new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                            <p className="text-[9px] text-slate-600 font-black uppercase mt-0.5 tracking-widest">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isPaid ? 'bg-white/5 text-slate-400 border-white/5' : 'bg-brand-500/10 text-brand-400 border-brand-500/20 shadow-inner'}`}>
                               <User size={18} />
                            </div>
                            <div>
                              <p className={`text-[15px] font-black uppercase tracking-tighter italic group-hover:text-brand-400 transition-colors ${isPaid ? 'text-slate-200' : 'text-white'}`}>{resolveGuestName(log)}</p>
                              <p className="text-[9px] text-slate-600 font-black uppercase tracking-dash mt-0.5">{log.guestEmail || 'No Digital Record'}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div>
                            <p className={`text-[13px] font-black tracking-widest uppercase ${isPaid ? 'text-slate-400' : 'text-white'}`}>{log.bookingCode}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                               <Hash size={10} className="text-slate-600" />
                               <p className="text-[10px] text-slate-500 font-mono italic truncate max-w-[120px]">{log.transactionReference || 'SYNC_PENDING'}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <p className={`text-[17px] font-black italic tracking-tighter ${activeTab === 'refunds' ? 'text-rose-400' : isPaid ? 'text-white' : 'text-emerald-400'}`}>
                           {activeTab === 'refunds' && '-'}₦{log.amount.toLocaleString()}
                         </p>
                         <p className="text-[9px] text-slate-700 font-black uppercase mt-1">{activeTab === 'queue' ? 'Property Value' : 'Liquidation Value'}</p>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex justify-center">
                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border flex items-center gap-2 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                               {statusCfg.icon}
                               {statusCfg.label}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         {isPaid && activeTab === 'queue' ? (
                           <div className="flex items-center justify-end gap-2 text-slate-700 px-6 py-4 opacity-50">
                              <Lock size={14} />
                              <span className="text-[9px] font-black uppercase tracking-widest">FOLIO SEALED</span>
                           </div>
                         ) : activeTab === 'refunds' ? (
                           <button className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-3xl shadow-rose-950/40 active:scale-95">
                              <RotateCcw size={16} />
                              REVERSE CAPITAL
                           </button>
                         ) : (
                           <button 
                             onClick={() => { setSelectedBooking(log); setIsConfirmModalOpen(true); }}
                             disabled={verifyingId === log.bookingCode}
                             className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-3xl shadow-brand-950/40 active:scale-95 disabled:bg-slate-900 disabled:text-slate-700"
                           >
                             {verifyingId === log.bookingCode ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                             VERIFY NOW
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

        <div className="px-10 py-6 bg-slate-950/60 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <ShieldCheck size={16} className="text-brand-500" />
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] italic">Operational Authority Confirmed • Financial Auditor v9.8</p>
           </div>
           <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                 <span className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Awaiting</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                 <span className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Refund Flow</span>
              </div>
           </div>
        </div>
      </div>

      {/* Manual Settlement Authorization Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0a0f1d] border border-white/10 rounded-[3rem] p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/20 shadow-inner">
                <ShieldCheck size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">COMMIT SETTLEMENT?</h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.15em] leading-relaxed mb-10">
                You are about to manually verify the bank transfer for <span className="text-brand-500 font-black italic">{selectedBooking ? resolveGuestName(selectedBooking) : ''}</span>. This action will update the property ledger and finalize the folio.
              </p>

              <div className="w-full bg-black/40 p-8 rounded-[2rem] border border-white/5 mb-10 space-y-4 text-left">
                 <div className="flex justify-between items-center text-[10px] text-slate-600 font-black uppercase tracking-widest">
                    <span>Folio Reference</span>
                    <span className="text-white font-mono">{selectedBooking?.bookingCode}</span>
                 </div>
                 {selectedBooking?.transactionReference && (
                   <div className="flex justify-between items-center text-[10px] text-slate-600 font-black uppercase tracking-widest pt-2">
                      <span>Sync Reference</span>
                      <span className="text-brand-400 font-mono">{selectedBooking.transactionReference}</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Value verified</span>
                    <span className="text-2xl font-black text-white italic">₦{selectedBooking?.amount.toLocaleString()}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button onClick={() => setIsConfirmModalOpen(false)} className="py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white border border-white/5 hover:bg-white/5 transition-all">Abort</button>
                <button onClick={executeConfirmation} className="py-5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-brand-500/20">
                  <FileCheck size={16} /> Authorize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlements;
