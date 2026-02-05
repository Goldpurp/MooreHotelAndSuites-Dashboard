
import React, { useMemo, useState } from 'react';
import { 
  FileDown, Printer, ChevronDown, TrendingUp, TrendingDown, 
  Calendar, Building, CreditCard, Users, History, Activity, 
  ChevronLeft, ChevronRight, SearchX, Eye, Code, ArrowRight,
  Database, ShieldCheck, X, Clock, Fingerprint
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
  const { bookings, rooms, guests, auditLogs } = useHotel();
  const [reportTab, setReportTab] = useState<'analytics' | 'audit'>('analytics');
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);
  
  // Pagination for Audit Logs
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PAGE_SIZE = 12;

  const metrics = useMemo(() => {
    const validBookings = (bookings || []).filter(b => b.status !== BookingStatus.Cancelled);
    const totalRevenue = validBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const occupiedRooms = (rooms || []).filter(r => r.status === RoomStatus.Occupied).length;
    const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
    const revPAR = rooms.length > 0 ? Math.round(totalRevenue / rooms.length) : 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
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
        // Estimated OPEX: 35% of revenue + base maintenance constant
        monthlyMap[monthIdx].expenses += ((b.amount || 0) * 0.35) + 2500;
      }
    });
    
    const currentMonthIdx = new Date().getMonth();
    return monthlyMap.slice(0, currentMonthIdx + 1);
  }, [bookings]);

  const occupancyByCategory = useMemo(() => {
    const categories = ['Standard', 'Business', 'Executive', 'Suite'];
    const colors = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981'];
    return categories.map((cat, idx) => {
      const roomsOfCat = (rooms || []).filter(r => r.category === cat);
      const totalOfCat = roomsOfCat.length;
      const occupiedOfCat = roomsOfCat.filter(r => r.status === RoomStatus.Occupied).length;
      return {
        name: cat,
        value: totalOfCat > 0 ? Math.round((occupiedOfCat / totalOfCat) * 100) : 0,
        count: totalOfCat,
        color: colors[idx]
      };
    }).filter(item => item.count > 0);
  }, [rooms]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * AUDIT_PAGE_SIZE;
    return (auditLogs || []).slice(start, start + AUDIT_PAGE_SIZE);
  }, [auditLogs, auditPage]);

  const totalAuditPages = Math.ceil((auditLogs?.length || 0) / AUDIT_PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-[2px] bg-brand-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
              <p className="text-[10px] text-brand-400 font-black uppercase tracking-[0.2em]">Operational Intelligence</p>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Reports & Analytics</h2>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1 italic">Performance Matrix v4.2 — Moore Property Node</p>
         </div>
         <div className="flex gap-2">
            <button className="bg-white/5 hover:bg-white/10 text-slate-400 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center gap-2">
              <Printer size={16}/> Print Ledger
            </button>
            <button className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-3xl shadow-brand-950/40 active:scale-95">
              <FileDown size={18}/> Export Dataset
            </button>
         </div>
      </div>

      <div className="flex gap-1.5 bg-black/40 p-1.5 rounded-2xl w-fit border border-white/5">
        <button 
          onClick={() => setReportTab('analytics')}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all ${reportTab === 'analytics' ? 'bg-brand-600 text-white shadow-xl' : 'text-slate-600 hover:text-slate-300'}`}
        >
          Performance Analytics
        </button>
        <button 
          onClick={() => setReportTab('audit')}
          className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${reportTab === 'audit' ? 'bg-brand-600 text-white shadow-xl' : 'text-slate-600 hover:text-slate-300'}`}
        >
          <History size={14}/> Forensic Audit
        </button>
      </div>

      {reportTab === 'analytics' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Cumulative Revenue', value: `₦${metrics.totalRevenue.toLocaleString()}`, growth: '+14.2%', color: 'text-emerald-400', icon: CreditCard, accent: 'from-emerald-500/20' },
              { label: 'Global Load', value: `${metrics.occupancyRate}%`, growth: '-2.4%', color: 'text-blue-400', icon: Building, accent: 'from-blue-500/20' },
              { label: 'Avg RevPAR', value: `₦${metrics.revPAR.toLocaleString()}`, growth: '+5.1%', color: 'text-amber-400', icon: Activity, accent: 'from-amber-500/20' },
              { label: 'Growth Delta (30d)', value: metrics.newBookingsCount, growth: '+12%', color: 'text-indigo-400', icon: Users, accent: 'from-indigo-500/20' }
            ].map(card => (
              <div key={card.label} className={`glass-card p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between relative overflow-hidden group bg-gradient-to-br ${card.accent} to-transparent`}>
                  <div className="absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <card.icon size={120} />
                  </div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 shadow-inner">
                        <card.icon size={18} className={card.color} />
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-black ${card.growth.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {card.growth.startsWith('+') ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                        {card.growth}
                    </div>
                  </div>
                  <div className="relative z-10">
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] block mb-1">{card.label}</span>
                    <h3 className="text-3xl font-black text-white tracking-tighter italic uppercase leading-none">{card.value}</h3>
                  </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/20 backdrop-blur-3xl shadow-3xl">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Revenue Dynamics</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time Liquidity Flow vs Expenditure Projection</p>
                  </div>
                  <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-brand-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"></div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Gross Yield</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500/40"></div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Op. Overhead</span>
                      </div>
                  </div>
                </div>
                <div className="h-96 w-full">
                  <ReResponsiveContainer width="100%" height="100%">
                      <ReAreaChart data={revenueTrendsData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <ReCartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <ReXAxis dataKey="month" stroke="#475569" axisLine={false} tickLine={false} dy={15} fontSize={11} fontWeight={900} tickFormatter={(v) => v.toUpperCase()} />
                        <ReYAxis stroke="#475569" axisLine={false} tickLine={false} fontSize={11} fontWeight={900} tickFormatter={(v) => `₦${v/1000}k`} />
                        <ReTooltip 
                          cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                          contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
                          itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', padding: '4px 0' }}
                          labelStyle={{ fontSize: '11px', fontWeight: 900, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.2em' }}
                        />
                        <ReArea type="monotone" dataKey="revenue" name="Gross Yield" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" animationDuration={2000} />
                        <ReArea type="monotone" dataKey="expenses" name="Op. Overhead" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorExp)" animationDuration={2000} />
                      </ReAreaChart>
                  </ReResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 flex flex-col shadow-3xl bg-slate-900/20">
                <h3 className="text-lg font-black text-white uppercase italic tracking-tight mb-2">Category Demand</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Asset Load Analysis</p>
                
                <div className="h-64 relative mb-10">
                  <ReResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <RePie data={occupancyByCategory} innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                            {occupancyByCategory.map((entry, index) => (
                              <ReCell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </RePie>
                        <ReTooltip 
                          contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }} 
                          itemStyle={{ fontSize: '11px', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }} 
                        />
                      </RePieChart>
                  </ReResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-4xl font-black text-white tracking-tighter italic leading-none">{metrics.occupancyRate}%</span>
                      <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em] mt-1">Global Load</span>
                  </div>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {occupancyByCategory.map(cat => (
                    <div key={cat.name} className="flex items-center justify-between bg-black/40 p-4 rounded-2xl border border-white/5 hover:bg-white/5 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)] group-hover:scale-125 transition-transform" style={{ backgroundColor: cat.color }}></div>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-widest">{cat.name}</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-dash">{cat.count} Units Tracked</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-white italic tracking-tighter">{cat.value}%</span>
                        </div>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col shadow-3xl bg-slate-900/20 backdrop-blur-3xl">
          <div className="px-10 py-6 border-b border-white/5 bg-slate-950/40 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight italic flex items-center gap-3">
                <Activity size={20} className="text-brand-500"/> System Audit Trail
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Forensic Event History</p>
            </div>
            <span className="px-5 py-2 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">{auditLogs.length} Total Records Found</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 bg-slate-950/20">
                  <th className="px-10 py-5">Security Timestamp</th>
                  <th className="px-10 py-5">Personnel Profile</th>
                  <th className="px-10 py-5">Action Type</th>
                  <th className="px-10 py-5">Target Asset</th>
                  <th className="px-10 py-5 text-right">Ledger Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-48 text-center">
                       <div className="flex flex-col items-center gap-6 opacity-30">
                          <div className="w-20 h-20 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                            <SearchX size={40} className="text-slate-700" />
                          </div>
                          <p className="text-[14px] font-black uppercase tracking-[0.4em] text-slate-500 italic">No forensic data in node</p>
                       </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-all group border-l-4 border-transparent hover:border-brand-500">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-black/40 rounded-xl text-slate-600 border border-white/5">
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-[14px] font-black text-white italic">{new Date(log.createdAt).toLocaleDateString('en-GB')}</p>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-brand-600/10 flex items-center justify-center text-[11px] font-black text-brand-400 border border-brand-500/20 uppercase tracking-tighter shadow-inner">
                             {log.profileId.slice(0, 2).toUpperCase()}
                           </div>
                           <div>
                             <p className="text-[13px] font-black text-slate-200 uppercase truncate max-w-[120px]">{log.profileId}</p>
                             <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Personnel Node</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border flex items-center gap-2 w-fit ${
                          log.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          log.action === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {log.action === 'INSERT' ? <Activity size={10}/> : log.action === 'DELETE' ? <ShieldCheck size={10}/> : <History size={10}/>}
                          {log.action}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-[14px] font-black text-white uppercase tracking-tight italic">{log.entityType}</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">ID: {log.entityId.slice(0, 10)}...</p>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button 
                          onClick={() => setInspectingLog(log)}
                          className="bg-white/5 hover:bg-white/10 text-brand-400 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center gap-2 ml-auto active:scale-95"
                        >
                          <Eye size={14}/> Inspect Object
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-10 py-6 border-t border-white/5 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-brand-500" />
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em] italic">System Audit Integrity Node • Active Since Deployment</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                disabled={auditPage === 1}
                className="p-3 border border-white/10 rounded-xl text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center px-6 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[11px] font-black text-white uppercase tracking-widest">{auditPage} / {totalAuditPages || 1}</span>
              </div>
              <button 
                onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                disabled={auditPage === totalAuditPages || totalAuditPages === 0}
                className="p-3 border border-white/10 rounded-xl text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Object Inspector Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-3xl animate-in fade-in duration-500">
           <div className="w-full max-w-4xl bg-[#0a0f1d] border border-white/10 rounded-[3rem] shadow-3xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-600/10 rounded-2xl border border-brand-500/20 text-brand-400">
                       <Code size={24} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Forensic Object Inspector</h3>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Asset State Trace • Reference: {inspectingLog.id.slice(0,12)}</p>
                    </div>
                 </div>
                 <button onClick={() => setInspectingLog(null)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white rounded-2xl transition-all border border-white/5 active:scale-90"><X size={20}/></button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 custom-scrollbar space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                       <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Fingerprint size={12}/> Event Metadata</p>
                       <div className="space-y-3">
                          <div className="flex justify-between items-center text-[11px]">
                             <span className="text-slate-500 font-bold">Personnel</span>
                             <span className="text-brand-400 font-black uppercase">{inspectingLog.profileId}</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] pt-3 border-t border-white/5">
                             <span className="text-slate-500 font-bold">Action</span>
                             <span className="text-white font-black uppercase italic tracking-widest">{inspectingLog.action}</span>
                          </div>
                       </div>
                    </div>
                    <div className="md:col-span-2 bg-white/5 p-6 rounded-[2rem] border border-white/5">
                       <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Database size={12}/> Asset Reference</p>
                       <div className="flex flex-wrap items-center gap-4">
                          <div className="px-4 py-2 bg-slate-950 border border-white/5 rounded-xl">
                             <span className="text-[11px] text-slate-300 font-black uppercase italic tracking-widest">{inspectingLog.entityType}</span>
                          </div>
                          <ArrowRight size={14} className="text-slate-700" />
                          <div className="px-4 py-2 bg-slate-950 border border-white/5 rounded-xl flex items-center gap-3">
                             <Code size={12} className="text-brand-500" />
                             <span className="text-[11px] text-brand-400 font-mono font-bold">{inspectingLog.entityId}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] ml-2">Previous State (Pre-Commit)</h4>
                       <div className="bg-[#05080f] rounded-[2rem] border border-white/5 p-8 font-mono text-[12px] text-slate-400 leading-relaxed max-h-[300px] overflow-auto custom-scrollbar shadow-inner">
                          {inspectingLog.oldData ? (
                            <pre className="whitespace-pre-wrap">{JSON.stringify(inspectingLog.oldData, null, 2)}</pre>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 opacity-30 italic">
                               <Code size={24} className="mb-2" />
                               <p>NULL_STATE: INITIAL_RECORD</p>
                            </div>
                          )}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[11px] font-black text-brand-500 uppercase tracking-[0.25em] ml-2">Current Ledger State (Post-Commit)</h4>
                       <div className="bg-[#05080f] rounded-[2rem] border border-brand-500/20 p-8 font-mono text-[12px] text-brand-100 leading-relaxed max-h-[300px] overflow-auto custom-scrollbar shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]">
                          {inspectingLog.newData ? (
                            <pre className="whitespace-pre-wrap">{JSON.stringify(inspectingLog.newData, null, 2)}</pre>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 opacity-30 italic">
                               <Code size={24} className="mb-2" />
                               <p>NULL_STATE: DECOMMISSIONED</p>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="px-10 py-8 bg-slate-950/60 border-t border-white/5 flex justify-end">
                 <button onClick={() => setInspectingLog(null)} className="px-12 py-4 bg-brand-600 hover:bg-brand-700 text-white font-black text-[12px] uppercase tracking-widest rounded-2xl shadow-2xl transition-all active:scale-95 italic">
                    Acknowledge State
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
