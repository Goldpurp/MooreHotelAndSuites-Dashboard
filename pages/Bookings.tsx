
import React, { useState, useEffect, useMemo } from 'react';
import { useHotel } from '../store/HotelContext';
import { BookingStatus, Booking, Guest, Room, PaymentStatus } from '../types';
import { 
  Search, Plus, ArrowRight, Zap, CheckCircle, 
  XCircle, Calendar, User, X, Mail, Phone, ChevronLeft, ChevronRight,
  ShieldCheck, Lock, Clock, History, AlertCircle, Bookmark, CreditCard
} from 'lucide-react';
import BookingModal from '../components/BookingModal';
import VoidBookingModal from '../components/VoidBookingModal';
import CheckInConfirmModal from '../components/CheckInConfirmModal';

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
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [bookingToVoid, setBookingToVoid] = useState<Booking | null>(null);

  const [isCheckInConfirmOpen, setIsCheckInConfirmOpen] = useState(false);
  const [bookingToCheckIn, setBookingToCheckIn] = useState<Booking | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'checkedin':
      case 'inhouse':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20',
          band: 'border-emerald-500/50 bg-emerald-500/5',
          icon: <Zap size={10} fill="currentColor" />,
          label: 'CHECKED-IN'
        };
      case 'confirmed':
        return {
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-blue-500/20',
          band: 'border-blue-500/50 bg-blue-500/5',
          icon: <CheckCircle size={10} />,
          label: 'CONFIRMED'
        };
      case 'pending':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/20',
          band: 'border-amber-500/50 bg-amber-500/5',
          icon: <Clock size={10} className="animate-pulse" />,
          label: 'PENDING'
        };
      case 'reserved':
        return {
          bg: 'bg-indigo-500/10',
          text: 'text-indigo-400',
          border: 'border-indigo-500/20',
          band: 'border-indigo-500/50 bg-indigo-500/5',
          icon: <Bookmark size={10} />,
          label: 'RESERVED'
        };
      case 'cancelled':
      case 'voided':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/20',
          band: 'border-rose-500/50 bg-rose-500/5',
          icon: <XCircle size={10} />,
          label: 'CANCELLED'
        };
      case 'checkedout':
        return {
          bg: 'bg-slate-800',
          text: 'text-slate-500',
          border: 'border-slate-700',
          band: 'border-slate-700/50 bg-slate-900/5',
          icon: <History size={10} />,
          label: 'CHECKED-OUT'
        };
      default:
        return {
          bg: 'bg-slate-900',
          text: 'text-slate-400',
          border: 'border-white/5',
          band: 'border-transparent',
          icon: <AlertCircle size={10} />,
          label: 'UNKNOWN'
        };
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, lookupId]);

  const filteredBookings = useMemo(() => {
    const q = lookupId.trim().toLowerCase();
    return (bookings || []).filter(b => {
      const bStatus = b.status?.toLowerCase();
      const matchesStatus = filter === 'All' || bStatus === filter.toLowerCase();
      const matchesSearch = !q || 
        (b.bookingCode || '').toLowerCase().includes(q) || 
        `${b.guestFirstName || ''} ${b.guestLastName || ''}`.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, filter, lookupId]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);

  useEffect(() => {
    if (selectedBookingId) {
      const found = (bookings || []).find(b => b.id === selectedBookingId);
      if (found) setSelectedBooking(found);
    } else if (bookings && bookings.length > 0 && !selectedBooking) {
      setSelectedBooking(bookings[0]);
    }
  }, [selectedBookingId, bookings]);

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
    if (firstName || lastName) return `${firstName || ''} ${lastName || ''}`.trim();
    const g = (guests || []).find(x => x.id === b.guestId);
    if (g) return `${g.firstName} ${g.lastName}`.trim();
    return b.bookingCode || "Resident Profile";
  };

  const selectedRoom = selectedBooking ? rooms.find(r => r.id === selectedBooking.roomId) : null;

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)] animate-in fade-in duration-700 overflow-hidden">
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-[2px] bg-brand-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
              <p className="text-[10px] text-brand-400 font-black uppercase tracking-[0.2em]">Front Desk Command</p>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Reservations</h2>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72 group">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Lookup Folio or Resident Name..." 
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-xs text-slate-200 outline-none focus:border-brand-500/40 transition-all font-bold"
              />
            </div>
            <button 
              onClick={() => { setPreFillData(null); setIsWalkIn(true); setIsBookingModalOpen(true); }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95 italic"
            >
              <Zap size={14} fill="currentColor"/> Walk-In
            </button>
            <button 
              onClick={() => { setPreFillData(null); setIsWalkIn(false); setIsBookingModalOpen(true); }}
              className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95 italic"
            >
              <Plus size={14} strokeWidth={3}/> New Folio
            </button>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40">
          <div className="px-6 py-4 border-b border-white/5 flex flex-wrap justify-between items-center bg-slate-950/60">
            <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
              {['All', 'CheckedIn', 'Confirmed', 'Reserved', 'Pending', 'CheckedOut', 'Cancelled'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    filter === f 
                    ? (f === 'CheckedIn' ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-lg' : 
                       f === 'Cancelled' ? 'bg-rose-600 text-white shadow-rose-500/20 shadow-lg' : 
                       f === 'Reserved' ? 'bg-indigo-600 text-white shadow-indigo-500/20 shadow-lg' :
                       'bg-brand-600 text-white shadow-brand-500/20 shadow-lg') 
                    : 'text-slate-600 hover:text-slate-300'
                  }`}
                >
                  {f === 'CheckedIn' ? 'IN-HOUSE' : f === 'CheckedOut' ? 'HISTORY' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 border-b border-white/10">
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">Occupant Dossier</th>
                  <th className="px-8 py-5">Stay Cycle</th>
                  <th className="px-8 py-5 text-center">Asset</th>
                  <th className="px-8 py-5 text-right">Settlement Status</th>
                  <th className="px-8 py-5 text-right">Operational Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedBookings.length === 0 ? (
                  <tr><td colSpan={5} className="py-32 text-center text-slate-700 font-black uppercase tracking-[0.4em] text-[12px] italic">No matching dossiers detected in ledger</td></tr>
                ) : (
                  paginatedBookings.map((b) => {
                    const room = rooms.find(r => r.id === b.roomId);
                    const isSelected = selectedBooking?.id === b.id;
                    const guestName = resolveGuestName(b);
                    const cfg = getStatusConfig(b.status);
                    const bStatusLower = b.status?.toLowerCase();
                    const isPaid = (b.paymentStatus || '').toLowerCase() === 'paid';
                    
                    return (
                      <tr 
                        key={b.id} 
                        onClick={() => handleSelectBooking(b)}
                        className={`cursor-pointer transition-all group border-l-4 ${isSelected ? cfg.band : 'hover:bg-white/[0.03] border-transparent'}`}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                              (bStatusLower === 'checkedin' || bStatusLower === 'inhouse') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-inner' :
                              'bg-white/5 border-white/5 text-slate-500'
                            }`}>
                              <User size={18} />
                            </div>
                            <div>
                              <p className="text-[15px] font-black text-white group-hover:text-brand-400 transition-colors uppercase italic tracking-tight">{guestName}</p>
                              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-0.5">REF: {b.bookingCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1.5">
                            <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border w-fit flex items-center gap-2 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              {cfg.icon}
                              {cfg.label}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                               <span>{new Date(b.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                               <ArrowRight size={10} className="opacity-30" />
                               <span>{new Date(b.checkOut).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <p className="text-[14px] font-black text-white uppercase italic tracking-tighter">Room {room?.roomNumber || '---'}</p>
                          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-dash mt-0.5">{room?.category}</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex flex-col items-end gap-1">
                             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[9px] font-black uppercase border ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'}`}>
                                {isPaid ? <ShieldCheck size={10}/> : <AlertCircle size={10}/>}
                                {isPaid ? 'Settled' : 'Unpaid'}
                             </div>
                             <p className={`text-[15px] font-black italic tracking-tighter ${isPaid ? 'text-white' : 'text-rose-400'}`}>₦{b.amount.toLocaleString()}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <div className="flex items-center justify-end gap-2.5" onClick={e => e.stopPropagation()}>
                             {(bStatusLower === 'confirmed' || bStatusLower === 'pending' || bStatusLower === 'reserved') ? (
                               <>
                                 <button 
                                   onClick={(e) => handleOpenCheckInConfirm(e, b)}
                                   disabled={!isPaid}
                                   className={`${!isPaid ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-950/40'} px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 italic`}
                                 >
                                   {!isPaid ? <Lock size={12}/> : <Zap size={14} fill="currentColor"/>}
                                   {isPaid ? 'Check-In' : 'Pending Pay'}
                                 </button>
                                 <button 
                                   onClick={(e) => handleOpenVoidModal(e, b)}
                                   className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                 >
                                   <XCircle size={18}/>
                                 </button>
                               </>
                             ) : (bStatusLower === 'checkedin' || bStatusLower === 'inhouse') ? (
                               <button 
                                 onClick={() => navigateToGuestStay(b.guestId)}
                                 className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-950/40 active:scale-95 italic flex items-center gap-2"
                               >
                                 <User size={14}/> Manage Stay
                               </button>
                             ) : (
                               <div className="flex items-center justify-end gap-2 text-slate-700 opacity-40 px-4 py-2">
                                  <Lock size={14} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Locked</span>
                               </div>
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

          <div className="px-8 py-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">
              Audit Trace: {filteredBookings.length} Dossiers found
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-white/10 rounded-lg text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center px-4 rounded-lg bg-black/20 border border-white/5">
                <span className="text-[10px] font-black text-white">{currentPage} / {totalPages || 1}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 border border-white/10 rounded-lg text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedBooking && (
        <div className="w-[420px] flex flex-col gap-4 animate-in slide-in-from-right-8 duration-500 h-full overflow-hidden shrink-0">
           <div className="glass-card rounded-[3rem] p-10 flex flex-col h-full overflow-y-auto custom-scrollbar border border-white/10 bg-[#0a0f1a] relative shadow-3xl">
             <div className="flex justify-between items-start mb-10">
               <div>
                  <h3 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Dossier</h3>
                  <p className="text-[11px] text-brand-500 font-black tracking-[0.25em] uppercase mt-4">REF: {selectedBooking.bookingCode}</p>
               </div>
               <button onClick={() => hotel.setSelectedBookingId(null)} className="p-3 bg-white/5 rounded-2xl text-slate-600 hover:text-rose-500 transition-all border border-white/5"><X size={20}/></button>
             </div>

             <div className="space-y-8 flex-1">
                <div className="flex flex-col items-center text-center p-10 bg-[#161d2b] rounded-[2.5rem] border border-white/5 shadow-inner">
                   <div className="w-28 h-28 rounded-[2rem] bg-[#05080f] flex items-center justify-center font-black text-white text-5xl italic mb-6 border border-white/5 shadow-2xl relative overflow-hidden ring-4 ring-white/5">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(resolveGuestName(selectedBooking))}&background=05080f&color=fff&size=128`} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="" />
                      {resolveGuestName(selectedBooking).charAt(0)}
                   </div>
                   <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1 truncate w-full">{resolveGuestName(selectedBooking)}</h4>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] opacity-80">Resident Identity</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className={`p-6 rounded-3xl border flex items-center justify-between transition-all ${getStatusConfig(selectedBooking.status).bg} ${getStatusConfig(selectedBooking.status).border}`}>
                     <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Protocol State</span>
                     <span className={`text-[12px] font-black uppercase tracking-widest italic ${getStatusConfig(selectedBooking.status).text}`}>
                        {getStatusConfig(selectedBooking.status).label}
                     </span>
                  </div>

                  <div className={`p-6 rounded-3xl border flex items-center justify-between transition-all ${(selectedBooking.paymentStatus || '').toLowerCase() === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'}`}>
                     <span className="text-[10px] opacity-70 font-black uppercase tracking-widest">Settlement</span>
                     <div className="flex items-center gap-2">
                        {(selectedBooking.paymentStatus || '').toLowerCase() === 'paid' ? <ShieldCheck size={14}/> : <AlertCircle size={14}/>}
                        <span className="text-[12px] font-black uppercase tracking-widest italic">
                           {(selectedBooking.paymentStatus || '').toLowerCase() === 'paid' ? 'SETTLED' : 'PAYMENT DUE'}
                        </span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0d131f] p-6 rounded-3xl border border-white/5">
                     <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Asset ID</span>
                     <span className="text-xl font-black text-brand-500 tracking-tighter italic">Room {selectedRoom?.roomNumber || '---'}</span>
                  </div>
                  <div className="bg-[#0d131f] p-6 rounded-3xl border border-white/5">
                     <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-2">Total Value</span>
                     <span className="text-xl font-black text-white tracking-tighter italic">₦{selectedBooking.amount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-[#0d131f] p-6 rounded-3xl border border-white/5 space-y-5">
                   <div className="flex items-center gap-4 text-slate-400">
                      <div className="p-2.5 bg-black rounded-xl border border-white/5 text-slate-600"><Mail size={16}/></div>
                      <span className="text-[13px] font-bold tracking-tight truncate flex-1">{selectedBooking.guestEmail || "No Digital Record"}</span>
                   </div>
                   <div className="flex items-center gap-4 text-slate-400">
                      <div className="p-2.5 bg-black rounded-xl border border-white/5 text-slate-600"><Phone size={16}/></div>
                      <span className="text-[13px] font-bold tracking-tight">{selectedBooking.guestPhone || "No Contact"}</span>
                   </div>
                </div>
             </div>

             <div className="mt-12">
                {(['confirmed', 'pending', 'reserved'].includes(selectedBooking.status?.toLowerCase())) ? (
                  <button 
                    onClick={(e) => handleOpenCheckInConfirm(e, selectedBooking)}
                    disabled={(selectedBooking.paymentStatus || '').toLowerCase() !== 'paid'}
                    className={`w-full ${(selectedBooking.paymentStatus || '').toLowerCase() !== 'paid' ? 'bg-slate-900 text-slate-600 cursor-not-allowed' : 'bg-[#10b981] hover:bg-[#059669] text-white shadow-3xl shadow-emerald-950/60'} font-black py-7 rounded-[1.5rem] text-[15px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 italic`}
                  >
                    {(selectedBooking.paymentStatus || '').toLowerCase() !== 'paid' ? <Lock size={22}/> : <Zap size={22} fill="currentColor" strokeWidth={0}/>}
                    {(selectedBooking.paymentStatus || '').toLowerCase() !== 'paid' ? 'WAITING FOR PAYMENT' : 'AUTHORIZE CHECK-IN'}
                  </button>
                ) : (selectedBooking.status?.toLowerCase() === 'checkedin' || selectedBooking.status?.toLowerCase() === 'inhouse') ? (
                  <button 
                    onClick={() => navigateToGuestStay(selectedBooking.guestId)}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-7 rounded-[1.5rem] text-[15px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 italic shadow-3xl shadow-brand-950/60"
                  >
                    <ShieldCheck size={22}/> MANAGE RESIDENCY
                  </button>
                ) : (
                  <button 
                    disabled
                    className="w-full bg-slate-900 text-slate-700 font-black py-7 rounded-[1.5rem] text-[15px] uppercase tracking-[0.2em] border border-white/5 cursor-not-allowed italic"
                  >
                    <Lock size={22}/> DOSSIER SEALED
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
