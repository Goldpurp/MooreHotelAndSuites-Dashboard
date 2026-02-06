import React, { useMemo, useState } from 'react';
import { 
  FileDown, Printer, ChevronDown, TrendingUp, TrendingDown, 
  Calendar, Building, CreditCard, Users, History, Activity, 
  ChevronLeft, ChevronRight, SearchX, Eye, Code, ArrowRight,
  Database, ShieldCheck, X, Clock, Fingerprint, AlertCircle
} from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { BookingStatus, RoomStatus, AuditLog } from '../types';

import { 
  BarChart as ReBarChart, Bar as ReBar, 
  XAxis as ReXAxis, YAxis as ReYAxis, 
  CartesianGrid as ReCartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer as ReResponsiveContainer, Cell as ReCell,
  PieChart as RePieChart, Pie as RePie,
  AreaChart as ReAreaChart, Area as ReArea,
  Legend as ReLegend
} from 'recharts';

const Reports: React.FC = () => {
  const { bookings, rooms, auditLogs } = useHotel();
  const [reportTab, setReportTab] = useState<'analytics' | 'audit'>('analytics');
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PAGE_SIZE = 12;

  const metrics = useMemo(() => {
    const validBookings = (bookings || []).filter(b => b.status !== BookingStatus.Cancelled);
    const totalRevenue = validBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const occupiedRooms = (rooms || []).filter(r => r.status === RoomStatus.Occupied).length;
    const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
    const revPAR = rooms.length > 0 ? Math.round(totalRevenue / rooms.length) : 0;
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newBookingsCount = (bookings || []).filter(b => new Date(b.createdAt) > thirtyDaysAgo).length;
    return { totalRevenue, occupancyRate, revPAR, newBookingsCount };
  }, [bookings, rooms]);

  const revenueTrendsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyMap = months.map(m => ({ month: m, revenue: 0, expenses: 0 }));
    (bookings || []).forEach(b => {
      if (b.status === BookingStatus.Cancelled) return;
      const date = new Date(b.createdAt);
      if (date.getFullYear() === currentYear) {
        const monthIdx = date.getMonth();
        monthlyMap[monthIdx].revenue += (b.amount || 0);
        monthlyMap[monthIdx].expenses += ((b.amount || 0) * 0.35) + 2500;
      }
    });
    return monthlyMap.slice(0, new Date().getMonth() + 1);
  }, [bookings]);

  const occupancyByCategory = useMemo(() => {
    const categories = ['Standard', 'Business', 'Executive', 'Suite'];
    const colors = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981'];
    return categories.map((cat, idx) => {
      const roomsOfCat = (rooms || []).filter(r => r.category?.toLowerCase() === cat.toLowerCase());
      const totalOfCat = roomsOfCat.length;
      const occupiedOfCat = roomsOfCat.filter(r => r.status === RoomStatus.Occupied).length;
      return { name: cat, value: totalOfCat > 0 ? Math.round((occupiedOfCat / totalOfCat) * 100) : 0, count: totalOfCat, color: colors[idx] };
    }).filter(item => item.count > 0);
  }, [rooms]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return (auditLogs || []).slice(start, start + AUDIT_PAGE_SIZE);
  }, [auditLogs, auditPage]);

  const totalAuditPages = Math.ceil((auditLogs?.length || 0) / AUDIT_PAGE_SIZE);

  return (
    <div className="space-y-4 lg:space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
         <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-[2px] bg-brand-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]"></span>
              <p className="adaptive-text-xs text-brand-400 font-black uppercase tracking-[0.15em]">Analytics Intelligence</p>
            </div>
            <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase italic leading-none">Intelligence Hub</h2>
         </div>
         <div className="flex gap-2">
            <button className="bg-white/5 hover:bg-white/10 text-slate-400 p-2 lg:px-4 lg:py-2.5 rounded-lg adaptive-text-xs font-black uppercase border border-white/5 transition-all"><Printer size={14}/></button>
            <button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg adaptive-text-xs font-black uppercase flex items-center gap-2 transition-all shadow-xl italic whitespace-nowrap"><FileDown size={16}/> Export Ledger</button>
         </div>
      </div>

      <div className="flex gap-1 bg-black/40 p-1 rounded-xl w-fit border border-white/5">
        <button onClick={() => setReportTab('analytics')} className={`px-6 py-2 rounded-lg adaptive-text-xs font-black uppercase tracking-[0.1em] transition-all ${reportTab === 'analytics' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>Performance</button>
        <button onClick={() => setReportTab('audit')} className={`px-6 py-2 rounded-lg adaptive-text-xs font-black uppercase tracking-[0.1em] transition-all ${reportTab === 'audit' ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>Forensic Audit</button>
      </div>

      {reportTab === 'analytics' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Yield', value: `₦${metrics.totalRevenue.toLocaleString()}`, growth: '+14%', color: 'text-emerald-400', icon: CreditCard },
              { label: 'Load', value: `${metrics.occupancyRate}%`, growth: '-2%', color: 'text-blue-400', icon: Building },
              { label: 'RevPAR', value: `₦${metrics.revPAR.toLocaleString()}`, growth: '+5%', color: 'text-amber-400', icon: Activity },
              { label: 'Velocity', value: metrics.newBookingsCount, growth: '+12%', color: 'text-indigo-400', icon: Users }
            ].map(card => (
              <div key={card.label} className="glass-card p-4 rounded-xl border border-white/5 bg-slate-900/10 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <card.icon size={14} className={card.color} />
                    <span className={`text-[8px] font-black ${card.growth.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{card.growth}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 text-[8px] font-black uppercase block mb-1">{card.label}</span>
                    <h3 className="adaptive-text-lg font-black text-white italic truncate leading-none">{card.value}</h3>
                  </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            <div className="col-span-12 xl:col-span-8 glass-card adaptive-p rounded-xl border border-white/5 bg-slate-900/20">
                <h3 className="adaptive-text-lg font-black text-white uppercase italic tracking-tight mb-8">Revenue Dynamics</h3>
                <div className="h-64 lg:h-80 w-full">
                  <ReResponsiveContainer width="100%" height="100%">
                      <ReAreaChart data={revenueTrendsData}>
                        <defs>
                          <linearGradient id="colorRevR" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                        </defs>
                        <ReCartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <ReXAxis dataKey="month" stroke="#475569" axisLine={false} tickLine={false} dy={10} fontSize={9} fontWeight={900} />
                        <ReYAxis stroke="#475569" axisLine={false} tickLine={false} fontSize={9} fontWeight={900} tickFormatter={(v) => `₦${v/1000}k`} />
                        <ReTooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }} itemStyle={{ fontSize: '10px', fontWeight: 900 }} />
                        <ReArea type="monotone" dataKey="revenue" name="Yield" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevR)" />
                      </ReAreaChart>
                  </ReResponsiveContainer>
                </div>
            </div>
            <div className="col-span-12 xl:col-span-4 glass-card adaptive-p rounded-xl border border-white/5 flex flex-col">
                <h3 className="adaptive-text-lg font-black text-white uppercase italic mb-6">Asset Load</h3>
                <div className="h-40 relative mb-6">
                  <ReResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <RePie data={occupancyByCategory} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value" stroke="none">
                            {occupancyByCategory.map((entry, index) => <ReCell key={`cell-${index}`} fill={entry.color} />)}
                        </RePie>
                      </RePieChart>
                  </ReResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="adaptive-text-2xl font-black text-white italic">{metrics.occupancyRate}%</span>
                      <span className="text-[7px] text-slate-600 font-black uppercase">Load</span>
                  </div>
                </div>
                <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
                  {occupancyByCategory.map(cat => (
                    <div key={cat.name} className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></div>
                          <p className="text-[9px] font-black text-white uppercase truncate">{cat.name}</p>
                        </div>
                        <span className="text-[11px] font-black text-slate-300 italic">{cat.value}%</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-white/5 overflow-hidden flex flex-col shadow-2xl bg-slate-900/20 backdrop-blur-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="text-slate-600 adaptive-text-xs font-black uppercase tracking-widest border-b border-white/5 bg-slate-950/40">
                  <th className="responsive-table-padding">Secured Timestamp</th>
                  <th className="responsive-table-padding">Personnel Node</th>
                  <th className="responsive-table-padding">Action</th>
                  <th className="responsive-table-padding">Target Asset</th>
                  <th className="responsive-table-padding text-right">Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.01] transition-all group border-l-2 border-transparent hover:border-brand-500">
                    <td className="responsive-table-padding">
                      <div className="min-w-0">
                        <p className="adaptive-text-sm font-black text-white italic truncate leading-none mb-1">{new Date(log.createdAt).toLocaleDateString('en-GB')}</p>
                        <p className="text-[7px] text-slate-700 font-bold uppercase truncate">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </td>
                    <td className="responsive-table-padding"><p className="adaptive-text-sm font-black text-slate-300 uppercase truncate max-w-[100px]">{log.profileId}</p></td>
                    <td className="responsive-table-padding">
                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${log.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400' : log.action === 'DELETE' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>{log.action}</span>
                    </td>
                    <td className="responsive-table-padding">
                      <p className="adaptive-text-xs font-black text-white uppercase italic leading-none mb-1 truncate">{log.entityType}</p>
                      <p className="text-[7px] text-slate-700 font-bold uppercase">ID: {log.entityId.slice(0, 8)}</p>
                    </td>
                    <td className="responsive-table-padding text-right">
                      <button onClick={() => setInspectingLog(log)} className="bg-white/5 hover:bg-white/10 text-brand-400 p-1.5 rounded-lg border border-white/5 transition-all"><Eye size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-white/5 bg-slate-950/60 flex items-center justify-between">
            <p className="text-[8px] text-slate-700 font-black uppercase italic">Forensic Integrity Active</p>
            <div className="flex gap-1.5">
              <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} className="p-1 border border-white/10 rounded text-slate-600 disabled:opacity-10 transition-all bg-white/5"><ChevronLeft size={12} /></button>
              <button onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))} disabled={auditPage === totalAuditPages} className="p-1 border border-white/10 rounded text-slate-600 disabled:opacity-10 transition-all bg-white/5"><ChevronRight size={12} /></button>
            </div>
          </div>
        </div>
      )}

      {inspectingLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-[#020617]/95 backdrop-blur-md animate-in fade-in duration-300 overflow-hidden">
           <div className="w-full max-w-2xl bg-[#0a0f1d] border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] shadow-3xl flex flex-col max-h-[92vh] sm:max-h-[80vh]">
              <div className="px-5 sm:px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                 <h3 className="text-base sm:adaptive-text-lg font-black text-white uppercase italic">Forensic Inspector</h3>
                 <button onClick={() => setInspectingLog(null)} className="p-2 hover:bg-white/10 text-slate-500 rounded-xl transition-all active:scale-90"><X size={18}/></button>
              </div>
              <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4 sm:space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/5"><p className="text-[8px] text-slate-600 font-black uppercase mb-1">Personnel</p><p className="text-[10px] sm:text-[11px] font-black text-brand-400 truncate">{inspectingLog.profileId}</p></div>
                    <div className="bg-white/5 p-3 sm:p-4 rounded-xl border border-white/5"><p className="text-[8px] text-slate-600 font-black uppercase mb-1">Entity</p><p className="text-[10px] sm:text-[11px] font-black text-white truncate">{inspectingLog.entityType}</p></div>
                 </div>
                 <div className="bg-[#05080f] rounded-xl border border-white/5 p-4 sm:p-6 font-mono text-[10px] text-slate-400 leading-relaxed overflow-auto max-h-[250px] custom-scrollbar shadow-inner">
                    <pre className="whitespace-pre-wrap break-all">{JSON.stringify(inspectingLog.newData || inspectingLog.oldData, null, 2)}</pre>
                 </div>
              </div>
              <div className="px-5 sm:px-6 py-4 bg-slate-950/60 border-t border-white/5 flex justify-end">
                 <button onClick={() => setInspectingLog(null)} className="px-6 sm:px-8 py-2 sm:py-3 bg-brand-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl italic transition-all active:scale-95">Acknowledge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Reports;