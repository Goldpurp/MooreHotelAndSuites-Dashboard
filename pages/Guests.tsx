import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { Guest, BookingStatus, RoomStatus, Booking } from '../types';
import { Search, Download, Phone, Eye, History, User, LogOut, Bed, UserCheck, RefreshCw, Archive, Mail, Star, SearchX } from 'lucide-react';
import CheckOutModal from '../components/CheckOutModal';

const Guests: React.FC = () => {
  const { guests, bookings, rooms, checkOutBooking, setActiveTab, selectedGuestId: globalSelectedGuestId, refreshData } = useHotel();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInHouseOnly, setShowInHouseOnly] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [activeCheckOutData, setActiveCheckOutData] = useState<{ guest: Guest | null; booking: any; room: any; }>({ guest: null, booking: null, room: null });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const getActiveStay = (guest: Guest) => {
    if (!guest || !bookings) return null;
    // Enhanced linkage: match by guestId or email, normalizing to lowercase for robust ID matching
    const booking = (bookings || []).find(b => 
      b.status === BookingStatus.CHECKED_IN && 
      (String(b.guestId || '').toLowerCase() === String(guest.id || '').toLowerCase() || 
       (b.guestEmail && guest.email && b.guestEmail.toLowerCase() === guest.email.toLowerCase()))
    );
    if (!booking) return null;
    const room = (rooms || []).find(r => r.id === booking.roomId);
    return { booking, room };
  };

  const processedGuests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (guests || [])
      .filter(g => {
        const matchesSearch = `${g.firstName} ${g.lastName} ${g.email} ${g.phone}`.toLowerCase().includes(q);
        const stay = getActiveStay(g);
        return matchesSearch && (showInHouseOnly ? !!stay : true);
      })
      .map(g => ({ ...g, activeStay: getActiveStay(g) }))
      .sort((a, b) => (a.activeStay && !b.activeStay) ? -1 : (b.activeStay && !a.activeStay) ? 1 : 0);
  }, [guests, searchQuery, showInHouseOnly, bookings, rooms]);

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (globalSelectedGuestId) { 
      setLocalSelectedId(globalSelectedGuestId); 
      setShowInHouseOnly(false); 
    } else if (processedGuests.length > 0 && !localSelectedId) { 
      setLocalSelectedId(processedGuests[0].id); 
    }
  }, [globalSelectedGuestId, processedGuests]);

  const selectedGuest = useMemo(() => processedGuests.find(g => g.id === localSelectedId), [processedGuests, localSelectedId]);

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)] animate-in fade-in duration-700">
      <div className="flex-[2.5] flex flex-col gap-4 overflow-hidden">
        <div className="flex items-end justify-between">
          <div><h2 className="text-3xl font-black text-white tracking-tight italic uppercase">{showInHouseOnly ? 'In-House Residents' : 'Guest Registry'}</h2></div>
          <div className="flex gap-2">
             <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>
             <button onClick={() => setShowInHouseOnly(!showInHouseOnly)} className="bg-blue-600/10 border border-blue-500/20 text-blue-400 px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2">{showInHouseOnly ? <Archive size={16}/> : <UserCheck size={16}/>} {showInHouseOnly ? 'All Guests' : 'Checked-In'}</button>
          </div>
        </div>
        <div className="glass-card rounded-md flex-1 flex flex-col overflow-hidden border border-white/5">
           <div className="px-4 py-3 border-b border-white/5 flex gap-4 bg-slate-900/40">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14}/><input type="text" placeholder="Search name, contact, or folio..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-[12px] text-slate-300 outline-none" /></div>
           </div>
           <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="sticky top-0 bg-slate-900 z-10 border-b border-white/10"><tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Occupant Profile</th><th className="px-6 py-4">Protocol Status</th><th className="px-6 py-4">Ledger Value</th><th className="px-6 py-4 text-right">Actions</th>
                 </tr></thead>
                 <tbody className="divide-y divide-white/5">{processedGuests.map((guest) => (
                    <tr key={guest.id} onClick={() => setLocalSelectedId(guest.id)} className={`hover:bg-blue-600/5 transition-all cursor-pointer ${localSelectedId === guest.id ? 'bg-blue-600/10' : ''}`}>
                       <td className="px-6 py-5"><div className="flex items-center gap-4"><img src={guest.avatarUrl || `https://ui-avatars.com/api/?name=${guest.firstName}`} className="w-10 h-10 rounded-xl object-cover" /><p className="text-[14px] font-black text-white">{guest.firstName} {guest.lastName}</p></div></td>
                       <td className="px-6 py-5">{guest.activeStay ? <span className="text-[10px] text-emerald-400 font-black italic">Room {guest.activeStay.room?.roomNumber}</span> : <span className="text-[10px] text-slate-600 font-black">Archive</span>}</td>
                       <td className="px-6 py-5 text-white font-black">₦{(guest.totalSpent ?? 0).toLocaleString()}</td>
                       <td className="px-6 py-5 text-right"><button className="p-2 bg-white/5 rounded-lg hover:text-blue-400"><Eye size={16}/></button></td>
                    </tr>
                 ))}</tbody>
              </table>
           </div>
        </div>
      </div>
      {selectedGuest && (
        <div className="flex-1 w-full md:w-[340px] shrink-0 glass-card rounded-md p-8 flex flex-col border border-white/10 bg-slate-900/60 shadow-2xl">
           <div className="flex flex-col items-center mb-10 pt-4"><img src={selectedGuest.avatarUrl} className="w-24 h-24 rounded-3xl object-cover mb-6 ring-4 ring-white/10" /><h3 className="text-2xl font-black text-white italic uppercase">{selectedGuest.firstName} <br/> {selectedGuest.lastName}</h3></div>
           <div className="space-y-6 flex-1">
              <div className="bg-white/5 p-5 rounded-2xl space-y-4"><div className="flex items-center gap-3"><Mail size={14}/><span className="text-sm truncate">{selectedGuest.email}</span></div><div className="flex items-center gap-3"><Phone size={14}/><span>{selectedGuest.phone || '---'}</span></div></div>
           </div>
           <div className="mt-10">
             {selectedGuest.activeStay ? (
               <button 
                 onClick={() => { 
                   if (selectedGuest.activeStay) {
                     setActiveCheckOutData({ 
                       guest: selectedGuest, 
                       booking: selectedGuest.activeStay.booking, 
                       room: selectedGuest.activeStay.room 
                     }); 
                     setIsCheckOutModalOpen(true); 
                   }
                 }} 
                 className="w-full bg-rose-600 hover:bg-rose-700 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
               >
                 <LogOut size={18}/> Check-Out
               </button>
             ) : (
               <button 
                 onClick={() => setActiveTab('bookings')} 
                 className="w-full bg-blue-600/10 hover:bg-blue-600/20 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest text-blue-400 transition-all border border-blue-500/10"
               >
                 New Folio
               </button>
             )}
           </div>
        </div>
      )}
      <CheckOutModal isOpen={isCheckOutModalOpen} onClose={() => setIsCheckOutModalOpen(false)} onConfirm={checkOutBooking} guest={activeCheckOutData.guest} booking={activeCheckOutData.booking} room={activeCheckOutData.room} />
    </div>
  );
};

export default Guests;