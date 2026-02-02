import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { DollarSign, UserCheck, Bed, Activity, ArrowRight, RefreshCw, PieChart as PieIcon, Clock, Zap } from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import StatCard from '../components/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BookingStatus, RoomStatus } from '../types';
import { api } from '../lib/api';

const Dashboard: React.FC = () => {
  const { bookings = [], rooms = [], setActiveTab, setSelectedBookingId, refreshData } = useHotel();
  const [timeFilter, setTimeFilter] = useState<'Day' | 'Week' | 'Month'>('Week');
  const [analytics, setAnalytics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const isFetchingRef = useRef(false);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isFetchingRef.current && !isManual) return;
    isFetchingRef.current = true;
    try {
      const analyticsRes = await api.get('/api/analytics/overview', { params: { period: timeFilter.toLowerCase() } });
      setAnalytics(analyticsRes);
    } catch (e) {
      setAnalytics(null);
    } finally {
      isFetchingRef.current = false;
    }
  }, [timeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchDashboardData(), 500);
    return () => { clearTimeout(timer); isFetchingRef.current = false; };
  }, [fetchDashboardData]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshData(), fetchDashboardData(true)]);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const operationalQueue = useMemo(() => {
    const actionable = [BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.CHECKED_IN];
    return [...bookings]
      .filter(b => actionable.includes(b.status))
      .sort((a, b) => {
        if (a.status === BookingStatus.CHECKED_IN && b.status !== BookingStatus.CHECKED_IN) return -1;
        return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
      })
      .slice(0, 6);
  }, [bookings]);

  const revenueTrendData = useMemo(() => {
    if (analytics?.revenueTrend?.length > 0) return analytics.revenueTrend;
    // Mocking logic for empty states
    return [{date: '01', revenue: 0}, {date: '02', revenue: 0}, {date: '03', revenue: 0}];
  }, [analytics]);

  const stats = useMemo(() => {
    const periodRev = bookings.filter(b => b.status !== BookingStatus.CANCELLED).reduce((sum, b) => sum + (b.amount || 0), 0);
    const occupiedCount = rooms.filter(r => r.status === RoomStatus.OCCUPIED).length;
    const occRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;
    return {
      revenue: { value: analytics?.totalRevenue ?? periodRev, growth: analytics?.revenueGrowth ?? 0 },
      occupancy: { value: analytics?.occupancyRate ?? occRate, growth: analytics?.occupancyGrowth ?? 0 },
      activeGuests: { value: bookings.filter(b => b.status === BookingStatus.CHECKED_IN).length, growth: 0 },
      adr: { value: analytics?.averageDailyRate ?? 0, growth: 0 }
    };
  }, [analytics, bookings, rooms]);

  const roomStatusData = useMemo(() => [
    { name: 'Occupied', value: rooms.filter(r => r.status === RoomStatus.OCCUPIED).length, color: '#3b82f6' },
    { name: 'Available', value: rooms.filter(r => r.status === RoomStatus.AVAILABLE).length, color: '#10b981' },
    { name: 'Cleaning', value: rooms.filter(r => r.status === RoomStatus.CLEANING).length, color: '#f59e0b' },
    { name: 'Repair', value: rooms.filter(r => r.status === RoomStatus.MAINTENANCE).length, color: '#ef4444' },
  ], [rooms]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">Dashboard</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Real-time Enterprise Ledger</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>
          <div className="flex gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl">
            {(['Day', 'Week', 'Month'] as const).map(t => (
              <button key={t} onClick={() => setTimeFilter(t)} className={`px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${timeFilter === t ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-600 hover:text-slate-200'}`}>{t}</button>
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
          <h3 className="text-lg font-black text-white uppercase italic mb-8">Revenue Dynamics</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} fontWeight={800} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="#475569" fontSize={10} fontWeight={800} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <h3 className="text-lg font-black text-white uppercase italic mb-6">Asset Status</h3>
          <div className="h-44 relative mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={roomStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">{roomStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
             {roomStatusData.map((item) => <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5"><div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div><span className="text-slate-300 text-[11px] font-black uppercase">{item.name}</span></div><span className="text-white font-black text-[12px]">{item.value}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;