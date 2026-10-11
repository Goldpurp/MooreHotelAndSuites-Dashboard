import React from "react";
import { LayoutDashboard, CalendarDays, Bed, Users, FileBarChart, Settings,
  LogOut, ShieldCheck, ChevronLeft, ChevronRight, ClipboardList, CheckCircle2,
  UserSquare, FileLock2 } from "lucide-react";
import { useHotel } from "../store/HotelContext";
import Logo from "./Logo";
import { useConfirmation } from "./ConfirmationProvider";
import { canOpenTab } from "../lib/access";

const operations = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: CalendarDays },
  { id: "settlements", label: "Payments", icon: CheckCircle2 },
  { id: "rooms", label: "Rooms", icon: Bed },
  { id: "housekeeping", label: "Housekeeping", icon: ClipboardList },
  { id: "guests", label: "Guests", icon: Users },
  { id: "reports", label: "Stats", icon: FileBarChart },
];
const management = [
  { id: "operation_log", label: "Activity", icon: ClipboardList },
  { id: "privacy", label: "Privacy", icon: FileLock2 },
  { id: "staff", label: "Staff", icon: ShieldCheck },
  { id: "clients", label: "Clients", icon: UserSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

const Sidebar: React.FC = () => {
  const { logout, isSidebarCollapsed: collapsed, toggleSidebar, activeTab, setActiveTab, currentUser } = useHotel();
  const confirm = useConfirmation();
  const handleLogout = async () => {
    if (await confirm({ title: "Log out of Moore Hotels?", message: "You will need to enter your staff credentials again to access hotel operations.", confirmLabel: "Log out", cancelLabel: "Stay signed in", tone: "danger" })) logout();
  };
  const renderItem = (item: typeof operations[number]) => (
    <button key={item.id} type="button" aria-label={item.label}
      aria-current={activeTab === item.id ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      onClick={() => setActiveTab(item.id)}
      className={`relative flex min-h-11 w-full items-center rounded-xl border text-xs font-normal uppercase transition-colors duration-150 ${collapsed ? "justify-center px-2" : "gap-3 px-4"} ${activeTab === item.id ? "border-brand-500/20 bg-brand-600/20 text-white" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
      {activeTab === item.id && <span aria-hidden="true" className="absolute left-0 h-6 w-1 rounded-r-full bg-brand-500" />}
      <item.icon size={22} className={`shrink-0 ${activeTab === item.id ? "text-brand-500" : ""}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
  return (
    <aside aria-label="Main navigation" className={`relative z-50 hidden h-full shrink-0 flex-col border-r border-white/10 bg-slate-950 md:flex ${collapsed ? "w-20" : "w-64"}`}>
      <div className={`flex h-24 shrink-0 items-center overflow-hidden ${collapsed ? "justify-center px-3" : "gap-4 px-5"}`}>
        <Logo size={collapsed ? "md" : "xl"} className="shrink-0" />
        {!collapsed && <h1 className="text-sm font-semibold uppercase leading-tight text-white">Moore Hotels<br />&amp; Suites</h1>}
      </div>
      <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={toggleSidebar}
        className="absolute -right-3.5 top-20 z-[60] flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-brand-600 text-white hover:bg-brand-500 transition-colors">
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      <nav aria-label="Hotel pages" className="scroll-pane min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 py-5">
        {operations.filter(item => canOpenTab(currentUser, item.id)).map(renderItem)}
        <div className="mt-5 border-t border-white/5 pt-4">
          {!collapsed && <p className="mb-3 px-4 text-xs uppercase text-slate-500">Manage</p>}
          <div className="space-y-1.5">{management.filter(item => canOpenTab(currentUser, item.id)).map(renderItem)}</div>
        </div>
      </nav>
      <div className="shrink-0 border-t border-white/5 p-3">
        <button type="button" aria-label="Log Out" title={collapsed ? "Log Out" : undefined} onClick={handleLogout}
          className={`flex min-h-11 w-full items-center rounded-xl text-xs font-medium uppercase text-rose-400 hover:bg-rose-500/10 transition-colors ${collapsed ? "justify-center px-2" : "gap-3 px-4"}`}>
          <LogOut size={22} className="shrink-0" />{!collapsed && <span>Log Out</span>}
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;
