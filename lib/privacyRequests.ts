export type RequestStatus = 'Pending' | 'InProgress' | 'Completed' | 'Rejected';
export type RequestType = 'Access' | 'Rectification' | 'Erasure' | 'Restriction' | 'Portability' | 'Objection';
export interface PrivacyRequest { id:string; guestId:string; type:RequestType; status:RequestStatus; details?:string|null; requestedAtUtc:string; dueAtUtc:string; resolutionNotes?:string|null; }
const key = (value:unknown) => String(value ?? '').replace(/[\s_-]/g,'').toLowerCase();
export function normalizePrivacyRequest(raw:Record<string, unknown>): PrivacyRequest {
  const statuses:RequestStatus[]=['Pending','InProgress','Completed','Rejected'];
  const types:RequestType[]=['Access','Rectification','Erasure','Restriction','Portability','Objection'];
  const status=statuses.find(value=>key(value)===key(raw.status ?? raw.Status));
  const type=types.find(value=>key(value)===key(raw.type ?? raw.Type));
  const id=raw.id ?? raw.Id;
  if (!status || !type || typeof id !== 'string' || !id) throw new Error('Unrecognized privacy request. Refresh before editing.');
  return {id, status, type, guestId:String(raw.guestId ?? raw.GuestId ?? ''), details:(raw.details ?? raw.Details) as string|null,
    requestedAtUtc:String(raw.requestedAtUtc ?? raw.RequestedAtUtc ?? ''), dueAtUtc:String(raw.dueAtUtc ?? raw.DueAtUtc ?? ''), resolutionNotes:(raw.resolutionNotes ?? raw.ResolutionNotes) as string|null};
}
export const privacyRequestClosed = (status: RequestStatus) => status === 'Completed' || status === 'Rejected';

export function parsePrivacyRequestPage(response: unknown, requestedPage: number, pageSize: number) {
  if (!response || typeof response !== 'object') throw new Error('Privacy requests could not be read. Please refresh.');
  const raw = response as Record<string, unknown>;
  const items = raw.items ?? raw.Items;
  const totalCount = raw.totalCount ?? raw.TotalCount;
  const page = raw.page ?? raw.Page;
  const size = raw.pageSize ?? raw.PageSize;
  if (!Array.isArray(items) || !Number.isInteger(totalCount) || Number(totalCount) < 0 ||
      page !== requestedPage || size !== pageSize ||
      items.length !== Math.min(pageSize, Math.max(0, Number(totalCount) - (requestedPage - 1) * pageSize))) {
    throw new Error('Privacy requests could not be read completely. Please refresh.');
  }
  const requests = items.map(normalizePrivacyRequest);
  if (new Set(requests.map(request => request.id)).size !== requests.length) throw new Error('Duplicate privacy requests were returned. Please refresh.');
  return { items: requests, totalCount: Number(totalCount) };
}
