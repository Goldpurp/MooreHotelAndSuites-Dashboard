import React, { useEffect, useState } from 'react';
import { useHotel } from '../store/HotelContext';
import { api } from '../lib/api';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import {
  canReviewPayments,
  parsePaymentReviewRoomOptions,
  parsePaymentReviews,
  PaymentReviewItem,
  PaymentReviewRoomOptions,
} from '../lib/paymentReview';

type PaymentReviewQueueProps = {
  requestedBookingCode?: string;
  requestId?: number;
};

export default function PaymentReviewQueue({ requestedBookingCode, requestId }: PaymentReviewQueueProps) {
  const { currentUser, isAuthenticated, refreshData } = useHotel();
  const allowed = isAuthenticated && canReviewPayments(currentUser?.role);
  const [items, setItems] = useState<PaymentReviewItem[]>([]);
  const [open, setOpen] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [decision, setDecision] = useState('');
  const [bankReference, setBankReference] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [replacementChoices, setReplacementChoices] = useState<PaymentReviewRoomOptions | null>(null);
  const [replacementRoomIds, setReplacementRoomIds] = useState<string[]>([]);
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [replacementError, setReplacementError] = useState('');
  const modalRef = useAccessibleModal(open, () => setOpen(false), !busy);

  useEffect(() => {
    let disposed = false;
    let pending = false;
    setItems([]); setQueueError(''); setLoading(true);
    if (!allowed) return;
    async function load() {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const data = parsePaymentReviews(await api.get<unknown>('/api/bookings/payment-reviews', { silent: true }));
        if (!disposed) { setItems(data); setQueueError(''); }
      } catch {
        if (!disposed) setQueueError('Payment reviews could not be loaded. Refresh before making changes.');
      } finally { pending = false; if (!disposed) setLoading(false); }
    }
    void load();
    const timer = window.setInterval(load, 30_000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); };
  }, [allowed, currentUser?.id, revision]);

  useEffect(() => {
    setOpen(false); setCode(''); setDecision(''); setBankReference(''); setAmount(''); setReason(''); setConfirmation(''); setMessage('');
    setReplacementChoices(null); setReplacementRoomIds([]); setReplacementError(''); setReplacementLoading(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!allowed || !requestedBookingCode) return;
    setCode(requestedBookingCode.trim().toUpperCase());
    setDecision('');
    setBankReference('');
    setAmount('');
    setReason('');
    setConfirmation('');
    setMessage('');
    setReplacementChoices(null);
    setReplacementRoomIds([]);
    setReplacementError('');
    setOpen(true);
  }, [allowed, requestedBookingCode, requestId]);

  const overdue = items.filter(item => item.overdue).length;
  const selected = items.find(item => item.bookingCode === code.trim().toUpperCase());
  const replacementRequired = decision === 'Confirm' && Boolean(selected && !selected.roomHeld);
  const replacementReady = !replacementRequired || Boolean(
    replacementChoices &&
    replacementRoomIds.length === replacementChoices.requiredRooms &&
    replacementRoomIds.every(Boolean) &&
    new Set(replacementRoomIds).size === replacementRoomIds.length,
  );
  const selectCase = (value: string) => {
    setCode(value); setDecision(''); setBankReference(''); setAmount(''); setReason(''); setConfirmation(''); setMessage('');
    setReplacementChoices(null); setReplacementRoomIds([]); setReplacementError(''); setReplacementLoading(false);
  };

  useEffect(() => {
    let disposed = false;
    setReplacementChoices(null);
    setReplacementRoomIds([]);
    setReplacementError('');
    if (decision !== 'Confirm' || !selected || selected.roomHeld) {
      setReplacementLoading(false);
      return () => { disposed = true; };
    }
    setReplacementLoading(true);
    api.get<unknown>(`/api/bookings/${encodeURIComponent(selected.bookingCode)}/review-transfer/rooms`, { silent: true })
      .then(value => {
        if (disposed) return;
        const parsed = parsePaymentReviewRoomOptions(value);
        if (parsed.bookingCode !== selected.bookingCode) throw new Error('Replacement room response does not match this booking.');
        setReplacementChoices(parsed);
        setReplacementRoomIds(Array(parsed.requiredRooms).fill(''));
      })
      .catch(error => {
        if (!disposed) setReplacementError(error instanceof Error ? error.message : 'Available rooms could not be loaded.');
      })
      .finally(() => { if (!disposed) setReplacementLoading(false); });
    return () => { disposed = true; };
  }, [decision, selected?.bookingCode, selected?.roomHeld, revision]);

  if (!allowed) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || loading || queueError) return;
    if (!replacementReady) {
      setMessage('Choose every required replacement room before confirming this expired reservation.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const result = await api.post<{ message: string }>(`/api/bookings/${encodeURIComponent(code.trim().toUpperCase())}/review-transfer`, {
        decision, confirmationText: confirmation, reason,
        ...(decision !== 'Reject' ? { bankReference, amount: Number(amount) } : {}),
        ...(replacementRequired ? { replacementRoomIds } : {}),
      });
      setMessage(result.message);
      setItems(previous => previous.filter(item => item.bookingCode !== code.trim().toUpperCase()));
      setCode(''); setConfirmation(''); setBankReference(''); setAmount(''); setDecision(''); setReason('');
      setReplacementChoices(null); setReplacementRoomIds([]); setReplacementError('');
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Review failed. Refresh the reservation before trying again.');
    } finally { setBusy(false); }
  };

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Open bank transfer reviews. ${items.length} waiting.`}
      className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[140] rounded-xl border px-4 py-3 text-sm font-bold shadow-xl md:bottom-4 md:right-4 ${overdue || queueError ? 'border-amber-400 bg-amber-950 text-amber-100' : 'border-slate-600 bg-slate-900 text-white'}`}
    >
      {queueError ? 'Payment review unavailable' : `Payment reviews (${items.length})${overdue ? ` · ${overdue} overdue` : ''}`}
    </button>
    {open && <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-3 sm:p-6">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="payment-review-title" className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-5 text-slate-100 sm:p-8">
        <div className="flex items-center justify-between gap-4"><h2 id="payment-review-title" className="text-xl font-bold">Bank transfer review</h2><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded border border-white/20 px-3 py-2">Close</button></div>
        <p className="mt-3 text-sm text-slate-300">A guest report is not proof of payment. Check the hotel’s bank statement before recording a credit. Reports older than one hour need urgent review; held rooms are not automatically cancelled.</p>
        {queueError && <p role="alert" className="mt-3 text-amber-300">{queueError}</p>}
        <button type="button" disabled={busy} className="my-3 rounded border border-white/20 px-3 py-2" onClick={() => { setRevision(v => v + 1); }}>Refresh queue</button>
        {loading ? <p>Loading…</p> : <ul className="space-y-2">{items.map(item => <li key={item.bookingCode}><button disabled={busy} type="button" onClick={() => selectCase(item.bookingCode)} className="w-full rounded-xl border border-white/10 p-3 text-left">
          <span className="font-bold">{item.bookingCode} · {item.guestName}</span><span className="block text-sm text-slate-300">{item.currency} {item.amount.toLocaleString()} · {item.roomHeld ? 'Room held' : 'No room held—availability must be checked'} · reported {new Date(item.reportedAtUtc).toLocaleString()}{item.overdue ? ' · OVERDUE' : ''}</span>
        </button></li>)}</ul>}
        {!loading && !items.length && !queueError && <p className="text-sm text-slate-400">No outstanding reports. You can enter an expired booking reference below for reconciliation.</p>}
        {items.length === 500 && <p className="text-sm text-amber-200">Showing the oldest 500 reports. Resolve these and refresh to see further cases.</p>}
        <form onSubmit={submit} className="mt-5 space-y-4">
          <fieldset disabled={busy || loading || Boolean(queueError)} className="space-y-4 disabled:opacity-60">
            <label className="block text-sm">Booking reference<input required maxLength={20} value={code} onChange={e => selectCase(e.target.value)} className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-3" placeholder="MHS123456" /></label>
            {selected && <p className="text-sm text-amber-200">{selected.roomHeld ? 'Room remains held pending this review.' : 'This booking is cancelled. Choose clean, online replacement inventory before confirming it.'}</p>}
            <label className="block text-sm">Decision<select required value={decision} onChange={e => { setDecision(e.target.value); setConfirmation(''); }} className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-3"><option value="">Choose a decision</option><option value="Confirm">Bank credit verified—confirm or restore reservation</option><option value="Refund">Bank credit verified—cancel and queue refund</option><option value="Reject">No bank credit verified—reject report and release room</option></select></label>
            {decision && decision !== 'Reject' && <>
              <label className="block text-sm">Unique reference from the hotel bank statement<input required minLength={6} maxLength={120} value={bankReference} onChange={e => setBankReference(e.target.value)} className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-3" /></label>
              <label className="block text-sm">Exact credit received (NGN)<input required type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-3" /></label>
            </>}
            {replacementRequired && <section aria-labelledby="replacement-room-title" className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
              <h3 id="replacement-room-title" className="font-bold text-blue-100">Select replacement room</h3>
              <p className="mt-1 text-sm text-slate-300">Only clean, online rooms in the originally paid room type are shown. Availability is checked again when you save.</p>
              {replacementLoading && <p className="mt-3 text-sm text-slate-300">Checking available rooms…</p>}
              {replacementError && <p role="alert" className="mt-3 text-sm text-rose-300">{replacementError}</p>}
              {replacementChoices && <>
                <p className="mt-3 text-sm font-semibold text-white">{replacementChoices.roomTypeName} · choose {replacementChoices.requiredRooms}</p>
                {replacementChoices.rooms.length < replacementChoices.requiredRooms ? (
                  <p role="alert" className="mt-2 text-sm text-amber-200">There are not enough suitable rooms. Arrange another reservation with the guest or choose Refund.</p>
                ) : Array.from({ length: replacementChoices.requiredRooms }, (_, index) => (
                  <label key={index} className="mt-3 block text-sm">Room {index + 1}
                    <select
                      required
                      value={replacementRoomIds[index] ?? ''}
                      onChange={event => setReplacementRoomIds(current => current.map((roomId, roomIndex) => roomIndex === index ? event.target.value : roomId))}
                      className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-3"
                    >
                      <option value="">Choose an available room</option>
                      {replacementChoices.rooms.map(room => (
                        <option
                          key={room.roomId}
                          value={room.roomId}
                          disabled={replacementRoomIds.some((selectedId, selectedIndex) => selectedIndex !== index && selectedId === room.roomId)}
                        >
                          {room.roomNumber} · {room.roomName}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </>}
            </section>}
            {decision === 'Refund' && <p className="text-sm text-amber-200">This records the verified credit and queues a refund. You must still process and record the actual refund in Settlements. No money is sent here.</p>}
            {decision === 'Reject' && <p className="text-sm text-amber-200">Check with the guest and the bank first. This releases the room and records no payment or refund.</p>}
            <label className="block text-sm">Review notes<textarea required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-3" /></label>
            <label className="block text-sm">Type VERIFY to record your review<input required pattern="VERIFY" value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" className="mt-1 block w-full rounded border border-white/20 bg-slate-900 p-3" /></label>
            <button disabled={busy || confirmation !== 'VERIFY' || !decision || !replacementReady} type="submit" className="rounded bg-amber-500 px-4 py-3 font-bold text-black disabled:opacity-40">{busy ? 'Saving review…' : 'Record review'}</button>
          </fieldset>
          {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
        </form>
      </div>
    </div>}
  </>;
}
