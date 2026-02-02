import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { Guest, BookingStatus, RoomStatus, Booking, Room } from '../types';
// Added Bed to the imports to resolve "Cannot find name 'Bed'" error on line 199
import { Search, Phone, Eye, LogOut, UserCheck, RefreshCw, Archive, Mail, ShieldCheck, CreditCard, Bed } from 'lucide-react';
import CheckOutModal from '../components/CheckOutModal';

const Guests: React.FC = () => {
  const { guests, bookings, rooms, checkOutBooking, setActiveTab, selectedGuestId: globalSelectedGuestId, refreshData } = useHotel();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInHouseOnly, setShowInHouseOnly] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [activeCheckOutData, setActiveCheckOutData] = useState<{ guest: Guest | null; booking: Booking | null; room: Room | null; }>({ guest: null, booking: null, room: null });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const getActiveStay = (guest: Guest) => {
    if (!guest || !bookings) return null;
    // Enhanced robust linkage: Match by ID, email, or phone to account for differing API response patterns
    const booking = (bookings || []).find(b => 
      b.status === BookingStatus.CHECKED_IN && 
      (
        (b.guestId && String(b.guestId).toLowerCase() === String(guest.id).toLowerCase()) ||
        (b.guestEmail && b.guestEmail.toLowerCase() === guest.email.toLowerCase()) ||
        (b.guestPhone && guest.phone && b.guestPhone.replace(/\D/g, '') === guest.phone.replace(/\D/g, ''))
      )
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
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-700">
      <div className="flex-[2.5] flex flex-col gap-4 overflow-hidden">
        <div className="flex items-end justify-between">
          <div>
             <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">{showInHouseOnly ? 'In-House Residents' : 'Guest Registry'}</h2>
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Personnel Management Ledger</p>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={handleManualRefresh} 
               className={`p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}
             >
               <RefreshCw size={18} />
             </button>
             <button 
               onClick={() => setShowInHouseOnly(!showInHouseOnly)} 
               className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all ${
                 showInHouseOnly ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-slate-800 border-white/10 text-slate-400'
               }`}
             >
               {showInHouseOnly ? <UserCheck size={16}/> : <Archive size={16}/>} 
               {showInHouseOnly ? 'In-House Focus' : 'Full Registry'}
             </button>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40">
           <div className="px-6 py-4 border-b border-white/5 flex gap-4 bg-slate-950/40">
              <div className="relative flex-1">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                 <input 
                   type="text" 
                   placeholder="Search name, contact, or folio..." 
                   value={searchQuery} 
                   onChange={(e) => setSearchQuery(e.target.value)} 
                   className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-[13px] text-slate-300 outline-none focus:bg-slate-900 focus:border-blue-500/30 transition-all font-bold" 
                 />
              </div>
           </div>
           <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 border-b border-white/10">
                    <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                       <th className="px-8 py-5">Occupant Profile</th>
                       <th className="px-8 py-5">Protocol Status</th>
                       <th className="px-8 py-5">Ledger Value</th>
                       <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {processedGuests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-24 text-center">
                          <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.4em]">No matching records found</p>
                        </td>
                      </tr>
                    ) : (
                      processedGuests.map((guest) => (
                        <tr 
                          key={guest.id} 
                          onClick={() => setLocalSelectedId(guest.id)} 
                          className={`hover:bg-blue-600/5 transition-all cursor-pointer group ${localSelectedId === guest.id ? 'bg-blue-600/10' : ''}`}
                        >
                           <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                 <img src={guest.avatarUrl || `https://ui-avatars.com/api/?name=${guest.firstName}&background=020617&color=fff`} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/5 group-hover:ring-blue-500/30 transition-all" alt=""/>
                                 <div>
                                    <p className="text-[15px] font-black text-white group-hover:text-blue-400 transition-colors uppercase italic tracking-tight">{guest.firstName} {guest.lastName}</p>
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-dash mt-0.5">{guest.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              {guest.activeStay ? (
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                   <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
                                   Room {guest.activeStay.room?.roomNumber}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic opacity-50">Archived</span>
                              )}
                           </td>
                           <td className="px-8 py-5">
                              <p className="text-[14px] font-black text-white italic">₦{(guest.totalSpent ?? 0).toLocaleString()}</p>
                              <p className="text-[8px] text-slate-600 font-bold uppercase tracking-dash">{guest.totalStays ?? 0} Stays</p>
                           </td>
                           <td className="px-8 py-5 text-right">
                              <button className="p-2.5 bg-white/5 rounded-xl border border-white/5 hover:text-blue-400 hover:border-blue-500/20 transition-all">
                                 <Eye size={18}/>
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {selectedGuest && (
        <div className="flex-1 w-full lg:w-[400px] shrink-0 glass-card rounded-[2.5rem] p-10 flex flex-col border border-white/10 bg-slate-900/60 shadow-3xl animate-in slide-in-from-right-10 duration-500">
           <div className="flex flex-col items-center mb-10 pt-4">
              <div className="relative">
                 <img src={selectedGuest.avatarUrl} className="w-32 h-32 rounded-[2.5rem] object-cover mb-6 ring-4 ring-white/10 shadow-2xl" alt=""/>
                 {selectedGuest.activeStay && (
                   <div className="absolute -bottom-2 -right-2 p-3 bg-emerald-600 rounded-2xl border-4 border-slate-900 text-white shadow-xl">
                      <UserCheck size={20} />
                   </div>
                 )}
              </div>
              <h3 className="text-3xl font-black text-white italic uppercase text-center leading-[0.85] tracking-tighter">
                {selectedGuest.firstName} <br/> {selectedGuest.lastName}
              </h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3">FOLIO IDENTIFIER: {selectedGuest.id.slice(0, 8).toUpperCase()}</p>
           </div>

           <div className="space-y-6 flex-1">
              <div className="bg-black/40 p-6 rounded-3xl space-y-5 border border-white/5">
                 <div className="flex items-center gap-4 text-slate-400">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5"><Mail size={16}/></div>
                    <span className="text-[13px] font-bold truncate tracking-tight">{selectedGuest.email}</span>
                 </div>
                 <div className="flex items-center gap-4 text-slate-400 pt-4 border-t border-white/5">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5"><Phone size={16}/></div>
                    <span className="text-[13px] font-bold tracking-tight">{selectedGuest.phone || 'NO CONTACT RECORD'}</span>
                 </div>
              </div>

              {selectedGuest.activeStay ? (
                <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Active Stay</span>
                      <span className="text-[11px] font-black text-emerald-400 uppercase tracking-tighter italic">Authorized</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400"><Bed size={24}/></div>
                      <div>
                         <p className="text-xl font-black text-white italic">Room {selectedGuest.activeStay.room?.roomNumber}</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedGuest.activeStay.room?.category}</p>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-emerald-500/10 flex justify-between">
                      <div>
                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-dash mb-1">Check-In</p>
                         <p className="text-[11px] font-black text-white">{new Date(selectedGuest.activeStay.booking.checkIn).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-dash mb-1">Settlement</p>
                         <p className="text-[11px] font-black text-emerald-400">₦{selectedGuest.activeStay.booking.amount.toLocaleString()}</p>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center">
                   <Archive size={32} className="text-slate-700 mb-4 opacity-50" />
                   <p className="text-[11px] text-slate-600 font-black uppercase tracking-widest leading-relaxed">Guest has no active folio assignments in current ledger.</p>
                </div>
              )}
           </div>

           <div className="mt-10">
             {selectedGuest.activeStay ? (
               <button 
                 onClick={() => { 
                   if (selectedGuest.activeStay) {
                     setActiveCheckOutData({ 
                       guest: selectedGuest, 
                       booking: selectedGuest.activeStay.booking, 
                       room: selectedGuest.activeStay.room || null 
                     }); 
                     setIsCheckOutModalOpen(true); 
                   }
                 }} 
                 className="w-full bg-rose-600 hover:bg-rose-700 py-6 rounded-3xl font-black text-[13px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-rose-950/50 italic"
               >
                 <LogOut size={20} strokeWidth={3}/> Authorize Check-Out
               </button>
             ) : (
               <button 
                 onClick={() => setActiveTab('bookings')} 
                 className="w-full bg-blue-600 hover:bg-blue-700 py-6 rounded-3xl font-black text-[13px] uppercase tracking-[0.2em] text-white transition-all border border-blue-500/30 shadow-2xl shadow-blue-950/50 flex items-center justify-center gap-3 italic"
               >
                 <CreditCard size={20}/> New Folio Assignment
               </button>
             )}
           </div>
        </div>
      )}
      <CheckOutModal 
        isOpen={isCheckOutModalOpen} 
        onClose={() => setIsCheckOutModalOpen(false)} 
        onConfirm={checkOutBooking} 
        guest={activeCheckOutData.guest} 
        booking={activeCheckOutData.booking} 
        room={activeCheckOutData.room} 
      />
    </div>
  );
};

export default Guests;