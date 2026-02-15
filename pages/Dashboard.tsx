import React, { useMemo, useState, useEffect } from "react";
import {
  DollarSign,
  UserCheck,
  Bed,
  Activity,
  ArrowRight,
  RefreshCw,
  PieChart as PieIcon,
  Clock,
  Zap,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { useHotel } from "../store/HotelContext";
import StatCard from "../components/StatCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BookingStatus, RoomStatus } from "../types";
import { api } from "../lib/api";

const Dashboard: React.FC = () => {
  const {
    bookings = [],
    rooms = [],
    setActiveTab,
    setSelectedBookingId,
    refreshData,
  } = useHotel();
  const [timeFilter, setTimeFilter] = useState<"Day" | "Week" | "Month">("Week");
  const [analytics, setAnalytics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queuePage, setQueuePage] = useState(1);
  const QUEUE_PAGE_SIZE = 8;

  const fetchDashboardData = async () => {
    try {
      const analyticsRes = await api.get("/api/analytics/overview", { params: { period: timeFilter.toLowerCase() } });
      setAnalytics(analyticsRes);
    } catch (e) {
      setAnalytics(null);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter, bookings, rooms]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    await fetchDashboardData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const sortedActionableBookings = useMemo(() => {
    const actionable = ['confirmed', 'pending', 'checkedin'];
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return [...bookings]
      .filter((b) => {
        const status = String(b.status || '').toLowerCase();
        if (!actionable.includes(status)) return false;

        // CRITICAL FILTER: If check-in is in the past and they haven't checked in, treat as invalid
        if (status === 'confirmed' || status === 'pending') {
          const bCheckIn = new Date(b.checkIn);
          bCheckIn.setHours(0, 0, 0, 0);
          if (bCheckIn < todayStart) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Overdue Calculation Utility
        const getOverdue = (booking: any) => {
          if (String(booking.status).toLowerCase() !== 'checkedin') return false;
          const checkoutDate = new Date(booking.checkOut);
          checkoutDate.setHours(11, 30, 0, 0);
          return now > checkoutDate;
        };

        const isOverdueA = getOverdue(a);
        const isOverdueB = getOverdue(b);

        // Priority 1: Overdue guests at the absolute top for immediate action
        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;

        // Priority 2: Arrange by check-in date (closest to now first)
        return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
      });
  }, [bookings]);

  const paginatedQueue = useMemo(() => {
    const start = (queuePage - 1) * QUEUE_PAGE_SIZE;
    return sortedActionableBookings.slice(start, start + QUEUE_PAGE_SIZE);
  }, [sortedActionableBookings, queuePage]);

  const totalQueuePages = Math.ceil(sortedActionableBookings.length / QUEUE_PAGE_SIZE);

  const revenueTrendData = useMemo(() => {
    if (analytics?.revenueTrend && analytics.revenueTrend.length > 0) return analytics.revenueTrend;
    const now = new Date();
    const result = [];
    const validBookings = (bookings || []).filter((b) => String(b.status).toLowerCase() !== 'cancelled');

    if (timeFilter === "Day") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
        const label = d.getHours() + ":00";
        const startTime = new Date(d.getTime() - 4 * 60 * 60 * 1000).getTime();
        const endTime = d.getTime();
        const revenue = validBookings
          .filter((b) => {
            const bt = new Date(b.createdAt).getTime();
            return bt >= startTime && bt <= endTime;
          })
          .reduce((sum, b) => sum + (b.amount || 0), 0);
        result.push({ date: label, revenue });
      }
    } else if (timeFilter === "Week") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        const revenue = validBookings
          .filter((b) => (b.createdAt || "").split("T")[0] === dateStr)
          .reduce((sum, b) => sum + (b.amount || 0), 0);
        result.push({ date: label, revenue });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i * 5);
        const label = d.getMonth() + 1 + "/" + d.getDate();
        const startTime = new Date(d.getTime() - 5 * 24 * 60 * 60 * 1000).getTime();
        const endTime = d.getTime();
        const revenue = validBookings
          .filter((b) => {
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
    const validBookings = (bookings || []).filter((b) => String(b.status).toLowerCase() !== 'cancelled');
    const now = new Date();
    const filterTime = timeFilter === "Day" ? 24 * 60 * 60 * 1000 : timeFilter === "Week" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const periodBookings = validBookings.filter((b) => now.getTime() - new Date(b.createdAt).getTime() <= filterTime);
    const periodRev = periodBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    
    const activeResidentsCount = (bookings || []).filter((b) => String(b.status).toLowerCase() === 'checkedin').length;
    
    const occupiedUnits = (rooms || []).filter((r) => String(r.status).toLowerCase() === 'occupied').length;
    const currOcc = (rooms || []).length > 0 ? Math.round((occupiedUnits / rooms.length) * 100) : 0;
    const currADR = periodBookings.length > 0 ? Math.round(periodRev / periodBookings.length) : 0;
    
    return {
      revenue: { value: analytics?.totalRevenue ?? periodRev, growth: analytics?.revenueGrowth ?? (timeFilter === "Week" ? 12.5 : 0) },
      occupancy: { value: analytics?.occupancyRate ?? currOcc, growth: analytics?.occupancyGrowth ?? 2.1 },
      activeGuests: { value: analytics?.totalActiveGuests ?? analytics?.activeGuests ?? activeResidentsCount, growth: 0 },
      adr: { value: analytics?.averageDailyRate ?? currADR, growth: 0 },
    };
  }, [analytics, bookings, rooms, timeFilter]);

  const roomStatusData = useMemo(() => [
    { name: "Occupied", value: (rooms || []).filter((r) => String(r.status).toLowerCase() === 'occupied').length, color: "#3b82f6" },
    { name: "Available", value: (rooms || []).filter((r) => String(r.status).toLowerCase() === 'available').length, color: "#10b981" },
    { name: "Cleaning", value: (rooms || []).filter((r) => String(r.status).toLowerCase() === 'cleaning').length, color: "#f59e0b" },
    { name: "Reserved", value: (rooms || []).filter((r) => String(r.status).toLowerCase() === 'reserved').length, color: "#6365f1f0" },
    { name: "Maintenance", value: (rooms || []).filter((r) => String(r.status).toLowerCase() === 'maintenance').length, color: "#ef4444" },
  ], [rooms]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
            <p className="adaptive-text-xs text-blue-400 font-black uppercase tracking-widest">Property Overview</p>
          </div>
          <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase leading-none">Management Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? "animate-spin" : ""}`}><RefreshCw size={16} /></button>
          <div className="flex gap-1 p-1 bg-white/5 border border-white/5 rounded-xl shrink-0">
            {(["Day", "Week", "Month"] as const).map((t) => (
              <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-1.5 rounded-lg adaptive-text-xs font-black uppercase tracking-widest transition-all ${timeFilter === t ? "bg-blue-600 text-white shadow-lg" : "text-slate-600 hover:text-slate-200"}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₦${stats.revenue.value.toLocaleString()}`} growth={stats.revenue.growth} icon={DollarSign} color="bg-blue-500/10 text-blue-400" />
        <StatCard label="Occupancy Rate" value={`${stats.occupancy.value}%`} growth={stats.occupancy.growth} icon={Bed} color="bg-emerald-500/10 text-emerald-400" />
        <StatCard label="Current Guests" value={stats.activeGuests.value} growth={0} icon={UserCheck} color="bg-amber-500/10 text-amber-400" />
        <StatCard label="Avg Daily Rate" value={`₦${stats.adr.value.toLocaleString()}`} growth={0} icon={Activity} color="bg-indigo-500/10 text-indigo-400" />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-8 glass-card adaptive-p rounded-2xl border border-white/5 flex flex-col min-h-[350px]">
          <h3 className="adaptive-text-lg font-black text-white uppercase tracking-tight mb-8 px-2">Revenue Trends</h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#475569" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} itemStyle={{ fontSize: "11px", fontWeight: 900, color: "#3b82f6" }} labelStyle={{ fontSize: "9px", fontWeight: 900, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4 glass-card adaptive-p rounded-2xl border border-white/5 flex flex-col min-h-[350px]">
          <h3 className="adaptive-text-lg font-black text-white uppercase tracking-tight mb-4 px-2">Room Inventory</h3>
          <div className="h-44 relative mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roomStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                  {roomStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }} itemStyle={{ fontSize: "11px", fontWeight: 900 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="adaptive-text-2xl font-black text-white">{(rooms || []).length}</span>
              <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest mt-1">Total Rooms</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto custom-scrollbar">
            {roomStatusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest truncate">{item.name}</span>
                </div>
                <span className="text-white font-black text-[12px]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-white/5 flex flex-col min-h-[500px]">
        <div className="adaptive-p border-b border-white/5 flex items-center justify-between bg-slate-900/40 px-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 rounded-lg text-blue-500"><Clock size={18} /></div>
            <h3 className="adaptive-text-lg font-black text-white uppercase tracking-tight leading-none">Operational Queue</h3>
          </div>
          <button onClick={() => setActiveTab("bookings")} className="bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2 transition-all">All Bookings <ArrowRight size={14} /></button>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5 bg-slate-900/20">
                <th className="responsive-table-padding">Guest Details</th>
                <th className="responsive-table-padding col-priority-med">Stay Period</th>
                <th className="responsive-table-padding col-priority-low">Room</th>
                <th className="responsive-table-padding">Booking Status</th>
                <th className="responsive-table-padding text-right">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedQueue.length === 0 ? (
                <tr><td colSpan={5} className="py-24 text-center text-slate-700 font-black uppercase text-[11px] tracking-widest">Operational Queue Clear</td></tr>
              ) : (
                paginatedQueue.map((booking) => {
                  const room = (rooms || []).find((r) => r.id === booking.roomId);
                  const isPaid = String(booking.paymentStatus || '').toLowerCase() === 'paid';
                  const isCheckedIn = String(booking.status || '').toLowerCase() === 'checkedin';
                  
                  // Detect overdue check-out
                  const checkoutDate = new Date(booking.checkOut);
                  checkoutDate.setHours(11, 30, 0, 0);
                  const isOverdue = isCheckedIn && new Date() > checkoutDate;
                  const isIncomingSoon = !isCheckedIn && new Date(booking.checkIn).toLocaleDateString() === new Date().toLocaleDateString();

                  return (
                    <tr key={booking.id} className={`group transition-all cursor-pointer border-l-4 ${isOverdue ? 'bg-rose-500/10 border-rose-500 hover:bg-rose-500/20 animate-pulse' : 'hover:bg-white/5 border-transparent hover:border-blue-600'}`} onClick={() => { setSelectedBookingId(booking.id); setActiveTab(isOverdue ? "guests" : "bookings"); }}>
                      <td className="responsive-table-padding">
                        <div className="flex items-center gap-4">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black shrink-0 ${isOverdue ? "bg-rose-500/20 border-rose-500/40 text-rose-500 animate-pulse" : isCheckedIn ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : isIncomingSoon ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-slate-800 border-white/10 text-slate-500"}`}>{booking.guestFirstName?.charAt(0) || "G"}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className={`adaptive-text-sm font-black truncate leading-none uppercase tracking-tight ${isOverdue ? 'text-rose-400 animate-pulse' : 'text-white'}`}>{booking.guestFirstName} {booking.guestLastName}</p>
                              {isOverdue && <AlertTriangle size={12} className="text-rose-500 animate-bounce" />}
                            </div>
                            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Ref: {booking.bookingCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="responsive-table-padding col-priority-med">
                        <p className={`adaptive-text-sm font-black ${isOverdue ? 'text-rose-500' : isIncomingSoon ? 'text-blue-400' : 'text-slate-300'}`}>{new Date(isCheckedIn ? booking.checkOut : booking.checkIn).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>
                        <p className={`text-[8px] font-bold uppercase mt-1 ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`}>
                          {isOverdue ? 'EXCEEDED TIME' : isCheckedIn ? 'Departure' : 'Arrival Status'}
                        </p>
                      </td>
                      <td className="responsive-table-padding col-priority-low">
                        <p className="adaptive-text-sm font-black text-slate-300 leading-none">Room {room?.roomNumber || "..."}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">{room?.category}</p>
                      </td>
                      <td className="responsive-table-padding">
                        <div className="flex flex-col gap-1.5">
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit ${
                            isOverdue ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                            isCheckedIn ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                            String(booking.status).toLowerCase() === 'confirmed' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${isOverdue ? 'bg-rose-500 animate-ping' : isCheckedIn ? "bg-emerald-400 animate-pulse" : "bg-current"}`}></span>
                            {isOverdue ? "EXCEEDED STAY" : isCheckedIn ? "In-House" : booking.status}
                          </span>
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-1 ${isPaid ? 'text-emerald-500' : 'text-rose-500'}`}>{isPaid ? 'Payment Confirmed' : 'Payment Pending'}</span>
                        </div>
                      </td>
                      <td className="responsive-table-padding text-right">
                        <div className="flex flex-col items-end">
                           <p className={`adaptive-text-base font-black ${isPaid ? 'text-white' : 'text-rose-500'}`}>₦{booking.amount?.toLocaleString() || "0"}</p>
                           <p className="text-[8px] text-slate-700 font-black uppercase mt-1">{isPaid ? 'Fully Paid' : 'Outstanding'}</p>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-950/40 border-t border-white/5 flex items-center justify-between">
           <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Showing {paginatedQueue.length} of {sortedActionableBookings.length} entries</div>
           <div className="flex gap-2">
              <button onClick={() => setQueuePage(p => Math.max(1, p - 1))} disabled={queuePage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={16} /></button>
              <button onClick={() => setQueuePage(p => Math.min(totalQueuePages, p + 1))} disabled={queuePage === totalQueuePages || totalQueuePages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={16} /></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;