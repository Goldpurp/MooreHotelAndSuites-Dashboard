
import React, { useMemo, useState } from 'react';
import { X, CheckCircle, Bed, Calendar, ArrowRight, ShieldCheck, Zap, AlertTriangle, AlertCircle, UserPlus, XCircle, Loader2, CreditCard } from 'lucide-react';
import { Guest, Booking, Room, PaymentStatus } from '../types';
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
  const { updatePaymentStatus } = useHotel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEarlyCheckIn = useMemo(() => {
    if (!booking) return false;
    const checkInDate = new Date(booking.checkIn);
    const now = new Date();
    checkInDate.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return checkInDate > now;
  }, [booking]);

  const needsPayment = useMemo(() => {
    return booking?.paymentStatus === PaymentStatus.UNPAID;
  }, [booking]);

  if (!isOpen || !guest || !booking || !room) return null;

  const handleAuthorizedConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (needsPayment) {
        await updatePaymentStatus(booking.id, PaymentStatus.PAID);
      }
      await onConfirm(booking.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Ledger synchronization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAndWalkIn = () => {
    if (booking) {
      onCancelAndWalkIn(booking);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`glass-card w-full max-w-sm rounded-xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 shadow-2xl ${
        isEarlyCheckIn ? 'shadow-amber-900/20 ring-1 ring-amber-500/20' : 'shadow-emerald-900/20'
      }`}>
        
        <div className={`px-5 py-4 border-b border-white/5 flex items-center justify-between ${
          isEarlyCheckIn ? 'bg-amber-500/5' : 'bg-emerald-500/5'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${isEarlyCheckIn ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isEarlyCheckIn ? <AlertTriangle size={16} /> : <Zap size={16} />}
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight uppercase italic">
                {isEarlyCheckIn ? 'EARLY ARRIVAL' : 'Check-In Activation'}
              </h2>
              <p className={`text-[7px] font-black uppercase tracking-[0.1em] ${isEarlyCheckIn ? 'text-amber-400' : 'text-emerald-400'}`}>
                Property Access Protocol
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-md transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-black text-white leading-tight uppercase italic">
              {isEarlyCheckIn ? 'SCHEDULE OVERRIDE' : 'Authorize Check-In?'}
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              {isEarlyCheckIn 
                ? `Folio ${booking.bookingCode} is scheduled for ${new Date(booking.checkIn).toLocaleDateString()}. Proceed with override?`
                : `Do you want to authorize check-in for ${guest.firstName} ${guest.lastName} now?`
              }
            </p>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
             <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-black uppercase">Reserved For</span>
                <span className={`text-[11px] font-black ${isEarlyCheckIn ? 'text-amber-400' : 'text-white'}`}>
                  {new Date(booking.checkIn).toLocaleDateString()}
                </span>
             </div>
             <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-[9px] text-slate-500 font-black uppercase">Settlement</span>
                <span className={`text-[11px] font-black ${needsPayment ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {booking.paymentStatus} ➡ <span className='ml-1'> ₦{booking.amount.toLocaleString()}</span> 
                </span>
             </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2 text-rose-400 animate-in shake">
               <AlertCircle size={14} className="shrink-0 mt-0.5" />
               <p className="text-[9px] font-black uppercase leading-tight">{error}</p>
            </div>
          )}

          {needsPayment && !error && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <CreditCard size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-amber-300 font-black uppercase tracking-tight leading-normal">
                Policy Enforcement: Folio is currently UNPAID. Authorization will mark as PAID prior to check-in.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/5 flex flex-col gap-2 bg-slate-950/40">
          <button 
            onClick={handleAuthorizedConfirm}
            disabled={isSubmitting}
            className={`w-full ${
              isSubmitting ? 'bg-slate-800' : 
              needsPayment ? 'bg-amber-600 hover:bg-amber-700' :
              isEarlyCheckIn ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20' : 
              'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
            } text-white px-4 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all`}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14}/>}
            {isSubmitting ? 'Syncing...' : needsPayment ? 'Authorize Payment & Check-In' : 'Authorize Check-In'}
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5"
            >
              Abort
            </button>
            {isEarlyCheckIn && (
              <button 
                onClick={handleCancelAndWalkIn}
                disabled={isSubmitting}
                className="flex-1 bg-white/5 border border-white/10 text-slate-400 hover:text-white px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Reset to Walk-In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInConfirmModal;
