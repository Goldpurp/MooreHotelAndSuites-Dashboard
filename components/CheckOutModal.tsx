
import React from 'react';
import { X, LogOut, Bed, Calendar, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Guest, Booking, Room } from '../types';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string) => void;
  guest: Guest | null;
  booking: Booking | null;
  room: Room | null;
}

const CheckOutModal: React.FC<CheckOutModalProps> = ({ isOpen, onClose, onConfirm, guest, booking, room }) => {
  if (!isOpen || !guest || !booking || !room) return null;

  const handleConfirm = () => {
    onConfirm(booking.id);
    onClose();
  };

  const stayNights = Math.ceil(
    Math.abs(new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-sm rounded-xl shadow-[0_0_50px_rgba(225,29,72,0.15)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-500">
              <LogOut size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight uppercase italic">Check-Out Authorization</h2>
              <p className="text-[7px] text-rose-400 font-black uppercase tracking-[0.1em]">Property Check-Out Protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-md transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Content Section */}
        <div className="p-5 space-y-4">
          {/* Guest Identity */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
            <img src={guest.avatarUrl} className="w-10 h-10 rounded-md object-cover ring-1 ring-white/10" alt="" />
            <div>
              <p className="text-[11px] font-black text-white">{guest.firstName} {guest.lastName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-dash">ID: {guest.id}</span>
                <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-dash">Room {room.roomNumber}</span>
              </div>
            </div>
          </div>

          {/* Stay Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
              <p className="text-[7px] text-slate-500 font-black uppercase tracking-dash mb-1">Duration</p>
              <p className="text-[11px] font-black text-white">{stayNights} Night(s)</p>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-white/5">
              <p className="text-[7px] text-slate-500 font-black uppercase tracking-dash mb-1">Category</p>
              {/* @fix: Changed room.type to room.category as 'type' does not exist on Room interface */}
              <p className="text-[11px] font-black text-white">{room.category}</p>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-emerald-500/5 p-3.5 rounded-lg border border-emerald-500/10">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-dash">Status</span>
              <span className={`text-[8px] font-black uppercase tracking-dash px-1.5 py-0.5 rounded ${booking.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'}`}>
                {booking.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between items-end pt-1.5 border-t border-white/5">
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-dash">Total Due</span>
              <span className="text-lg font-black text-white tracking-tight">₦{booking.amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Warning Note */}
          <div className="flex items-start gap-2 p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <AlertCircle size={12} className="text-rose-400 shrink-0 mt-0.5" />
            <p className="text-[9px] text-rose-300 leading-relaxed font-bold uppercase tracking-tight">
              Action will mark Unit {room.roomNumber} for Cleaning immediately.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-white/5 flex gap-2 bg-slate-950/40">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-[1.5] bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Confirm Check-Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckOutModal;
