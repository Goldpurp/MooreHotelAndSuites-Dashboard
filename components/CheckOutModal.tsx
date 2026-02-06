import React, { useState } from 'react';
import { X, LogOut, Bed, Calendar, CreditCard, AlertCircle, CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import { Guest, Booking, Room } from '../types';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string) => void | Promise<void>;
  guest: Guest | null;
  booking: Booking | null;
  room: Room | null;
}

const CheckOutModal: React.FC<CheckOutModalProps> = ({ isOpen, onClose, onConfirm, guest, booking, room }) => {
  const [status, setStatus] = useState<'details' | 'success'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !guest || !booking || !room) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(booking.id);
      setStatus('success');
      // Auto-close after a brief acknowledgement window
      setTimeout(() => {
        onClose();
        setStatus('details');
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stayNights = Math.ceil(
    Math.abs(new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-md rounded-[2rem] shadow-[0_0_50px_rgba(225,29,72,0.15)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
        
        {status === 'success' ? (
          <div className="p-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <ShieldCheck size={40} className="text-emerald-500" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Folio Released</h2>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-2">Dossier {booking.bookingCode} Archived</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 w-full">
              <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Asset State</p>
              <p className="text-xs font-black text-white uppercase">Room {room.roomNumber} Marked for Cleaning</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500">
                  <LogOut size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight uppercase italic">Authorize Exit</h2>
                  <p className="text-[8px] text-rose-400 font-black uppercase tracking-[0.15em]">Property Check-Out Protocol</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                <img src={guest.avatarUrl} className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/10" alt="" />
                <div className="min-w-0">
                  <p className="text-sm font-black text-white uppercase italic truncate">{guest.firstName} {guest.lastName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ID: {guest.id.slice(0,8)}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Room {room.roomNumber}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5">
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Stay Duration</p>
                  <p className="text-sm font-black text-white">{stayNights} Night(s)</p>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5">
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Asset Class</p>
                  <p className="text-sm font-black text-white uppercase">{room.category}</p>
                </div>
              </div>

              <div className="bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/10">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Accounting Status</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${booking.paymentStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500 text-white animate-pulse'}`}>
                    {booking.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between items-end pt-3 border-t border-white/5">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Folio Value</span>
                  <span className="text-2xl font-black text-white tracking-tighter italic">₦{booking.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-rose-300 leading-relaxed font-bold uppercase tracking-tight">
                  Confirmation will revoke current node access and mark <span className="text-white font-black">Unit {room.roomNumber}</span> for Cleaning.
                </p>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-white/5 flex gap-3 bg-slate-950/40">
              <button onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5">
                Abort
              </button>
              <button 
                onClick={handleConfirm} 
                disabled={isSubmitting}
                className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all italic disabled:bg-rose-900/50 disabled:text-rose-400"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  'Authorize Departure'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckOutModal;