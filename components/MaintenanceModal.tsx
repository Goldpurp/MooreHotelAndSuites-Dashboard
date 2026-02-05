
import React from 'react';
import { X, Wrench, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Room, RoomStatus } from '../types';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (roomId: string) => Promise<void>;
  room: Room | null;
}

const MaintenanceModal: React.FC<MaintenanceModalProps> = ({ isOpen, onClose, onConfirm, room }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen || !room) return null;

  // Fix: Fixed casing for RoomStatus enum member
  const isEnteringMaintenance = room.status !== RoomStatus.Maintenance;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(room.id);
      onClose();
    } catch (error) {
      console.error("Maintenance protocol failure:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`glass-card w-full max-w-sm rounded-[2rem] shadow-3xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 ${
        isEnteringMaintenance ? 'shadow-amber-950/20' : 'shadow-emerald-950/20'
      }`}>
        
        {/* Header */}
        <div className={`px-8 py-6 border-b border-white/5 flex items-center justify-between ${
          isEnteringMaintenance ? 'bg-amber-500/5' : 'bg-emerald-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isEnteringMaintenance ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isEnteringMaintenance ? <Wrench size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight uppercase italic">
                {isEnteringMaintenance ? 'Decommission Unit' : 'Restore Asset'}
              </h2>
              <p className={`text-[7px] font-black uppercase tracking-[0.2em] ${isEnteringMaintenance ? 'text-amber-400' : 'text-emerald-400'}`}>
                Hardware Protocol: {room.roomNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
              {isEnteringMaintenance ? 'Initialize Maintenance?' : 'Mark Unit as Ready?'}
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              {isEnteringMaintenance 
                ? `Marking Room ${room.roomNumber} for maintenance will revoke its availability in the public booking ledger.`
                : `Confirm that Room ${room.roomNumber} has been inspected and is physically prepared for new residents.`
              }
            </p>
          </div>

          <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-3">
             <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500 font-black uppercase">Current Node</span>
                <span className="text-[11px] font-black text-white uppercase tracking-tighter">Room {room.roomNumber}</span>
             </div>
             <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-[9px] text-slate-500 font-black uppercase">Target State</span>
                <span className={`text-[11px] font-black uppercase ${isEnteringMaintenance ? 'text-amber-400' : 'text-emerald-400'}`}>
                   {isEnteringMaintenance ? 'Maintenance' : 'Available'}
                </span>
             </div>
          </div>

          {isEnteringMaintenance && (
            <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
               <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
               <p className="text-[9px] text-amber-300 font-black uppercase leading-tight tracking-tight">
                 Warning: This unit will be bypassed during the next automated asset allocation cycle.
               </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 py-6 border-t border-white/5 flex flex-col gap-3 bg-slate-950/40">
          <button 
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
              isEnteringMaintenance 
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
            }`}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEnteringMaintenance ? (
              <Wrench size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            {isSubmitting ? 'Processing...' : isEnteringMaintenance ? 'Confirm Decommission' : 'Confirm Restoration'}
          </button>
          
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all"
          >
            Abort Protocol
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;
