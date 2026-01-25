
import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: string | undefined | null;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const normalizedRole = (role?.toLowerCase() || 'staff') as UserRole;

  const config = {
    admin: { label: 'Admin', classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    manager: { label: 'Manager', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    staff: { label: 'Staff', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    client: { label: 'Guest', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };

  // Fallback to staff if role is unrecognized
  const activeConfig = config[normalizedRole] || config.staff;

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${activeConfig.classes}`}>
      {activeConfig.label}
    </span>
  );
};

export default RoleBadge;
