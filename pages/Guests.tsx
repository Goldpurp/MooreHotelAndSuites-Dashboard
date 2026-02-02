import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { Guest, BookingStatus, Booking, Room } from '../types';
import { Search, Phone, Eye, LogOut, UserCheck, RefreshCw, Archive, Mail, CreditCard, Bed, ShieldCheck } from 'lucide-react';
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

  // Robust Linking Logic: Match guest to active booking by ID, Email, or Phone
  const getActiveStay = (guest: Guest) => {
    if (!guest || !bookings) return null;
    
    const booking = (bookings || []).find(b => {
      // Priority 1: Check-in status must be correct
      const isCheckedIn = b.status === BookingStatus.CHECKED_IN;
      if (!isCheckedIn) return false;

      const guestIdLower = String(guest.id).toLowerCase();
      
      // Priority 2: Precise ID matching (handles GUIDs and synthesized strings)
      const idMatch = b.guestId && String(b.guestId).toLowerCase() === guestIdLower;
      
      // Priority 3: Fuzzy matching (email/phone) for cases where IDs differ across systems
      const emailMatch = b.guestEmail && guest.email && b.guestEmail.toLowerCase() === guest.email.toLowerCase();
      const phoneMatch = b.guestPhone && guest.phone && b.guestPhone.replace(/\D/g, '') === guest.phone.replace(/\D/g, '');
      
      // Priority 4: Synthesis ID matching (where guest.id IS the email or bookingCode)
      const synthesisMatch = guestIdLower === b.guestEmail?.toLowerCase() || guestIdLower === b.bookingCode?.toLowerCase();

      return idMatch || emailMatch || phoneMatch || synthesisMatch;
    });

    if (!booking) return null;
    const room = (rooms || []).find(r => r.id === booking.roomId);
    return { booking, room: room || null };
  };

  const processedGuests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (guests || [])
      .filter(g => {
        const matchesSearch = `${g.firstName} ${g.lastName} ${g.email} ${g.phone}`.toLowerCase().includes(q);
        const stay = getActiveStay(g);
        // If we are showing only in-house, ensure the guest has an active stay verified
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
             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Property Personnel Ledger</p>
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
               {showInHouseOnly ? 'Active Focus' : 'Full Ledger'}
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
                       <th className="px-8 py-5 text-right">Details</th>
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
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-dash mt-0.5 truncate max-w-[150px]">{guest.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-8 py-5">
                              {guest.activeStay ? (
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                   Room {guest.activeStay.room?.roomNumber || '...'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest italic opacity-50">Archived</span>
                              )}
                           </td>
                           <td className="px-8 py-5">
                              <p className="text-[14px] font-black text-white italic">₦{(guest.totalSpent ?? 0).toLocaleString()}</p>
                              <p className="text-[8px] text-slate-600 font-bold uppercase tracking-dash">{guest.totalStays ?? 1} Visit(s)</p>
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
        <div className="flex-1 w-full lg:w-[420px] shrink-0 glass-card rounded-[2.5rem] p-10 flex flex-col border border-white/10 bg-slate-900/60 shadow-3xl animate-in slide-in-from-right-10 duration-500">
           <div className="flex flex-col items-center mb-10 pt-4">
              <div className="relative">
                 <img src={selectedGuest.avatarUrl || `https://ui-avatars.com/api/?name=${selectedGuest.firstName}`} className="w-32 h-32 rounded-[2.5rem] object-cover mb-6 ring-4 ring-white/10 shadow-2xl" alt=""/>
                 {selectedGuest.activeStay && (
                   <div className="absolute -bottom-2 -right-2 p-3 bg-emerald-600 rounded-2xl border-4 border-slate-900 text-white shadow-xl">
                      <ShieldCheck size={20} />
                   </div>
                 )}
              </div>
              <h3 className="text-3xl font-black text-white italic uppercase text-center leading-[0.85] tracking-tighter">
                {selectedGuest.firstName} <br/> {selectedGuest.lastName}
              </h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-3 truncate w-full text-center">FOLIO ID: {String(selectedGuest.id).toUpperCase().slice(0, 12)}</p>
           </div>

           <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="bg-black/40 p-6 rounded-3xl space-y-5 border border-white/5">
                 <div className="flex items-center gap-4 text-slate-400">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5"><Mail size={16}/></div>
                    <span className="text-[13px] font-bold truncate tracking-tight">{selectedGuest.email || 'NO EMAIL RECORDED'}</span>
                 </div>
                 <div className="flex items-center gap-4 text-slate-400 pt-4 border-t border-white/5">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/5"><Phone size={16}/></div>
                    <span className="text-[13px] font-bold tracking-tight">{selectedGuest.phone || 'NO CONTACT RECORDED'}</span>
                 </div>
              </div>

              {selectedGuest.activeStay ? (
                <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20 space-y-4 shadow-inner">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] text-emerald-500/60 font-black uppercase tracking-widest">Active Folio</span>
                      <span className="text-[11px] font-black text-emerald-400 uppercase tracking-tighter italic">Authorized</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400"><Bed size={24}/></div>
                      <div>
                         <p className="text-xl font-black text-white italic">Room {selectedGuest.activeStay.room?.roomNumber || '...'}</p>
                         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedGuest.activeStay.room?.category || 'Standard'}</p>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-emerald-500/10 flex justify-between">
                      <div>
                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-dash mb-1">Arrival</p>
                         <p className="text-[11px] font-black text-white">{new Date(selectedGuest.activeStay.booking.checkIn).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] text-slate-500 font-black uppercase tracking-dash mb-1">Balance</p>
                         <p className="text-[11px] font-black text-emerald-400">₦{selectedGuest.activeStay.booking.amount.toLocaleString()}</p>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center opacity-60">
                   <Archive size={32} className="text-slate-700 mb-4" />
                   <p className="text-[11px] text-slate-600 font-black uppercase tracking-widest leading-relaxed">No active residency detected in current property ledger.</p>
                </div>
              )}
           </div>

           <div className="mt-10">
             {selectedGuest.activeStay ? (
               <button 
                 onClick={() => { 
                   if (selectedGuest && selectedGuest.activeStay) {
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
                 <CreditCard size={20}/> New Resident Assignment
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