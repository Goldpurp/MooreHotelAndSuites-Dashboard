import React, { useMemo, useState } from 'react';
import { FileDown, Printer, ChevronDown, TrendingUp, TrendingDown, Calendar, Building, CreditCard, Users, History, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { BookingStatus, RoomStatus } from '../types';

import { 
  BarChart as ReBarChart, Bar as ReBar, 
  XAxis as ReXAxis, YAxis as ReYAxis, 
  CartesianGrid as ReCartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer as ReResponsiveContainer, Cell as ReCell,
  PieChart as RePieChart, Pie as RePie,
  AreaChart as ReAreaChart, Area as ReArea
} from 'recharts';

const Reports: React.FC = () => {
  const { bookings, rooms, guests, auditLogs } = useHotel();
  const [reportTab, setReportTab] = useState<'analytics' | 'audit'>('analytics');
  
  // Pagination for Audit Logs
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PAGE_SIZE = 10;

  const metrics = useMemo(() => {
    const validBookings = bookings.filter(b => b.status !== BookingStatus.CANCELLED);
    const totalRevenue = validBookings.reduce((sum, b) => sum + b.amount, 0);
    const occupiedRooms = rooms.filter(r => r.status === RoomStatus.OCCUPIED).length;
    const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
    const revPAR = rooms.length > 0 ? Math.round(totalRevenue / rooms.length) : 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newBookingsCount = bookings.filter(b => new Date(b.createdAt) > thirtyDaysAgo).length;

    return { totalRevenue, occupancyRate, revPAR, newBookingsCount };
  }, [bookings, rooms]);

  const revenueTrendsData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const monthlyMap = months.map(m => ({ month: m, revenue: 0, expenses: 0 }));
    bookings.forEach(b => {
      if (b.status === BookingStatus.CANCELLED) return;
      const date = new Date(b.createdAt);
      if (date.getFullYear() === currentYear) {
        const monthIdx = date.getMonth();
        monthlyMap[monthIdx].revenue += b.amount;
        monthlyMap[monthIdx].expenses += (b.amount * 0.35) + 5000;
      }
    });
    const currentMonthIdx = new Date().getMonth();
    return monthlyMap.slice(0, currentMonthIdx + 1);
  }, [bookings]);

  const occupancyByCategory = useMemo(() => {
    const categories = ['Standard', 'Business', 'Executive', 'Suite', 'Deluxe'];
    const colors = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b'];
    return categories.map((cat, idx) => {
      const roomsOfCat = rooms.filter(r => r.category === cat);
      const totalOfCat = roomsOfCat.length;
      const occupiedOfCat = roomsOfCat.filter(r => r.status === RoomStatus.OCCUPIED).length;
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
              <span className="w-6 h-[1.5px] bg-blue-500 rounded-full"></span>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em]">Property Intelligence</p>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Reports & Analytics</h2>
            <p className="text-slate-500 text-sm font-medium">Moore Hotels & Suites — Live Performance Metrics</p>
         </div>
         <div className="flex gap-2">
            <button className="bg-white/5 hover:bg-white/10 text-slate-400 px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-dash border border-white/5 transition-all flex items-center gap-2">
              <Printer size={14}/> Print
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-blue-500/10">
              <FileDown size={16}/> Export Ledger
            </button>
         </div>
      </div>

      <div className="flex gap-2 bg-black/20 p-1 rounded-md w-fit">
        <button 
          onClick={() => setReportTab('analytics')}
          className={`px-6 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${reportTab === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Operational Analytics
        </button>
        <button 
          onClick={() => setReportTab('audit')}
          className={`px-6 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${reportTab === 'audit' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <History size={14}/> Audit Trails
        </button>
      </div>

      {reportTab === 'analytics' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Cumulative Revenue', value: `₦${metrics.totalRevenue.toLocaleString()}`, growth: '+14.2%', color: 'text-emerald-400', icon: CreditCard },
              { label: 'Global Occupancy', value: `${metrics.occupancyRate}%`, growth: '-2.4%', color: 'text-rose-400', icon: Building },
              { label: 'RevPAR (Avg)', value: `₦${metrics.revPAR.toLocaleString()}`, growth: '+5.1%', color: 'text-emerald-400', icon: Calendar },
              { label: 'Acquisition (30d)', value: metrics.newBookingsCount, growth: '+12%', color: 'text-emerald-400', icon: Users }
            ].map(card => (
              <div key={card.label} className="glass-card p-5 rounded-md border border-white/5 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <card.icon size={80} />
                  </div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="p-2 bg-slate-950 rounded-md border border-white/10 shadow-inner">
                        <card.icon size={14} className="text-blue-500" />
                    </div>
                    <div className={`flex items-center gap-1 text-[9px] font-black ${card.growth.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {card.growth.startsWith('+') ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                        {card.growth}
                    </div>
                  </div>
                  <div className="relative z-10">
                    <span className="text-slate-600 text-[9px] font-black uppercase tracking-[0.1em] block mb-0.5">{card.label}</span>
                    <h3 className="text-xl font-black text-white tracking-tight">{card.value}</h3>
                  </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6 rounded-md border border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Revenue Flow vs Operational Cost</h3>
                  </div>
                  <div className="flex gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Gross Rev.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Op. Expenses</span>
                      </div>
                  </div>
                </div>
                <div className="h-80 w-full">
                  <ReResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={revenueTrendsData}>
                        <ReCartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <ReXAxis dataKey="month" stroke="#475569" axisLine={false} tickLine={false} dy={10} fontSize={10} fontWeight={800} tickFormatter={(v) => v.toUpperCase()} />
                        <ReYAxis stroke="#475569" axisLine={false} tickLine={false} fontSize={10} fontWeight={800} tickFormatter={(v) => `₦${v/1000}k`} />
                        <ReTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px' }} itemStyle={{ fontSize: '11px', fontWeight: 900, color: '#fff', textTransform: 'uppercase' }} labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }} />
                        <ReBar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                        <ReBar dataKey="expenses" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={32} />
                      </ReBarChart>
                  </ReResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-6 rounded-md border border-white/5 flex flex-col">
                <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-2">Category Demand</h3>
                <div className="h-56 relative mb-8">
                  <ReResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <RePie data={occupancyByCategory} innerRadius={65} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none">
                            {occupancyByCategory.map((entry, index) => (
                              <ReCell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </RePie>
                        <ReTooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ fontSize: '10px', fontWeight: 900, color: '#fff' }} />
                      </RePieChart>
                  </ReResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-white tracking-tighter">{metrics.occupancyRate}%</span>
                      <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Global Load</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  {occupancyByCategory.map(cat => (
                    <div key={cat.name} className="flex items-center justify-between bg-white/5 p-2.5 rounded-md border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-tight">{cat.name}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-blue-400">{cat.value}%</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card rounded-md border border-white/5 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
          <div className="px-6 py-4 border-b border-white/5 bg-slate-900/40 flex justify-between items-center">
            <h3 className="text-sm font-black text-white uppercase tracking-widest italic flex items-center gap-2">
              <Activity size={16} className="text-blue-500"/> System Audit Trail
            </h3>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{auditLogs.length} Total Trace Records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-600 text-[8px] font-black uppercase tracking-widest border-b border-white/5">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Profile</th>
                  <th className="px-6 py-4">Action Type</th>
                  <th className="px-6 py-4">Entity Identity</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">No activity detected in current view</td>
                  </tr>
                ) : (
                  paginatedAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-all group">
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-bold text-slate-300">{new Date(log.createdAt).toLocaleDateString()}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-md bg-blue-600/10 flex items-center justify-center text-[9px] font-black text-blue-400 border border-blue-500/20 uppercase tracking-tighter">
                             {log.profileId.slice(0, 2)}
                           </div>
                           <span className="text-[11px] font-black text-slate-200 uppercase">{log.profileId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          log.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          log.action === 'DELETE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-black text-white uppercase tracking-tight">{log.entityType}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">UID: {log.entityId.slice(0, 10)}...</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[9px] text-blue-500 font-black uppercase hover:underline">Inspect Object</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Audit Trail Pagination Controls */}
          <div className="px-6 py-4 border-t border-white/5 bg-slate-900/20 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
              Showing {paginatedAuditLogs.length} of {auditLogs.length} records
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                disabled={auditPage === 1}
                className="p-2 border border-white/10 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center px-4 rounded-lg bg-black/20 border border-white/5">
                <span className="text-[10px] font-black text-white">{auditPage} / {totalAuditPages || 1}</span>
              </div>
              <button 
                onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                disabled={auditPage === totalAuditPages || totalAuditPages === 0}
                className="p-2 border border-white/10 rounded-lg text-slate-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;