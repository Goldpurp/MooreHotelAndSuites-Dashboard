import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Bed,
  Users,
  FileBarChart,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  UserSquare,
} from "lucide-react";
import { useHotel } from "../store/HotelContext";
import PermissionWrapper from "./PermissionWrapper";
import Logo from "./Logo";
import { UserRole } from "../types";

const Sidebar: React.FC = () => {
  const { logout, isSidebarCollapsed, toggleSidebar, activeTab, setActiveTab } =
    useHotel();

  const menuItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "bookings", label: "Reservations", icon: CalendarDays },
    { id: "settlements", label: "Confirmations", icon: CheckCircle2 },
    { id: "rooms", label: "Rooms", icon: Bed },
    { id: "guests", label: "Guests", icon: Users },
  ];

  return (
    <aside
      className={`h-screen bg-slate-950/95 backdrop-blur-3xl border-r border-white/10 flex flex-col fixed left-0 top-0 z-50 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
        isSidebarCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="p-6 flex items-center gap-4 h-24 overflow-hidden">
        <Logo
          size={isSidebarCollapsed ? "md" : "xl"}
          className="shrink-0 transition-all duration-300"
        />
        {!isSidebarCollapsed && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <h1 className="text-sm font-black text-white tracking-tighter whitespace-nowrap leading-tight uppercase">
              Moore Hotels <br /> & Suites
            </h1>
            {/* <p className="text-brand-500 font-black tracking-dash uppercase whitespace-nowrap mt-0.5">
              Global Operations
            </p> */}
          </div>
        )}
      </div>

      <button
        onClick={toggleSidebar}
        className="absolute -right-3.5 top-20 w-7 h-7 bg-brand-600 rounded-full border border-white/20 flex items-center justify-center text-white shadow-2xl hover:bg-brand-500 transition-all z-[60] active:scale-90 group"
      >
        {isSidebarCollapsed ? (
          <ChevronRight size={16} />
        ) : (
          <ChevronLeft size={16} />
        )}
      </button>

      <nav className="flex-1 px-4 pt-8 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
              activeTab === item.id
                ? "bg-brand-600/20 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-brand-500/20"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
            }`}
          >
            {activeTab === item.id && (
              <div className="absolute left-0 w-1.5 h-6 bg-brand-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
            )}
            <item.icon
              size={22}
              className={`shrink-0 transition-all ${activeTab === item.id ? "text-brand-500 scale-110" : "group-hover:text-slate-200 group-hover:scale-105"}`}
            />
            <span
              className={`font-black text-[12px] tracking-widest uppercase transition-all duration-500 ${
                isSidebarCollapsed
                  ? "opacity-0 -translate-x-10 invisible"
                  : "opacity-100 translate-x-0 visible"
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}

        {/* RESTRICTED: Only Admin and Manager can access Analytics */}
        <PermissionWrapper allowedRoles={[UserRole.Admin, UserRole.Manager]}>
          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
              activeTab === "reports"
                ? "bg-brand-600/20 text-white border border-brand-500/20"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
            }`}
          >
            {activeTab === "reports" && (
              <div className="absolute left-0 w-1.5 h-6 bg-brand-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
            )}
            <FileBarChart
              size={22}
              className={`shrink-0 transition-all ${activeTab === "reports" ? "text-brand-500 scale-110" : "group-hover:text-slate-200"}`}
            />
            <span
              className={`font-black text-[12px] tracking-widest uppercase transition-all duration-500 ${isSidebarCollapsed ? "opacity-0 invisible -translate-x-10" : "opacity-100 visible translate-x-0"}`}
            >
              Analytics
            </span>
          </button>
        </PermissionWrapper>

        <div className="pt-10">
          {!isSidebarCollapsed && (
            <p className="px-4 text-[10px] text-slate-600 font-black uppercase tracking-dash mb-5 flex items-center gap-2">
              <span className="w-4 h-px bg-slate-800"></span> Administration
            </p>
          )}

          <div className="space-y-1.5">
            <PermissionWrapper
              allowedRoles={[UserRole.Admin, UserRole.Manager]}
            >
              <button
                onClick={() => setActiveTab("operation_log")}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
                  activeTab === "operation_log"
                    ? "bg-brand-600/20 text-white border border-brand-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                }`}
              >
                <ClipboardList
                  size={22}
                  className={`shrink-0 ${activeTab === "operation_log" ? "text-brand-500" : "group-hover:text-slate-200"}`}
                />
                <span
                  className={`font-black text-[12px] tracking-widest uppercase transition-all duration-500 ${isSidebarCollapsed ? "opacity-0 invisible -translate-x-10" : "opacity-100 visible translate-x-0"}`}
                >
                  Operation Log
                </span>
              </button>

              <button
                onClick={() => setActiveTab("staff")}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
                  activeTab === "staff"
                    ? "bg-brand-600/20 text-white border border-brand-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                }`}
              >
                <ShieldCheck
                  size={22}
                  className={`shrink-0 ${activeTab === "staff" ? "text-brand-500" : "group-hover:text-slate-200"}`}
                />
                <span
                  className={`font-black text-[12px] tracking-widest uppercase transition-all duration-500 ${isSidebarCollapsed ? "opacity-0 invisible -translate-x-10" : "opacity-100 visible translate-x-0"}`}
                >
                  Staffing
                </span>
              </button>

              <button
                onClick={() => setActiveTab("clients")}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
                  activeTab === "clients"
                    ? "bg-brand-600/20 text-white border border-brand-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                }`}
              >
                <UserSquare
                  size={22}
                  className={`shrink-0 ${activeTab === "clients" ? "text-brand-500" : "group-hover:text-slate-200"}`}
                />
                <span
                  className={`font-black text-[12px] tracking-widest uppercase transition-all duration-500 ${isSidebarCollapsed ? "opacity-0 invisible -translate-x-10" : "opacity-100 visible translate-x-0"}`}
                >
                  Clients
                </span>
              </button>
            </PermissionWrapper>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group ${
                activeTab === "settings"
                  ? "bg-brand-600/20 text-white border border-brand-500/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Settings
                size={22}
                className={`shrink-0 ${activeTab === "settings" ? "text-brand-500" : "group-hover:text-slate-200"}`}
              />
              <span
                className={`font-black text-[12px] tracking-widest uppercase transition-all duration-500 ${isSidebarCollapsed ? "opacity-0 invisible -translate-x-10" : "opacity-100 visible translate-x-0"}`}
              >
                Settings
              </span>
            </button>
          </div>
        </div>
      </nav>

      <div className="p-4 mt-auto border-t border-white/5">
        <button
          onClick={logout}
          className="w-full flex items-center gap-4 px-4 py-4 text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-400 rounded-2xl transition-all text-[12px] font-black uppercase tracking-widest group"
        >
          <LogOut
            size={22}
            className="group-hover:-translate-x-1 transition-transform shrink-0"
          />
          <span
            className={`transition-all duration-500 ${isSidebarCollapsed ? "opacity-0 invisible -translate-x-10" : "opacity-100 visible translate-x-0"}`}
          >
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
