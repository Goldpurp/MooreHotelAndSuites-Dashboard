
import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { Guest, BookingStatus, RoomStatus, Booking } from '../types';
import { 
  Search, Download, Phone, Eye, CreditCard, History, User, LogOut, 
  AlertTriangle, Clock, MapPin, Calendar, Bed, Star, Users, UserCheck, 
  Filter, SearchX, Mail, Plus, Archive
} from 'lucide-react';
import CheckOutModal from '../components/CheckOutModal';

const Guests: React.FC = () => {
  const { guests, bookings, rooms, checkOutBooking, setActiveTab, selectedGuestId: globalSelectedGuestId } = useHotel();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInHouseOnly, setShowInHouseOnly] = useState(true);
  
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [activeCheckOutData, setActiveCheckOutData] = useState<{
    guest: Guest | null;
    booking: any;
    room: any;
  }>({ guest: null, booking: null, room: null });

  const getActiveStay = (guest: Guest) => {
    if (!guest || !bookings) return null;
    // Cross-reference with bookings to find real-time active stays
    const booking = (bookings || []).find(b => 
      b.status === BookingStatus.CHECKED_IN && 
      (b.guestId === guest.id || b.guestEmail?.toLowerCase() === guest.email?.toLowerCase())
    );
    if (!booking) return null;
    const room = (rooms || []).find(r => r.id === booking.roomId);
    return { booking, room };
  };

  const processedGuests = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const today = new Date().toISOString().split('T')[0];

    return (guests || [])
      .filter(g => {
        if (!g) return false;
        const fullName = `${g.firstName || ''} ${g.lastName || ''}`.toLowerCase();
        const matchesSearch = 
          fullName.includes(query) ||
          (g.email || '').toLowerCase().includes(query) ||
          (g.phone || '').includes(query);
        
        const activeStay = getActiveStay(g);
        const matchesFilter = showInHouseOnly ? !!activeStay : true;

        return matchesSearch && matchesFilter;
      })
      .map(g => {
        const stay = getActiveStay(g);
        const isDueToday = stay?.booking.checkOut.split('T')[0] === today;
        const isOverdue = stay ? new Date(stay.booking.checkOut).getTime() < new Date().getTime() && !isDueToday : false;

        return {
          ...g,
          activeStay: stay,
          isDueToday,
          isOverdue
        };
      })
      .sort((a, b) => {
        if (a.activeStay && !b.activeStay) return -1;
        if (!a.activeStay && b.activeStay) return 1;
        return 0;
      });
  }, [guests, searchQuery, showInHouseOnly, bookings, rooms]);

  const [localSelectedGuestId, setLocalSelectedGuestId] = useState<string | null>(null);
  
  useEffect(() => {
    if (globalSelectedGuestId) {
      setLocalSelectedGuestId(globalSelectedGuestId);
      setSearchQuery('');
      setShowInHouseOnly(false);
    } else if (processedGuests.length > 0 && !localSelectedGuestId) {
      setLocalSelectedGuestId(processedGuests[0].id);
    }
  }, [globalSelectedGuestId, processedGuests, localSelectedGuestId]);

  const selectedGuest = useMemo(() => processedGuests.find(g => g.id === localSelectedGuestId), [processedGuests, localSelectedGuestId]);

  const handleOpenCheckOut = (e: React.MouseEvent, guestData: any) => {
    e.stopPropagation();
    if (!guestData.activeStay) return;
    setActiveCheckOutData({
      guest: guestData,
      booking: guestData.activeStay.booking,
      room: guestData.activeStay.room
    });
    setIsCheckOutModalOpen(true);
  };

  const handleCheckOutConfirm = (bookingId: string) => {
    checkOutBooking(bookingId);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-100px)] animate-in fade-in duration-700">
      <div className="flex-[2.5] flex flex-col gap-4 overflow-hidden">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
              <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Verified Occupancy</p>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">
              {showInHouseOnly ? 'In-House Residents' : 'Guest Registry'}
            </h2>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-dash mt-1">
              {showInHouseOnly 
                ? `Synchronizing ${processedGuests.length} active hospitality sessions` 
                : `Viewing all recorded property profiles`}
            </p>
          </div>
          <div className="flex gap-2">
             <button className="bg-white/5 border border-white/5 text-slate-400 px-4 py-2.5 rounded-md text-[10px] font-black uppercase tracking-dash hover:text-white transition-all"><Download size={18}/></button>
             <button 
              onClick={() => setActiveTab('operation_log')}
              className="bg-blue-600/10 border border-blue-500/20 text-blue-400 px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-blue-500/10"
             >
               <History size={16}/> Protocol Logs
             </button>
          </div>
        </div>

        <div className="glass-card rounded-md flex-1 flex flex-col overflow-hidden border border-white/5 shadow-2xl">
           <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-slate-900/40 gap-4">
              <div className="relative flex-1 max-w-lg">
                 <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-blue-500' : 'text-slate-500'}`} size={14}/>
                 <input 
                    type="text" 
                    placeholder="Search name, contact, or folio..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-[12px] text-slate-300 outline-none focus:bg-slate-900 transition-all focus:border-blue-500/40 shadow-inner"
                 />
              </div>
              <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                 <button 
                  onClick={() => setShowInHouseOnly(true)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-dash transition-all flex items-center gap-2 ${
                    showInHouseOnly ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'
                  }`}
                 >
                    <UserCheck size={14} /> Checked-In
                 </button>
                 <button 
                  onClick={() => setShowInHouseOnly(false)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-dash transition-all flex items-center gap-2 ${
                    !showInHouseOnly ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'
                  }`}
                 >
                    <Archive size={14} /> All Guests
                 </button>
              </div>
           </div>

           <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-slate-900 z-10 border-b border-white/10">
                    <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest bg-slate-900/90 backdrop-blur-md">
                       <th className="px-6 py-4">Occupant Profile</th>
                       <th className="px-6 py-4">Protocol Status</th>
                       <th className="px-6 py-4">Stay Cycle</th>
                       <th className="px-6 py-4">Ledger Value</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {processedGuests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center justify-center opacity-30">
                            <SearchX size={48} className="text-slate-600 mb-4" />
                            <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">
                              {showInHouseOnly ? 'No active check-ins' : 'Global directory empty'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      processedGuests.map((guest) => (
                        <tr 
                            key={guest.id} 
                            className={`hover:bg-blue-600/5 transition-all cursor-pointer group ${localSelectedGuestId === guest.id ? 'bg-blue-600/10' : ''}`}
                            onClick={() => setLocalSelectedGuestId(guest.id)}
                        >
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <img src={guest.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest.firstName)}&background=020617&color=fff`} className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/5 group-hover:ring-blue-500/50 transition-all shadow-lg" alt=""/>
                                    {guest.activeStay && (
                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-md border-2 border-slate-950 flex items-center justify-center shadow-lg">
                                         <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-[15px] font-black text-white group-hover:text-blue-400 transition-colors uppercase italic">{guest.firstName} {guest.lastName}</p>
                                    <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-0.5">{guest.phone || guest.email}</p>
                                  </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              {guest.activeStay ? (
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                                    <Bed size={14} />
                                  </div>
                                  <div>
                                    <p className="text-[12px] font-black text-emerald-400 uppercase tracking-tighter italic">Room {guest.activeStay.room?.roomNumber}</p>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${guest.isOverdue ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>
                                      {guest.isOverdue ? 'Overstay Flag' : 'In-House'}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 italic">Archived</span>
                              )}
                            </td>
                            <td className="px-6 py-5">
                                <p className="text-[13px] font-black text-slate-300">{(guest.totalStays ?? 1).toLocaleString()} Stays</p>
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-dash mt-0.5 italic">Protocol History</p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-[15px] font-black text-white italic">₦{(guest.totalSpent ?? 0).toLocaleString()}</p>
                              <p className="text-[9px] text-slate-500 font-black uppercase tracking-dash mt-0.5">Sum Settled</p>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                {guest.activeStay && (
                                  <button 
                                    onClick={(e) => handleOpenCheckOut(e, guest)}
                                    className="p-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl border border-rose-500/20 transition-all shadow-xl shadow-rose-500/10"
                                    title="Authorize Check-Out"
                                  >
                                      <LogOut size={16}/>
                                  </button>
                                )}
                                <button className="p-3 bg-white/5 text-slate-400 hover:text-blue-400 rounded-xl border border-white/5 transition-all"><Eye size={16}/></button>
                              </div>
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
        <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-right-6 duration-500 h-full overflow-hidden shrink-0 w-[340px]">
           <div className="glass-card rounded-md p-8 flex flex-col h-full overflow-y-auto custom-scrollbar relative border border-white/10 bg-slate-900/60 shadow-2xl">
              <div className={`absolute top-0 left-0 w-full h-[4px] ${selectedGuest.activeStay ? (selectedGuest.isOverdue ? 'bg-rose-600' : 'bg-emerald-600') : 'bg-slate-700'}`}></div>
              
              <div className="flex flex-col items-center text-center mb-10 pt-4">
                 <div className="relative mb-6">
                   <img src={selectedGuest.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedGuest.firstName)}&background=020617&color=fff`} className="w-28 h-28 rounded-3xl object-cover ring-4 ring-white/10 shadow-3xl" alt=""/>
                   {selectedGuest.isVIP && (
                     <div className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 p-2 rounded-xl border-4 border-slate-950 shadow-2xl"><Star size={18} fill="currentColor"/></div>
                   )}
                 </div>
                 <h3 className="text-3xl font-black text-white tracking-tighter italic uppercase leading-none">{selectedGuest.firstName} <br/> {selectedGuest.lastName}</h3>
                 <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {selectedGuest.activeStay ? (
                      <span className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg italic">Checked-In</span>
                    ) : (
                      <span className="bg-slate-800/50 border border-white/5 text-slate-500 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Protocol Archive</span>
                    )}
                 </div>
              </div>

              <div className="space-y-8 flex-1">
                 <div>
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 italic"><User size={14} className="text-blue-500"/> Core Dossier</h4>
                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4">
                       <div className="flex items-center gap-4"><Mail size={14} className="text-slate-600"/><span className="text-[12px] font-bold text-slate-200 truncate">{selectedGuest.email}</span></div>
                       <div className="flex items-center gap-4"><Phone size={14} className="text-slate-600"/><span className="text-[12px] font-bold text-slate-200">{selectedGuest.phone || "---"}</span></div>
                    </div>
                 </div>

                 <div>
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 italic"><History size={14} className="text-amber-500"/> Current Stay</h4>
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-4 shadow-xl">
                       {selectedGuest.activeStay ? (
                         <>
                           <div className="flex justify-between items-center"><span className="text-[10px] text-slate-600 font-black uppercase">Unit</span><span className="text-[13px] font-black text-white italic">Room {selectedGuest.activeStay.room?.roomNumber}</span></div>
                           <div className="flex justify-between items-center pt-4 border-t border-white/5"><span className="text-[10px] text-slate-600 font-black uppercase">Folio Code</span><span className="text-[12px] font-bold text-blue-400">{selectedGuest.activeStay.booking.bookingCode}</span></div>
                           <div className="flex justify-between items-center pt-4 border-t border-white/5"><span className="text-[10px] text-slate-600 font-black uppercase">Release Date</span><span className="text-[12px] font-black text-white">{new Date(selectedGuest.activeStay.booking.checkOut).toLocaleDateString()}</span></div>
                         </>
                       ) : (
                         <p className="text-[10px] text-slate-700 font-black uppercase text-center py-4 italic">No Active Sessions</p>
                       )}
                    </div>
                 </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/5">
                 {selectedGuest.activeStay ? (
                   <button 
                    onClick={() => {
                        if (!selectedGuest.activeStay) return;
                        setActiveCheckOutData({ guest: selectedGuest, booking: selectedGuest.activeStay.booking, room: selectedGuest.activeStay.room });
                        setIsCheckOutModalOpen(true);
                    }}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-5 rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all shadow-3xl shadow-rose-950/50 flex items-center justify-center gap-3 active:scale-95 italic"
                   >
                      <LogOut size={18}/> Authorize Check-Out
                   </button>
                 ) : (
                   <button 
                    onClick={() => { setActiveTab('bookings'); }}
                    className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest transition-all border border-blue-500/20 flex items-center justify-center gap-3"
                   >
                      <Plus size={18}/> Provision Stay
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}

      <CheckOutModal 
        isOpen={isCheckOutModalOpen}
        onClose={() => setIsCheckOutModalOpen(false)}
        onConfirm={handleCheckOutConfirm}
        guest={activeCheckOutData.guest}
        booking={activeCheckOutData.booking}
        room={activeCheckOutData.room}
      />
    </div>
  );
};

export default Guests;
