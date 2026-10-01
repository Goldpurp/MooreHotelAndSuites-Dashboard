import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { sileo } from 'sileo';
import { useHotel } from '../store/HotelContext';
import { api } from '../lib/api';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import type { Booking } from '../types';
import {
  canReviewPayments,
  parsePaymentReviewRoomOptions,
  parsePaymentReviews,
  PaymentReviewItem,
  PaymentReviewRebooking,
} from '../lib/paymentReview';

type ReviewDecision = 'Confirm' | 'Refund' | 'Reject';

type PaymentReviewQueueProps = {
  requestedBooking?: Booking | null;
  requestId?: number;
  onChooseReplacement: (context: PaymentReviewRebooking) => void;
  onOpenSettlements: () => void;
};

const defaultReason = "Checked the hotel's bank statement and reviewed the guest transfer report.";

export default function PaymentReviewQueue({
  requestedBooking,
  requestId,
  onChooseReplacement,
  onOpenSettlements,
}: PaymentReviewQueueProps) {
  const { currentUser, isAuthenticated, refreshData } = useHotel();
  const allowed = isAuthenticated && canReviewPayments(currentUser?.role);
  const [items, setItems] = useState<PaymentReviewItem[]>([]);
  const [open, setOpen] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState(defaultReason);
  const [statementChecked, setStatementChecked] = useState(false);
  const [message, setMessage] = useState('');
  const modalRef = useAccessibleModal(open, () => setOpen(false), !busy);

  useEffect(() => {
    let disposed = false;
    let pending = false;
    setItems([]);
    setQueueError('');
    setLoading(true);
    if (!allowed) return;

    async function load() {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const data = parsePaymentReviews(await api.get<unknown>('/api/bookings/payment-reviews', { silent: true }));
        if (!disposed) {
          setItems(data);
          setQueueError('');
        }
      } catch {
        if (!disposed) setQueueError('Payment reviews could not be loaded. Refresh before making changes.');
      } finally {
        pending = false;
        if (!disposed) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(load, 30_000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', load);
    };
  }, [allowed, currentUser?.id, revision]);

  useEffect(() => {
    setOpen(false);
    setDecision(null);
    setBankReference('');
    setAmount('');
    setReason(defaultReason);
    setStatementChecked(false);
    setMessage('');
  }, [currentUser?.id]);

  useEffect(() => {
    if (!allowed || !requestedBooking) return;
    setDecision(null);
    setBankReference('');
    setAmount(String(requestedBooking.amount));
    setReason(defaultReason);
    setStatementChecked(false);
    setMessage('');
    setOpen(true);
  }, [allowed, requestedBooking, requestId]);

  const queuedReview = useMemo(
    () => items.find(item => item.bookingCode === requestedBooking?.bookingCode),
    [items, requestedBooking?.bookingCode],
  );
  const review = useMemo<PaymentReviewItem | null>(() => {
    if (queuedReview) return queuedReview;
    if (!requestedBooking) return null;
    return {
      bookingCode: requestedBooking.bookingCode,
      guestName: `${requestedBooking.guestFirstName} ${requestedBooking.guestLastName}`.trim(),
      bookingStatus: requestedBooking.status,
      amount: requestedBooking.amount,
      currency: 'NGN',
      reportedAtUtc: requestedBooking.createdAt,
      overdue: false,
      roomHeld: String(requestedBooking.status).toLowerCase() === 'pending',
    };
  }, [queuedReview, requestedBooking]);

  if (!allowed) return null;

  const overdue = items.filter(item => item.overdue).length;
  const evidenceRequired = decision === 'Confirm' || decision === 'Refund';
  const normalizedBankReference = bankReference.trim().toUpperCase();
  const bankReferenceIsBookingCode = Boolean(
    review && normalizedBankReference === review.bookingCode.trim().toUpperCase(),
  );
  const evidenceValid = !evidenceRequired || (
    statementChecked &&
    normalizedBankReference.length >= 6 &&
    !bankReferenceIsBookingCode &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0
  );
  const canSubmit = Boolean(decision && reason.trim().length >= 10 && evidenceValid && review && requestedBooking);

  const chooseDecision = (next: ReviewDecision) => {
    setDecision(next);
    setMessage('');
    if (next === 'Reject') {
      setStatementChecked(false);
      setBankReference('');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !decision || !review || !requestedBooking || !canSubmit) return;

    setBusy(true);
    setMessage('');
    try {
      if (decision === 'Confirm' && !review.roomHeld) {
        const roomOptions = parsePaymentReviewRoomOptions(
          await api.get<unknown>(`/api/bookings/${encodeURIComponent(review.bookingCode)}/review-transfer/rooms`, { silent: true }),
        );
        if (roomOptions.bookingCode !== review.bookingCode) {
          throw new Error('The room choices do not match this payment review. Refresh and try again.');
        }
        if (roomOptions.rooms.length < roomOptions.requiredRooms) {
          setMessage('No suitable room is available in the paid category. Keep this review open and choose Refund.');
          return;
        }
        onChooseReplacement({
          requestId: Date.now(),
          booking: requestedBooking,
          review,
          evidence: {
            bankReference: bankReference.trim(),
            amount: Number(amount),
            reason: reason.trim(),
          },
          roomOptions,
        });
        setOpen(false);
        return;
      }

      const result = await api.post<{ message: string }>(
        `/api/bookings/${encodeURIComponent(review.bookingCode)}/review-transfer`,
        {
          decision,
          confirmationText: 'VERIFY',
          reason: reason.trim(),
          ...(evidenceRequired ? {
            bankReference: bankReference.trim(),
            amount: Number(amount),
          } : {}),
        },
      );
      setItems(previous => previous.filter(item => item.bookingCode !== review.bookingCode));
      setRevision(value => value + 1);
      await refreshData();
      setOpen(false);
      sileo.success({
        title: decision === 'Confirm' ? 'Payment verified' : decision === 'Refund' ? 'Refund queued' : 'Report rejected',
        description: result.message,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The review could not be saved. Refresh and try again.');
    } finally {
      setBusy(false);
    }
  };

  return <>
    <button
      type="button"
      onClick={onOpenSettlements}
      aria-label={`Open payment reviews. ${items.length} waiting.`}
      className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[90] rounded-xl border px-4 py-3 text-sm font-bold shadow-xl transition-colors md:bottom-4 md:right-4 ${overdue || queueError ? 'border-amber-400/50 bg-amber-950 text-amber-100' : 'border-slate-600 bg-slate-900 text-white'}`}
    >
      {loading ? 'Loading payment reviews' : queueError ? 'Payment review unavailable' : `Payment reviews (${items.length})${overdue ? `, ${overdue} overdue` : ''}`}
    </button>

    {open && requestedBooking && review ? (
      <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-6">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-review-title"
          tabIndex={-1}
          className="glass-card max-h-[94dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 shadow-3xl"
        >
          <header className="flex items-center justify-between gap-4 border-b border-white/5 bg-amber-500/5 px-5 py-5 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <span className="rounded-xl bg-amber-500/15 p-2.5 text-amber-400"><ShieldCheck size={20} /></span>
              <div className="min-w-0">
                <h2 id="payment-review-title" className="truncate text-lg font-black text-white">Review bank transfer</h2>
                <p className="text-xs font-semibold text-amber-300">{review.bookingCode}</p>
              </div>
            </div>
            <button type="button" data-modal-close aria-label="Close payment review" disabled={busy} onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"><X size={18} /></button>
          </header>

          <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
            <section aria-label="Transfer details" className="grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-white/[0.035] p-4 text-sm">
              <div className="col-span-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Guest</p>
                <p className="mt-1 font-bold text-white">{review.guestName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Amount reported</p>
                <p className="mt-1 font-black text-emerald-400">{review.currency} {review.amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Reported</p>
                <p className="mt-1 font-semibold text-slate-200">{new Date(review.reportedAtUtc).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Stay</p>
                <p className="mt-1 font-semibold text-slate-200">{new Date(requestedBooking.checkIn).toLocaleDateString()} to {new Date(requestedBooking.checkOut).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Room status</p>
                <p className={`mt-1 font-bold ${review.roomHeld ? 'text-emerald-400' : 'text-amber-300'}`}>{review.roomHeld ? 'Room still held' : 'Room released'}</p>
              </div>
            </section>

            {!review.roomHeld ? (
              <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4 text-sm text-amber-100">
                <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-400" />
                <p>The original hold ended. After payment is verified, staff will continue in Bookings and select a clean, online room in the same paid category.</p>
              </div>
            ) : null}

            <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
              <legend className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Choose the review result</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={() => chooseDecision('Confirm')} className={`rounded-xl border p-3 text-left text-xs font-bold transition-colors ${decision === 'Confirm' ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'}`}><CheckCircle2 size={17} className="mb-2" />Payment arrived</button>
                <button type="button" onClick={() => chooseDecision('Refund')} className={`rounded-xl border p-3 text-left text-xs font-bold transition-colors ${decision === 'Refund' ? 'border-amber-400/60 bg-amber-500/15 text-amber-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'}`}><RotateCcw size={17} className="mb-2" />Queue refund</button>
                <button type="button" onClick={() => chooseDecision('Reject')} className={`rounded-xl border p-3 text-left text-xs font-bold transition-colors ${decision === 'Reject' ? 'border-rose-400/60 bg-rose-500/15 text-rose-100' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'}`}><X size={17} className="mb-2" />Payment not found</button>
              </div>
            </fieldset>

            {decision ? (
              <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
                {evidenceRequired ? <>
                  <label className="block text-xs font-bold text-slate-300">Bank transaction ID
                    <input required minLength={6} maxLength={120} value={bankReference} onChange={event => setBankReference(event.target.value)} autoComplete="off" aria-invalid={bankReferenceIsBookingCode} placeholder="Enter the unique ID from the bank statement" className={`mt-2 block w-full rounded-xl border bg-black/30 px-4 py-3 text-sm text-white outline-none ${bankReferenceIsBookingCode ? 'border-rose-500/60' : 'border-white/10 focus:border-amber-400/50'}`} />
                    <span className={`mt-2 block text-[10px] font-semibold leading-relaxed ${bankReferenceIsBookingCode ? 'text-rose-300' : 'text-slate-500'}`}>{bankReferenceIsBookingCode ? 'The booking reference is not a bank transaction ID.' : 'Use the unique transfer or credit reference shown on the hotel bank statement.'}</span>
                  </label>
                  <label className="block text-xs font-bold text-slate-300">Exact amount received (NGN)
                    <input required type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50" />
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs font-semibold leading-relaxed text-slate-300">
                    <input type="checkbox" checked={statementChecked} onChange={event => setStatementChecked(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500" />
                    <span>I checked the hotel bank statement and confirmed this credit is present and has not been used for another booking.</span>
                  </label>
                </> : null}
                <label className="block text-xs font-bold text-slate-300">Review notes
                  <textarea required minLength={10} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className="mt-2 block min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-400/50" />
                </label>
              </fieldset>
            ) : null}

            {decision === 'Refund' ? <p className="text-xs leading-relaxed text-amber-200">This records the verified credit and sends it to the existing refund queue. It does not send money automatically.</p> : null}
            {decision === 'Reject' ? <p className="text-xs leading-relaxed text-rose-200">Use this only when the bank statement does not contain the reported credit. No payment or refund will be recorded.</p> : null}
            {message ? <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">{message}</p> : null}

            <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-5 sm:flex-row sm:justify-end">
              <button type="button" data-modal-cancel disabled={busy} onClick={() => setOpen(false)} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold text-slate-300 transition-colors hover:bg-white/5">Cancel</button>
              <button type="submit" disabled={busy || !canSubmit} className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-black text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
                {busy ? <><Loader2 size={16} className="animate-spin" />Checking...</> : decision === 'Confirm' && !review.roomHeld ? <>Choose a room <ArrowRight size={16} /></> : decision === 'Refund' ? <><RotateCcw size={16} />Queue refund</> : decision === 'Reject' ? <>Reject report</> : <><CheckCircle2 size={16} />Confirm payment</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
  </>;
}
