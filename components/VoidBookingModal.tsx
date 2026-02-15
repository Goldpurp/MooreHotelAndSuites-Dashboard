import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, Loader2, ShieldCheck, BookmarkX, MessageSquare } from 'lucide-react';
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
  const [status, setStatus] = useState<'details' | 'success'>('details');
  const [reason, setReason] = useState('Guest requested cancellation');

  if (!isOpen || !booking || !guest || !room) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(booking.id, reason);
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('details');
        setReason('Guest requested cancellation');
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-md rounded-[2rem] shadow-[0_0_50px_rgba(244,63,94,0.1)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
        
        {status === 'success' ? (
          <div className="p-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <BookmarkX size={40} className="text-rose-500" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Reservation Voided</h2>
              <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.2em] mt-2">Folio {booking.bookingCode} purged from queue</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 w-full">
              <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Asset Status</p>
              <p className="text-xs font-black text-white uppercase">Room {room.roomNumber} Returned to Inventory</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight uppercase">Void Reservation</h2>
                  <p className="text-[8px] text-rose-400 font-black uppercase tracking-[0.15em]">Protocol: Folio Revocation</p>
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
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Occupant Dossier</p>
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
                    placeholder="Enter justification for revocation..."
                 />
              </div>

              <div className="flex items-start gap-3 p-2">
                <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                  Proceeding will void <span className="text-white font-black">Folio {booking.bookingCode}</span> and release Room {room.roomNumber} back to global inventory immediately.
                </p>
              </div>

              <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500 font-black uppercase tracking-widest">Folio Value</span>
                  <span className="text-slate-200 font-black">₦{booking.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] pt-3 border-t border-white/5">
                  <span className="text-slate-500 font-black uppercase tracking-widest">Post-Protocol State</span>
                  <span className="text-rose-400 font-black uppercase">Cancelled</span>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-white/5 flex gap-3 bg-slate-950/40">
              <button onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5">
                Keep Folio
              </button>
              <button 
                onClick={handleConfirm} 
                disabled={isSubmitting || !reason.trim()}
                className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Purging Folio...
                  </>
                ) : (
                  'Void Folio Access'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoidBookingModal;