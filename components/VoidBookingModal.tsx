import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, Loader2, MessageSquare } from 'lucide-react';
import { sileo } from 'sileo';
import { Booking, Guest, Room } from '../types';

interface VoidBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string, reason: string) => void | Promise<void>;
  booking: Booking | null;
  guest: Guest | null;
  room: Room | null;
}

const VoidBookingModal: React.FC<VoidBookingModalProps> = ({ isOpen, onClose, onConfirm, booking, guest, room }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState('Guest requested cancellation');

  if (!isOpen || !booking || !guest || !room) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(booking.id, reason);
      sileo.success({
        title: 'Booking Cancelled',
        description: `Booking ${booking.bookingCode} for ${booking.guestFirstName} ${booking.guestLastName} has been cancelled. Room ${room.roomNumber} is now available.`
      });
      onClose();
    } catch (err: any) {
      sileo.error({
        title: 'Could Not Cancel',
        description: err.message || `The system could not cancel this booking. Please try again or contact support.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-md rounded-[2rem] shadow-[0_0_50px_rgba(244,63,94,0.1)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
          <>
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight uppercase">Cancel Booking</h2>
                  <p className="text-[8px] text-rose-400 font-black uppercase tracking-[0.15em]">Booking Cancellation</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <img src={guest.avatarUrl} className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/10 shadow-lg" alt="" />
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Guest Details</p>
                  <p className="text-sm font-black text-white uppercase truncate">{guest.firstName} {guest.lastName}</p>
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                    <MessageSquare size={12}/> Cancellation Reason
                 </label>
                 <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white focus:border-rose-500/40 outline-none min-h-[80px] resize-none"
                    placeholder="Enter why this was cancelled..."
                 />
              </div>

              <div className="flex items-start gap-3 p-2">
                <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                  This will cancel <span className="text-white font-black">booking {booking.bookingCode}</span> and make Room {room.roomNumber} available again.
                </p>
              </div>

              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-black uppercase tracking-widest">Total Amount</span>
                  <span className="text-slate-200 font-black">₦{booking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] pt-3 border-t border-white/5">
                  <span className="text-slate-500 font-black uppercase tracking-widest">New Status</span>
                  <span className="text-rose-400 font-black uppercase">Cancelled</span>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-white/5 flex gap-3 bg-slate-950/40">
              <button onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5">
                Go Back
              </button>
              <button 
                onClick={handleConfirm} 
                disabled={isSubmitting || !reason.trim()}
                className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Booking'
                )}
              </button>
            </div>
          </>
      </div>
    </div>
  );
};

export default VoidBookingModal;