import React, { useState } from 'react';
import {
  Bed,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserSquare,
  Users,
  X,
} from 'lucide-react';
import { useHotel } from '../store/HotelContext';
import { UserRole } from '../types';
import { useConfirmation } from './ConfirmationProvider';

const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, logout, userRole } = useHotel();
  const confirm = useConfirmation();
  const [moreOpen, setMoreOpen] = useState(false);

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setMoreOpen(false);
  };

  const handleLogout = async () => {
    const accepted = await confirm({
      title: 'Log out of Moore Hotels?',
      message: 'You will need to enter your staff credentials again to access hotel operations.',
      confirmLabel: 'Log out',
      cancelLabel: 'Stay signed in',
      tone: 'danger',
    });
    if (accepted) logout();
  };

  const privileged = userRole === UserRole.Admin || userRole === UserRole.Manager;
  const primary = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'bookings', label: 'Bookings', icon: CalendarDays },
    { id: 'rooms', label: 'Rooms', icon: Bed },
    { id: 'settlements', label: 'Payments', icon: CheckCircle2, visible: privileged },
  ].filter((item) => item.visible !== false);
  const secondary = [
    { id: 'guests', label: 'Guests', icon: Users, visible: true },
    { id: 'reports', label: 'Reports', icon: FileBarChart, visible: privileged },
    { id: 'operation_log', label: 'Activity', icon: ClipboardList, visible: privileged },
    { id: 'staff', label: 'Staff', icon: ShieldCheck, visible: privileged },
    { id: 'clients', label: 'Clients', icon: UserSquare, visible: privileged },
    { id: 'settings', label: 'Settings', icon: Settings, visible: true },
  ].filter((item) => item.visible);

  return (
    <>
      {moreOpen && (
        <div className="mobile-nav-backdrop fixed inset-0 z-[145] bg-slate-950/70 backdrop-blur-sm md:hidden" onClick={() => setMoreOpen(false)}>
          <section
            className="mobile-nav-sheet absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] rounded-3xl border border-white/10 bg-slate-900 p-4 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">More</p>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close more navigation" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {secondary.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left text-xs font-bold ${
                    activeTab === item.id
                      ? 'border-brand-500/30 bg-brand-500/15 text-white'
                      : 'border-white/5 bg-white/[0.03] text-slate-400'
                  }`}
                >
                  <item.icon size={18} className="shrink-0" /> {item.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={handleLogout} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/10 text-xs font-extrabold uppercase tracking-wider text-rose-400">
              <LogOut size={18} /> Log out
            </button>
          </section>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-[150] border-t border-white/10 bg-slate-950/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl md:hidden" aria-label="Primary navigation">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {primary.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-bold ${
                activeTab === item.id ? 'bg-brand-500/15 text-brand-400' : 'text-slate-500'
              }`}
            >
              <item.icon size={19} />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[9px] font-bold text-slate-500"
          >
            <Menu size={19} /> <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
