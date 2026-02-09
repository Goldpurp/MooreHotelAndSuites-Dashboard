import React, { useState, useEffect, useMemo } from "react";
import { useHotel } from "../store/HotelContext";
import { BookingStatus, Booking, Guest, Room, PaymentStatus } from "../types";
import {
  Search,
  Plus,
  ArrowRight,
  Zap,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  X,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Lock,
  Clock,
  History,
  AlertCircle,
  Bookmark,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import BookingModal from "../components/BookingModal";
import VoidBookingModal from "../components/VoidBookingModal";
import CheckInConfirmModal from "../components/CheckInConfirmModal";

const Bookings: React.FC = () => {
  const hotel = useHotel();
  const {
    bookings,
    guests,
    rooms,
    checkInBooking,
    cancelBooking,
    selectedBookingId,
    setSelectedBookingId,
    setActiveTab,
    setSelectedGuestId,
    refreshData
  } = hotel;

  const [filter, setFilter] = useState<string>("All");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [preFillData, setPreFillData] = useState<any>(null);

  const [lookupId, setLookupId] = useState("");
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [bookingToVoid, setBookingToVoid] = useState<Booking | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const [isCheckInConfirmOpen, setIsCheckInConfirmOpen] = useState(false);
  const [bookingToCheckIn, setBookingToCheckIn] = useState<Booking | null>(
    null,
  );

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || "";
    switch (s) {
      case "checkedin":
      case "inhouse":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/20",
          band: "border-emerald-500/50 bg-emerald-500/5",
          icon: <Zap size={12} fill="currentColor" />,
          label: "IN-HOUSE",
        };
      case "confirmed":
        return {
          bg: "bg-blue-500/10",
          text: "text-blue-400",
          border: "border-blue-500/20",
          band: "border-blue-500/50 bg-blue-500/5",
          icon: <CheckCircle size={12} />,
          label: "CONFIRMED",
        };
      case "pending":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/20",
          band: "border-amber-500/50 bg-amber-500/5",
          icon: <Clock size={12} />,
          label: "PENDING",
        };
      case "reserved":
        return {
          bg: "bg-indigo-500/10",
          text: "text-indigo-400",
          border: "border-indigo-500/20",
          band: "border-indigo-500/50 bg-indigo-500/5",
          icon: <Bookmark size={12} />,
          label: "RESERVED",
        };
      case "cancelled":
      case "voided":
        return {
          bg: "bg-rose-500/10",
          text: "text-rose-400",
          border: "border-rose-500/20",
          band: "border-rose-500/50 bg-rose-500/5",
          icon: <XCircle size={12} />,
          label: "VOIDED",
        };
      case "checkedout":
        return {
          bg: "bg-slate-800",
          text: "text-slate-500",
          border: "border-slate-700",
          band: "border-slate-700/50 bg-slate-900/5",
          icon: <History size={12} />,
          label: "CHECKED-OUT",
        };
      default:
        return {
          bg: "bg-slate-900",
          text: "text-slate-400",
          border: "border-white/5",
          band: "border-transparent",
          icon: <AlertCircle size={12} />,
          label: "UNKNOWN",
        };
    }
  };

  const filteredBookings = useMemo(() => {
    const q = lookupId.trim().toLowerCase();
    return (bookings || [])
      .filter((b) => {
        const bStatus = b.status?.toLowerCase();
        const matchesStatus =
          filter === "All" || bStatus === filter.toLowerCase();
        const matchesSearch =
          !q ||
          (b.bookingCode || "").toLowerCase().includes(q) ||
          `${b.guestFirstName || ""} ${b.guestLastName || ""}`
            .toLowerCase()
            .includes(q);
        return matchesStatus && matchesSearch;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [bookings, filter, lookupId]);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, lookupId]);

  useEffect(() => {
    if (selectedBookingId) {
      const found = (bookings || []).find((b) => b.id === selectedBookingId);
      if (found) setSelectedBooking(found);
    } else if (bookings && bookings.length > 0 && !selectedBooking) {
      setSelectedBooking(filteredBookings[0] || null);
    }
  }, [selectedBookingId, bookings, filteredBookings]);

  const handleSelectBooking = (b: Booking) => {
    setSelectedBooking(b);
    setSelectedBookingId(b.id);
  };
  const handleOpenVoidModal = (e: React.MouseEvent, b: Booking) => {
    e.stopPropagation();
    setBookingToVoid(b);
    setIsVoidModalOpen(true);
  };
  const handleOpenCheckInConfirm = (e: React.MouseEvent, b: Booking) => {
    e.stopPropagation();
    setBookingToCheckIn(b);
    setIsCheckInConfirmOpen(true);
  };

  const handleCancelAndWalkIn = (b: Booking) => {
    cancelBooking(b.id);
    setPreFillData({
      guestFirstName: b.guestFirstName,
      guestLastName: b.guestLastName,
      guestEmail: b.guestEmail,
      guestPhone: b.guestPhone,
    });
    setIsWalkIn(true);
    setIsBookingModalOpen(true);
  };

  const navigateToGuestStay = (guestId?: string) => {
    if (guestId) {
      setSelectedGuestId(guestId);
      setActiveTab("guests");
    }
  };

  const resolveGuestName = (b: Booking) => {
    const firstName = b.guestFirstName?.trim();
    const lastName = b.guestLastName?.trim();
    if (firstName || lastName)
      return `${firstName || ""} ${lastName || ""}`.trim();
    const g = (guests || []).find((x) => x.id === b.guestId);
    return g
      ? `${g.firstName} ${g.lastName}`.trim()
      : b.bookingCode || "Unknown Guest";
  };

  const selectedRoom = selectedBooking
    ? rooms.find((r) => r.id === selectedBooking.roomId)
    : null;

      const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 800);
  };


  return (
    <div className="flex flex-row gap-6 h-[calc(100vh-120px)] animate-in fade-in duration-700 overflow-hidden">
      <div className="split-main flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-8 h-[2px] bg-brand-500 rounded-full"></span>
              <p className="adaptive-text-xs text-brand-400 font-black uppercase tracking-widest leading-none">
                Reservations Ledger
              </p>
            </div>
            <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase leading-none">
              Booking Management
            </h2>
          </div>

          <div className="flex items-center gap-2">

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw size={16} />
            </button>
          </div>

            <div className="relative group hidden md:block">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-500"
              />
              <input
                type="text"
                placeholder="Lookup Guest/Folio..."
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 adaptive-text-xs text-slate-200 outline-none focus:border-brand-500/40 w-48 lg:w-64"
              />
            </div>
            <button
              onClick={() => {
                setPreFillData(null);
                setIsWalkIn(true);
                setIsBookingModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl adaptive-text-xs font-black uppercase flex items-center gap-2 transition-all whitespace-nowrap"
            >
              <Zap size={14} fill="currentColor" />{" "}
              <span className="hidden lg:inline">Walk-In</span>
            </button>
            <button
              onClick={() => {
                setPreFillData(null);
                setIsWalkIn(false);
                setIsBookingModalOpen(true);
              }}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl adaptive-text-xs font-black uppercase flex items-center gap-2 transition-all whitespace-nowrap"
            >
              <Plus size={14} strokeWidth={3} />{" "}
              <span className="hidden lg:inline">New Booking</span>
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40">
          <div className="px-6 py-4 border-b border-white/5 flex items-center bg-slate-950/60 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 shrink-0">
              {[
                "All",
                "CheckedIn",
                "Confirmed",
                "Reserved",
                "Pending",
                "CheckedOut",
                "Cancelled",
              ].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? (f === "CheckedIn" ? "bg-emerald-600 text-white" : f === "Cancelled" ? "bg-rose-600 text-white" : "bg-brand-600 text-white shadow-lg") : "text-slate-600 hover:text-slate-300"}`}
                >
                  {f === "CheckedIn"
                    ? "IN-HOUSE"
                    : f === "CheckedOut"
                      ? "HISTORY"
                      : f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[600px]">
              <thead className="sticky top-0 bg-slate-950/90 z-10 border-b border-white/10">
                <tr className="text-slate-500 adaptive-text-xs font-black uppercase tracking-widest">
                  <th className="responsive-table-padding">Guest Details</th>
                  <th className="responsive-table-padding col-priority-med">
                    Stay Timeline
                  </th>
                  <th className="responsive-table-padding text-center col-priority-low">
                    Asset ID
                  </th>
                  <th className="responsive-table-padding text-right">
                    Billing Status
                  </th>
                  <th className="responsive-table-padding text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-32 text-center text-slate-700 font-black uppercase adaptive-text-sm"
                    >
                      No records found in current view
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((b) => {
                    const room = rooms.find((r) => r.id === b.roomId);
                    const isSelected = selectedBooking?.id === b.id;
                    const guestName = resolveGuestName(b);
                    const cfg = getStatusConfig(b.status);
                    const isPaid =
                      (b.paymentStatus || "").toLowerCase() === "paid";

                    return (
                      <tr
                        key={b.id}
                        onClick={() => handleSelectBooking(b)}
                        className={`cursor-pointer transition-all group border-l-4 ${isSelected ? cfg.band + " border-brand-500" : "hover:bg-white/[0.02] border-transparent"}`}
                      >
                        <td className="responsive-table-padding">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${b.status?.toLowerCase() === "checkedin" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-500"}`}
                            >
                              <User size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="adaptive-text-sm font-black text-white group-hover:text-brand-400 transition-colors uppercase truncate leading-none mb-1.5">
                                {guestName}
                              </p>
                              <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                                Folio: {b.bookingCode}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="responsive-table-padding col-priority-med">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border w-fit flex items-center gap-1.5 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              {cfg.icon} {cfg.label}
                            </span>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">
                              {new Date(b.checkIn).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}{" "}
                              —{" "}
                              {new Date(b.checkOut).toLocaleDateString(
                                "en-GB",
                                { day: "2-digit", month: "short" },
                              )}
                            </p>
                          </div>
                        </td>
                        <td className="responsive-table-padding text-center col-priority-low">
                          <p className="adaptive-text-sm font-black text-slate-300 uppercase leading-none mb-1.5">
                            Room {room?.roomNumber || "---"}
                          </p>
                          <p className="text-[8px] text-slate-700 font-bold uppercase">
                            {room?.category}
                          </p>
                        </td>
                        <td className="responsive-table-padding text-right">
                          <div className="flex flex-col items-end">
                            <p
                              className={`adaptive-text-sm font-black tracking-tighter ${isPaid ? "text-white" : "text-rose-400"}`}
                            >
                              ₦{b.amount.toLocaleString()}
                            </p>
                            <p
                              className={`text-[8px] font-black uppercase mt-1 ${isPaid ? "text-emerald-500" : "text-rose-500 animate-pulse"}`}
                            >
                              {isPaid ? "Payment Confirmed" : "Payment Due"}
                            </p>
                          </div>
                        </td>
                        <td className="responsive-table-padding text-right">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {["confirmed", "pending", "reserved"].includes(
                              b.status?.toLowerCase(),
                            ) ? (
                              <>
                                <button
                                  onClick={(e) =>
                                    handleOpenCheckInConfirm(e, b)
                                  }
                                  disabled={!isPaid}
                                  className={`${!isPaid ? "opacity-30" : "bg-emerald-600 hover:bg-emerald-700"} p-2.5 rounded-xl text-white shadow-lg active:scale-95 transition-all flex items-center gap-2`}
                                  title="Authorize Check-In"
                                >
                                  {isPaid ? (
                                    <Zap size={14} fill="currentColor" />
                                  ) : (
                                    <Lock size={14} />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => handleOpenVoidModal(e, b)}
                                  className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-slate-600 hover:text-rose-500 transition-all"
                                >
                                  <XCircle size={14} />
                                </button>
                              </>
                            ) : b.status?.toLowerCase() === "checkedin" ||
                              b.status?.toLowerCase() === "inhouse" ? (
                              <button
                                onClick={() => navigateToGuestStay(b.guestId)}
                                className="bg-brand-600 hover:bg-brand-700 text-white p-2.5 rounded-xl shadow-lg active:scale-95 transition-all"
                                title="Manage Stay"
                              >
                                <User size={14} />
                              </button>
                            ) : (
                              <div className="p-2 text-slate-800 opacity-20">
                                <Lock size={16} />
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

          <div className="px-8 py-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              {filteredBookings.length} Total Records
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white disabled:opacity-10 transition-all bg-white/5"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[11px] font-black text-white">
                  {currentPage} / {totalPages || 1}
                </span>
              </div>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white disabled:opacity-10 transition-all bg-white/5"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedBooking && (
        <div className="split-side flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 h-full overflow-hidden">
          <div className="glass-card rounded-2xl p-8 flex flex-col h-full border border-white/10 bg-[#0a0f1a] relative">
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-1">
                <h3 className="adaptive-text-xl font-black text-white tracking-tighter uppercase leading-none">
                  Booking Folio
                </h3>
                <p className="text-[9px] text-brand-500 font-black tracking-widest uppercase">
                  Details & Control
                </p>
              </div>
              <button
                onClick={() => hotel.setSelectedBookingId(null)}
                className="p-2 bg-white/5 rounded-xl text-slate-600 hover:text-rose-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-col items-center text-center p-8 bg-[#161d2b] rounded-3xl border border-white/5 shadow-inner">
                <div className="w-20 h-20 rounded-2xl bg-[#05080f] flex items-center justify-center font-black text-white text-4xl mb-4 border border-white/5 shadow-2xl relative overflow-hidden ring-4 ring-white/5">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(resolveGuestName(selectedBooking))}&background=05080f&color=fff&size=128`}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    alt=""
                  />
                  {/* {resolveGuestName(selectedBooking).charAt(0)} */}
                </div>
                <h4 className="adaptive-text-lg font-black text-white uppercase tracking-tighter mb-1 truncate w-full">
                  {resolveGuestName(selectedBooking)}
                </h4>
                <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                  Guest Persona
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <div
                  className={`px-5 py-3.5 rounded-2xl border flex items-center justify-between transition-all ${getStatusConfig(selectedBooking.status).bg} ${getStatusConfig(selectedBooking.status).border}`}
                >
                  <span className="text-[9px] text-slate-500 font-black uppercase">
                    Lifecycle State
                  </span>
                  <span
                    className={`adaptive-text-xs font-black uppercase ${getStatusConfig(selectedBooking.status).text}`}
                  >
                    {getStatusConfig(selectedBooking.status).label}
                  </span>
                </div>
                <div
                  className={`px-5 py-3.5 rounded-2xl border flex items-center justify-between transition-all ${(selectedBooking.paymentStatus || "").toLowerCase() === "paid" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"}`}
                >
                  <span className="text-[9px] opacity-70 font-black uppercase">
                    Billing Status
                  </span>
                  <div className="flex items-center gap-2">
                    {(selectedBooking.paymentStatus || "").toLowerCase() ===
                    "paid" ? (
                      <ShieldCheck size={14} />
                    ) : (
                      <AlertCircle size={14} />
                    )}
                    <span className="adaptive-text-xs font-black uppercase">
                      {(selectedBooking.paymentStatus || "").toLowerCase() ===
                      "paid"
                        ? "PAID"
                        : "DUE"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#0d131f] px-5 py-4 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-slate-600 font-black uppercase block mb-1">
                    Room No.
                  </span>
                  <span className="adaptive-text-base font-black text-brand-500 tracking-tighter whitespace-nowrap">
                    Room {selectedRoom?.roomNumber || "---"}
                  </span>
                </div>
                <div className="bg-[#0d131f] px-5 py-4 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-slate-600 font-black uppercase block mb-1">
                    Total Stay
                  </span>
                  <span className="adaptive-text-base font-black text-white tracking-tighter whitespace-nowrap">
                    ₦{selectedBooking.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-[#0d131f] p-5 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center gap-4 text-slate-500">
                  <div className="p-2 bg-black rounded-xl border border-white/5 text-slate-600 shrink-0">
                    <Mail size={14} />
                  </div>
                  <span className="adaptive-text-sm font-bold truncate flex-1 leading-none">
                    {selectedBooking.guestEmail || "No Email"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-slate-500 pt-4 border-t border-white/5">
                  <div className="p-2 bg-black rounded-xl border border-white/5 text-slate-600 shrink-0">
                    <Phone size={14} />
                  </div>
                  <span className="adaptive-text-sm font-bold leading-none">
                    {selectedBooking.guestPhone || "No Phone"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              {["confirmed", "pending", "reserved"].includes(
                selectedBooking.status?.toLowerCase(),
              ) ? (
                <button
                  onClick={(e) => handleOpenCheckInConfirm(e, selectedBooking)}
                  disabled={
                    (selectedBooking.paymentStatus || "").toLowerCase() !==
                    "paid"
                  }
                  className={`w-full ${(selectedBooking.paymentStatus || "").toLowerCase() !== "paid" ? "bg-slate-900 text-slate-700 cursor-not-allowed" : "bg-[#10b981] hover:bg-[#059669] text-white shadow-xl shadow-emerald-950/60"} font-black py-5 rounded-2xl adaptive-text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3`}
                >
                  {(selectedBooking.paymentStatus || "").toLowerCase() !==
                  "paid" ? (
                    <Lock size={20} />
                  ) : (
                    <Zap size={20} fill="currentColor" />
                  )}
                  {(selectedBooking.paymentStatus || "").toLowerCase() !==
                  "paid"
                    ? "AWAITING PAYMENT"
                    : "AUTHORIZE CHECK-IN"}
                </button>
              ) : selectedBooking.status?.toLowerCase() === "checkedin" ||
                selectedBooking.status?.toLowerCase() === "inhouse" ? (
                <button
                  onClick={() => navigateToGuestStay(selectedBooking.guestId)}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black py-5 rounded-2xl adaptive-text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl"
                >
                  <ShieldCheck size={20} /> MANAGE ACTIVE STAY
                </button>
              ) : (
                <button
                  disabled
                  className="w-full bg-slate-900 text-slate-800 font-black py-5 rounded-2xl adaptive-text-sm uppercase tracking-widest border border-white/5 cursor-not-allowed"
                >
                  <Lock size={20} /> FOLIO SEALED
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        isWalkIn={isWalkIn}
        initialData={preFillData}
      />
      <VoidBookingModal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={cancelBooking}
        booking={bookingToVoid}
        guest={
          bookingToVoid
            ? ({
                firstName: bookingToVoid.guestFirstName,
                lastName: bookingToVoid.guestLastName,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(resolveGuestName(bookingToVoid))}&background=020617&color=fff`,
              } as any)
            : null
        }
        room={rooms.find((r) => r.id === bookingToVoid?.roomId) || null}
      />
      <CheckInConfirmModal
        isOpen={isCheckInConfirmOpen}
        onClose={() => setIsCheckInConfirmOpen(false)}
        onConfirm={checkInBooking}
        onCancelAndWalkIn={handleCancelAndWalkIn}
        booking={bookingToCheckIn}
        guest={
          bookingToCheckIn
            ? ({
                firstName: bookingToCheckIn.guestFirstName,
                lastName: bookingToCheckIn.guestLastName,
              } as any)
            : null
        }
        room={rooms.find((r) => r.id === bookingToCheckIn?.roomId) || null}
      />
    </div>
  );
};

export default Bookings;
