import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, ShieldAlert, Loader2, Trash } from 'lucide-react';
import { Room } from '../types';

interface DeleteRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (roomId: string) => void | Promise<void>;
  room: Room | null;
}

const DeleteRoomModal: React.FC<DeleteRoomModalProps> = ({ isOpen, onClose, onConfirm, room }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'details' | 'success'>('details');

  if (!isOpen || !room) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(room.id);
      setStatus('success');
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

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-md rounded-[2rem] shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
        
        {status === 'success' ? (
          <div className="p-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.2)]">
              <Trash size={40} className="text-rose-500" strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Asset Liquidated</h2>
              <p className="text-[10px] text-rose-400 font-black uppercase tracking-[0.2em] mt-2">Room {room.roomNumber} removed from ledger</p>
            </div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Property hardware updated across all nodes.</p>
          </div>
        ) : (
          <>
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-xl text-rose-500">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight uppercase">Liquidate Asset</h2>
                  <p className="text-[8px] text-rose-400 font-black uppercase tracking-[0.15em]">Protocol: Physical Removal</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                <img src={room.images[0]} className="w-16 h-12 rounded-xl object-cover ring-2 ring-white/10 shadow-lg" alt="" />
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Target Asset</p>
                  <p className="text-sm font-black text-white uppercase truncate">Room {room.roomNumber}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">{room.category}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-2">
                <AlertTriangle size={24} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                  Permanent removal will <span className="text-rose-400 font-black">invalidate all current folio references</span> to Room {room.roomNumber} in the ledger history.
                </p>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-white/5 flex gap-3 bg-slate-950/40">
              <button onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5">
                Abort Protocol
              </button>
              <button 
                onClick={handleConfirm} 
                disabled={isSubmitting}
                className="flex-[2] bg-rose-600 hover:bg-rose-700 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Liquidating...
                  </>
                ) : (
                  'Decommission Unit'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteRoomModal;