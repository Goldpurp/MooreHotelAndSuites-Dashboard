
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { DollarSign, UserCheck, Bed, Activity, ArrowRight, RefreshCw, PieChart as PieIcon, Clock, Zap } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import StatCard from '../components/StatCard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { BookingStatus, RoomStatus } from '../types';
import { api } from '../lib/api';

const Dashboard: React.FC = () => {
  const { bookings = [], rooms = [], setActiveTab, setSelectedBookingId, refreshData } = useHotel();
  const [timeFilter, setTimeFilter] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [analytics, setAnalytics] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [analyticsRes, dailyRes] = await Promise.all([
        api.get('/api/analytics/overview', { params: { period: timeFilter.toLowerCase() } }),
        api.get('/api/operations/stats/daily', { silent: true })
      ]);
      setAnalytics(analyticsRes);
      setDailyStats(dailyRes);
    } catch (e) {
      setAnalytics(null);
    }
  }, [timeFilter]);

  // Only fetch analytics on period change or mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    // refreshData updates the context rooms/bookings, 
    // fetchDashboardData updates the analytics summaries
    await Promise.all([
      refreshData(),
      fetchDashboardData()
    ]);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Operational Queue Logic: Filter for actionable items and sort by date
  const operationalQueue = useMemo(() => {
    const actionableStatuses = [BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN];
    
    return [...bookings]
      .filter(b => actionableStatuses.includes(b.status))
      .sort((a, b) => {
        // Priority: CheckedIn first (Active stays), then nearest arrival
        if (a.status === BookingStatus.CHECKED_IN && b.status !== BookingStatus.CHECKED_IN) return -1;
        if (a.status !== BookingStatus.CHECKED_IN && b.status === BookingStatus.CHECKED_IN) return 1;
        return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
      })
      .slice(0, 6); // Show top 6 urgent items
  }, [bookings]);

  // REVENUE DYNAMICS LOGIC ENGINE
  const revenueTrendData = useMemo(() => {
    if (analytics?.revenueTrend && analytics.revenueTrend.length > 0) return analytics.revenueTrend;

    const now = new Date();
    const result = [];
    const validBookings = (bookings || []).filter(b => b.status !== BookingStatus.CANCELLED);

    if (timeFilter === 'Day') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
        const label = d.getHours() + ':00';
        const startTime = new Date(d.getTime() - 4 * 60 * 60 * 1000).getTime();
        const endTime = d.getTime();
        
        const revenue = validBookings
          .filter(b => {
            const bt = new Date(b.createdAt).getTime();
            return bt >= startTime && bt <= endTime;
          })
          .reduce((sum, b) => sum + (b.amount || 0), 0);
          
        result.push({ date: label, revenue });
      }
    } else if (timeFilter === 'Week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        const revenue = validBookings
          .filter(b => (b.createdAt || '').split('T')[0] === dateStr)
          .reduce((sum, b) => sum + (b.amount || 0), 0);
          
        result.push({ date: label, revenue });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 5);
        const label = (d.getMonth() + 1) + '/' + d.getDate();
        const startTime = new Date(d.getTime() - 5 * 24 * 60 * 60 * 1000).getTime();
        const endTime = d.getTime();

        const revenue = validBookings
          .filter(b => {
            const bt = new Date(b.createdAt).getTime();
            return bt >= startTime && bt <= endTime;
          })
          .reduce((sum, b) => sum + (b.amount || 0), 0);
          
        result.push({ date: label, revenue });
      }
    }
    return result;
  }, [analytics, bookings, timeFilter]);

  const stats = useMemo(() => {
    const validBookings = (bookings || []).filter(b => b.status !== BookingStatus.CANCELLED);
    const now = new Date();
    const filterTime = timeFilter === 'Day' ? 24 * 60 * 60 * 1000 : 
                       timeFilter === 'Week' ? 7 * 24 * 60 * 60 * 1000 : 
                       30 * 24 * 60 * 60 * 1000;
    
    const periodBookings = validBookings.filter(b => 
      (now.getTime() - new Date(b.createdAt).getTime()) <= filterTime
    );

    const periodRev = periodBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const occupiedUnits = (rooms || []).filter(r => r.status === RoomStatus.OCCUPIED).length;
    const currOcc = (rooms || []).length > 0 ? Math.round((occupiedUnits / rooms.length) * 100) : 0;
    const activeResidents = (bookings || []).filter(b => b.status === BookingStatus.CHECKED_IN).length;
    const currADR = periodBookings.length > 0 ? Math.round(periodRev / periodBookings.length) : 0;

    return {
      revenue: { 
        value: analytics?.totalRevenue ?? periodRev, 
        growth: analytics?.revenueGrowth ?? (timeFilter === 'Week' ? 12.5 : 0) 
      },
      occupancy: { 
        value: analytics?.occupancyRate ?? currOcc, 
        growth: analytics?.occupancyGrowth ?? 2.1 
      },
      activeGuests: { 
        value: analytics?.activeGuests ?? activeResidents, 
        growth: 0 
      },
      adr: { 
        value: analytics?.averageDailyRate ?? currADR, 
        growth: 0 
      }
    };
  }, [analytics, bookings, rooms, timeFilter]);

  const roomStatusData = useMemo(() => {
    return [
      { name: 'Occupied', value: (rooms || []).filter(r => r.status === RoomStatus.OCCUPIED).length, color: '#3b82f6' },
      { name: 'Available', value: (rooms || []).filter(r => r.status === RoomStatus.AVAILABLE).length, color: '#10b981' },
      { name: 'Cleaning', value: (rooms || []).filter(r => r.status === RoomStatus.CLEANING).length, color: '#f59e0b' },
      { name: 'Repair', value: (rooms || []).filter(r => r.status === RoomStatus.MAINTENANCE).length, color: '#ef4444' },
      { name: 'Reserved', value: (rooms || []).filter(r => r.status === RoomStatus.RESERVED).length, color: '#8b5cf6' },
    ];
  }, [rooms]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Property Operations Intel</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Dashboard</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Real-time Enterprise Ledger Protocol</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleManualRefresh} 
            className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            title="Force ledger synchronization"
          >
            <RefreshCw size={18} />
          </button>
          <div className="flex gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl">
            {(['Day', 'Week', 'Month'] as const).map(t => (
              <button 
                key={t} 
                onClick={() => setTimeFilter(t)} 
                className={`px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${timeFilter === t ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-600 hover:text-slate-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Net Revenue" value={`₦${stats.revenue.value.toLocaleString()}`} growth={stats.revenue.growth} icon={DollarSign} color="bg-blue-500/10 text-blue-400" />
        <StatCard label="Occupancy" value={`${stats.occupancy.value}%`} growth={stats.occupancy.growth} icon={Bed} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="Active Residents" value={stats.activeGuests.value} growth={0} icon={UserCheck} color="bg-amber-500/10 text-amber-400" />
        <StatCard label="Avg Daily Rate" value={`₦${stats.adr.value.toLocaleString()}`} growth={0} icon={Activity} color="bg-indigo-500/10 text-indigo-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-lg font-black text-white tracking-tight uppercase italic">Revenue Dynamics</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Inflow trend for current {timeFilter.toLowerCase()}</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight={800} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  fontWeight={800} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `₦${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900, color: '#3b82f6' }}
                  labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <PieIcon size={18} className="text-blue-500" />
            <h3 className="text-lg font-black text-white tracking-tight uppercase italic">Asset Status</h3>
          </div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-6">Physical Property Distribution</p>
          <div className="h-44 relative mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={roomStatusData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={55} 
                  outerRadius={75} 
                  paddingAngle={8} 
                  dataKey="value" 
                  stroke="none"
                  animationDuration={1500}
                >
                  {roomStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-black text-white leading-none">{(rooms || []).length}</span>
               <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Units</span>
            </div>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
             {roomStatusData.map((item) => (
               <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                 <div className="flex items-center gap-3">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                   <span className="text-slate-300 text-[11px] font-black uppercase tracking-dash">{item.name}</span>
                 </div>
                 <span className="text-white font-black text-[12px]">{item.value}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500">
               <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight uppercase italic leading-none">Operational Queue</h3>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-dash mt-1">Most urgent pending actions & arrivals</p>
            </div>
          </div>
          <button onClick={() => setActiveTab('bookings')} className="bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl border border-white/5 flex items-center gap-2 transition-all">
            Full Ledger <ArrowRight size={14}/>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-dash border-b border-white/5 bg-slate-900/20">
                <th className="px-6 py-4">Guest Identity</th>
                <th className="px-6 py-4">Timeline</th>
                <th className="px-6 py-4">Asset ID</th>
                <th className="px-6 py-4">Status Protocol</th>
                <th className="px-6 py-4 text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {operationalQueue.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-700 font-black uppercase text-[10px] tracking-[0.4em]">Queue is currently clear</td></tr>
              ) : (
                operationalQueue.map((booking) => {
                  const room = (rooms || []).find(r => r.id === booking.roomId);
                  const isToday = new Date(booking.checkIn).toDateString() === new Date().toDateString();
                  
                  return (
                    <tr 
                      key={booking.id} 
                      className="group transition-all hover:bg-white/10 cursor-pointer" 
                      onClick={() => { setSelectedBookingId(booking.id); setActiveTab('bookings'); }}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black italic ${
                            booking.status === BookingStatus.CHECKED_IN ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-white/10 text-slate-500'
                          }`}>
                             {booking.guestFirstName?.charAt(0) || 'G'}
                          </div>
                          <div>
                            <p className="text-[14px] font-black text-white group-hover:text-blue-400 transition-colors">{booking.guestFirstName} {booking.guestLastName}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-dash">ID: {booking.bookingCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className={`text-[12px] font-black ${isToday ? 'text-amber-500' : 'text-slate-300'}`}>
                          {new Date(booking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">{booking.status === BookingStatus.CHECKED_IN ? 'Active Stay' : 'Incoming'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-[13px] font-black text-slate-300">Room {room?.roomNumber || '...'}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-dash">{room?.category || 'Executive'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${
                          booking.status === BookingStatus.CHECKED_IN ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          booking.status === BookingStatus.CONFIRMED ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${booking.status === BookingStatus.CHECKED_IN ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`}></span>
                          {booking.status === BookingStatus.CHECKED_IN ? 'Checked In' : booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="text-[15px] font-black text-white">₦{booking.amount?.toLocaleString() || '0'}</p>
                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-dash">{booking.paymentStatus}</p>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
