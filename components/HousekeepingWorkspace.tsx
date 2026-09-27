import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { canManageHousekeeping, isPrivileged } from '../lib/access';
import { activeTask, HousekeepingTask, overdueCleaning } from '../lib/housekeeping';
import { useHotel } from '../store/HotelContext';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { useConfirmation } from './ConfirmationProvider';

const HousekeepingContext = createContext<{
  tasks: HousekeepingTask[]; error: string; loading: boolean;
  refresh: () => void;
}>({ tasks: [], error: '', loading: true, refresh: () => {} });

export function HousekeepingProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthenticated } = useHotel();
  const enabled = isAuthenticated && canManageHousekeeping(currentUser);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false;
    let pending = false;
    setTasks([]);
    setError('');
    setLoading(enabled);
    if (!enabled) return;
    async function refresh() {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const result = await api.get<HousekeepingTask[]>('/api/housekeeping/tasks', { silent: true });
        if (!disposed) { setTasks(result); setError(''); }
      } catch {
        if (!disposed) setError('Housekeeping could not be refreshed. Actions are paused until the connection recovers.');
      } finally {
        pending = false;
        if (!disposed) setLoading(false);
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, currentUser?.id, revision]);
  return <HousekeepingContext.Provider value={{ tasks, error, loading, refresh: () => setRevision(value => value + 1) }}>{children}</HousekeepingContext.Provider>;
}

export function HousekeepingReminder() {
  const { tasks, error, loading } = useContext(HousekeepingContext);
  const { currentUser, activeTab, setActiveTab } = useHotel();
  const [now, setNow] = useState(Date.now);
  const [snoozed, setSnoozed] = useState<Record<string, number>>({});
  useEffect(() => { setSnoozed({}); }, [currentUser?.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const due = overdueCleaning(tasks, now).filter(task => (snoozed[task.id] || 0) <= now);
  const open = canManageHousekeeping(currentUser) && !error && !loading && activeTab !== 'housekeeping' && due.length > 0;
  const dismiss = () => setSnoozed(previous => ({ ...previous, ...Object.fromEntries(due.map(task => [task.id, Date.now() + 30 * 60_000])) }));
  const modalRef = useAccessibleModal(open, dismiss);
  if (!open) return null;
  return <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/85 p-4">
    <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="cleaning-reminder-title" aria-describedby="cleaning-reminder-description" tabIndex={-1} className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-slate-900 p-6 shadow-xl">
      <h2 id="cleaning-reminder-title" className="text-xl font-bold">Rooms still awaiting cleaning</h2>
      <p id="cleaning-reminder-description" className="mt-3 text-slate-300">At least two hours have passed since checkout. These rooms are still unavailable because cleaning has not been recorded as complete. If already clean, update Housekeeping, then inspect before release.</p>
      <ul className="my-4 max-h-48 overflow-y-auto space-y-2">{due.map(task => <li key={task.id}>Room {task.roomNumber} — {Math.floor((now - Date.parse(task.createdAtUtc)) / 60_000)} minutes waiting</li>)}</ul>
      <div className="flex flex-wrap gap-3">
        <button className="min-h-11 rounded-xl bg-brand-600 px-4 font-bold" onClick={() => { dismiss(); setActiveTab('housekeeping'); }}>Review housekeeping</button>
        <button data-modal-cancel className="min-h-11 rounded-xl border border-white/20 px-4" onClick={dismiss}>Remind me in 30 minutes</button>
      </div>
    </div>
  </div>;
}

const labels: Record<HousekeepingTask['type'], string> = {
  CheckoutCleaning: 'Checkout cleaning', StayoverService: 'Stayover service',
  Inspection: 'Inspection / release', MaintenanceRecovery: 'Maintenance recovery', RoomMoveCleaning: 'Room-move cleaning',
};

export function HousekeepingPage() {
  const { tasks, error, loading, refresh } = useContext(HousekeepingContext);
  const { currentUser, refreshData } = useHotel();
  const confirm = useConfirmation();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const management = isPrivileged(currentUser);
  const active = tasks.filter(activeTask);
  async function update(task: HousekeepingTask, status: HousekeepingTask['status'], inspectionPassed?: boolean) {
    if (busy) return;
    if (status === 'Completed') {
      const accepted = await confirm({
        title: inspectionPassed === true ? `Release room ${task.roomNumber}?` : `Update room ${task.roomNumber}?`,
        message: task.type === 'Inspection'
          ? inspectionPassed ? 'Confirm the room has passed inspection. The server will check for open maintenance before making it available.' : 'The room will remain unavailable and corrective cleaning will be required.'
          : 'Confirm cleaning is finished. The room will remain unavailable until inspection passes.',
        confirmLabel: inspectionPassed === true ? 'Inspection passed' : 'Confirm',
      });
      if (!accepted) return;
    }
    setBusy(task.id); setActionError(''); setNotice('');
    try {
      await api.put(`/api/housekeeping/tasks/${task.id}`, { status, inspectionPassed });
      setNotice(status === 'Completed' ? 'Saved. The room status has been updated by the server.' : 'Task started.');
      refresh();
      void refreshData({ silent: true }).catch(() => {});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save. Refresh and retry.');
      refresh();
    } finally { setBusy(null); }
  }
  return <section className="space-y-5 pb-24">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Housekeeping</h1><p className="mt-2 text-slate-400">Start the task, mark cleaning done, then inspect and release. Guest and payment details are not shown here.</p></div><button onClick={refresh} disabled={Boolean(busy)} className="min-h-11 rounded-xl border border-white/20 px-4">Refresh</button></div>
    {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-4 text-rose-300">{error}</p>}
    {actionError && <p role="alert" className="text-rose-300">{actionError}</p>}
    {notice && <p role="status" className="text-emerald-300">{notice}</p>}
    {loading ? <p role="status">Loading housekeeping…</p> : !error && active.length === 0 ? <p className="rounded-xl border border-white/10 p-6">No outstanding housekeeping tasks.</p> : null}
    <div className="grid gap-4 lg:grid-cols-2">{active.map(task => {
      const owned = management || !task.assignedToUserId || task.assignedToUserId === currentUser?.id;
      const allowed = owned && (task.type !== 'Inspection' || management);
      const overdue = overdueCleaning([task], Date.now()).length > 0;
      const disabled = Boolean(busy) || Boolean(error) || loading;
      return <article key={task.id} className={`rounded-2xl border p-5 ${overdue ? 'border-amber-400/40 bg-amber-400/5' : 'border-white/10 bg-slate-900'}`}>
        <h2 className="text-xl font-bold">Room {task.roomNumber}</h2><p className="mt-1 text-slate-300">{labels[task.type]} · {task.status === 'InProgress' ? 'In progress' : task.status}</p>
        {overdue && <p className="mt-2 text-amber-300">Over two hours since checkout — cleaning still outstanding.</p>}
        {!allowed ? <p className="mt-4 text-slate-400">{task.type === 'Inspection' && !management ? 'Awaiting manager inspection.' : 'Assigned to another team member.'}</p> : <div className="mt-4 flex flex-wrap gap-3">
          {task.status !== 'InProgress' ? <button disabled={disabled} onClick={() => update(task, 'InProgress')} className="min-h-12 rounded-xl bg-brand-600 px-5 font-bold disabled:opacity-50">{task.type === 'Inspection' ? 'Start inspection' : 'Start cleaning'}</button> : task.type === 'Inspection' ? <>
            <button disabled={disabled} onClick={() => update(task, 'Completed', true)} className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold disabled:opacity-50">Passed — release room</button>
            <button disabled={disabled} onClick={() => update(task, 'Completed', false)} className="min-h-12 rounded-xl border border-rose-400/40 px-5 text-rose-300 disabled:opacity-50">Needs cleaning again</button>
          </> : <button disabled={disabled} onClick={() => update(task, 'Completed')} className="min-h-12 rounded-xl bg-emerald-700 px-5 font-bold disabled:opacity-50">Cleaning done</button>}
        </div>}
      </article>;
    })}</div>
  </section>;
}
