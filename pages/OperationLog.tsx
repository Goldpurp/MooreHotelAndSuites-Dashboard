
import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { VisitAction } from '../types';
import { 
  Search, Clock, User, Bed, ShieldCheck, 
  Calendar, Zap, LogOut, Filter, Printer, 
  ArrowRight, ClipboardList, RefreshCw, Hash, FileDown,
  ShieldAlert, Activity, ChevronLeft, ChevronRight
} from 'lucide-react';

const OperationLog: React.FC = () => {
  const { visitHistory, refreshData } = useHotel();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [localSearch, setLocalSearch] = useState('');
  const [activeProtocol, setActiveProtocol] = useState<'All' | VisitAction>('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [localSearch, activeProtocol]);

  const filteredLogs = useMemo(() => {
    const query = localSearch.toLowerCase().trim();
    return (visitHistory || []).filter(log => {
      const matchesSearch = 
        log.guestName.toLowerCase().includes(query) ||
        log.bookingCode.toLowerCase().includes(query) ||
        log.roomNumber.toLowerCase().includes(query) ||
        log.authorizedBy.toLowerCase().includes(query);
      
      const matchesProtocol = activeProtocol === 'All' || log.action === activeProtocol;
      
      return matchesSearch && matchesProtocol;
    });
  }, [visitHistory, localSearch, activeProtocol]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      checkIns: (visitHistory || []).filter(l => l.action === VisitAction.CHECK_IN && new Date(l.timestamp).toDateString() === today).length,
      checkOuts: (visitHistory || []).filter(l => l.action === VisitAction.CHECK_OUT && new Date(l.timestamp).toDateString() === today).length,
      total: (visitHistory || []).length
    };
  }, [visitHistory]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const getActionBadge = (action: VisitAction) => {
    switch (action) {
      case VisitAction.CHECK_IN:
        return { 
          label: 'Checked In', 
          classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
          icon: <Zap size={10} strokeWidth={3} />
        };
      case VisitAction.CHECK_OUT:
        return { 
          label: 'Checked Out', 
          classes: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
          icon: <LogOut size={10} strokeWidth={3} />
        };
      case VisitAction.RESERVATION:
        return { 
          label: 'Reservation', 
          classes: 'bg-blue-600/15 text-blue-400 border-blue-600/20',
          icon: <Calendar size={10} strokeWidth={3} />
        };
      case VisitAction.VOID:
        return { 
          label: 'Voided', 
          classes: 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
          icon: <ShieldAlert size={10} strokeWidth={3} />
        };
      default:
        return { 
          label: 'Activity', 
          classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: <ClipboardList size={10} strokeWidth={3} />
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Property Flow Analytics</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Operations Ledger</h2>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Real-time asset movement and guest cycle audit</p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={handleManualRefresh}
             className={`p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}
           >
             <RefreshCw size={18} />
           </button>
           <button className="bg-white/5 border border-white/5 text-slate-500 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-2">
             <Printer size={16} /> Print Records
           </button>
           <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-blue-500/20 active:scale-95">
             <FileDown size={16} /> Export Audit
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Check-Ins Today', value: stats.checkIns, color: 'text-emerald-400', icon: Zap },
          { label: 'Check-Outs Today', value: stats.checkOuts, color: 'text-amber-400', icon: LogOut },
          { label: 'Historical Trace', value: stats.total, color: 'text-white', icon: Activity },
          { label: 'Audit Health', value: '100%', color: 'text-blue-400', icon: ShieldCheck }
        ].map(stat => (
          <div key={stat.label} className="glass-card p-6 rounded-2xl border border-white/5 shadow-lg flex items-center justify-between">
             <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                <h4 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h4>
             </div>
             <stat.icon className={`opacity-10 ${stat.color}`} size={28} />
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-3xl bg-slate-900/20 backdrop-blur-xl">
        <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
           <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                type="text" 
                placeholder="Search Guest, Room or Code..." 
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-11 pr-4 text-[12px] text-slate-300 outline-none focus:bg-slate-900 focus:border-blue-500/30 transition-all placeholder:text-slate-700 font-bold"
              />
           </div>

           <div className="flex items-center gap-1.5 p-1.5 bg-black/40 rounded-xl border border-white/5">
              {(['All', VisitAction.RESERVATION, VisitAction.CHECK_IN, VisitAction.CHECK_OUT, VisitAction.VOID] as const).map((p) => (
                <button 
                  key={p}
                  onClick={() => setActiveProtocol(p)}
                  className={`px-4 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeProtocol === p 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/10' 
                    : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {p === 'All' ? 'System Full' : p.replace(' Made', '').replace('Dossier ', '')}
                </button>
              ))}
           </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 border-b border-white/10">
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Audit Timestamp</th>
                <th className="px-8 py-5">Occupant Dossier</th>
                <th className="px-8 py-5 text-center">Protocol Action</th>
                <th className="px-8 py-5">Allocated Asset</th>
                <th className="px-8 py-5 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center opacity-20">
                    <ClipboardList size={56} className="mx-auto mb-6 text-slate-700" />
                    <p className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-500 italic">No operational data recorded</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-blue-600/5 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-black/40 rounded-xl text-slate-600 border border-white/5">
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-[14px] font-black text-white italic">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-[9px] text-slate-600 font-black uppercase mt-0.5 tracking-widest">{new Date(log.timestamp).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div>
                            <p className="text-[15px] font-black text-slate-200 uppercase tracking-tight group-hover:text-blue-400 transition-colors italic">{log.guestName}</p>
                            <p className="text-[9px] text-slate-600 font-black uppercase tracking-dash mt-0.5">Ref: {log.bookingCode}</p>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex justify-center">
                            <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit transition-all ${badge.classes}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-slate-500 group-hover:text-white transition-all shadow-inner">
                               <Bed size={16} />
                            </div>
                            <div>
                               <p className="text-[14px] font-black text-slate-300">Room {log.roomNumber}</p>
                               <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Asset Unit</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div>
                            <p className="text-[13px] font-black text-slate-400 italic">{log.authorizedBy}</p>
                            <p className="text-[8px] text-emerald-500/50 font-black uppercase tracking-dash mt-0.5">Verification Confirmed</p>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-5 bg-slate-950/60 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <ShieldCheck size={14} className="text-blue-500" />
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] italic">Moore Hotels Ledger Protocol • Showing {paginatedLogs.length} of {filteredLogs.length}</p>
           </div>
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
  );
};

export default OperationLog;
