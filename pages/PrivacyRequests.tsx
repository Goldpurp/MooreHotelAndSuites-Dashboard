import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
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
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
      <header className="flex items-end justify-between gap-4">
        <div><p className="adaptive-text-xs font-black uppercase tracking-widest text-brand-400">Data protection</p><h1 className="adaptive-text-2xl font-black uppercase italic text-white">Privacy requests</h1></div>
        <button type="button" onClick={() => void load()} disabled={loading || saving !== null} aria-label="Refresh privacy requests" className="p-3 rounded-xl border border-white/10 bg-white/5 text-slate-400"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button>
      </header>
      <div className="scroll-pane min-h-0 flex-1 space-y-4 overflow-auto pr-1">
        {loading && <p role="status" className="p-6 text-slate-300">Loading privacy requests…</p>}
        {error && <p role="alert" className="rounded-xl border border-rose-500/30 p-4 text-rose-300">{error} Use Refresh to try again.</p>}
        {!loading && !error && requests.length === 0 && <div className="glass-card rounded-2xl border border-white/5 py-24 text-center text-slate-600 font-black uppercase tracking-widest">No privacy requests</div>}
        {requests.map((request) => {
          const draft = drafts[request.id] || emptyDraft(request);
          const closed = request.status === "Completed" || request.status === "Rejected";
          return <article key={request.id} className="glass-card rounded-2xl border border-white/5 p-5 sm:p-7">
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
      </div>
      <nav aria-label="Privacy request pages" className="flex items-center justify-between gap-3 text-sm">
        <button type="button" disabled={page === 1 || loading || saving !== null} onClick={() => setPage((current) => current - 1)} className="rounded-xl border border-white/10 px-4 py-3 disabled:opacity-40">Previous</button>
        <span>Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}</span>
        <button type="button" disabled={page * pageSize >= totalCount || loading || saving !== null || Boolean(error)} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-white/10 px-4 py-3 disabled:opacity-40">Next</button>
      </nav>
    </div>
  );
};

export default PrivacyRequests;
