import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Bell, Bed, Users, Calendar, CheckCircle, 
  Info, Check, ShieldAlert, X, CreditCard, ShieldCheck,
  UserSquare, ClipboardList, History, ArrowRight
} from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { AppNotification } from '../types';
import { getStaffDisplayName } from '../lib/displayPrivacy';
import {
  buildGlobalSearchGroups,
  GlobalSearchKind,
  GlobalSearchResult,
} from '../lib/globalSearch';
import { isCheckoutOverdue } from '../lib/stayTime';

const SEARCH_ICONS: Record<GlobalSearchKind, React.ElementType> = {
  page: ArrowRight,
  room: Bed,
  booking: Calendar,
  guest: Users,
  payment: CreditCard,
  staff: ShieldCheck,
  client: UserSquare,
  activity: ClipboardList,
  notification: Bell,
  audit: History,
};

const SEARCH_ICON_STYLES: Record<GlobalSearchKind, string> = {
  page: 'bg-slate-500/10 text-slate-300',
  room: 'bg-blue-500/10 text-blue-400',
  booking: 'bg-amber-500/10 text-amber-400',
  guest: 'bg-emerald-500/10 text-emerald-400',
  payment: 'bg-violet-500/10 text-violet-400',
  staff: 'bg-sky-500/10 text-sky-400',
  client: 'bg-teal-500/10 text-teal-400',
  activity: 'bg-orange-500/10 text-orange-400',
  notification: 'bg-rose-500/10 text-rose-400',
  audit: 'bg-indigo-500/10 text-indigo-400',
};

const TopBar: React.FC = () => {
  const {
    currentUser, rooms, guests, bookings, staff, auditLogs, visitHistory, userRole,
    setActiveTab, setSelectedBookingId, setSelectedGuestId, setSelectedRoomId,
    setSelectedPaymentBookingId, setSelectedProfileId, setSelectedVisitRecordId,
    setSelectedAuditLogId,
    notifications, markAllNotificationsRead, markNotificationAsRead
  } = useHotel();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const resultItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Critical Tasks Logic (Overdue check-outs)
  const criticalTasksCount = useMemo(() => {
    return (bookings || []).filter(b => {
      if (String(b.status).toLowerCase() !== 'checkedin') return false;
      return isCheckoutOverdue(b.checkOut);
    }).length;
  }, [bookings]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowResults(true);
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

  const searchGroups = useMemo(() => buildGlobalSearchGroups({
    query: searchQuery,
    rooms: rooms || [],
    bookings: bookings || [],
    guests: guests || [],
    staff: staff || [],
    notifications: notifications || [],
    auditLogs: auditLogs || [],
    visitHistory: visitHistory || [],
    userRole,
  }), [searchQuery, rooms, bookings, guests, staff, notifications, auditLogs, visitHistory, userRole]);

  const flatSearchResults = useMemo(
    () => searchGroups.flatMap((group) => group.results),
    [searchGroups],
  );

  const resultIndexes = useMemo(() => {
    const indexes = new Map<string, number>();
    flatSearchResults.forEach((result, index) => indexes.set(result.key, index));
    return indexes;
  }, [flatSearchResults]);

  useEffect(() => {
    setActiveSearchIndex(0);
    resultItemRefs.current = [];
  }, [searchQuery]);

  useEffect(() => {
    if (!showResults) return;
    resultItemRefs.current[activeSearchIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeSearchIndex, showResults]);

  const resetSearchTargets = () => {
    setSelectedBookingId(null);
    setSelectedGuestId(null);
    setSelectedRoomId(null);
    setSelectedPaymentBookingId(null);
    setSelectedProfileId(null);
    setSelectedVisitRecordId(null);
    setSelectedAuditLogId(null);
  };

  const closeSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setActiveSearchIndex(0);
  };

  const handleSearchSelection = async (result: GlobalSearchResult) => {
    resetSearchTargets();

    if (result.kind === 'booking' && result.targetId) setSelectedBookingId(result.targetId);
    if (result.kind === 'guest' && result.targetId) setSelectedGuestId(result.targetId);
    if (result.kind === 'room' && result.targetId) setSelectedRoomId(result.targetId);
    if (result.kind === 'payment' && result.targetId) setSelectedPaymentBookingId(result.targetId);
    if ((result.kind === 'staff' || result.kind === 'client') && result.targetId) setSelectedProfileId(result.targetId);
    if (result.kind === 'activity' && result.targetId) setSelectedVisitRecordId(result.targetId);
    if (result.kind === 'audit' && result.targetId) setSelectedAuditLogId(result.targetId);

    if (result.kind === 'notification') {
      const notification = notifications.find((item) => item.id === result.key.replace('notification-', ''));
      if (notification && !notification.isRead) await markNotificationAsRead(notification.id);
      if (result.tab === 'bookings' && result.targetId) setSelectedBookingId(result.targetId);
    }

    setActiveTab(result.tab);
    closeSearch();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setShowResults(false);
      return;
    }
    if (flatSearchResults.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setShowResults(true);
      setActiveSearchIndex((index) => Math.min(index + 1, flatSearchResults.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSearchIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      void handleSearchSelection(flatSearchResults[activeSearchIndex] || flatSearchResults[0]);
    }
  };

  const handleNavigate = (tab: string, id?: string) => {
    resetSearchTargets();
    if (tab === 'bookings' && id) setSelectedBookingId(id);
    if (tab === 'guests' && id) setSelectedGuestId(id);
    if (tab === 'rooms' && id) setSelectedRoomId(id);
    setActiveTab(tab);
    closeSearch();
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead) {
      await markNotificationAsRead(n.id);
    }
    
    if (n.bookingCode) {
      const booking = (bookings || []).find(b => b.bookingCode === n.bookingCode);
      if (booking) {
        handleNavigate('bookings', booking.id);
      } else {
        setActiveTab('bookings');
      }
    } else if (n.title.toLowerCase().includes('settlement')) {
      setActiveTab('settlements');
    }
    
    setShowNotifications(false);
  };

  const unreadNotifications = useMemo(() => 
    (notifications || []).filter(n => !n.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), 
    [notifications]
  );

  const unreadCount = unreadNotifications.length;
  const currentUserDisplayName = getStaffDisplayName(
    currentUser?.name,
    currentUser?.role ? `Hotel ${String(currentUser.role).toLowerCase()}` : 'Hotel staff',
  );

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-slate-900/60 px-3 backdrop-blur-xl sm:h-20 sm:px-6">
      <div className="relative w-full max-w-2xl">
        <div className="relative group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${searchQuery ? 'text-brand-500' : 'text-slate-500'}`} size={16} />
          <input
            ref={searchInputRef}
            type="search"
            role="combobox"
            aria-label="Search all hotel data"
            aria-autocomplete="list"
            aria-expanded={showResults && searchQuery.trim().length >= 2}
            aria-controls="global-search-results"
            aria-activedescendant={showResults && flatSearchResults.length > 0 ? `global-search-option-${activeSearchIndex}` : undefined}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search rooms, guests, bookings, payments..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-slate-950/60 border border-white/10 rounded-2xl py-3 pl-11 pr-12 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-brand-500/50 focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/5 shadow-inner [appearance:textfield] [&::-webkit-search-cancel-button]:hidden"
          />
          {searchQuery ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={closeSearch}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={16} />
            </button>
          ) : (
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black text-slate-600 lg:block">⌘ K</span>
          )}
        </div>

        {showResults && searchQuery.trim().length >= 2 && (
          <div
            ref={resultsRef}
            id="global-search-results"
            className="fixed left-3 right-3 top-16 z-[160] mt-2 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/98 shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top-2 sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-3 sm:w-[min(42rem,calc(100vw-5rem))]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/5 bg-slate-950/55 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white">Search all hotel data</p>
                <p className="mt-0.5 text-[9px] font-bold text-slate-600">Results are limited by your access level.</p>
              </div>
              <span className="shrink-0 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[9px] font-black text-slate-500">{flatSearchResults.length} found</span>
            </div>

            {flatSearchResults.length === 0 ? (
              <div className="p-10 text-center">
                <Search size={24} className="mx-auto mb-3 text-slate-700" />
                <p className="text-[11px] font-black uppercase tracking-dash text-slate-500">No matching hotel data</p>
                <p className="mt-2 text-[10px] font-medium text-slate-700">Try a guest name, room, date, status, phone, email, amount, or reference.</p>
              </div>
            ) : (
              <div role="listbox" aria-label="Global search results" className="scroll-pane max-h-[min(68vh,34rem)] overflow-y-auto p-2">
                {searchGroups.map((group) => (
                  <section key={group.kind} aria-label={group.label} className="mb-2 last:mb-0">
                    <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">{group.label}</p>
                      <span className="text-[8px] font-black text-slate-700">{group.results.length}</span>
                    </div>
                    <div className="space-y-1">
                      {group.results.map((result) => {
                        const index = resultIndexes.get(result.key) ?? 0;
                        const Icon = SEARCH_ICONS[result.kind];
                        const isActive = index === activeSearchIndex;
                        return (
                          <button
                            key={result.key}
                            ref={(node) => { resultItemRefs.current[index] = node; }}
                            id={`global-search-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onMouseEnter={() => setActiveSearchIndex(index)}
                            onClick={() => void handleSearchSelection(result)}
                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${isActive ? 'border-brand-500/20 bg-brand-500/10' : 'border-transparent hover:bg-white/[0.045]'}`}
                          >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${SEARCH_ICON_STYLES[result.kind]}`}>
                              <Icon size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] font-black text-white">{result.title}</span>
                              <span className="mt-0.5 block break-words text-[10px] font-medium leading-4 text-slate-500">{result.description}</span>
                            </span>
                            {result.meta && <span className="max-w-28 shrink-0 truncate text-right text-[8px] font-black uppercase tracking-wider text-slate-600">{result.meta}</span>}
                            <ArrowRight size={14} className={`shrink-0 transition-transform ${isActive ? 'translate-x-0 text-brand-400' : '-translate-x-1 text-slate-700'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}

            <div className="hidden items-center gap-4 border-t border-white/5 bg-slate-950/55 px-4 py-2.5 text-[8px] font-bold text-slate-700 sm:flex">
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>Esc Close</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {/* Critical Overdue Alerts */}
        {criticalTasksCount > 0 && (
          <button 
            onClick={() => setActiveTab('guests')}
            className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 hover:bg-rose-500/20 transition-all animate-pulse shadow-lg shadow-rose-950/20"
          >
            <ShieldAlert size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden lg:inline">{criticalTasksCount} Overdue</span>
          </button>
        )}

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
            <div className="fixed left-3 right-3 top-16 mt-2 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96 bg-slate-900/98 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                 <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Notifications</h3>
                 {unreadCount > 0 && (
                   <button onClick={() => markAllNotificationsRead()} className="text-[9px] text-brand-400 font-black uppercase tracking-dash hover:text-brand-300 transition-colors">Clear All</button>
                 )}
              </div>
              <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {unreadCount === 0 ? (
                   <div className="py-12 text-center">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/5">
                        <CheckCircle size={24} className="text-slate-700 opacity-40" />
                      </div>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-dash">No notifications</p>
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
                             n.title.toLowerCase().includes('reservation') ? 'bg-emerald-500/10 text-emerald-400' :
                             n.title.toLowerCase().includes('payment') ? 'bg-amber-500/10 text-amber-400' :
                             n.title.toLowerCase().includes('error') ? 'bg-rose-500/10 text-rose-400' :
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
                               <span className="text-[8px] font-black uppercase tracking-dash">View Details</span>
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
                    <p className="text-[8px] text-slate-700 font-black uppercase tracking-[0.3em]">Moore Hotel Management</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden min-[420px]:flex items-center gap-3 pl-2 sm:pl-4 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-black text-white leading-tight">{currentUserDisplayName}</p>
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-dash">{(currentUser?.role || 'staff').toUpperCase()}</p>
          </div>
          <img src={currentUser?.avatarUrl || '/avatar-placeholder.svg'} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10" alt="" />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
