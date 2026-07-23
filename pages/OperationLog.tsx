import React, { useState, useMemo, useEffect } from 'react';
import { useHotel } from '../store/HotelContext';
import { VisitAction, VisitRecord } from '../types';
import {
  Search, Clock, Bed, 
  Calendar, Zap, LogOut, RefreshCw, ChevronLeft, ChevronRight,
  X, FileDown, ShieldCheck, UserRound, ReceiptText
} from 'lucide-react';
import { sileo } from 'sileo';
import { downloadPDF } from '../lib/utils';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import {
  formatPrivateDateTime,
  getBookingReferenceDisplay,
  getPrivateGuestName,
  getStaffDisplayName,
} from '../lib/displayPrivacy';

const getActivityDescription = (record: VisitRecord) => {
  const guest = getPrivateGuestName(record.guestName);
  const room = record.roomNumber && record.roomNumber !== '---'
    ? `Room ${record.roomNumber}`
    : 'the assigned room';

  switch (String(record.action)) {
    case VisitAction.RESERVATION:
      return `A new reservation was recorded for ${guest} for ${room}.`;
    case VisitAction.CHECK_IN:
      return `${guest} was checked into ${room}.`;
    case VisitAction.CHECK_OUT:
      return `${guest} was checked out of ${room}.`;
    case VisitAction.VOID:
      return `The reservation for ${guest} was cancelled.`;
    case 'NoShow':
      return `${guest} was marked as a no-show for ${room}.`;
    default:
      return `A hotel activity was recorded for ${guest}.`;
  }
};

const OperationLog: React.FC = () => {
  const { visitHistory, refreshData, bookings, rooms, selectedVisitRecordId, setSelectedVisitRecordId } = useHotel();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inspectingRecord, setInspectingRecord] = useState<VisitRecord | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [activeProtocol, setActiveProtocol] = useState<'All' | VisitAction | 'NoShow'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const detailsModalRef = useAccessibleModal(Boolean(inspectingRecord), () => setInspectingRecord(null));
  const PAGE_SIZE = 15;

  useEffect(() => { setCurrentPage(1); }, [localSearch, activeProtocol]);

  const filteredLogs = useMemo(() => {
    const q = localSearch.toLowerCase().trim();
    
    // Build base logs from visitHistory
    let baseLogs: any[] = (visitHistory || []).map(log => ({ ...log }));

    // Inject No-Shows from bookings if they are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const noShows = (bookings || [])
      .filter(b => (b.status === 'Reserved' || b.status === 'Confirmed') && new Date(b.checkIn) < today)
      .map(b => {
        const room = rooms.find(r => r.id === b.roomId);
        return {
          id: `noshow-${b.id}`,
          guestId: b.guestId || '',
          guestName: `${b.guestFirstName} ${b.guestLastName}`,
          roomId: b.roomId,
          roomNumber: room?.roomNumber || '---',
          bookingCode: b.bookingCode,
          action: 'NoShow', // Custom action for display
          timestamp: b.checkIn,
          authorizedBy: 'System Audit'
        };
      });

    const combinedLogs = [...baseLogs, ...noShows];

    return combinedLogs
      .filter((log: any) => {
        if (!log) return false;
        const matchesSearch = (log.guestName || '').toLowerCase().includes(q) || (log.bookingCode || '').toLowerCase().includes(q) || (log.roomNumber || '').toLowerCase().includes(q) || (log.authorizedBy || '').toLowerCase().includes(q);
        
        const matchesProtocol = activeProtocol === 'All' || 
                               (activeProtocol === 'NoShow' ? log.action === 'NoShow' : log.action === activeProtocol);
        
        return matchesSearch && matchesProtocol;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [visitHistory, bookings, rooms, localSearch, activeProtocol]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  useEffect(() => {
    if (!selectedVisitRecordId) return;
    const record = visitHistory.find((item) => item.id === selectedVisitRecordId);
    if (!record) return;
    setActiveProtocol('All');
    setLocalSearch('');
    setInspectingRecord(record);
    setSelectedVisitRecordId(null);
  }, [selectedVisitRecordId, setSelectedVisitRecordId, visitHistory]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    sileo.success({
      title: 'Log Updated',
      description: 'The log has been updated.'
    });
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleExportData = () => {
    const exportData = filteredLogs.map(log => ({
      Time: new Date(log.timestamp).toLocaleString(),
      Guest: getPrivateGuestName(log.guestName),
      Activity: getActionBadge(log.action).label,
      Room: log.roomNumber,
      HandledBy: getStaffDisplayName(log.authorizedBy),
      Reference: getBookingReferenceDisplay(log.bookingCode),
    }));
    downloadPDF(exportData, "Activity History", `ActivityLog_${new Date().toISOString().split('T')[0]}.pdf`);
    sileo.success({
      title: 'Success',
      description: 'Log downloaded.'
    });
  };

  const getActionBadge = (action: VisitAction) => {
    switch (action) {
      case VisitAction.CHECK_IN: return { label: 'Check In', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <Zap size={10} fill="currentColor" /> };
      case VisitAction.CHECK_OUT: return { label: 'Check Out', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <LogOut size={10} /> };
      case VisitAction.RESERVATION: return { label: 'New Booking', classes: 'bg-blue-600/10 text-blue-400 border-blue-600/20', icon: <Calendar size={10} /> };
      case VisitAction.VOID: return { label: 'Cancelled', classes: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <X size={10} /> };
      case 'NoShow' as any: return { label: 'No Show', classes: 'bg-rose-900/20 text-rose-500 border-rose-900/30', icon: <X size={10} /> };
      default: return { label: 'Standard', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: <Clock size={10} /> };
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-[2px] bg-brand-500 rounded-full"></span>
            <p className="adaptive-text-xs text-brand-400 font-black uppercase tracking-widest leading-none">Activity Log</p>
          </div>
          <h2 className="adaptive-text-2xl font-black text-white tracking-tight uppercase leading-none">Activity Log</h2>
        </div>
        <div className="flex gap-2">
           <button onClick={handleManualRefresh} className={`p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>
           <button onClick={handleExportData} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl adaptive-text-xs font-black uppercase flex items-center gap-2 shadow-lg whitespace-nowrap"><FileDown size={18} /> Download Log</button>
        </div>
      </div>

      <div className="glass-card min-h-0 flex-1 rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl bg-slate-900/10 backdrop-blur-3xl">
        <div className="px-6 py-4 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-950/60">
           <div className="relative w-full md:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input type="text" placeholder="Search logs..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 adaptive-text-xs text-white outline-none font-medium" />
           </div>
           <div className="flex items-center gap-1.5 p-1.5 bg-black/40 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
              {(['All', VisitAction.RESERVATION, VisitAction.CHECK_IN, VisitAction.CHECK_OUT, VisitAction.VOID, 'NoShow'] as const).map((p) => (
                <button key={p} onClick={() => setActiveProtocol(p)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeProtocol === p ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-300'}`}>{p === 'All' ? 'ALL' : p === 'NoShow' ? 'NO SHOW' : p.toUpperCase()}</button>
              ))}
           </div>
        </div>

        <div className="scroll-pane min-h-0 flex-1 overflow-auto">
          <table className="mobile-card-table w-full text-left min-w-[800px]">
            <thead>
              <tr className="text-slate-600 text-[10px] font-black uppercase tracking-widest bg-slate-950/40 border-b border-white/5">
                <th className="responsive-table-padding">Time</th>
                <th className="responsive-table-padding">Guest Name</th>
                <th className="responsive-table-padding text-center">Action</th>
                <th className="responsive-table-padding hide-on-tablet">Room</th>
                <th className="responsive-table-padding text-right">Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLogs.length === 0 ? (
                <tr><td colSpan={5} className="py-48 text-center text-slate-700 adaptive-text-sm font-black uppercase tracking-widest">No logs found</td></tr>
              ) : (
                paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} onClick={() => setInspectingRecord(log)} className="hover:bg-brand-500/[0.02] transition-all group border-l-4 border-transparent hover:border-brand-500 cursor-pointer">
                      <td data-label="Time" className="responsive-table-padding">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-black/60 rounded-xl border border-white/5 text-slate-700 shrink-0"><Clock size={16} /></div>
                          <div>
                            <p className="adaptive-text-sm font-black text-white leading-none mb-1.5">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(log.timestamp).toLocaleDateString('en-GB')}</p>
                          </div>
                        </div>
                      </td>
                      <td data-label="Guest" className="responsive-table-padding">
                        <div className="min-w-0">
                            <p className="adaptive-text-sm font-black text-white uppercase truncate leading-none mb-1.5">{getPrivateGuestName(log.guestName)}</p>
                           <p className="break-all text-[9px] font-black uppercase tracking-wider text-slate-500">Ref: {getBookingReferenceDisplay(log.bookingCode)}</p>
                        </div>
                      </td>
                      <td data-label="Action" className="responsive-table-padding">
                         <div className="flex justify-center">
                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-2 w-fit ${badge.classes}`}>{badge.icon} {badge.label}</span>
                         </div>
                      </td>
                      <td data-label="Room" className="responsive-table-padding hide-on-tablet">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/5 rounded-xl border border-white/5 text-slate-700 shrink-0"><Bed size={16} /></div>
                            <div>
                               <p className="adaptive-text-sm font-black text-white leading-none mb-1.5">Room {log.roomNumber || '---'}</p>
                               <p className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">Room</p>
                            </div>
                         </div>
                      </td>
                      <td data-label="Staff" className="responsive-table-padding text-right">
                         <div className="min-w-0">
                            <p className="adaptive-text-sm font-black text-slate-300 uppercase truncate leading-none mb-1.5">{getStaffDisplayName(log.authorizedBy)}</p>
                            <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Handled by</p>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
           <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Ready • {filteredLogs.length} Records</div>
           <div className="flex gap-2">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={18} /></button>
              <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[11px] font-black text-white">{currentPage} / {totalPages || 1}</span></div>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={18} /></button>
           </div>
        </div>
      </div>

      {inspectingRecord && (
        <div ref={detailsModalRef} role="dialog" aria-modal="true" aria-label="Activity record details" tabIndex={-1} className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-[#020617]/95 backdrop-blur-md animate-in fade-in duration-500 overflow-hidden">
           <div className="w-full max-w-xl bg-[#0a0f1d] border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] shadow-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-5 sm:px-8 py-5 border-b border-white/5 flex items-center justify-between gap-4 bg-slate-950/40">
                 <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${getActionBadge(inspectingRecord.action).classes}`}>
                      {getActionBadge(inspectingRecord.action).icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-brand-400">Activity summary</p>
                      <h3 className="truncate text-lg font-black text-white">{getActionBadge(inspectingRecord.action).label}</h3>
                    </div>
                 </div>
                 <button type="button" data-modal-close aria-label="Close activity details" onClick={() => setInspectingRecord(null)} className="p-2 hover:bg-white/10 text-slate-500 rounded-xl transition-all active:scale-90"><X size={20}/></button>
              </div>
              <div className="scroll-pane flex-1 space-y-5 overflow-y-auto p-5 sm:p-8">
                 <section className="rounded-2xl border border-brand-500/15 bg-brand-500/[0.06] p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${getActionBadge(inspectingRecord.action).classes}`}>
                        {getActionBadge(inspectingRecord.action).icon} {getActionBadge(inspectingRecord.action).label}
                      </span>
                      <span className="text-right text-[10px] font-bold text-slate-500">{formatPrivateDateTime(inspectingRecord.timestamp)}</span>
                    </div>
                    <p className="text-sm font-semibold leading-6 text-slate-200">{getActivityDescription(inspectingRecord)}</p>
                 </section>

                 <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                      <dt className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600"><UserRound size={14}/> Guest</dt>
                      <dd className="truncate text-sm font-black text-white">{getPrivateGuestName(inspectingRecord.guestName)}</dd>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                      <dt className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600"><Bed size={14}/> Room</dt>
                      <dd className="truncate text-sm font-black text-white">{inspectingRecord.roomNumber && inspectingRecord.roomNumber !== '---' ? `Room ${inspectingRecord.roomNumber}` : 'Not assigned'}</dd>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                      <dt className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600"><ShieldCheck size={14}/> Handled by</dt>
                      <dd className="truncate text-sm font-black text-white">{getStaffDisplayName(inspectingRecord.authorizedBy)}</dd>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.035] p-4">
                      <dt className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-600"><ReceiptText size={14}/> Booking reference</dt>
                      <dd className="break-all text-sm font-black text-white">{getBookingReferenceDisplay(inspectingRecord.bookingCode)}</dd>
                    </div>
                 </dl>
              </div>
              <div className="px-5 sm:px-8 py-4 bg-slate-950/60 border-t border-white/5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                 <p className="flex items-center gap-2 text-[9px] font-bold text-slate-600"><ShieldCheck size={14}/> Booking references are shown in full; private system credentials remain protected.</p>
                 <button type="button" data-modal-close onClick={() => setInspectingRecord(null)} className="px-8 sm:px-10 py-2 sm:py-3 bg-brand-600 hover:bg-brand-700 text-white font-black text-[11px] sm:text-[12px] uppercase tracking-widest rounded-xl shadow-xl transition-all active:scale-95">Close</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OperationLog;
