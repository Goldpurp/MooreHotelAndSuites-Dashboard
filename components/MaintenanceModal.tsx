import React, { useState } from 'react';
import { X, Wrench, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { sileo } from 'sileo';
import { Room, RoomStatus } from '../types';
import { useAccessibleModal } from '../hooks/useAccessibleModal';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (roomId: string) => Promise<void>;
  room: Room | null;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onConfirm, room }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useAccessibleModal(isOpen, onClose, !isSubmitting);

  if (!isOpen || !room) return null;

  const isEnteringMaintenance = room.status !== RoomStatus.Maintenance;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(room.id);
      sileo.success({
        title: isEnteringMaintenance ? 'Unit Placed Offline' : 'Unit Restored to Inventory',
        description: `Room ${room.roomNumber} has undergone a status transition. ${isEnteringMaintenance ? 'Maintenance protocols are now active for this unit.' : 'The unit has been verified and returned to authorized status.'}`
      });
      onClose();
    } catch (error: any) {
      sileo.error({
        title: 'Maintenance Protocol Fault',
        description: error.message || "The property security node could not synchronize the maintenance status for Unit ${room.roomNumber}. Hardware lockout may be active."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={modalRef} role="alertdialog" aria-modal="true" aria-label={isEnteringMaintenance ? 'Place room in maintenance' : 'Restore room to inventory'} tabIndex={-1} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`glass-card w-full max-w-md rounded-[2rem] shadow-3xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 ${
        isEnteringMaintenance ? 'shadow-amber-950/20' : 'shadow-emerald-950/20'
      }`}>
          <>
            <div className={`px-8 py-6 border-b border-white/5 flex items-center justify-between ${
              isEnteringMaintenance ? 'bg-amber-500/5' : 'bg-emerald-500/5'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isEnteringMaintenance ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {isEnteringMaintenance ? <Wrench size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight uppercase">
                    {isEnteringMaintenance ? 'Decommission Room' : 'Restore Asset'}
                  </h2>
                  <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isEnteringMaintenance ? 'text-amber-400' : 'text-emerald-400'}`}>
                    Hardware Protocol: {room.roomNumber}
                  </p>
                </div>
              </div>
              <button type="button" data-modal-close aria-label="Close maintenance confirmation" onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="text-center space-y-3">
                <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">
                  {isEnteringMaintenance ? 'Initialize Maintenance?' : 'Mark Room as Ready?'}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  {isEnteringMaintenance 
                    ? `Revoking Room ${room.roomNumber} availability will block all future automated asset allocations for this room.`
                    : `Confirm Room ${room.roomNumber} inspection completion. The asset will be restored to the live booking ledger.`
                  }
                </p>
              </div>

              <div className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5 space-y-4 shadow-inner">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Asset Unit</span>
                    <span className="text-sm font-black text-white uppercase tracking-tighter">Room {room.roomNumber}</span>
                 </div>
                 <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Target State</span>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${isEnteringMaintenance ? 'text-amber-400' : 'text-emerald-400'}`}>
                       {isEnteringMaintenance ? 'MAINTENANCE' : 'AVAILABLE'}
                    </span>
                 </div>
              </div>

              {isEnteringMaintenance && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                   <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                   <p className="text-[9px] text-amber-300 font-black uppercase leading-tight tracking-tight">
                     Warning: This room will be hidden from the client portal and manual reservation pool.
                   </p>
                </div>
              )}
            </div>

            <div className="px-8 py-6 border-t border-white/5 flex flex-col gap-3 bg-slate-950/40">
              <button 
                onClick={handleConfirm} 
                disabled={isSubmitting} 
                className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95 ${isEnteringMaintenance ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Synchronizing Ledger...
                  </>
                ) : (
                  <>
                    {isEnteringMaintenance ? <Wrench size={18} /> : <ShieldCheck size={18} />}
                    {isEnteringMaintenance ? 'Authorize Decommission' : 'Confirm Restoration'}
                  </>
                )}
              </button>
              <button type="button" data-modal-cancel onClick={onClose} disabled={isSubmitting} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Abort Protocol</button>
            </div>
          </>
      </div>
    </div>
  );
};

export default MaintenanceModal;
