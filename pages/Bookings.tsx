import React, { useState, useEffect, useMemo } from 'react';
import { useHotel } from '../store/HotelContext';
import { BookingStatus, Booking, Guest, Room } from '../types';
import { 
  Search, Plus, ArrowRight, Zap, XCircle, Users, Calendar, X, Mail, Phone, 
  ChevronLeft, ChevronRight, Loader2, Filter, FileUp, CheckCircle, AlertCircle
} from 'lucide-react';
import BookingModal from '../components/BookingModal';
import VoidBookingModal from '../components/VoidBookingModal';
import CheckInConfirmModal from '../components/CheckInConfirmModal';
import { api } from '../lib/api';

const Bookings: React.FC = () => {
  const hotel = useHotel();
  const { 
    bookings, guests, rooms, checkInBooking, 
    cancelBooking, selectedBookingId, 
    setSelectedBookingId, setActiveTab, setSelectedGuestId
  } = hotel;
  
  const [filter, setFilter] = useState<string>('All');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [preFillData, setPreFillData] = useState<any>(null);
  
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<Booking | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [bookingToVoid, setBookingToVoid] = useState<Booking | null>(null);

  const [isCheckInConfirmOpen, setIsCheckInConfirmOpen] = useState(false);
  const [bookingToCheckIn, setBookingToCheckIn] = useState<Booking | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, lookupId]);

  // Deep Ledger Lookup Logic (API Integration)
  const handleFolioLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lookupId.trim()) return;
    
    setIsSearching(true);
    setLookupError(null);
    try {
      const res = await api.get<Booking>('/api/bookings/lookup', {
        params: { code: lookupId }
      });
      if (res && res.id) {
        setSelectedBooking(res);
        setSelectedBookingId(res.id);
        setLookupResult(res);
      }
    } catch (err: any) {
      setLookupError(err.message || "Dossier not found in property ledger.");
      setLookupResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Local filtering logic for immediate results
  const filteredBookings = useMemo(() => {
    const q = lookupId.trim().toLowerCase();
    return (bookings || []).filter(b => {
      const matchesStatus = filter === 'All' || b.status === filter;
      const matchesSearch = !q || 
        (b.bookingCode || '').toLowerCase().includes(q) || 
        (b.id || '').toLowerCase().includes(q) ||
        `${b.guestFirstName || ''} ${b.guestLastName || ''}`.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, filter, lookupId]);

  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  useEffect(() => {
    if (selectedBookingId) {
      const found = (bookings || []).find(b => b.id === selectedBookingId);
      if (found) setSelectedBooking(found);
    } else if (bookings && bookings.length > 0 && !selectedBooking) {
      setSelectedBooking(bookings[0]);
    }
  }, [selectedBookingId, bookings, selectedBooking]);

  // Visual feedback for local matches
  useEffect(() => {
    const q = lookupId.trim().toUpperCase();
    if (q.length >= 3) {
      const found = (bookings || []).find(b => 
        b.id.toUpperCase() === q || 
        b.bookingCode.toUpperCase() === q ||
        b.bookingCode.toUpperCase().includes(q)
      );
      
      if (found) {
        if (found.status === BookingStatus.CANCELLED || found.status === BookingStatus.CHECKED_OUT) {
          setLookupResult(null);
        } else {
          setLookupResult(found);
          setLookupError(null);
        }
      } else {
        setLookupResult(null);
      }
    } else {
      setLookupResult(null);
    }
  }, [lookupId, bookings]);

  const handleSelectBooking = (b: Booking) => {
    setSelectedBooking(b);
    setSelectedBookingId(b.id);
  };

  const handleOpenVoidModal = (e: React.MouseEvent, b: Booking) => {
    e.stopPropagation(); 
    setBookingToVoid(b);
    setIsVoidModalOpen(true);
  };

  const handleOpenCheckInConfirm = (e: React.MouseEvent, b: Booking) => {
    e.stopPropagation(); 
    setBookingToCheckIn(b);
    setIsCheckInConfirmOpen(true);
  };

  const handleCancelAndWalkIn = (b: Booking) => {
    cancelBooking(b.id);
    setPreFillData({
      guestFirstName: b.guestFirstName,
      guestLastName: b.guestLastName,
      guestEmail: b.guestEmail,
      guestPhone: b.guestPhone
    });
    setIsWalkIn(true);
    setIsBookingModalOpen(true);
  };

  const navigateToGuestStay = (guestId?: string) => {
    if (guestId) {
      setSelectedGuestId(guestId);
      setActiveTab('guests');
    }
  };

  const resolveGuestName = (b: Booking) => {
    const firstName = b.guestFirstName?.trim();
    const lastName = b.guestLastName?.trim();
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    const g = (guests || []).find(x => x.id === b.guestId);
    if (g) {
      return `${g.firstName} ${g.lastName}`.trim();
    }
    return b.guestId || b.bookingCode || "Guest";
  };

  const selectedRoom = selectedBooking ? rooms.find(r => r.id === selectedBooking.roomId) : null;

  return (
    <div className="flex gap-4 h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Reservations Ledger</h2>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.2em]">Front Desk Operations</p>
          </div>

          <form onSubmit={handleFolioLookup} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={12} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${lookupResult ? 'text-brand-500' : 'text-slate-500'}`} />
              <input 
                type="text" 
                placeholder="Search Code, Name or ID..." 
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className={`w-full bg-white/5 border rounded-md py-2.5 pl-9 pr-3 text-[10px] text-slate-200 outline-none transition-all placeholder:text-slate-600 ${
                  lookupResult ? 'border-brand-500/50 bg-brand-500/5 ring-4 ring-brand-500/10 shadow-2xl' : 'border-white/5 focus:bg-white/10'
                }`}
              />
              {isSearching && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />}
            </div>
            <button 
              type="button"
              onClick={() => { setPreFillData(null); setIsWalkIn(true); setIsBookingModalOpen(true); }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-md text-[9px] font-black uppercase tracking-dash flex items-center gap-2 transition-all shadow-xl shadow-amber-500/10 active:scale-95"
            >
              <Zap size={14}/> Walk-In
            </button>
            <button 
              type="button"
              onClick={() => { setPreFillData(null); setIsWalkIn(false); setIsBookingModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-[9px] font-black uppercase tracking-dash flex items-center gap-2 transition-all shadow-xl shadow-blue-500/10 active:scale-95"
            >
              <Plus size={14}/> New Booking
            </button>
          </form>
        </div>

        {lookupError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-top-2">
            <XCircle size={14} /> {lookupError}
            <button onClick={() => setLookupError(null)} className="ml-auto p-1 hover:bg-white/5 rounded-full"><X size={10}/></button>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="glass-card rounded-md flex-1 flex flex-col overflow-hidden shadow-xl border border-white/5">
            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-slate-900/40">
              <div className="flex gap-1 bg-black/20 p-1 rounded-md">
                {['All', 'Confirmed', 'CheckedIn', 'Pending', 'CheckedOut', 'Cancelled'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-dash transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {f === 'CheckedIn' ? 'Checked In' : f === 'CheckedOut' ? 'Checked Out' : f}
                  </button>
                ))}
              </div>
              {lookupId && (
                <button onClick={() => setLookupId('')} className="text-[8px] font-black uppercase text-rose-500 flex items-center gap-1 hover:text-rose-400">
                  <X size={10} /> Clear Search
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-900 z-10 border-b border-white/5">
                  <tr className="text-slate-600 text-[8px] font-black uppercase tracking-dash">
                    <th className="px-5 py-5">Guest & Number</th>
                    <th className="px-5 py-5">Guest Status</th>
                    <th className="px-5 py-5">Room Number</th>
                    <th className="px-5 py-5">Total Amount</th>
                    <th className="px-5 py-5">Check In/Out</th>
                    <th className="px-5 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedBookings.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center text-slate-700 font-black uppercase tracking-[0.3em] text-[10px]">No dossiers found matching criteria</td></tr>
                  ) : (
                    paginatedBookings.map((b) => {
                      const room = rooms.find(r => r.id === b.roomId);
                      const isSelected = selectedBooking?.id === b.id;
                      const guestName = resolveGuestName(b);
                      
                      return (
                        <tr 
                          key={b.id} 
                          onClick={() => handleSelectBooking(b)}
                          className={`cursor-pointer transition-all group border-l-4 ${isSelected ? 'bg-blue-600/10 border-blue-500' : 'hover:bg-white/5 border-transparent'}`}
                        >
                          <td className="px-5 py-5">
                            <div className="flex flex-col">
                              <span className="text-[14px] font-black text-white group-hover:text-blue-400 transition-colors leading-none mb-1">{guestName}</span>
                              <span className="text-[9px] text-slate-500 font-bold tracking-widest">{b.bookingCode || b.id.slice(0, 8)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-5">
                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-dash border ${
                              b.status === BookingStatus.CHECKED_IN ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                              b.status === BookingStatus.CONFIRMED ? 'bg-blue-600/15 text-blue-400 border-blue-600/30' :
                              b.status === BookingStatus.CHECKED_OUT ? 'bg-slate-500/15 text-slate-500 border-slate-700' :
                              b.status === BookingStatus.CANCELLED ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                              'bg-amber-500/15 text-amber-400 border-amber-500/20'
                            }`}>
                              {b.status === BookingStatus.CHECKED_IN ? 'Checked In' : b.status}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            <span className="text-[13px] font-black text-slate-200">Room {room?.roomNumber || '---'}</span>
                            <p className="text-[8px] text-slate-600 font-bold uppercase mt-0.5">{room?.category}</p>
                          </td>
                          <td className="px-5 py-5">
                            <span className="text-[14px] font-black text-white italic">₦{b.amount.toLocaleString()}</span>
                            <p className="text-[8px] text-slate-600 font-bold uppercase mt-0.5">Sum Total Pay</p>
                          </td>
                          <td className="px-5 py-5">
                            <div className="flex flex-col gap-0.5">
                               <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-200">{new Date(b.checkIn).toLocaleDateString('en-GB')}</span>
                                  <ArrowRight size={10} className="text-slate-600" />
                                  <span className="text-[11px] font-bold text-slate-200">{new Date(b.checkOut).toLocaleDateString('en-GB')}</span>
                               </div>
                               <p className="text-[8px] text-slate-600 font-bold uppercase">Stay Duration</p>
                            </div>
                          </td>
                          <td className="px-5 py-5 text-right">
                             <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                               {b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING ? (
                                 <>
                                   <button 
                                     onClick={(e) => handleOpenCheckInConfirm(e, b)}
                                     className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-dash transition-all"
                                   >
                                     Check-In
                                   </button>
                                   <button 
                                     onClick={(e) => handleOpenVoidModal(e, b)}
                                     className="p-2.5 rounded-lg border border-white/10 text-slate-500 hover:text-rose-500 transition-all"
                                   >
                                     <XCircle size={16}/>
                                   </button>
                                 </>
                               ) : b.status === BookingStatus.CHECKED_IN ? (
                                 <button 
                                   onClick={() => navigateToGuestStay(b.guestId)}
                                   className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-dash border border-blue-500/20 transition-all"
                                 >
                                   Manage
                                 </button>
                               ) : (
                                 <button className="bg-white/5 text-slate-400 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-dash border border-white/10 opacity-50">
                                   Invoice
                                 </button>
                               )}
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-white/5 bg-slate-900/40 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Showing {paginatedBookings.length} of {filteredBookings.length} results
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-white/10 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center px-4 rounded-lg bg-black/20 border border-white/5">
                  <span className="text-[10px] font-black text-white">{currentPage} / {totalPages || 1}</span>
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 border border-white/10 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedBooking && (
        <div className="w-[330px] flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 h-full overflow-hidden shrink-0">
           <div className="glass-card rounded-[2.5rem] p-8 flex flex-col h-full overflow-y-auto custom-scrollbar border border-white/10 bg-[#0a0f1a] relative">
             <div className="flex justify-between items-start mb-8">
               <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">FOLIO</h3>
                  <p className="text-[11px] text-[#3b82f6] font-black tracking-[0.2em] uppercase mt-1">REF: {selectedBooking.bookingCode}</p>
               </div>
               <button onClick={() => setSelectedBookingId(null)} className="p-3 bg-white/5 rounded-full text-slate-500 hover:text-rose-500 transition-all border border-white/10"><X size={20}/></button>
             </div>

             <div className="space-y-6 flex-1">
                <div className="flex flex-col items-center text-center p-8 bg-[#161d2b] rounded-[2rem] border border-white/5 shadow-inner">
                   <div className="w-24 h-24 rounded-[2rem] bg-[#05080f] flex items-center justify-center font-black text-white text-4xl italic mb-4 border border-white/5 shadow-2xl relative overflow-hidden">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(resolveGuestName(selectedBooking))}&background=05080f&color=fff&size=128`} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="" />
                      {resolveGuestName(selectedBooking).charAt(0)}
                   </div>
                   <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-1 truncate w-full">{resolveGuestName(selectedBooking)}</h4>
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] opacity-80">PRIMARY OCCUPANT</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-[#0d131f] p-6 rounded-2xl border border-white/5">
                     <span className="text-[11px] text-slate-500 font-black uppercase tracking-widest">UNIT ID</span>
                     <span className="text-[15px] font-black text-[#3b82f6] tracking-tight">Room {selectedRoom?.roomNumber || '...'}</span>
                  </div>

                  <div className="flex justify-between items-center bg-[#0d131f] p-6 rounded-2xl border border-white/5">
                     <span className="text-[11px] text-slate-500 font-black uppercase tracking-widest">TOTAL SETTLEMENT</span>
                     <span className="text-[15px] font-black text-[#10b981] tracking-tight">₦{selectedBooking.amount.toLocaleString()}</span>
                  </div>

                  <div className="bg-[#0d131f] p-6 rounded-2xl border border-white/5 space-y-4">
                     <div className="flex items-center gap-3 text-slate-400">
                        <Mail size={14} />
                        <span className="text-[11px] font-medium tracking-tight truncate">{selectedBooking.guestEmail || "No Email"}</span>
                     </div>
                     <div className="flex items-center gap-3 text-slate-400">
                        <Phone size={14} />
                        <span className="text-[11px] font-medium tracking-tight">{selectedBooking.guestPhone || "---"}</span>
                     </div>
                  </div>
                </div>
             </div>

             <div className="mt-10">
                {(selectedBooking.status === BookingStatus.CONFIRMED || selectedBooking.status === BookingStatus.PENDING) ? (
                  <button 
                    onClick={(e) => handleOpenCheckInConfirm(e, selectedBooking)}
                    className="w-full bg-[#059669] hover:bg-[#047857] text-white font-black py-6 rounded-2xl text-[13px] uppercase tracking-[0.2em] transition-all shadow-3xl shadow-emerald-950/60 active:scale-95 flex items-center justify-center gap-3 italic"
                  >
                    <Zap size={20} fill="currentColor"/> AUTHORIZE CHECK-IN
                  </button>
                ) : (
                  <button 
                    onClick={() => navigateToGuestStay(selectedBooking.guestId)}
                    className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black py-6 rounded-2xl text-[13px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 italic"
                  >
                    <Users size={20}/> MANAGE STAY
                  </button>
                )}
             </div>
           </div>
        </div>
      )}

      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} isWalkIn={isWalkIn} initialData={preFillData} />
      <VoidBookingModal 
        isOpen={isVoidModalOpen} 
        onClose={() => setIsVoidModalOpen(false)} 
        onConfirm={cancelBooking}
        booking={bookingToVoid}
        guest={bookingToVoid ? { firstName: bookingToVoid.guestFirstName, lastName: bookingToVoid.guestLastName, avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(resolveGuestName(bookingToVoid))}&background=020617&color=fff` } as any : null}
        room={rooms.find(r => r.id === bookingToVoid?.roomId) || null}
      />
      <CheckInConfirmModal 
        isOpen={isCheckInConfirmOpen}
        onClose={() => setIsCheckInConfirmOpen(false)}
        onConfirm={checkInBooking}
        onCancelAndWalkIn={handleCancelAndWalkIn}
        booking={bookingToCheckIn}
        guest={bookingToCheckIn ? { firstName: bookingToCheckIn.guestFirstName, lastName: bookingToCheckIn.guestLastName } as any : null}
        room={rooms.find(r => r.id === bookingToCheckIn?.roomId) || null}
      />
    </div>
  );
};

export default Bookings;