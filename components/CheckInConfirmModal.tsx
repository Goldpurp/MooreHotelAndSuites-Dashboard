import React, { useMemo, useState } from 'react';
// Fix: Added missing History import from lucide-react to avoid using global browser History as a JSX component
import { X, CheckCircle, Bed, Calendar, ArrowRight, ShieldCheck, Zap, AlertTriangle, AlertCircle, UserPlus, XCircle, Loader2, CreditCard, Clock, Lock, ExternalLink, Brush, Wrench, CalendarClock, History } from 'lucide-react';
import { Guest, Booking, Room, PaymentStatus, RoomStatus } from '../types';
import { useHotel } from '../store/HotelContext';

interface CheckInConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string) => void;
  onCancelAndWalkIn: (booking: Booking) => void;
  booking: Booking | null;
  guest: Guest | null;
  room: Room | null;
}

const CheckInConfirmModal: React.FC<CheckInConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancelAndWalkIn,
  booking, 
  guest, 
  room 
}) => {
  const { setActiveTab } = useHotel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * TEMPORAL ANALYSIS ENGINE
   * Compares current system time against the booking's scheduled window.
   */
  const arrivalState = useMemo(() => {
    if (!booking) return 'today';
    
    const checkInDate = new Date(booking.checkIn);
    const now = new Date();
    
    // Normalize to Midnight for date-only comparison
    const checkInDateOnly = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (checkInDateOnly > nowDateOnly) return 'future';
    if (checkInDateOnly < nowDateOnly) return 'past';
    
    // Same day: check 15:00 (3 PM) policy
    if (now.getHours() < 15) return 'early-today';
    
    return 'on-time';
  }, [booking]);

  const isUnpaid = useMemo(() => {
    const status = (booking?.paymentStatus || '').toLowerCase();
    return status !== 'paid';
  }, [booking]);

  const isBlockedByStatus = useMemo(() => {
    if (!room) return false;
    return room.status !== RoomStatus.Available;
  }, [room]);

  if (!isOpen || !guest || !booking || !room) return null;

  const handleAuthorizedConfirm = async () => {
    if (isUnpaid || isBlockedByStatus) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(booking.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Ledger synchronization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToSettlements = () => {
    setActiveTab('settlements');
    onClose();
  };

  const getStatusDisplay = () => {
    if (isUnpaid) return { title: 'SETTLEMENT BLOCKED', sub: 'Payment Verification Required', icon: <Lock size={16}/>, color: 'rose' };
    if (isBlockedByStatus) return { title: room.status === RoomStatus.Cleaning ? 'UNIT BEING CLEANED' : 'UNIT NOT READY', sub: 'Readiness Check Failed', icon: <Brush size={16}/>, color: 'rose' };
    
    switch(arrivalState) {
      case 'future': return { title: 'FUTURE ARRIVAL', sub: 'Date Mismatch Detected', icon: <CalendarClock size={16}/>, color: 'amber' };
      // Fix: History icon is now correctly imported and used
      case 'past': return { title: 'LATE ARRIVAL', sub: 'Folio Recovery Mode', icon: <History size={16} className="rotate-180" />, color: 'blue' };
      case 'early-today': return { title: 'EARLY ARRIVAL', sub: 'Pre-15:00 Access Protocol', icon: <Clock size={16}/>, color: 'amber' };
      default: return { title: 'CHECK-IN ACTIVATION', sub: 'Property Access Protocol', icon: <Zap size={16}/>, color: 'emerald' };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`glass-card w-full max-w-sm rounded-xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 shadow-2xl ring-1 ${
        display.color === 'rose' ? 'shadow-rose-950/20 ring-rose-500/20' : 
        display.color === 'amber' ? 'shadow-amber-900/20 ring-amber-500/20' : 
        'shadow-emerald-900/20 ring-emerald-500/20'
      }`}>
        
        <div className={`px-5 py-4 border-b border-white/5 flex items-center justify-between ${
          display.color === 'rose' ? 'bg-rose-500/5' : display.color === 'amber' ? 'bg-amber-500/5' : 'bg-emerald-500/5'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${
              display.color === 'rose' ? 'bg-rose-500/20 text-rose-500' : 
              display.color === 'amber' ? 'bg-amber-500/20 text-amber-500' : 
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {display.icon}
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight uppercase italic">{display.title}</h2>
              <p className={`text-[7px] font-black uppercase tracking-[0.1em] ${
                display.color === 'rose' ? 'text-rose-400' : 
                display.color === 'amber' ? 'text-amber-400' : 
                'text-emerald-400'
              }`}>{display.sub}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-md transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isUnpaid ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex flex-col items-center gap-3">
                 <CreditCard size={32} className="text-rose-500" />
                 <h3 className="text-lg font-black text-white uppercase italic">PENDING PAYMENT</h3>
                 <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest leading-relaxed">
                   Property protocol forbids check-in for unpaid folios. 
                   Ensure settlement via Bank Transfer or Paystack before proceeding.
                 </p>
              </div>
              <button onClick={handleNavigateToSettlements} className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-all">
                Go to Settlement Page <ExternalLink size={12}/>
              </button>
            </div>
          ) : isBlockedByStatus ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex flex-col items-center gap-3">
                 {room.status === RoomStatus.Cleaning ? <Brush size={32} className="text-rose-500" /> : <Wrench size={32} className="text-rose-500" />}
                 <h3 className="text-lg font-black text-white uppercase italic">UNIT NOT READY</h3>
                 <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest leading-relaxed italic">
                   {room.status === RoomStatus.Cleaning 
                     ? "Resident cannot be checked in while the unit is still being cleaned." 
                     : "Resident cannot be checked in while the unit is under maintenance."}
                   <br/>Status must be <span className="underline font-black text-white">AVAILABLE</span> to authorize entry.
                 </p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-white leading-tight uppercase italic">
                  {arrivalState === 'future' ? 'DATE OVERRIDE' : arrivalState === 'early-today' ? 'POLICY OVERRIDE' : 'AUTHORIZE ENTRY'}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  {arrivalState === 'future' 
                    ? `Guest is scheduled to arrive on ${new Date(booking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}. Room ${room.roomNumber} is currently Available. Proceed anyway?`
                    : arrivalState === 'early-today'
                    ? `Standard check-in starts at 15:00. Room ${room.roomNumber} is Available. Authorize early access?`
                    : `Do you want to authorize check-in for ${guest.firstName} ${guest.lastName} now?`
                  }
                </p>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] text-slate-500 font-black uppercase">Asset Node</span>
                    <span className="text-[11px] font-black text-white">Room {room.roomNumber}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-[9px] text-slate-500 font-black uppercase">Scheduled Date</span>
                    <span className={`text-[11px] font-black uppercase ${arrivalState === 'future' ? 'text-amber-500' : 'text-blue-400'}`}>
                      {new Date(booking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-rose-400 animate-in shake">
               <AlertCircle size={14} className="shrink-0 mt-0.5" />
               <p className="text-[9px] font-black uppercase leading-tight">{error}</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/5 flex flex-col gap-2 bg-slate-950/40">
          <button 
            onClick={handleAuthorizedConfirm}
            disabled={isSubmitting || isUnpaid || isBlockedByStatus}
            className={`w-full ${
              isSubmitting || isUnpaid || isBlockedByStatus ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 
              display.color === 'amber' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20' : 
              'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
            } text-white px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all`}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : (isBlockedByStatus || isUnpaid) ? <Lock size={14} /> : <ShieldCheck size={14}/>}
            {isSubmitting ? 'Syncing...' : isUnpaid ? 'Payment Required' : isBlockedByStatus ? 'Physical Readiness Required' : arrivalState === 'future' ? 'Override Date Block' : arrivalState === 'early-today' ? 'Force Policy Override' : 'Authorize Check-In'}
          </button>
          
          <button onClick={onClose} disabled={isSubmitting} className="w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5">
            Abort Protocol
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckInConfirmModal;