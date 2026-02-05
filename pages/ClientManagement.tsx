import React, { useState, useMemo } from "react";
import { useHotel } from "../store/HotelContext";
import {
  UserPlus,
  Search,
  ShieldCheck,
  ShieldOff,
  Users,
  RefreshCw,
  Mail,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight,
  Database,
  SearchX,
  UserMinus,
  UserCheck,
  Fingerprint,
  Globe,
  Shield,
} from "lucide-react";
import RoleBadge from "../components/RoleBadge";
import PermissionWrapper from "../components/PermissionWrapper";
import StaffSuspensionModal from "../components/StaffSuspensionModal";
import { StaffUser, UserRole } from "../types";

const ClientManagement: React.FC = () => {
  const { staff, toggleStaffStatus, refreshData, currentUser } = useHotel();
  const [isSuspensionOpen, setIsSuspensionOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<StaffUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Suspended"
  >("All");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  /**
   * REGISTRY RESOLUTION
   * Strictly filters for UserRole.Client to ensure segregated management.
   */
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const allClients = (staff || []).filter(
      (s) => s && s.role === UserRole.Client,
    );

    return allClients.filter((s) => {
      const matchesSearch =
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q);

      const sStatus = String(s.status).toLowerCase();
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && sStatus === "active") ||
        (statusFilter === "Suspended" && sStatus === "suspended");

      return matchesSearch && matchesStatus;
    });
  }, [staff, searchQuery, statusFilter]);

  const handleToggleAccessRequest = (user: StaffUser) => {
    if (currentUser?.role !== UserRole.Admin) return;
    setUserToToggle(user);
    setIsSuspensionOpen(true);
  };

  const isAdminActor = currentUser?.role === UserRole.Admin;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[2px] bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)]"></span>
            <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.25em]">
              Global Client Identity Node
            </p>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight uppercase italic leading-none">
            Client Registry
          </h2>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-3 italic">
            External Identity Management — Authorized Access Hub
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            className={`p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all shadow-xl active:scale-95 ${isRefreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Statistical Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            label: "Active Clients",
            value: filteredClients.filter(
              (s) => String(s.status).toLowerCase() === "active",
            ).length,
            color: "text-emerald-400",
            icon: Globe,
            sub: "Authorized Identity",
          },
          {
            label: "Total Enrolled",
            value: filteredClients.length,
            color: "text-brand-400",
            icon: Users,
            sub: "External Registry",
          },
          {
            label: "Revoked Identities",
            value: filteredClients.filter(
              (s) => String(s.status).toLowerCase() === "suspended",
            ).length,
            color: "text-rose-400",
            icon: ShieldOff,
            sub: "Locked Portals",
          },
        ].map((node) => (
          <div
            key={node.label}
            className="glass-card p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group bg-slate-900/20"
          >
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <node.icon size={100} />
            </div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-slate-950 rounded-2xl border border-white/10 shadow-inner">
                <node.icon size={20} className={node.color} />
              </div>
              <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">
                Cloud Sync
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] block mb-1">
                {node.label}
              </span>
              <div className="flex items-baseline gap-2">
                <h4
                  className={`text-4xl font-black italic tracking-tighter ${node.color}`}
                >
                  {node.value}
                </h4>
                <span className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">
                  {node.sub}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Registry Table */}
      <div className="glass-card rounded-[2.5rem] flex flex-col overflow-hidden border border-white/5 shadow-3xl bg-slate-900/10 backdrop-blur-3xl">
        <div className="px-8 py-6 border-b border-white/5 flex flex-wrap justify-between items-center gap-6 bg-slate-950/60">
          <div className="relative flex-1 max-w-xl group">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors"
              size={16}
            />
            <input
              type="text"
              placeholder="Filter Client Registry by Identity or Mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-white/5 rounded-2xl py-4.5 pl-14 pr-6 text-[13px] text-slate-200 outline-none focus:bg-slate-950 transition-all font-black uppercase tracking-tight placeholder:text-slate-700"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 overflow-hidden">
              {(["All", "Active", "Suspended"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === f
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "text-slate-600 hover:text-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-4 px-6 py-3 rounded-2xl border border-white/5 bg-black/40">
              <Fingerprint size={16} className="text-emerald-500" />
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                Identity Verified
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md z-10">
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">
                <th className="px-10 py-6 border-b border-white/10">
                  Client Persona
                </th>
                <th className="px-10 py-6 border-b border-white/10">
                  Authorized Role
                </th>
                <th className="px-10 py-6 border-b border-white/10">
                  Member Since
                </th>
                <th className="px-10 py-6 border-b border-white/10 text-center">
                  Lifecycle Status
                </th>
                <th className="px-10 py-6 border-b border-white/10 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-48 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                      <SearchX size={64} className="text-slate-700" />
                      <p className="text-[15px] font-black uppercase tracking-[0.5em] text-slate-600 italic">
                        No client records detected
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((user) => {
                  if (!user) return null;
                  const isActive =
                    String(user.status).toLowerCase() === "active";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-emerald-500/[0.04] transition-all group border-l-4 border-transparent hover:border-emerald-500"
                    >
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <img
                              src={
                                user.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=020617&color=fff`
                              }
                              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-emerald-500/40 transition-all shadow-xl"
                              alt=""
                            />
                            {isActive && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-slate-950 shadow-sm animate-pulse"></div>
                            )}
                          </div>
                          <div>
                            <p className="text-[16px] font-black text-white group-hover:text-emerald-400 transition-colors uppercase italic tracking-tight">
                              {user.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Mail size={10} className="text-slate-600" />
                              <p className="text-[10px] text-slate-500 font-bold tracking-tight lowercase">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-2.5">
                          <Calendar size={14} className="text-slate-600" />
                          <p className="text-[12px] font-black text-slate-300 uppercase italic tracking-tighter">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "SYS-ENTRY"}
                          </p>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <div className="flex justify-center">
                          <span
                            className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all flex items-center gap-2.5 ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                            }`}
                          >
                            {isActive ? (
                              <ShieldCheck size={10} />
                            ) : (
                              <ShieldOff size={10} />
                            )}
                            {isActive ? "Active" : "Suspended"}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <div
                          className="flex justify-end gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isAdminActor ? (
                            <button
                              onClick={() => handleToggleAccessRequest(user)}
                              className={`p-4 rounded-2xl border transition-all active:scale-90 flex items-center justify-center ${
                                isActive
                                  ? "bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white border-rose-500/20 shadow-xl shadow-rose-950/20"
                                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-600 hover:text-white border-emerald-500/20 shadow-xl shadow-emerald-950/20"
                              }`}
                              title={
                                isActive
                                  ? "Authorize Portal Deactivation"
                                  : "Authorize Portal Activation"
                              }
                            >
                              {isActive ? (
                                <UserMinus size={22} strokeWidth={2.5} />
                              ) : (
                                <UserCheck size={22} strokeWidth={2.5} />
                              )}
                            </button>
                          ) : (
                            <div
                              className="p-4 bg-white/5 rounded-2xl border border-white/5 text-slate-800 opacity-20"
                              title="Administrative Access Required for Client Lifecycle"
                            >
                              <Lock size={20} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-10 py-8 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield size={20} className="text-emerald-500" />
            <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.35em] italic">
              Identity Registry • Global Client Management Mode
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleManualRefresh}
              className="p-4 border border-white/10 rounded-2xl text-slate-600 hover:text-white transition-all bg-white/5 hover:bg-white/10"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center px-8 rounded-2xl bg-black/40 border border-white/10">
              <span className="text-[12px] font-black text-white tracking-widest uppercase italic pt-1 leading-none">
                Identity Cloud
              </span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="p-4 border border-white/10 rounded-2xl text-slate-600 hover:text-white transition-all bg-white/5 hover:bg-white/10"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <StaffSuspensionModal
        isOpen={isSuspensionOpen}
        onClose={() => setIsSuspensionOpen(false)}
        onConfirm={toggleStaffStatus}
        user={userToToggle}
      />
    </div>
  );
};

export default ClientManagement;
