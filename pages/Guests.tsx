import React, { useState, useMemo, useEffect } from "react";
import { useHotel } from "../store/HotelContext";
import { Guest, Booking, Room, PaymentStatus } from "../types";
import {
  Search,
  Phone,
  LogOut,
  UserCheck,
  RefreshCw,
  Archive,
  Mail,
  CreditCard,
  Bed,
  ShieldCheck,
  History,
  User,
  ArrowRight,
  Calendar,
  ExternalLink,
  AlertCircle,
  Zap,
  Users,
  Fingerprint,
} from "lucide-react";
import CheckOutModal from "../components/CheckOutModal";

const Guests: React.FC = () => {
  const {
    guests,
    bookings,
    rooms,
    checkOutBooking,
    setActiveTab,
    selectedGuestId,
    setSelectedGuestId,
    setSelectedBookingId,
    refreshData,
  } = useHotel();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setLocalActiveTab] = useState<"in-house" | "history">(
    "in-house",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [activeCheckOutData, setActiveCheckOutData] = useState<{
    guest: Guest | null;
    booking: Booking | null;
    room: Room | null;
  }>({
    guest: null,
    booking: null,
    room: null,
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  /**
   * ADVANCED IDENTITY RESOLUTION ENGINE (v3.0)
   *
   * Strict Protocol:
   * 1. ACTIVE BOOKINGS are the primary source of truth. Data from the check-in record
   *    (Name, Email, Phone) takes precedence over the global registry.
   * 2. NO FUZZY MATCHING: Active residents are keyed by their specific Folio Code
   *    to prevent collision with other guests sharing contact info.
   * 3. ID ALIGNMENT: Prioritizes human-readable Dossier Codes (e.g. GS-EF2292)
   *    over system UUIDs for visual identification.
   */
  const unifiedResidentList = useMemo(() => {
    const registry = new Map<string, any>();

    // Phase 1: Identify and Lock Active Residents
    (bookings || []).forEach((b) => {
      const bStatus = b.status?.toLowerCase();
      const isActive = bStatus === "checkedin" || bStatus === "inhouse";

      if (isActive) {
        // Primary Key for Active: The Folio Code (ensure uniqueness and correct ID display)
        const identityKey = `ACT-${b.bookingCode}`;

        // Find matching global profile for metadata ONLY (like avatar),
        // but never let its stale data overwrite this specific stay's info.
        const match = (guests || []).find(
          (g) => b.guestId && g.id === b.guestId,
        );

        registry.set(identityKey, {
          // Use the human-readable Folio Code as the identifier the user requested
          id: b.bookingCode || b.id,
          registryId: b.guestId || null,
          firstName: b.guestFirstName || match?.firstName || "Resident",
          lastName: b.guestLastName || match?.lastName || "",
          email: b.guestEmail || match?.email || "",
          phone: b.guestPhone || match?.phone || "",
          avatarUrl:
            match?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent((b.guestFirstName || "R") + " " + (b.guestLastName || ""))}&background=020617&color=fff`,
          activeStay: {
            booking: b,
            room: rooms.find((r) => r.id === b.roomId) || null,
          },
          history: [],
          totalSpent: b.amount || 0,
        });
      }
    });

    // Phase 2: Process Registry/History for non-active profiles
    (bookings || []).forEach((b) => {
      const bStatus = b.status?.toLowerCase();
      if (bStatus !== "checkedout") return;

      // Check if this resident is already handled as "Active" in another room (multi-room folio)
      const isActiveElsewhere = Array.from(registry.values()).some(
        (r) =>
          r.activeStay &&
          r.email?.toLowerCase() === b.guestEmail?.toLowerCase() &&
          r.email !== "",
      );

      if (isActiveElsewhere) return;

      const identityKey =
        b.guestId || b.guestEmail?.toLowerCase() || `HIST-${b.bookingCode}`;

      if (!registry.has(identityKey)) {
        registry.set(identityKey, {
          id: b.bookingCode || b.guestId || identityKey,
          registryId: b.guestId || null,
          firstName: b.guestFirstName || "Resident",
          lastName: b.guestLastName || "",
          email: b.guestEmail || "",
          phone: b.guestPhone || "",
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent((b.guestFirstName || "R") + " " + (b.guestLastName || ""))}&background=020617&color=fff`,
          activeStay: null,
          history: [],
          totalSpent: 0,
        });
      }

      const profile = registry.get(identityKey);
      profile.history.push(b);
      profile.totalSpent += b.amount || 0;
    });

    return Array.from(registry.values());
  }, [guests, bookings, rooms]);

  const filteredResidents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return unifiedResidentList
      .filter((r) => {
        const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
        const matchesSearch =
          fullName.includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.includes(q) ||
          String(r.id).toLowerCase().includes(q);

        if (activeTab === "in-house") {
          return matchesSearch && !!r.activeStay;
        } else {
          return matchesSearch && !r.activeStay && r.history.length > 0;
        }
      })
      .sort((a, b) => {
        // Current occupants first by check-in date
        if (activeTab === "in-house" && a.activeStay && b.activeStay) {
          return (
            new Date(b.activeStay.booking.checkIn).getTime() -
            new Date(a.activeStay.booking.checkIn).getTime()
          );
        }
        return 0;
      });
  }, [unifiedResidentList, searchQuery, activeTab]);

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGuestId) {
      setLocalSelectedId(selectedGuestId);
      const target = unifiedResidentList.find(
        (r) => r.id === selectedGuestId || r.registryId === selectedGuestId,
      );
      if (target) {
        setLocalActiveTab(target.activeStay ? "in-house" : "history");
        setLocalSelectedId(target.id);
      }
    } else if (filteredResidents.length > 0 && !localSelectedId) {
      setLocalSelectedId(filteredResidents[0].id);
    }
  }, [selectedGuestId, filteredResidents, unifiedResidentList]);

  const selectedResident = useMemo(
    () => filteredResidents.find((r) => r.id === localSelectedId),
    [filteredResidents, localSelectedId],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-700 overflow-hidden">
      <div className="flex-[2.5] flex flex-col gap-4 overflow-hidden">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-[2px] bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em]">
                Residency Identification Ledger
              </p>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight italic uppercase">
              {activeTab === "in-house"
                ? "In-House Protocol"
                : "Residency History"}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleManualRefresh}
              className={`p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-white/5 gap-8 mb-2">
          <button
            onClick={() => setLocalActiveTab("in-house")}
            className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === "in-house" ? "text-emerald-400" : "text-slate-600 hover:text-slate-400"}`}
          >
            <div className="flex items-center gap-2">
              <UserCheck size={14} />
              Active Residents
              <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-[9px] border border-emerald-500/20 ml-1">
                {unifiedResidentList.filter((r) => !!r.activeStay).length}
              </span>
            </div>
            {activeTab === "in-house" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-in slide-in-from-left duration-300"></div>
            )}
          </button>
          <button
            onClick={() => setLocalActiveTab("history")}
            className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === "history" ? "text-blue-400" : "text-slate-600 hover:text-slate-400"}`}
          >
            <div className="flex items-center gap-2">
              <History size={14} />
              Residency History
              <span className="bg-blue-500/10 px-2 py-0.5 rounded text-[9px] border border-blue-500/20 ml-1">
                {
                  unifiedResidentList.filter(
                    (r) => !r.activeStay && r.history.length > 0,
                  ).length
                }
              </span>
            </div>
            {activeTab === "history" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-in slide-in-from-left duration-300"></div>
            )}
          </button>
        </div>

        <div className="glass-card rounded-[2.5rem] flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40 shadow-3xl">
          <div className="px-6 py-4 border-b border-white/5 bg-slate-950/40">
            <div className="relative group">
              <Search
                className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${activeTab === "in-house" ? "group-focus-within:text-emerald-500" : "group-focus-within:text-blue-500"} text-slate-600`}
                size={16}
              />
              <input
                type="text"
                placeholder={`Search ${activeTab === "in-house" ? "Active Residents" : "Legacy Records"} (Full Name, Folio, or Contact)...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-[14px] text-white outline-none focus:border-white/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-xl z-20 border-b border-white/10">
                <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-10 py-6">Resident Identity</th>
                  <th className="px-10 py-6 text-center">State</th>
                  <th className="px-10 py-6">Audit Period</th>
                  <th className="px-10 py-6 text-right">Ledger Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-32 text-center opacity-30">
                      <Archive
                        size={48}
                        className="mx-auto mb-4 text-slate-700"
                      />
                      <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-600 italic">
                        No dossiers matching query in {activeTab} ledger
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((resident) => {
                    const active = resident.activeStay;
                    const lastStay = !active ? resident.history[0] : null;
                    const activeIsPaid =
                      (active?.booking?.paymentStatus || "").toLowerCase() ===
                      "paid";

                    return (
                      <tr
                        key={resident.id}
                        onClick={() => setLocalSelectedId(resident.id)}
                        className={`hover:bg-white/[0.02] transition-all cursor-pointer group ${localSelectedId === resident.id ? "bg-white/[0.04] border-l-4 border-brand-500" : "border-l-4 border-transparent"}`}
                      >
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={resident.avatarUrl}
                                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/5 group-hover:ring-brand-500/30 transition-all shadow-lg"
                                alt=""
                              />
                              {active && (
                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-slate-900 shadow-sm animate-pulse"></div>
                              )}
                            </div>
                            <div>
                              <p className="text-[15px] font-black text-white group-hover:text-brand-400 transition-colors uppercase italic tracking-tight">
                                {resident.firstName} {resident.lastName}
                              </p>
                              <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-0.5">
                                ID: {resident.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex justify-center">
                            {active ? (
                              <span className="px-5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Zap size={10} fill="currentColor" /> IN-HOUSE
                              </span>
                            ) : (
                              <span className="px-5 py-2 bg-slate-900 text-slate-600 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                <History size={10} /> HISTORY
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col gap-1 text-[11px]">
                            {active ? (
                              <div className="flex items-center gap-3 font-black text-slate-300">
                                <span>
                                  {new Date(
                                    active.booking.checkIn,
                                  ).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                                <ArrowRight
                                  size={10}
                                  className="text-emerald-500"
                                />
                                <span className="text-white italic">
                                  PRESENT
                                </span>
                              </div>
                            ) : lastStay ? (
                              <div className="flex items-center gap-3 font-bold text-slate-600">
                                <span>
                                  {new Date(
                                    lastStay.checkIn,
                                  ).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                                <ArrowRight size={10} className="opacity-30" />
                                <span>
                                  {new Date(
                                    lastStay.checkOut,
                                  ).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-800 font-black tracking-widest">
                                ---
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                          {active ? (
                            <div>
                              <p
                                className={`text-[15px] font-black italic tracking-tighter ${activeIsPaid ? "text-emerald-400" : "text-rose-500 animate-pulse"}`}
                              >
                                {activeIsPaid ? "SETTLED" : "UNPAID"}
                              </p>
                              <p className="text-[9px] text-slate-700 font-black uppercase">
                                ₦{active.booking.amount.toLocaleString()}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-[15px] font-black text-slate-300 italic tracking-tighter">
                                ₦{resident.totalSpent.toLocaleString()}
                              </p>
                              <p className="text-[8px] text-slate-700 font-black uppercase">
                                CUMULATIVE
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedResident && (
        <div className="flex-1 w-full lg:w-[450px] shrink-0 glass-card rounded-[3rem] p-10 flex flex-col border border-white/10 bg-[#0a0f1a] shadow-3xl animate-in slide-in-from-right-10 duration-500 h-full overflow-hidden relative">
          <div className="flex flex-col items-center mb-10 pt-2">
            <div className="relative mb-6">
              <img
                src={selectedResident.avatarUrl}
                className="w-32 h-32 rounded-[2.5rem] object-cover ring-4 ring-white/10 shadow-2xl"
                alt=""
              />
              {selectedResident.activeStay && (
                <div className="absolute -bottom-1 -right-1 p-3 bg-emerald-600 rounded-2xl border-4 border-slate-950 text-white shadow-xl">
                  <ShieldCheck size={20} />
                </div>
              )}
            </div>
            <h3 className="text-3xl font-black text-white italic uppercase text-center leading-[0.85] tracking-tighter">
              {selectedResident.firstName} <br /> {selectedResident.lastName}
            </h3>

            <div className="mt-8 px-4 py-2 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
              <Fingerprint size={14} className="text-slate-500" />
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest truncate max-w-[280px]">
                {selectedResident.activeStay
                  ? `Folio ID: ${selectedResident.id}`
                  : `Registry ID: ${String(selectedResident.id).toUpperCase()}`}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
            <div className="bg-black/40 p-6 rounded-[2rem] space-y-5 border border-white/5 shadow-inner">
              <div className="flex items-center gap-4 text-slate-400">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-slate-600">
                  <Mail size={16} />
                </div>
                <span className="text-[13px] font-bold truncate tracking-tight">
                  {selectedResident.email || "NO EMAIL ON RECORD"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-400 pt-4 border-t border-white/5">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-slate-600">
                  <Phone size={16} />
                </div>
                <span className="text-[13px] font-bold tracking-tight">
                  {selectedResident.phone || "NO PHONE ON RECORD"}
                </span>
              </div>
            </div>

            {selectedResident.activeStay && (
              <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/20 space-y-5 shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] text-emerald-500/60 font-black uppercase tracking-[0.2em]">
                    Active Residency
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[8px] font-black uppercase rounded border ${(selectedResident.activeStay.booking.paymentStatus || "").toLowerCase() === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse"}`}
                  >
                    {(
                      selectedResident.activeStay.booking.paymentStatus || ""
                    ).toLowerCase() === "paid"
                      ? "SETTLED"
                      : "PAYMENT DUE"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                    <Bed size={24} />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white italic tracking-tighter leading-none">
                      Room {selectedResident.activeStay.room?.roomNumber}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {selectedResident.activeStay.room?.category}
                    </p>
                  </div>
                </div>
                <div className="pt-5 border-t border-emerald-500/10 flex justify-between items-end">
                  <div>
                    <p className="text-[9px] text-slate-600 font-black uppercase mb-1">
                      Check-In
                    </p>
                    <p className="text-[12px] font-black text-white">
                      {new Date(
                        selectedResident.activeStay.booking.checkIn,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-slate-600 font-black uppercase mb-1">
                      Folio Value
                    </p>
                    <p className="text-[13px] font-black text-emerald-400 uppercase">
                      ₦
                      {selectedResident.activeStay.booking.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <History size={14} /> RESIDENCY HISTORY
                </h4>
                <span className="text-[9px] font-bold text-slate-700 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                  {selectedResident.history.length} STAYS
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {selectedResident.history.length === 0 ? (
                  <div className="p-8 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10 opacity-40 italic">
                    <p className="text-[10px] text-slate-500 uppercase font-black">
                      No prior cycles recorded
                    </p>
                  </div>
                ) : (
                  selectedResident.history.map((stay: Booking) => (
                    <div
                      key={stay.id}
                      className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-black text-white uppercase italic tracking-tighter">
                            Room{" "}
                            {rooms.find((r) => r.id === stay.roomId)
                              ?.roomNumber || "---"}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-dash">
                            {stay.bookingCode}
                          </span>
                        </div>
                        <span className="text-[11px] font-black text-slate-400 italic">
                          ₦{stay.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={10} className="opacity-40" />
                          <span>
                            {new Date(stay.checkIn).toLocaleDateString()} —{" "}
                            {new Date(stay.checkOut).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedGuestId(selectedResident.id);
                            setActiveTab("bookings");
                            setSelectedBookingId(stay.id);
                          }}
                          className="text-brand-500 hover:text-brand-400 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all font-black"
                        >
                          FOLIO <ExternalLink size={8} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/5">
            {selectedResident.activeStay ? (
              <button
                onClick={() => {
                  if (selectedResident && selectedResident.activeStay) {
                    setActiveCheckOutData({
                      guest: selectedResident,
                      booking: selectedResident.activeStay.booking,
                      room: selectedResident.activeStay.room || null,
                    });
                    setIsCheckOutModalOpen(true);
                  }
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 py-6 rounded-[1.5rem] font-black text-[14px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-3xl shadow-rose-950/60 italic"
              >
                <LogOut size={22} strokeWidth={3} /> AUTHORIZE CHECK-OUT
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedGuestId(selectedResident.id);
                  setActiveTab("bookings");
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 rounded-[1.5rem] font-black text-[14px] uppercase tracking-[0.2em] text-white transition-all shadow-3xl shadow-emerald-950/60 flex items-center justify-center gap-3 italic"
              >
                <Users size={22} /> NEW RESERVATION
              </button>
            )}
          </div>
        </div>
      )}

      <CheckOutModal
        isOpen={isCheckOutModalOpen}
        onClose={() => setIsCheckOutModalOpen(false)}
        onConfirm={checkOutBooking}
        guest={activeCheckOutData.guest}
        booking={activeCheckOutData.booking}
        room={activeCheckOutData.room}
      />
    </div>
  );
};

export default Guests;
