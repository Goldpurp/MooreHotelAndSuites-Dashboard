import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck, ChevronLeft, ChevronRight, X, Eye } from "lucide-react";
import { api } from "../lib/api";
import { sileo } from "sileo";

type RequestStatus = "Pending" | "InProgress" | "Completed" | "Rejected";
type RequestType = "Access" | "Rectification" | "Erasure" | "Restriction" | "Portability" | "Objection";

interface PrivacyRequest {
  id: string;
  guestId: string;
  type: RequestType;
  status: RequestStatus;
  details?: string | null;
  requestedAtUtc: string;
  dueAtUtc: string;
  resolutionNotes?: string | null;
}

interface Draft {
  status: RequestStatus;
  resolutionNotes: string;
  identityVerificationReference: string;
  fulfillmentEvidenceReference: string;
  confirmAction: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const emptyDraft = (request: PrivacyRequest): Draft => ({
  status: request.status === "Pending" ? "InProgress" : request.status,
  resolutionNotes: "",
  identityVerificationReference: "",
  fulfillmentEvidenceReference: "",
  confirmAction: false,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
});

const PrivacyRequests: React.FC = () => {
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<any>("/api/privacy/requests", { params: { page: String(page), pageSize: String(pageSize) } });
      const items = response.items || response.Items || [];
      setTotalCount(response.totalCount ?? response.TotalCount ?? items.length);
      setRequests(items);
      setDrafts(Object.fromEntries(items.map((request: PrivacyRequest) => [request.id, emptyDraft(request)])));
    } catch (error) {
      setError(error instanceof Error ? error.message : "The queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const updateDraft = (id: string, changes: Partial<Draft>) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...changes } }));

  const save = async (request: PrivacyRequest) => {
    const draft = drafts[request.id];
    if (!draft) return;
    if (["Completed", "Rejected"].includes(draft.status) && !draft.resolutionNotes.trim()) {
      sileo.error({ title: "Resolution notes required", description: "Add the outcome before closing this request." });
      return;
    }
    if (draft.status === "Completed" && (!draft.identityVerificationReference.trim() || !draft.fulfillmentEvidenceReference.trim())) {
      sileo.error({ title: "Evidence required", description: "Record both identity verification and fulfillment evidence." });
      return;
    }
    if (draft.status === "Completed" && ["Erasure", "Restriction", "Objection"].includes(request.type) && !draft.confirmAction) {
      sileo.error({ title: "Confirm the action", description: "Confirm that the requested privacy action was completed." });
      return;
    }

    const rectification = request.type === "Rectification"
      ? Object.fromEntries(Object.entries({ firstName: draft.firstName, lastName: draft.lastName, email: draft.email, phone: draft.phone }).filter(([, value]) => value.trim()))
      : undefined;
    if (draft.status === "Completed" && request.type === "Rectification" && !Object.keys(rectification || {}).length) {
      sileo.error({ title: "Correction required", description: "Enter at least one corrected guest field." });
      return;
    }

    setSaving(request.id);
    try {
      await api.patch(`/api/privacy/requests/${request.id}/status`, {
        status: draft.status,
        resolutionNotes: draft.resolutionNotes.trim() || undefined,
        identityVerificationReference: draft.identityVerificationReference.trim() || undefined,
        fulfillmentEvidenceReference: draft.fulfillmentEvidenceReference.trim() || undefined,
        rectification,
        confirmAction: draft.confirmAction,
      });
      sileo.success({ title: "Privacy request updated", description: `${request.type} is now ${draft.status}.` });
      await load();
    } catch (error) {
      sileo.error({ title: "Update failed", description: error instanceof Error ? error.message : "The request could not be updated." });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="master-detail-workspace flex h-full min-h-0 flex-row gap-6 overflow-hidden">
      <div className="split-main flex min-h-0 flex-col gap-4">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1"><div className="flex items-center gap-2"><span className="w-8 h-[2px] bg-brand-500 rounded-full" /><p className="adaptive-text-xs text-brand-400 font-black uppercase tracking-widest leading-none">Data protection</p></div><h1 className="adaptive-text-2xl font-black text-white tracking-tight uppercase leading-none">Privacy requests</h1></div>
        <button type="button" onClick={() => void load()} disabled={loading || saving !== null} aria-label="Refresh privacy requests" className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
      </header>
      <div className="glass-card rounded-2xl min-h-0 flex-1 flex flex-col overflow-hidden border border-white/5 bg-slate-900/40">
        <div className="scroll-pane min-h-0 flex-1 overflow-auto">
          {loading && <p role="status" className="p-6 text-slate-300">Loading privacy requests…</p>}
          {error && <p role="alert" className="m-4 rounded-xl border border-rose-500/30 p-4 text-rose-300">{error} Use Refresh to try again.</p>}
          <table className="mobile-card-table w-full text-left min-w-[700px]">
            <thead><tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5 bg-slate-950/40">
              <th className="responsive-table-padding">Request</th><th className="responsive-table-padding">Requested</th><th className="responsive-table-padding">Due</th><th className="responsive-table-padding">Status</th><th className="responsive-table-padding text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {!loading && !error && requests.length === 0 && <tr><td colSpan={5} className="py-32 text-center text-slate-700 adaptive-text-sm font-black uppercase tracking-widest">No privacy requests</td></tr>}
              {requests.map((request) => <tr key={request.id} onClick={() => setSelectedId(request.id)} className={`hover:bg-white/[0.02] transition-all group border-l-4 cursor-pointer ${selectedId === request.id ? 'bg-white/[0.04] border-brand-500' : 'border-transparent'}`}>
                <td data-label="Request" className="responsive-table-padding"><button type="button" onClick={() => setSelectedId(request.id)} className="adaptive-text-sm font-black text-white uppercase hover:text-brand-400">{request.type}</button></td>
                <td data-label="Requested" className="responsive-table-padding text-xs text-slate-400">{new Date(request.requestedAtUtc).toLocaleDateString('en-GB')}</td>
                <td data-label="Due" className="responsive-table-padding text-xs text-slate-400">{new Date(request.dueAtUtc).toLocaleDateString('en-GB')}</td>
                <td data-label="Status" className="responsive-table-padding"><span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border tracking-widest bg-brand-500/10 text-brand-400 border-brand-500/20">{request.status}</span></td>
                <td data-label="Actions" className="responsive-table-padding text-right"><button type="button" aria-label={`View ${request.type} request`} onClick={() => setSelectedId(request.id)} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white"><Eye size={16} /></button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <nav aria-label="Privacy request pages" className="px-6 py-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between">
          <div className="text-[9px] text-slate-700 font-black uppercase tracking-widest">Total requests • {totalCount}</div>
          <div className="flex gap-2">
            <button type="button" aria-label="Previous page" disabled={page === 1 || loading || saving !== null} onClick={() => { setSelectedId(null); setPage((current) => current - 1); }} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronLeft size={16} /></button>
            <div className="flex items-center px-4 rounded-xl bg-black/40 border border-white/5"><span className="text-[10px] font-black text-white">{page} / {Math.max(1, Math.ceil(totalCount / pageSize))}</span></div>
            <button type="button" aria-label="Next page" disabled={page * pageSize >= totalCount || loading || saving !== null || Boolean(error)} onClick={() => { setSelectedId(null); setPage((current) => current + 1); }} className="p-2 border border-white/10 rounded-xl text-slate-500 hover:text-white transition-all disabled:opacity-10 bg-white/5"><ChevronRight size={16} /></button>
          </div>
        </nav>
      </div>
      </div>
      {selectedId && <div className="split-side flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 h-full overflow-hidden shrink-0">
        {requests.filter((request) => request.id === selectedId).map((request) => {
          const draft = drafts[request.id] || emptyDraft(request);
          const closed = request.status === "Completed" || request.status === "Rejected";
          return <article key={request.id} className="glass-card scroll-pane rounded-2xl p-8 flex flex-col h-full border border-white/10 bg-[#0a0f1a] shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-start mb-8"><h3 className="adaptive-text-xl font-black text-white tracking-tighter uppercase leading-none">Request details</h3><button type="button" aria-label="Close request details" onClick={() => setSelectedId(null)} className="p-2 bg-white/5 rounded-xl text-slate-600 hover:text-rose-500 transition-all"><X size={18} /></button></div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-brand-400" /><h2 className="font-black text-white">{request.type}</h2><span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-black uppercase text-slate-400">{request.status}</span></div><p className="mt-2 text-xs text-slate-500">Guest {request.guestId} · requested {new Date(request.requestedAtUtc).toLocaleString()} · due {new Date(request.dueAtUtc).toLocaleDateString()}</p>{request.details && <p className="mt-3 text-sm text-slate-300">{request.details}</p>}</div></div>
            {!closed && <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Next status</span><select value={draft.status} onChange={(e) => updateDraft(request.id, { status: e.target.value as RequestStatus })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white"><option value="InProgress">In progress</option><option value="Completed">Completed</option><option value="Rejected">Rejected</option></select></label>
              <label><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Resolution notes</span><input value={draft.resolutionNotes} onChange={(e) => updateDraft(request.id, { resolutionNotes: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white" /></label>
              {draft.status === "Completed" && <><label><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Identity evidence reference</span><input value={draft.identityVerificationReference} onChange={(e) => updateDraft(request.id, { identityVerificationReference: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white" /></label><label><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fulfillment evidence reference</span><input value={draft.fulfillmentEvidenceReference} onChange={(e) => updateDraft(request.id, { fulfillmentEvidenceReference: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white" /></label></>}
              {draft.status === "Completed" && request.type === "Rectification" && <div className="grid grid-cols-2 gap-3 md:col-span-2"><input placeholder="Correct first name" value={draft.firstName} onChange={(e) => updateDraft(request.id, { firstName: e.target.value })} className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white" /><input placeholder="Correct last name" value={draft.lastName} onChange={(e) => updateDraft(request.id, { lastName: e.target.value })} className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white" /><input placeholder="Correct email" value={draft.email} onChange={(e) => updateDraft(request.id, { email: e.target.value })} className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white" /><input placeholder="Correct phone" value={draft.phone} onChange={(e) => updateDraft(request.id, { phone: e.target.value })} className="rounded-xl border border-white/10 bg-slate-950 p-3 text-sm text-white" /></div>}
              {draft.status === "Completed" && ["Erasure", "Restriction", "Objection"].includes(request.type) && <label className="flex items-center gap-3 text-sm text-slate-300 md:col-span-2"><input type="checkbox" checked={draft.confirmAction} onChange={(e) => updateDraft(request.id, { confirmAction: e.target.checked })} className="h-4 w-4 accent-blue-600" />I confirm the requested action has been completed.</label>}
              <button type="button" onClick={() => void save(request)} disabled={saving !== null || loading || Boolean(error)} className="rounded-xl bg-brand-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white md:col-span-2"><CheckCircle2 size={15} className="mr-2 inline" />{saving === request.id ? "Saving" : "Update request"}</button>
            </div>}
            {closed && request.resolutionNotes && <p className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4 text-sm text-slate-400">{request.resolutionNotes}</p>}
          </article>;
        })}
      </div>}
    </div>
  );
};

export default PrivacyRequests;
