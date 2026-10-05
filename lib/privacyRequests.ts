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
