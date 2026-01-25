
import React from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import { Booking, Guest, Room } from '../types';

interface VoidBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string) => void;
  booking: Booking | null;
  guest: Guest | null;
  room: Room | null;
}

const VoidBookingModal: React.FC<VoidBookingModalProps> = ({ isOpen, onClose, onConfirm, booking, guest, room }) => {
  if (!isOpen || !booking || !guest || !room) return null;

  const handleConfirm = () => {
    onConfirm(booking.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-sm rounded-xl shadow-[0_0_50px_rgba(244,63,94,0.1)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-500">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight uppercase italic">Void Reservation</h2>
              <p className="text-[7px] text-rose-400 font-black uppercase tracking-[0.1em]">Protocol: Revocation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-md transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex items-center gap-3">
            <img src={guest.avatarUrl} className="w-10 h-10 rounded-md object-cover ring-1 ring-white/10" alt="" />
            <div>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-dash mb-0.5">Occupant Dossier</p>
              <p className="text-[11px] font-black text-white">{guest.firstName} {guest.lastName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-1">
            <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
              Proceeding will void <span className="text-white">Folio {booking.id}</span> and release Room {room.roomNumber} immediately.
            </p>
          </div>

          <div className="bg-slate-900/40 p-3 rounded-lg border border-white/5 space-y-1.5">
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-500 font-black uppercase">Folio Value</span>
              <span className="text-slate-200 font-black">₦{booking.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[9px] pt-1 border-t border-white/5">
              <span className="text-slate-500 font-black uppercase">Status Result</span>
              <span className="text-rose-400 font-black uppercase">Cancelled</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 flex gap-2 bg-slate-950/40">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5"
          >
            Keep
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-[1.5] bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 active:scale-95 transition-all"
          >
            Void Folio
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoidBookingModal;
