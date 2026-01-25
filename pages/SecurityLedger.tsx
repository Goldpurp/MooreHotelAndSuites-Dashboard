
import React, { useState, useMemo } from 'react';
import { useHotel } from '../store/HotelContext';
import { VisitAction } from '../types';
import { 
  ShieldAlert, Search, Download, Printer, Filter, 
  Calendar, User, Bed, Clock, Hash, ChevronLeft, ChevronRight,
  ShieldCheck, Info, Zap, LogOut
} from 'lucide-react';

const SecurityLedger: React.FC = () => {
  const { visitHistory } = useHotel();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('All Actions');

  const filteredHistory = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return visitHistory.filter(log => {
      const matchesSearch = 
        log.guestName.toLowerCase().includes(query) ||
        log.bookingCode.toLowerCase().includes(query) ||
        log.roomNumber.toLowerCase().includes(query) ||
        log.authorizedBy.toLowerCase().includes(query);
      
      const matchesAction = filterAction === 'All Actions' || log.action === filterAction;
      
      return matchesSearch && matchesAction;
    });
  }, [visitHistory, searchQuery, filterAction]);

  const getActionStyles = (action: VisitAction) => {
    switch (action) {
      case VisitAction.CHECK_IN:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
      case VisitAction.CHECK_OUT:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
      case VisitAction.RESERVATION:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
      case VisitAction.VOID:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getActionIcon = (action: VisitAction) => {
    switch (action) {
      case VisitAction.CHECK_IN: return <Zap size={12} />;
      case VisitAction.CHECK_OUT: return <LogOut size={12} />;
      case VisitAction.RESERVATION: return <Calendar size={12} />;
      case VisitAction.VOID: return <ShieldAlert size={12} />;
      default: return <Info size={12} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-emerald-500 rounded-full"></span>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em]">Live Security Protocol</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">Property Security Ledger</h2>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Visit History & Authorization Dossier</p>
        </div>
        <div className="flex gap-2">
           <button className="bg-white/5 border border-white/5 text-slate-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-dash hover:text-white transition-all">
             <Printer size={14} className="mr-2 inline" /> Print Dossier
           </button>
           <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-emerald-500/20 active:scale-95">
             <Download size={16}/> Export Security Logs
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between">
           <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Today's In-Flow</p>
              <h4 className="text-2xl font-black text-white">{visitHistory.filter(v => v.action === VisitAction.CHECK_IN && new Date(v.timestamp).toDateString() === new Date().toDateString()).length}</h4>
           </div>
           <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
              <Zap size={20} />
           </div>
        </div>
        <div className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between">
           <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Today's Out-Flow</p>
              <h4 className="text-2xl font-black text-white">{visitHistory.filter(v => v.action === VisitAction.CHECK_OUT && new Date(v.timestamp).toDateString() === new Date().toDateString()).length}</h4>
           </div>
           <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-400">
              <LogOut size={20} />
           </div>
        </div>
        <div className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between">
           <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Authorized Acts</p>
              <h4 className="text-2xl font-black text-blue-400">{visitHistory.length}</h4>
           </div>
           <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
              <ShieldCheck size={20} />
           </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl flex flex-col overflow-hidden border border-white/10 shadow-3xl bg-slate-900/40 backdrop-blur-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 bg-slate-950/40">
           <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
              <input 
                type="text" 
                placeholder="Search Guest, Code or Room Number..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-[13px] text-slate-300 outline-none focus:bg-slate-900 transition-all focus:border-emerald-500/30"
              />
           </div>
           <div className="flex gap-2">
             <select 
               value={filterAction}
               onChange={e => setFilterAction(e.target.value)}
               className="bg-black/40 border border-white/10 rounded-xl py-3 px-6 text-[11px] font-black text-slate-500 uppercase tracking-widest outline-none appearance-none cursor-pointer hover:border-white/20 transition-all"
             >
               <option value="All Actions">All Protocols</option>
               <option value={VisitAction.CHECK_IN}>In-Flow Only</option>
               <option value={VisitAction.CHECK_OUT}>Out-Flow Only</option>
               <option value={VisitAction.RESERVATION}>Bookings Only</option>
             </select>
             <button className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all"><Filter size={16}/></button>
           </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-950/80 backdrop-blur-md z-10 border-b border-white/10">
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Security Timestamp</th>
                <th className="px-8 py-5">Occupant Dossier</th>
                <th className="px-8 py-5">Operational Protocol</th>
                <th className="px-8 py-5">Asset Identification</th>
                <th className="px-8 py-5 text-right">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center opacity-30">
                    <ShieldAlert size={48} className="mx-auto mb-4 text-slate-700" />
                    <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-600">No Security Records in Ledger</p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 text-slate-500">
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="text-[14px] font-black text-white">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                          <p className="text-[9px] text-slate-600 font-black uppercase mt-0.5">{new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div>
                          <p className="text-[15px] font-black text-white group-hover:text-blue-400 transition-colors">{log.guestName}</p>
                          <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-0.5">Ref: {log.bookingCode}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit transition-all ${getActionStyles(log.action)}`}>
                         {getActionIcon(log.action)}
                         {log.action}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-slate-500 group-hover:text-blue-500 group-hover:border-blue-500/20 transition-all">
                             <Bed size={16} />
                          </div>
                          <div>
                            <p className="text-[14px] font-black text-white leading-none">Room {log.roomNumber}</p>
                            <p className="text-[9px] text-slate-600 font-black uppercase mt-1 tracking-dash">Asset Secured</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div>
                         <p className="text-[13px] font-black text-slate-200">{log.authorizedBy}</p>
                         <p className="text-[8px] text-emerald-500 font-black uppercase tracking-dash mt-0.5">Verified Authorization</p>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 border-t border-white/5 bg-slate-950/40 flex items-center justify-between">
           <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.3em] italic">System Dossier • Moore Property Security Ledger</p>
           <div className="flex gap-2">
              <button className="p-2 text-slate-600 hover:text-white transition-all"><ChevronLeft size={16}/></button>
              <button className="p-2 text-slate-600 hover:text-white transition-all"><ChevronRight size={16}/></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityLedger;
