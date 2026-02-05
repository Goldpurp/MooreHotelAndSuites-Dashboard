
import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { VisitAction, VisitRecord } from '../types';
import { 
  Search, Clock, User, Bed, ShieldCheck, 
  Calendar, Zap, LogOut, Filter, Printer, 
  ArrowRight, ClipboardList, RefreshCw, Hash, FileDown,
  ShieldAlert, Activity, ChevronLeft, ChevronRight,
  Database, Info, UserCheck, Layers, Eye, X, Fingerprint, Code
} from 'lucide-react';

const OperationLog: React.FC = () => {
  const { visitHistory, refreshData } = useHotel();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inspectingRecord, setInspectingRecord] = useState<VisitRecord | null>(null);
  
  const [localSearch, setLocalSearch] = useState('');
  const [activeProtocol, setActiveProtocol] = useState<'All' | VisitAction>('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [localSearch, activeProtocol]);

  /**
   * REFINED SEARCH & FILTER ENGINE
   * Strictly filters the ledger based on selected protocol and user query.
   */
  const filteredLogs = useMemo(() => {
    const query = localSearch.toLowerCase().trim();
    const history = visitHistory || [];
    
    return history.filter(log => {
      if (!log) return false;
      
      const matchesSearch = 
        (log.guestName || '').toLowerCase().includes(query) ||
        (log.bookingCode || '').toLowerCase().includes(query) ||
        (log.roomNumber || '').toLowerCase().includes(query) ||
        (log.authorizedBy || '').toLowerCase().includes(query);
      
      // Strict equality check with canonical Enum values
      const matchesProtocol = activeProtocol === 'All' || log.action === activeProtocol;
      
      return matchesSearch && matchesProtocol;
    }).sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
  }, [visitHistory, localSearch, activeProtocol]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  /**
   * ROLLING 24H WINDOW STATISTICAL ENGINE
   * Uses precise UTC-to-Local conversion to ensure "Today's" throughput is accurate 
   * within a sliding 24-hour window from the current execution moment.
   */
  const stats = useMemo(() => {
    const now = Date.now();
    const window24h = 24 * 60 * 60 * 1000;
    const history = visitHistory || [];
    
    const windowLogs = history.filter(l => {
      if (!l.timestamp) return false;
      const ts = new Date(l.timestamp).getTime();
      // Ensure the timestamp is valid and within the last 24 hours
      return !isNaN(ts) && (now - ts) >= 0 && (now - ts) < window24h;
    });
    
    return {
      checkIns: windowLogs.filter(l => l.action === VisitAction.CHECK_IN).length,
      checkOuts: windowLogs.filter(l => l.action === VisitAction.CHECK_OUT).length,
      reservations: windowLogs.filter(l => l.action === VisitAction.RESERVATION).length,
      voids: windowLogs.filter(l => l.action === VisitAction.VOID).length,
      total: history.length
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
          label: 'Authorized Entry', 
          classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
          icon: <Zap size={10} strokeWidth={3} className="fill-emerald-400" />
        };
      case VisitAction.CHECK_OUT:
        return { 
          label: 'Authorized Exit', 
          classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
          icon: <LogOut size={10} strokeWidth={3} />
        };
      case VisitAction.RESERVATION:
        return { 
          label: 'Dossier Opened', 
          classes: 'bg-blue-600/10 text-blue-400 border-blue-600/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]',
          icon: <Calendar size={10} strokeWidth={3} />
        };
      case VisitAction.VOID:
        return { 
          label: 'Dossier Voided', 
          classes: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
          icon: <ShieldAlert size={10} strokeWidth={3} />
        };
      default:
        return { 
          label: 'General Protocol', 
          classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          icon: <ClipboardList size={10} strokeWidth={3} />
        };
    }
  };

  const getTabLabel = (action: string) => {
    if (action === 'All') return 'Complete Ledger';
    if (action === VisitAction.CHECK_IN) return 'Check-In';
    if (action === VisitAction.CHECK_OUT) return 'Check-Out';
    if (action === VisitAction.RESERVATION) return 'Reservation';
    if (action === VisitAction.VOID) return 'Voided';
    return action;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-[2px] bg-brand-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"></span>
            <div className="flex items-center gap-2">
               <p className="text-[10px] text-brand-400 font-black uppercase tracking-[0.25em]">Forensic Trace Ledger</p>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]"></div>
               <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest italic">Node Healthy</span>
            </div>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight uppercase italic leading-none">Operations Log</h2>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest italic mt-2">Real-time Asset movement Audit Trail v8.4 — API Node v1.2</p>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={handleManualRefresh}
             className={`p-3.5 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl hover:shadow-brand-500/10 active:scale-95 ${isRefreshing ? 'animate-spin' : ''}`}
           >
             <RefreshCw size={20} />
           </button>
           <button className="bg-brand-600 hover:bg-brand-700 text-white px-7 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-3xl shadow-brand-950/40 active:scale-95 italic">
             <FileDown size={18} /> Export CSV Audit
           </button>
        </div>
      </div>

      {/* ROLLING 24H WINDOW STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Rolling Check-ins', value: stats.checkIns, color: 'text-emerald-400', icon: Zap, sub: 'Authorized Entry' },
          { label: 'Rolling Check-outs', value: stats.checkOuts, color: 'text-amber-400', icon: LogOut, sub: 'Authorized Exit' },
          { label: 'New Reserv.', value: stats.reservations, color: 'text-blue-400', icon: Calendar, sub: 'Dossier Opens' },
          { label: 'Active Voids', value: stats.voids, color: 'text-rose-400', icon: ShieldAlert, sub: 'Protocol Revokes' },
          { label: 'Ledger Depth', value: stats.total, color: 'text-white', icon: Database, sub: 'Full Audit Trail' }
        ].map(stat => (
          <div key={stat.label} className="glass-card p-5 rounded-[2rem] border border-white/5 shadow-2xl flex flex-col justify-between relative overflow-hidden group bg-slate-950/40">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon size={80} />
             </div>
             <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-slate-900 rounded-xl border border-white/10">
                   <stat.icon size={16} className={stat.color} />
                </div>
                <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Rolling 24H</span>
             </div>
             <div>
                <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-0.5">{stat.label}</span>
                <div className="flex items-baseline gap-2">
                   <h4 className={`text-2xl font-black italic ${stat.color}`}>{stat.value}</h4>
                   <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">{stat.sub}</span>
                </div>
             </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden shadow-3xl bg-slate-900/10 backdrop-blur-3xl">
        <div className="px-8 py-6 border-b border-white/5 flex flex-wrap items-center justify-between gap-6 bg-slate-950/60">
           <div className="relative w-full md:w-[450px] group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search Identity, Asset ID or Folio Code..." 
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-black/60 border border-white/5 rounded-2xl py-4.5 pl-14 pr-6 text-[13px] text-slate-200 outline-none focus:bg-slate-950 focus:border-brand-500/30 transition-all font-black uppercase tracking-tight placeholder:text-slate-700"
              />
           </div>

           <div className="flex items-center gap-1.5 p-1.5 bg-black/40 rounded-2xl border border-white/5 overflow-x-auto custom-scrollbar">
              {(['All', VisitAction.RESERVATION, VisitAction.CHECK_IN, VisitAction.CHECK_OUT, VisitAction.VOID] as const).map((p) => (
                <button 
                  key={p}
                  onClick={() => setActiveProtocol(p)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeProtocol === p 
                    ? 'bg-brand-600 text-white shadow-2xl shadow-brand-600/20' 
                    : 'text-slate-600 hover:text-slate-300'
                  }`}
                >
                  {getTabLabel(p)}
                </button>
              ))}
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-600 text-[10px] font-black uppercase tracking-[0.25em] bg-slate-950/40">
                <th className="px-10 py-6">Trace Timestamp</th>
                <th className="px-10 py-6">Occupant / Resident</th>
                <th className="px-10 py-6 text-center">Protocol Action</th>
                <th className="px-10 py-6">Asset Resource</th>
                <th className="px-10 py-6 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-56 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                       <Layers size={64} className="text-slate-700" />
                       <p className="text-[15px] font-black uppercase tracking-[0.5em] text-slate-600 italic">No operational telemetry found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setInspectingRecord(log)}
                      className="hover:bg-brand-500/[0.04] transition-all group border-l-4 border-transparent hover:border-brand-500 cursor-pointer"
                    >
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-5">
                          <div className="p-3 bg-black/60 rounded-2xl text-slate-600 border border-white/5 group-hover:text-brand-400 group-hover:border-brand-500/20 transition-all">
                            <Clock size={18} />
                          </div>
                          <div>
                            <p className="text-[16px] font-black text-white italic tracking-tight">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            <p className="text-[10px] text-slate-600 font-black uppercase mt-1 tracking-widest">{new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 group-hover:text-white transition-all`}>
                               <User size={18}/>
                            </div>
                            <div>
                               <p className="text-[16px] font-black text-slate-100 uppercase tracking-tighter group-hover:text-brand-400 transition-colors italic">{log.guestName || 'Anonymous Resident'}</p>
                               <div className="flex items-center gap-1.5 mt-1">
                                  <Hash size={10} className="text-slate-700"/>
                                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-dash">{log.bookingCode || 'SYS-TRCE'}</p>
                               </div>
                            </div>
                         </div>
                      </td>
                      <td className="px-10 py-7">
                         <div className="flex justify-center">
                            <span className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border flex items-center gap-2.5 w-fit transition-all ${badge.classes}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                         </div>
                      </td>
                      <td className="px-10 py-7">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 text-slate-600 group-hover:text-brand-500 group-hover:border-brand-500/20 transition-all shadow-inner">
                               <Bed size={18} />
                            </div>
                            <div>
                               <p className="text-[16px] font-black text-white tracking-tighter uppercase italic">Room {log.roomNumber || '---'}</p>
                               <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest mt-1">Physical Asset Unit</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-10 py-7 text-right">
                         <div className="flex items-center justify-end gap-4">
                            <div>
                                <div className="flex items-center justify-end gap-2 mb-1">
                                  <UserCheck size={12} className="text-emerald-500"/>
                                  <p className="text-[14px] font-black text-slate-400 italic tracking-tight">{log.authorizedBy || 'System Protocol'}</p>
                                </div>
                                <p className="text-[9px] text-slate-800 font-black uppercase tracking-widest">Verification Confirmed</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 text-slate-600 group-hover:text-brand-400 transition-all border border-transparent group-hover:border-white/10">
                               <Eye size={16} />
                            </div>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-10 py-8 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <ShieldCheck size={20} className="text-brand-500" />
              <div>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.35em] italic">Moore Global Operations Ledger</p>
                <p className="text-[8px] text-slate-700 font-bold uppercase tracking-widest mt-0.5">Showing index {Math.min(filteredLogs.length, (currentPage-1)*PAGE_SIZE + 1)} — {Math.min(filteredLogs.length, currentPage*PAGE_SIZE)} of {filteredLogs.length}</p>
              </div>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-4 border border-white/10 rounded-2xl text-slate-600 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all bg-white/5 hover:bg-white/10"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center px-8 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[12px] font-black text-white tracking-widest uppercase">{currentPage} / {totalPages || 1}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-4 border border-white/10 rounded-2xl text-slate-600 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all bg-white/5 hover:bg-white/10"
              >
                <ChevronRight size={20} />
              </button>
           </div>
        </div>
      </div>

      {/* Protocol Object Inspector Modal */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="w-full max-w-2xl bg-[#0a0f1d] border border-white/10 rounded-[3rem] shadow-3xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-600/10 rounded-2xl border border-brand-500/20 text-brand-400">
                       <Code size={24} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Protocol Inspector</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Asset Entry Trace • Reference: {inspectingRecord.id.slice(0,12)}</p>
                    </div>
                 </div>
                 <button onClick={() => setInspectingRecord(null)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl transition-all border border-white/5 active:scale-90"><X size={20}/></button>
              </div>

              <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                       <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Fingerprint size={12}/> Resident Data</p>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-[11px]">
                             <span className="text-slate-500 font-bold uppercase">Identity</span>
                             <span className="text-white font-black uppercase">{inspectingRecord.guestName}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] pt-3 border-t border-white/5">
                             <span className="text-slate-500 font-bold uppercase">Folio Code</span>
                             <span className="text-brand-400 font-black uppercase tracking-widest italic">{inspectingRecord.bookingCode}</span>
                          </div>
                       </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                       <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={12}/> Protocol Meta</p>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-[11px]">
                             <span className="text-slate-500 font-bold uppercase">Action</span>
                             <span className="text-emerald-400 font-black uppercase italic tracking-widest">{inspectingRecord.action}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] pt-3 border-t border-white/5">
                             <span className="text-slate-500 font-bold uppercase">Personnel</span>
                             <span className="text-white font-black uppercase">{inspectingRecord.authorizedBy}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                       <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">Raw Visit Payload</h4>
                       <span className="text-[9px] text-brand-500 font-mono font-black">NODE_REF: {inspectingRecord.id}</span>
                    </div>
                    <div className="bg-[#05080f] rounded-[2rem] border border-white/5 p-8 font-mono text-[12px] text-brand-100 leading-relaxed overflow-auto custom-scrollbar shadow-inner">
                       <pre className="whitespace-pre-wrap">{JSON.stringify(inspectingRecord, null, 2)}</pre>
                    </div>
                 </div>
              </div>

              <div className="px-10 py-8 bg-slate-950/60 border-t border-white/5 flex justify-end">
                 <button onClick={() => setInspectingRecord(null)} className="px-12 py-4 bg-brand-600 hover:bg-brand-700 text-white font-black text-[12px] uppercase tracking-widest rounded-2xl shadow-2xl transition-all active:scale-95 italic">
                    Close Trace
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OperationLog;
