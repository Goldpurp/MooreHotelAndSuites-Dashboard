
import React from 'react';
import { Room, RoomStatus } from '../types';
import { X, Bed, Users, Square, Info, Check, Shield } from 'lucide-react';

interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room | null;
}

const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ isOpen, onClose, room }) => {
  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-3xl rounded-md shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 flex flex-col md:flex-row h-[500px]">
        <div className="md:w-1/2 relative bg-slate-900 overflow-hidden">
          <img 
            src={room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800'} 
            className="w-full h-full object-cover" 
            alt={room.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
          <div className="absolute bottom-6 left-6">
            {/* Fix: Fixed casing for RoomStatus enum members */}
            <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border mb-3 ${
              room.status === RoomStatus.Available ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
              room.status === RoomStatus.Occupied ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
              room.status === RoomStatus.Cleaning ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
              room.status === RoomStatus.Maintenance ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
              'bg-slate-500/20 text-slate-400 border-slate-500/20'
            }`}>
              {/* Fix: Fixed casing for RoomStatus enum members */}
              <span className={`w-1 h-1 rounded-full ${
                 room.status === RoomStatus.Available ? 'bg-emerald-400 animate-pulse' :
                 room.status === RoomStatus.Occupied ? 'bg-blue-400' : 
                 room.status === RoomStatus.Cleaning ? 'bg-amber-400' : 'bg-rose-400'
              }`}></span>
              {room.status}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">Room {room.roomNumber}</h2>
            <p className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-0.5">{room.category} — {room.name}</p>
          </div>
        </div>

        <div className="md:w-1/2 p-6 overflow-y-auto custom-scrollbar flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Nightly Tariff</p>
              <h3 className="text-2xl font-black text-white">₦{room.pricePerNight.toLocaleString()}</h3>
            </div>
            <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-md transition-all border border-white/5">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/5 p-3 rounded-md border border-white/5 text-center">
              <Bed size={16} className="text-blue-500 mx-auto mb-1.5" />
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{room.category}</p>
            </div>
            <div className="bg-white/5 p-3 rounded-md border border-white/5 text-center">
              <Users size={16} className="text-blue-500 mx-auto mb-1.5" />
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{room.capacity} Guests</p>
            </div>
            <div className="bg-white/5 p-3 rounded-md border border-white/5 text-center">
              <Square size={16} className="text-blue-500 mx-auto mb-1.5" />
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{room.size} sqm</p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div>
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Info size={10}/> Overview</h4>
              <p className="text-[12px] text-slate-400 leading-relaxed italic">
                {room.description || "Luxurious executive suite for modern stays."}
              </p>
            </div>

            <div>
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Check size={10}/> Features</h4>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities.map(amenity => (
                  <span key={amenity} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-md border border-blue-500/10">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 mt-auto flex items-center justify-between">
            <div className="flex items-center gap-1.5">
               <Shield size={14} className="text-blue-500" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Property Managed</span>
            </div>
            <p className="text-[9px] text-slate-600 font-bold uppercase italic">Floor: {room.floor.replace(/([A-Z])/g, ' $1').trim()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetailModal;
