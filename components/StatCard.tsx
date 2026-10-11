import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  growth: number | null;
  icon: LucideIcon;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, growth, icon: Icon, color }) => {
  const isPositive = growth !== null && growth >= 0;

  return (
    <div className="glass-card p-5 rounded-2xl transition-all duration-300 group overflow-hidden relative border border-white/5">
      <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <Icon size={90} />
      </div>
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-slate-500 text-xs font-normal uppercase tracking-normal mb-1.5 opacity-80">{label}</p>
          <h3 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">{value}</h3>
          {growth !== null && Number.isFinite(growth) && <div className="flex items-center gap-2">
            <div className={`flex items-center gap-0.5 text-xs font-normal px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              <span>{Math.abs(growth)}%</span>
            </div>
            <span className="text-xs text-slate-600 font-normal uppercase tracking-tighter">vs prev.</span>
          </div>}
        </div>
        <div className={`p-3 rounded-xl shadow-lg transition-transform group-hover:scale-105 duration-300 ${color}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;