import React, { useMemo, useState } from 'react';
import { X, CheckCircle, Bed, Calendar, ArrowRight, ShieldCheck, Zap, AlertTriangle, AlertCircle, UserPlus, XCircle, Loader2, CreditCard, Clock, Lock, ExternalLink, Brush, Wrench, CalendarClock, History, Check } from 'lucide-react';
import { Guest, Booking, Room, PaymentStatus, RoomStatus } from '../types';
import { useHotel } from '../store/HotelContext';

interface CheckInConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string) => void | Promise<void>;
  onCancelAndWalkIn: (booking: Booking) => void;
  booking: Booking | null;
  guest: Guest | null;
  room: Room | null;
}

const CheckInConfirmModal: React.FC<CheckInConfirmModalProps> = ({ isOpen, onClose, onConfirm, onCancelAndWalkIn, booking, guest, room }) => {
  const { setActiveTab } = useHotel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'details' | 'success'>('details');
  const [error, setError] = useState<string | null>(null);

  const arrivalState = useMemo(() => {
    if (!booking) return 'today';
    const checkInDate = new Date(booking.checkIn);
    const now = new Date();
    const checkInDateOnly = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (checkInDateOnly > nowDateOnly) return 'future';
    if (checkInDateOnly < nowDateOnly) return 'past';
    if (now.getHours() < 15) return 'early-today';
    return 'on-time';
  }, [booking]);

  const isUnpaid = useMemo(() => (booking?.paymentStatus || '').toLowerCase() !== 'paid', [booking]);
  const isBlockedByStatus = useMemo(() => room ? room.status !== RoomStatus.Available : false, [room]);

  if (!isOpen || !guest || !booking || !room) return null;

  const handleAuthorizedConfirm = async () => {
    if (isUnpaid || isBlockedByStatus) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(booking.id);
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('details');
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Ledger synchronization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToSettlements = () => { setActiveTab('settlements'); onClose(); };

  const getStatusDisplay = () => {
    if (isUnpaid) return { title: 'SETTLEMENT BLOCKED', sub: 'Payment Verification Required', icon: <Lock size={16}/>, color: 'rose' };
    if (isBlockedByStatus) return { title: room.status === RoomStatus.Cleaning ? 'ROOM` BEING CLEANED' : 'ROOM` NOT READY', sub: 'Readiness Check Failed', icon: <Brush size={16}/>, color: 'rose' };
    switch(arrivalState) {
      case 'future': return { title: 'FUTURE ARRIVAL', sub: 'Date Mismatch Detected', icon: <CalendarClock size={16}/>, color: 'amber' };
      case 'past': return { title: 'LATE ARRIVAL', sub: 'Folio Recovery Mode', icon: <History size={16} className="rotate-180" />, color: 'blue' };
      case 'early-today': return { title: 'EARLY ARRIVAL', sub: 'Pre-15:00 Access Protocol', icon: <Clock size={16}/>, color: 'amber' };
      default: return { title: 'CHECK-IN ACTIVATION', sub: 'Property Access Protocol', icon: <Zap size={16}/>, color: 'emerald' };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`glass-card w-full max-w-md rounded-[2rem] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 shadow-3xl ring-1 ${
        display.color === 'rose' ? 'shadow-rose-950/20 ring-rose-500/20' : 
        display.color === 'amber' ? 'shadow-amber-900/20 ring-amber-500/20' : 'shadow-emerald-900/20 ring-emerald-500/20'
      }`}>
        
        {status === 'success' ? (
          <div className="p-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Zap size={40} className="text-emerald-500" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Identity Verified</h2>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-2">Dossier {booking.bookingCode} Activated</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 w-full">
              <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Asset Status</p>
              <p className="text-xs font-black text-white uppercase">Room {room.roomNumber} - Now Occupied</p>
            </div>
          </div>
        ) : (
          <>
            <div className={`px-8 py-6 border-b border-white/5 flex items-center justify-between ${
              display.color === 'rose' ? 'bg-rose-500/5' : display.color === 'amber' ? 'bg-amber-500/5' : 'bg-emerald-500/5'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  display.color === 'rose' ? 'bg-rose-500/20 text-rose-500' : 
                  display.color === 'amber' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {display.icon}
                </div>
                <div>
                  <h2 className="text-base font-black text-white tracking-tight uppercase">{display.title}</h2>
                  <p className={`text-[8px] font-black uppercase tracking-[0.1em] ${
                    display.color === 'rose' ? 'text-rose-400' : 
                    display.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>{display.sub}</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all"><X size={16} /></button>
            </div>

            <div className="p-8 space-y-6">
              {isUnpaid ? (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex flex-col items-center gap-4">
                     <CreditCard size={40} className="text-rose-500" />
                     <h3 className="text-lg font-black text-white uppercase">PENDING PAYMENT</h3>
                     <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest leading-relaxed">Property protocol forbids check-in for unpaid folios.</p>
                  </div>
                  <button onClick={handleNavigateToSettlements} className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-all">Go to Settlement Page <ExternalLink size={14}/></button>
                </div>
              ) : isBlockedByStatus ? (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex flex-col items-center gap-4">
                     {room.status === RoomStatus.Cleaning ? <Brush size={40} className="text-rose-500" /> : <Wrench size={40} className="text-rose-500" />}
                     <h3 className="text-lg font-black text-white uppercase">ROOM NOT READY</h3>
                     <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest leading-relaxed">Room status must be <span className="underline font-black text-white uppercase">AVAILABLE</span> to authorize check-in.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-3">
                    <h3 className="text-xl font-black text-white leading-tight uppercase">{arrivalState === 'future' ? 'DATE OVERRIDE' : arrivalState === 'early-today' ? 'POLICY OVERRIDE' : 'AUTHORIZE ENTRY'}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      {arrivalState === 'future' ? `Scheduled for ${new Date(booking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}. Override block?`
                        : arrivalState === 'early-today' ? `Standard check-in starts at 15:00. Authorize early access protocol?`
                        : `Authorize digital folio activation for ${guest.firstName} ${guest.lastName}?`}
                    </p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4 shadow-inner">
                    <div className="flex justify-between items-center"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Asset Unit</span><span className="text-sm font-black text-white uppercase tracking-tighter">Room {room.roomNumber}</span></div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Scheduled Arrival</span><span className={`text-[11px] font-black uppercase tracking-widest ${arrivalState === 'future' ? 'text-amber-500' : 'text-blue-400'}`}>{new Date(booking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></div>
                  </div>
                </>
              )}

              {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-400 animate-in shake"><AlertCircle size={16} className="shrink-0 mt-0.5" /><p className="text-[10px] font-black uppercase leading-tight">{error}</p></div>}
            </div>

            <div className="px-8 py-6 border-t border-white/5 flex flex-col gap-3 bg-slate-950/40">
              <button 
                onClick={handleAuthorizedConfirm} 
                disabled={isSubmitting || isUnpaid || isBlockedByStatus} 
                className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all ${isSubmitting || isUnpaid || isBlockedByStatus ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : display.color === 'amber' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    {(isBlockedByStatus || isUnpaid) ? <Lock size={18} /> : <ShieldCheck size={18}/>}
                    {isUnpaid ? 'Payment Required' : isBlockedByStatus ? 'Physical Readiness Check' : 'Authorize Check-In'}
                  </>
                )}
              </button>
              <button onClick={onClose} disabled={isSubmitting} className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5">Abort Protocol</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckInConfirmModal;