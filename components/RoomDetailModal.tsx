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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto custom-scrollbar">
      <div className="glass-card w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 flex flex-col md:flex-row h-auto md:h-[600px] my-8">
        <div className="w-full md:w-1/2 relative bg-slate-900 overflow-hidden shrink-0 h-64 md:h-full">
          <img src={room.images[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" alt={room.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
          <div className="absolute bottom-6 left-6 pr-6">
            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border mb-3 ${
              room.status === RoomStatus.Available ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
              room.status === RoomStatus.Occupied ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
              room.status === RoomStatus.Cleaning ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
              room.status === RoomStatus.Reserved ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' :
              room.status === RoomStatus.Maintenance ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
              'bg-slate-500/20 text-slate-400 border-slate-500/20'
            }`}>
              <span className={`w-1 h-1 rounded-full ${
                 room.status === RoomStatus.Available ? 'bg-emerald-400 animate-pulse' :
                 room.status === RoomStatus.Occupied ? 'bg-blue-400' : 
                 room.status === RoomStatus.Reserved ? 'bg-indigo-400' : 
                 room.status === RoomStatus.Cleaning ? 'bg-amber-400' : 'bg-rose-400'
              }`}></span>
              {room.status}
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase leading-none">Room {room.roomNumber}</h2>
            <p className="text-blue-400 font-bold uppercase text-[10px] tracking-widest mt-1.5">{room.category} — {room.name}</p>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-6 md:p-10 lg:p-12 overflow-y-auto custom-scrollbar flex flex-col bg-slate-950/40">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Nightly Tariff</p>
              <h3 className="text-3xl font-black text-white">₦{room.pricePerNight.toLocaleString()}</h3>
            </div>
            <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
              <Bed size={20} className="text-blue-500 mx-auto mb-2" />
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{room.category}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
              <Users size={20} className="text-blue-500 mx-auto mb-2" />
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{room.capacity} Guests</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
              <Square size={20} className="text-blue-500 mx-auto mb-2" />
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{room.size} sqm</p>
            </div>
          </div>

          <div className="space-y-8 flex-1">
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Info size={12}/> Overview</h4>
              <p className="text-sm text-slate-400 leading-relaxed font-medium">
                {room.description || "Luxurious executive suite designed for modern, high-tier hospitality stays."}
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Check size={12}/> Asset Features</h4>
              <div className="flex flex-wrap gap-2">
                {room.amenities.map(amenity => (
                  <span key={amenity} className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-500/10">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 mt-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Shield size={16} className="text-brand-500" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Managed Asset Layer</span>
            </div>
            <p className="text-[10px] text-slate-600 font-bold uppercase">Room: {room.floor.replace(/([A-Z])/g, ' $1').trim()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomDetailModal;