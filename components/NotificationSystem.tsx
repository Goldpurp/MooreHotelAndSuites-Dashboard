
import React, { useEffect, useState, useMemo } from 'react';
import { useHotel } from '../store/HotelContext';
import { Info, CheckCircle, AlertTriangle, X, Bell, Calendar } from 'lucide-react';
import { AppNotification } from '../types';

const NotificationSystem: React.FC = () => {
  const { notifications } = useHotel();
  const [active, setActive] = useState<AppNotification | null>(null);

  useEffect(() => {
    // Only show unread notifications that arrived recently (within last 8s)
    // We use a slightly longer window to catch updates that happen during route transitions
    const latest = notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (latest && !latest.isRead) {
      const timeDiff = Date.now() - new Date(latest.createdAt).getTime();
      // Only toast if it's actually "new" to this session's lifecycle (within 8 seconds of now)
      if (timeDiff < 8000) {
        setActive(latest);
      }
    }
  }, [notifications]);

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        setActive(null);
      }, 6000); 
      return () => clearTimeout(timer);
    }
  }, [active]);

  // Infer styling based on notification content since backend doesn't provide 'type'
  const style = useMemo(() => {
    if (!active) return null;
    const title = active.title.toLowerCase();
    if (title.includes('reservation') || title.includes('booking')) {
      return {
        border: 'border-emerald-500/30',
        iconBg: 'bg-emerald-500/10 text-emerald-400',
        icon: <Calendar size={16} />
      };
    }
    if (title.includes('payment') || title.includes('settlement') || title.includes('transfer')) {
      return {
        border: 'border-amber-500/30',
        iconBg: 'bg-amber-500/10 text-amber-400',
        icon: <CheckCircle size={16} />
      };
    }
    if (title.includes('error') || title.includes('failed') || title.includes('alert')) {
      return {
        border: 'border-rose-500/30',
        iconBg: 'bg-rose-500/10 text-rose-400',
        icon: <AlertTriangle size={16} />
      };
    }
    return {
      border: 'border-brand-500/30',
      iconBg: 'bg-brand-500/10 text-brand-400',
      icon: <Bell size={16} />
    };
  }, [active]);

  if (!active || !style) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] w-80 pointer-events-none">
      <div 
        key={active.id} 
        className={`p-4 rounded-2xl border shadow-3xl flex items-start gap-4 animate-in slide-in-from-right-10 fade-in duration-500 pointer-events-auto backdrop-blur-3xl bg-slate-900/90 ${style.border}`}
      >
        <div className={`mt-0.5 shrink-0 p-2 rounded-lg ${style.iconBg}`}>
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-black text-white uppercase tracking-tight leading-tight">{active.title}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-1.5 leading-relaxed whitespace-pre-line">{active.message}</p>
          <p className="text-[8px] font-black opacity-30 mt-2.5 uppercase tracking-dash">
            {new Date(active.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button 
          onClick={() => setActive(null)}
          className="text-slate-600 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotificationSystem;
