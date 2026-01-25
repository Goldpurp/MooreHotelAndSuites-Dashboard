
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Bell, Bed, Users, Calendar, 
  ShieldCheck, UserCog, Hash, X, CheckCircle, 
  Info, AlertTriangle, Trash2, Clock, Check
} from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { AppNotification } from '../types';

const TopBar: React.FC = () => {
  const { 
    currentUser, rooms, guests, bookings, staff, 
    setActiveTab, setSelectedBookingId, setSelectedGuestId, setSelectedRoomId,
    notifications, markAllNotificationsRead, markNotificationAsRead, dismissNotification
  } = useHotel();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node) && !searchInputRef.current?.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return null;
    const q = searchQuery.toLowerCase();
    
    return {
      rooms: (rooms || []).filter(r => 
        (r.roomNumber || '').toLowerCase().includes(q) || 
        (r.category || '').toLowerCase().includes(q) || 
        (r.name || '').toLowerCase().includes(q)
      ).slice(0, 4),
      guests: (guests || []).filter(g => 
        (g.lastName || '').toLowerCase().includes(q) || 
        (g.firstName || '').toLowerCase().includes(q) ||
        (g.email || '').toLowerCase().includes(q)
      ).slice(0, 4),
      bookings: (bookings || []).filter(b => 
        (b.bookingCode || '').toLowerCase().includes(q) ||
        (b.id || '').toLowerCase().includes(q)
      ).slice(0, 4),
      staff: (staff || []).filter(s => 
        (s.name || '').toLowerCase().includes(q) || 
        (s.email || '').toLowerCase().includes(q)
      ).slice(0, 4)
    };
  }, [searchQuery, rooms, guests, bookings, staff]);

  const hasAnyResults = useMemo(() => {
    if (!searchResults) return false;
    return Object.values(searchResults).some((arr) => (arr as any[]).length > 0);
  }, [searchResults]);

  const handleNavigate = (tab: string, id: string) => {
    setSelectedBookingId(null);
    setSelectedGuestId(null);
    setSelectedRoomId(null);
    if (tab === 'bookings') setSelectedBookingId(id);
    if (tab === 'guests') setSelectedGuestId(id);
    if (tab === 'rooms') setSelectedRoomId(id);
    setActiveTab(tab);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead) {
      await markNotificationAsRead(n.id);
    }
    
    // Logic to navigate based on bookingCode if present
    if (n.bookingCode) {
      const booking = (bookings || []).find(b => b.bookingCode === n.bookingCode);
      if (booking) {
        handleNavigate('bookings', booking.id);
      } else {
        // Fallback to bookings tab if booking not found in current local set
        setActiveTab('bookings');
      }
    } else if (n.title.toLowerCase().includes('settlement')) {
      setActiveTab('settlements');
    }
    
    setShowNotifications(false);
  };

  // Only display unread notifications in the dropdown list as requested
  const unreadNotifications = useMemo(() => 
    (notifications || []).filter(n => !n.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
    [notifications]
  );

  const unreadCount = unreadNotifications.length;

  return (
    <header className="h-20 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="relative w-full max-w-lg">
        <div className="relative group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchQuery ? 'text-brand-500' : 'text-slate-500'}`} size={16} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search Records... (⌘+K)" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-brand-500/50 focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/5 shadow-inner"
          />
        </div>
        
        {showResults && searchQuery.trim().length >= 2 && (
          <div ref={resultsRef} className="absolute top-full left-0 mt-3 w-full max-w-xl bg-slate-900/98 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl p-2 z-[100] animate-in fade-in slide-in-from-top-2 overflow-hidden">
            {!hasAnyResults ? (
              <div className="p-12 text-center">
                <p className="text-[11px] font-black uppercase tracking-dash text-slate-600 italic">No matches found in ledger</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2 space-y-4">
                {searchResults?.rooms.length! > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 px-3">Units</p>
                    {searchResults?.rooms.map(r => (
                      <button key={r.id} onClick={() => handleNavigate('rooms', r.id)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <Bed size={14} className="text-blue-500" />
                          <span className="text-[13px] font-black text-white">Room {r.roomNumber}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{r.category}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchResults?.bookings.length! > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 px-3">Reservations</p>
                    {searchResults?.bookings.map(b => (
                      <button key={b.id} onClick={() => handleNavigate('bookings', b.id)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-amber-500" />
                          <span className="text-[13px] font-black text-white">{b.guestFirstName} {b.guestLastName}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{b.bookingCode}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults?.guests.length! > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 px-3">Guests</p>
                    {searchResults?.guests.map(g => (
                      <button key={g.id} onClick={() => handleNavigate('guests', g.id)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                          <Users size={14} className="text-emerald-500" />
                          <span className="text-[13px] font-black text-white">{g.firstName} {g.lastName}</span>
                        </div>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{g.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationRef}>
          <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-xl border transition-all duration-300 relative shadow-sm ${showNotifications ? 'bg-brand-600 text-white border-brand-500 shadow-xl' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-950">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-3 w-96 bg-slate-900/98 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Actionable Queue</h3>
                 {unreadCount > 0 && (
                   <button onClick={() => markAllNotificationsRead()} className="text-[9px] text-brand-400 font-black uppercase tracking-dash hover:text-brand-300 transition-colors">Acknowledge All</button>
                 )}
              </div>
              <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {unreadCount === 0 ? (
                   <div className="py-12 text-center">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/5">
                        <CheckCircle size={24} className="text-slate-700 opacity-40" />
                      </div>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-dash italic">Operational queue is clear</p>
                   </div>
                 ) : (
                   unreadNotifications.map((n) => (
                     <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className="p-4 rounded-xl border border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/[0.08] transition-all cursor-pointer group relative overflow-hidden"
                     >
                        <div className="absolute top-4 left-0 w-1 h-4 bg-brand-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                        <div className="flex gap-3">
                           <div className={`p-2 rounded-lg h-fit ${
                             n.title.toLowerCase().includes('reservation') ? 'bg-emerald-500/10 text-emerald-500' :
                             n.title.toLowerCase().includes('payment') ? 'bg-amber-500/10 text-amber-500' :
                             n.title.toLowerCase().includes('error') ? 'bg-rose-500/10 text-rose-500' :
                             'bg-brand-500/10 text-brand-500'
                           }`}>
                             {n.title.toLowerCase().includes('reservation') ? <Calendar size={14}/> : 
                              n.title.toLowerCase().includes('payment') ? <CheckCircle size={14}/> :
                              <Info size={14}/>}
                           </div>
                           <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start gap-2">
                               <p className="text-[12px] font-black uppercase tracking-tight truncate text-white">{n.title}</p>
                               <span className="text-[8px] text-slate-600 font-black whitespace-nowrap mt-0.5">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                             </div>
                             <p className="text-[11px] leading-relaxed mt-1.5 font-medium whitespace-pre-line text-slate-400">{n.message}</p>
                             <div className="flex items-center gap-1.5 mt-3 text-brand-400">
                               <span className="text-[8px] font-black uppercase tracking-dash">Inspect Dossier</span>
                               <Check size={8}/>
                             </div>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
              {unreadCount > 0 && (
                <div className="p-3 border-t border-white/5 bg-slate-950/40 text-center">
                   <p className="text-[8px] text-slate-700 font-black uppercase tracking-[0.3em] italic">Moore Property Management Protocol v2.1</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-black text-white leading-tight">{currentUser?.name || 'Authorized Personnel'}</p>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-dash">{(currentUser?.role || 'staff').toUpperCase()}</p>
          </div>
          <img src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10" alt="" />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
