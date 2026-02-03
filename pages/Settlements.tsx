import React, { useState, useMemo } from 'react';
import { useHotel } from '../store/HotelContext';
import { PaymentStatus, Booking } from '../types';
import { 
  CreditCard, Search, CheckCircle, Clock, 
  RefreshCw, ShieldCheck, AlertCircle, Loader2, X, AlertTriangle
} from 'lucide-react';

const Settlements: React.FC = () => {
  const { bookings, confirmTransfer, refreshData } = useHotel();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const pendingSettlements = useMemo(() => {
    return (bookings || []).filter(b => 
      (b.paymentMethod === 'DirectTransfer' || b.paymentMethod === 'Bank Transfer') && 
      (b.paymentStatus === PaymentStatus.AWAITING_VERIFICATION || b.paymentStatus === PaymentStatus.UNPAID)
    );
  }, [bookings]);

  const filteredSettlements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return pendingSettlements.filter(b => 
      (b.guestFirstName || '').toLowerCase().includes(q) ||
      (b.guestLastName || '').toLowerCase().includes(q) ||
      (b.bookingCode || '').toLowerCase().includes(q)
    );
  }, [pendingSettlements, searchQuery]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const initiateConfirmation = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsConfirmModalOpen(true);
  };

  const executeConfirmation = async () => {
    if (!selectedBooking) return;
    
    const code = selectedBooking.bookingCode;
    setIsConfirmModalOpen(false);
    setVerifyingId(code);
    
    try {
      await confirmTransfer(code);
    } catch (err) {
      console.error("Settlement verification failed", err);
    } finally {
      setVerifyingId(null);
      setSelectedBooking(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Financial Auditing</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Direct Settlements</h2>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Manual bank transfer verification queue</p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={handleManualRefresh}
             className={`p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}
           >
             <RefreshCw size={18} />
           </button>
           <div className="bg-slate-900/60 border border-white/5 rounded-xl px-5 py-3 flex items-center gap-3">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Pending Verification</span>
              <span className="text-xl font-black text-blue-500">{pendingSettlements.length}</span>
           </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-3xl bg-slate-900/20 backdrop-blur-xl">
        <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                type="text" 
                placeholder="Search Guest or Folio Ref..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-[12px] text-slate-300 outline-none focus:bg-slate-900 focus:border-blue-500/30 transition-all placeholder:text-slate-700 font-bold"
              />
           </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 border-b border-white/10">
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Initiation Date</th>
                <th className="px-8 py-5">Occupant</th>
                <th className="px-8 py-5 text-center">Protocol</th>
                <th className="px-8 py-5 text-right">Value (₦)</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center opacity-20">
                    <CheckCircle size={56} className="mx-auto mb-6 text-slate-700" />
                    <p className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-500 italic">No pending settlements found</p>
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-600/5 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-black/40 rounded-xl text-slate-600 border border-white/5">
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-white italic">{new Date(log.createdAt).toLocaleDateString('en-GB')}</p>
                          <p className="text-[9px] text-slate-600 font-black uppercase mt-0.5 tracking-widest">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div>
                          <p className="text-[15px] font-black text-slate-200 uppercase tracking-tight group-hover:text-blue-400 transition-colors italic">{log.guestFirstName} {log.guestLastName}</p>
                          <p className="text-[9px] text-slate-600 font-black uppercase tracking-dash mt-0.5">Ref: {log.bookingCode}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex justify-center">
                          <span className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-500/30 bg-amber-500/10 text-amber-400 flex items-center gap-2">
                             <CreditCard size={10} /> Bank Transfer
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <p className="text-[16px] font-black text-white italic">₦{log.amount.toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <button 
                         onClick={() => initiateConfirmation(log)}
                         disabled={verifyingId === log.bookingCode}
                         className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:bg-slate-800 disabled:text-slate-600"
                       >
                         {verifyingId === log.bookingCode ? (
                           <Loader2 size={14} className="animate-spin" />
                         ) : (
                           <ShieldCheck size={14} />
                         )}
                         Verify Settlement
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-5 bg-slate-950/60 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <ShieldCheck size={14} className="text-blue-500" />
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] italic">Moore Hotels Finance Protocol • Payment Verification Sequence</p>
           </div>
           <p className="text-[9px] text-slate-800 font-bold italic uppercase tracking-widest">Enterprise Ledger v8.7 Gold</p>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-card w-full max-w-md rounded-3xl shadow-3xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Confirm Verification</h3>
              </div>
              <button onClick={() => setIsConfirmModalOpen(false)} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Occupant</span>
                  <span className="text-[13px] font-black text-white italic uppercase">{selectedBooking?.guestFirstName} {selectedBooking?.guestLastName}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Settlement Amount</span>
                  <span className="text-[18px] font-black text-emerald-400 tracking-tighter italic">₦{selectedBooking?.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed text-center italic">
                  Authorize this transfer as physically verified? This action will update the global property ledger and mark the folio as PAID.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5 hover:bg-white/5"
                >
                  Abort
                </button>
                <button 
                  onClick={executeConfirmation}
                  className="flex-[1.5] bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-950/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <ShieldCheck size={16} /> Confirm Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl flex items-start gap-4">
         <AlertCircle className="text-blue-500 shrink-0 mt-1" size={24} />
         <div className="space-y-1">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Auditor's Policy</h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight">
              Direct Bank Transfers must only be confirmed after physical verification of the receipt or bank statement entry. 
              Confirming a settlement will move the Folio to <span className="text-emerald-400">PAID</span> status and update the global property ledger.
            </p>
         </div>
      </div>
    </div>
  );
};

export default Settlements;