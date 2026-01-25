
import React from 'react';
import { X, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Room } from '../types';

interface DeleteRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (roomId: string) => void;
  room: Room | null;
}

const DeleteRoomModal: React.FC<DeleteRoomModalProps> = ({ isOpen, onClose, onConfirm, room }) => {
  if (!isOpen || !room) return null;

  const handleConfirm = () => {
    onConfirm(room.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-sm rounded-xl shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/20 rounded-lg text-rose-500">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight uppercase italic">Decommission Room</h2>
              <p className="text-[7px] text-rose-400 font-black uppercase tracking-[0.1em]">Protocol: Liquidation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded-md transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="bg-white/5 p-3 rounded-lg border border-white/5 flex items-center gap-3">
            <img src={room.images[0]} className="w-12 h-9 rounded-md object-cover ring-1 ring-white/10" alt="" />
            <div>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-dash mb-0.5">Target Asset</p>
              <p className="text-[11px] font-black text-white">Room {room.roomNumber}</p>
              {/* @fix: Changed room.type to room.category as 'type' does not exist on Room interface */}
              <p className="text-[8px] text-slate-500 font-bold uppercase">{room.category}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-1">
            <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
              Permanent removal will invalidate all current session references to <span className="text-white">Unit {room.roomNumber}</span>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/5 flex gap-2 bg-slate-950/40">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5"
          >
            Abort
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-[1.5] bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Decommission
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRoomModal;
