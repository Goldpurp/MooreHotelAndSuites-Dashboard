import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { VisitAction, VisitRecord } from '../types';
import { 
  Search, Clock, User, Bed, ShieldCheck, 
  Calendar, Zap, LogOut, RefreshCw, ChevronLeft, ChevronRight,
  Database, Eye, X, Fingerprint, Code, FileDown
} from 'lucide-react';

const OperationLog: React.FC = () => {
  const { visitHistory, refreshData } = useHotel();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inspectingRecord, setInspectingRecord] = useState<VisitRecord | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [activeProtocol, setActiveProtocol] = useState<'All' | VisitAction>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => { setCurrentPage(1); }, [localSearch, activeProtocol]);

  const filteredLogs = useMemo(() => {
    const q = localSearch.toLowerCase().trim();
    return (visitHistory || [])
      .filter(log => {
        if (!log) return false;
        const matchesSearch = (log.guestName || '').toLowerCase().includes(q) || (log.bookingCode || '').toLowerCase().includes(q) || (log.roomNumber || '').toLowerCase().includes(q) || (log.authorizedBy || '').toLowerCase().includes(q);
        const matchesProtocol = activeProtocol === 'All' || log.action === activeProtocol;
        return matchesSearch && matchesProtocol;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [visitHistory, localSearch, activeProtocol]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  const handleManualRefresh = async () => { setIsRefreshing(true); await refreshData(); setTimeout(() => setIsRefreshing(false), 800); };

  const getActionBadge = (action: VisitAction) => {
    switch (action) {
      case VisitAction.CHECK_IN: return { label: 'Arrival', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <Zap size={10} fill="currentColor" /> };
      case VisitAction.CHECK_OUT: return { label: 'Departure', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <LogOut size={10} /> };
      case VisitAction.RESERVATION: return { label: 'New Folio', classes: 'bg-blue-600/10 text-blue-400 border-blue-600/20', icon: <Calendar size={10} /> };
      case VisitAction.VOID: return { label: 'Voided', classes: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <X size={10} /> };
      default: return { label: 'Standard', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: <Clock size={10} /> };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-[2px] bg-brand-500 rounded-full"></span>
            <p className="adaptive-text-xs text-brand-400 font-black uppercase tracking-widest leading-none">Security Audit Trail</p>
          </div>
          <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase italic leading-none">Operational Log</h2>
        </div>
        <div className="flex gap-2">
           <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>
           <button className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl adaptive-text-xs font-black uppercase flex items-center gap-2 shadow-lg italic whitespace-nowrap"><FileDown size={18} /> Export Data</button>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-[600px] shadow-2xl bg-slate-900/10 backdrop-blur-3xl">
        <div className="px-6 py-4 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-950/60">
           <div className="relative w-full md:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input type="text" placeholder="Lookup Guest or Folio..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 adaptive-text-xs text-white outline-none font-medium" />
           </div>
           <div className="flex items-center gap-1.5 p-1.5 bg-black/40 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
              {(['All', VisitAction.RESERVATION, VisitAction.CHECK_IN, VisitAction.CHECK_OUT, VisitAction.VOID] as const).map((p) => (
                <button key={p} onClick={() => setActiveProtocol(p)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeProtocol === p ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>{p === 'All' ? 'FULL TRAIL' : p.toUpperCase()}</button>
              ))}
           </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-slate-600 text-[10px] font-black uppercase tracking-widest bg-slate-950/40 border-b border-white/5">
                <th className="responsive-table-padding">Log Timestamp</th>
                <th className="responsive-table-padding">Guest Identity</th>
                <th className="responsive-table-padding text-center">Status Action</th>
                <th className="responsive-table-padding hide-on-tablet">Physical Room</th>
                <th className="responsive-table-padding text-right">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLogs.length === 0 ? (
                <tr><td colSpan={5} className="py-48 text-center text-slate-700 adaptive-text-sm font-black uppercase italic tracking-widest">No telemetry found</td></tr>
              ) : (
                paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} onClick={() => setInspectingRecord(log)} className="hover:bg-brand-500/[0.02] transition-all group border-l-4 border-transparent hover:border-brand-500 cursor-pointer">
                      <td className="responsive-table-padding">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-black/60 rounded-xl border border-white/5 text-slate-700 shrink-0"><Clock size={16} /></div>
                          <div>
                            <p className="adaptive-text-sm font-black text-white italic leading-none mb-1.5">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(log.timestamp).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="responsive-table-padding">
                        <div className="min-w-0">
                           <p className="adaptive-text-sm font-black text-white uppercase italic truncate leading-none mb-1.5">{log.guestName || 'Internal Act'}</p>
                           <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Ref: {log.bookingCode || 'SYS-ACT'}</p>
                        </div>
                      </td>
                      <td className="responsive-table-padding">
                         <div className="flex justify-center">
                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${badge.classes}`}>{badge.icon} {badge.label}</span>
                         </div>
                      </td>
                      <td className="responsive-table-padding hide-on-tablet">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-slate-700 shrink-0"><Bed size={16} /></div>
                            <div>
                               <p className="adaptive-text-sm font-black text-white italic leading-none mb-1.5">Unit {log.roomNumber || '---'}</p>
                               <p className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">Room Allocation</p>
                            </div>
                         </div>
                      </td>
                      <td className="responsive-table-padding text-right">
                         <div className="min-w-0">
                            <p className="adaptive-text-sm font-black text-slate-300 italic uppercase truncate leading-none mb-1.5">{log.authorizedBy || 'System'}</p>
                            <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest italic">Authorized Session</p>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
           <div className="text-[10px] text-slate-600 font-black uppercase italic tracking-widest">Integrity Active • {filteredLogs.length} Records</div>
           <div className="flex gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={18} /></button>
              <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[11px] font-black text-white">{currentPage} / {totalPages || 1}</span></div>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={18} /></button>
           </div>
        </div>
      </div>

      {inspectingRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-[#020617]/95 backdrop-blur-md animate-in fade-in duration-500 overflow-hidden">
           <div className="w-full max-w-2xl bg-[#0a0f1d] border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] shadow-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">
              <div className="px-6 sm:px-10 py-4 sm:py-6 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                 <h3 className="text-base sm:adaptive-text-xl font-black text-white uppercase italic leading-none">Dossier Inspector</h3>
                 <button onClick={() => setInspectingRecord(null)} className="p-2 hover:bg-white/10 text-slate-500 rounded-xl transition-all active:scale-90"><X size={20}/></button>
              </div>
              <div className="p-6 sm:p-10 overflow-y-auto space-y-6 sm:space-y-8 flex-1 custom-scrollbar">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-3xl border border-white/5 space-y-1"><p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Personnel</p><p className="adaptive-text-base font-black text-brand-400 italic uppercase">{inspectingRecord.authorizedBy}</p></div>
                    <div className="bg-white/5 p-4 sm:p-6 rounded-xl sm:rounded-3xl border border-white/5 space-y-1"><p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Context</p><p className="adaptive-text-base font-black text-white italic uppercase truncate">{inspectingRecord.guestName}</p></div>
                 </div>
                 <div className="bg-[#05080f] rounded-xl sm:rounded-3xl border border-white/5 p-4 sm:p-10 font-mono text-[10px] sm:text-[11px] text-slate-400 leading-relaxed shadow-inner overflow-auto"><pre className="whitespace-pre-wrap break-all">{JSON.stringify(inspectingRecord, null, 2)}</pre></div>
              </div>
              <div className="px-6 sm:px-10 py-4 sm:py-6 bg-slate-950/60 border-t border-white/5 flex justify-end">
                 <button onClick={() => setInspectingRecord(null)} className="px-8 sm:px-10 py-2 sm:py-3 bg-brand-600 hover:bg-brand-700 text-white font-black text-[11px] sm:text-[12px] uppercase tracking-widest rounded-xl shadow-xl transition-all active:scale-95 italic">Acknowledge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OperationLog;