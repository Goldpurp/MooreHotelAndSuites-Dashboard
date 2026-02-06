
import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: string | undefined | null;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const normalizedRole = (role?.toLowerCase() || 'staff') as string;

  const config: Record<string, { label: string; classes: string }> = {
    admin: { label: 'Admin', classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' },
    manager: { label: 'Manager', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' },
    staff: { label: 'Staff', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    client: { label: 'Client', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };

  const activeConfig = config[normalizedRole] || config.staff;

  return (
    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border transition-all ${activeConfig.classes}`}>
      {activeConfig.label}
    </span>
  );
};

export default RoleBadge;
