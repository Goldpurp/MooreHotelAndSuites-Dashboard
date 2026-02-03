import React from 'react';
import { UserRole } from '../types';

interface RoleBadgeProps {
  role: string | undefined | null;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  // Use PascalCase keys to match UserRole exactly
  const activeRole = (role || 'Staff') as UserRole;

  const config: Record<UserRole, { label: string; classes: string }> = {
    Admin: { label: 'Admin', classes: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    Manager: { label: 'Manager', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    Staff: { label: 'Staff', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    Client: { label: 'Guest', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };

  // Fallback to Staff if role is unrecognized
  const activeConfig = config[activeRole] || config.Staff;

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${activeConfig.classes}`}>
      {activeConfig.label}
    </span>
  );
};

export default RoleBadge;