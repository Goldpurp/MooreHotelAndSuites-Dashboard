import React, { useMemo, useState } from 'react';
import {
  X, ShieldCheck, Zap, AlertTriangle, AlertCircle, Loader2, CreditCard, Clock, Lock, ExternalLink, Brush, Wrench, CalendarClock, History
} from 'lucide-react';
import { Guest, Booking, Room, PaymentStatus, RoomStatus } from '../types';
import { useHotel } from '../store/HotelContext';

interface CheckInConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingId: string) => void | Promise<void>;
  onCancelAndWalkIn: (booking: Booking) => void;
  booking: Booking | null;
  guest: Guest | null;
  room: Room | null;
}

const CheckInConfirmModal: React.FC<CheckInConfirmModalProps> = ({
  isOpen, onClose, onConfirm, onCancelAndWalkIn, booking, guest, room
}) => {
  const { setActiveTab } = useHotel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'details' | 'success'>('details');
  const [error, setError] = useState<string | null>(null);

  // Arrival state logic
  const arrivalState = useMemo(() => {
    if (!booking) return 'today';
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    checkOutDate.setHours(11, 30, 0, 0); // Set checkout time to 11:30
    const now = new Date();
    const checkInDateOnly = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (now > checkOutDate) return 'past'; // Booking is past
    if (checkInDateOnly > nowDateOnly) return 'future'; // Booking is in the future
    if (checkInDateOnly < nowDateOnly) return 'past'; // Booking is past
    if (now.getHours() < 15) return 'early-today'; // Early check-in for today
    return 'on-time'; // Normal check-in for today
  }, [booking]);

  const isUnpaid = useMemo(() => (booking?.paymentStatus || '').toLowerCase() !== 'paid', [booking]);
  const isBlockedByStatus = useMemo(() => room ? room.status !== RoomStatus.Available : false, [room]);
  const isCleaning = useMemo(() => room?.status === RoomStatus.Cleaning, [room]);

  if (!isOpen || !guest || !booking || !room) return null;

  const handleAuthorizedConfirm = async () => {
    if (
      isUnpaid ||
      isBlockedByStatus ||
      arrivalState === 'past' ||
      arrivalState === 'future'
    ) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(booking.id);
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('details');
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Ledger synchronization failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToSettlements = () => { setActiveTab('settlements'); onClose(); };

  // Modal display logic
  const getStatusDisplay = () => {
    if (isUnpaid) {
      return {
        title: 'SETTLEMENT BLOCKED',
        sub: 'Payment Verification Required',
        icon: <Lock size={16} />,
        color: 'rose'
      };
    }
    if (isCleaning) {
      return {
        title: 'ROOM BEING CLEANED',
        sub: 'Guest should wait till room is cleaned and available.',
        icon: <Brush size={16} />,
        color: 'rose'
      };
    }
    switch (arrivalState) {
      case 'past':
        return {
          title: 'PAST BOOKING',
          sub: 'This booking is in the past. Check-in is not allowed.',
          icon: <History size={16} className="rotate-180" />,
          color: 'rose'
        };
      case 'future':
        return {
          title: 'FUTURE BOOKING',
          sub: 'Booking is for a future date. Check-in is not allowed.',
          icon: <CalendarClock size={16} />,
          color: 'amber'
        };
      case 'early-today':
        return {
          title: 'EARLY ARRIVAL',
          sub: 'Pre-15:00 Access Protocol. Room must be available.',
          icon: <Clock size={16} />,
          color: 'amber'
        };
      default:
        return {
          title: 'CHECK-IN ACTIVATION',
          sub: 'Property Access Protocol',
          icon: <Zap size={16} />,
          color: 'emerald'
        };
    }
  };

  const display = getStatusDisplay();

  // Disable check-in button for past, future, unpaid, cleaning, or unavailable
  const isCheckInDisabled =
    isSubmitting ||
    isUnpaid ||
    isCleaning ||
    room.status !== RoomStatus.Available ||
    arrivalState === 'past' ||
    arrivalState === 'future';

  // Show Cancel & Walk-In button only for future bookings
  const showCancelAndWalkIn = arrivalState === 'future';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`glass-card w-full max-w-md rounded-[2rem] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300 shadow-3xl ring-1 ${
        display.color === 'rose' ? 'shadow-rose-950/20 ring-rose-500/20' :
        display.color === 'amber' ? 'shadow-amber-900/20 ring-amber-500/20' : 'shadow-emerald-900/20 ring-emerald-500/20'
      }`}>
        {status === 'success' ? (
          <div className="p-12 flex flex-col items-center text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Zap size={40} className="text-emerald-500" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Identity Verified</h2>
              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-2">Dossier {booking.bookingCode} Activated</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 w-full">
              <p className="text-[9px] text-slate-500 font-black uppercase mb-1">Asset Status</p>
              <p className="text-xs font-black text-white uppercase">Room {room.roomNumber} - Now Occupied</p>
            </div>
          </div>
        ) : (
          <>
            <div className={`px-8 py-6 border-b border-white/5 flex items-center justify-between ${
              display.color === 'rose' ? 'bg-rose-500/5' : display.color === 'amber' ? 'bg-amber-500/5' : 'bg-emerald-500/5'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  display.color === 'rose' ? 'bg-rose-500/20 text-rose-500' :
                  display.color === 'amber' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {display.icon}
                </div>
                <div>
                  <h2 className="text-base font-black text-white tracking-tight uppercase">{display.title}</h2>
                  <p className={`text-[8px] font-black uppercase tracking-[0.1em] ${
                    display.color === 'rose' ? 'text-rose-400' :
                    display.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>{display.sub}</p>
                </div>
              </div>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all"><X size={16} /></button>
            </div>

            <div className="p-8 space-y-6">
              {isUnpaid ? (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex flex-col items-center gap-4">
                    <CreditCard size={40} className="text-rose-500" />
                    <h3 className="text-lg font-black text-white uppercase">PENDING PAYMENT</h3>
                    <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest leading-relaxed">Property protocol forbids check-in for unpaid folios.</p>
                  </div>
                  <button onClick={handleNavigateToSettlements} className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-all">Go to Settlement Page <ExternalLink size={14}/></button>
                </div>
              ) : isCleaning ? (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex flex-col items-center gap-4">
                    <Brush size={40} className="text-rose-500" />
                    <h3 className="text-lg font-black text-white uppercase">ROOM BEING CLEANED</h3>
                    <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest leading-relaxed">Guest should wait till room is cleaned and available.</p>
                  </div>
                </div>
              ) : arrivalState === 'past' ? (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20 flex flex-col items-center gap-4">
                    <History size={40} className="text-rose-500 rotate-180" />
                    <h3 className="text-lg font-black text-white uppercase">PAST BOOKING</h3>
                    <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest leading-relaxed">This booking is in the past. Check-in is not allowed.</p>
                  </div>
                </div>
              ) : arrivalState === 'future' ? (
                <div className="text-center space-y-4">
                  <div className="p-6 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex flex-col items-center gap-4">
                    <CalendarClock size={40} className="text-amber-500" />
                    <h3 className="text-lg font-black text-white uppercase">FUTURE BOOKING</h3>
                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-relaxed">Booking is for a future date. Check-in is not allowed.</p>
                  </div>
                  <button
                    onClick={() => onCancelAndWalkIn(booking)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    Cancel & Walk-In Instead
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-3">
                    <h3 className="text-xl font-black text-white leading-tight uppercase">{arrivalState === 'early-today' ? 'POLICY OVERRIDE' : 'AUTHORIZE ENTRY'}</h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                      {arrivalState === 'early-today'
                        ? `Standard check-in starts at 15:00. Authorize early access protocol?`
                        : `Authorize digital folio activation for ${guest.firstName} ${guest.lastName}?`}
                    </p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4 shadow-inner">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Asset Unit</span>
                      <span className="text-sm font-black text-white uppercase tracking-tighter">Room {room.roomNumber}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Scheduled Arrival</span>
                      <span className="text-[11px] font-black uppercase tracking-widest text-blue-400">{new Date(booking.checkIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>
                </>
              )}

              {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-400 animate-in shake"><AlertCircle size={16} className="shrink-0 mt-0.5" /><p className="text-[10px] font-black uppercase leading-tight">{error}</p></div>}
            </div>

            <div className="px-8 py-6 border-t border-white/5 flex flex-col gap-3 bg-slate-950/40">
              <button
                onClick={handleAuthorizedConfirm}
                disabled={isCheckInDisabled}
                className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all ${
                  isCheckInDisabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : display.color === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    {(isBlockedByStatus ||
                      isUnpaid ||
                      isCleaning ||
                      arrivalState === 'past' ||
                      arrivalState === 'future') ? (
                      <Lock size={18} />
                    ) : (
                      <ShieldCheck size={18} />
                    )}
                    {isUnpaid
                      ? 'Payment Required'
                      : isCleaning
                      ? 'Room Not Ready'
                      : arrivalState === 'past'
                      ? 'Check-In Not Allowed'
                      : arrivalState === 'future'
                      ? 'Check-In Not Allowed'
                      : 'Authorize Check-In'}
                  </>
                )}
              </button>
              <button onClick={onClose} disabled={isSubmitting} className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5">Abort Protocol</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckInConfirmModal;