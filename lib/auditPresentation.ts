type Audit = {action: string; entityId: string; profileId: string; oldData?: unknown; newData?: unknown};
const allowed = new Set(['bookingcode','roomname','roomnumber','status','paymentstatus','amount','totalamount','currency','checkin','checkout','adultcount','childcount','roomquantity','reason','reviewreason','bankreference','transactionreference','externalreference','decision','name','isactive','isonline','priority','type','assignedroomid','roomid','roomtypeid','rateplanid','channelid','quantity','unitamount','direction','inspectionpassed','role','department']);
const label = (value: string) => value.replace(/[_-]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2');
const parse = (value: unknown): Record<string, unknown> => {
 try { const result = typeof value === 'string' ? JSON.parse(value) : value; return result && typeof result === 'object' && !Array.isArray(result) ? result : {}; } catch { return {}; }
};
const fields = (value: unknown) => Object.fromEntries(Object.entries(parse(value)).filter(([key,v])=>allowed.has(key.replace(/[_-]/g,'').toLowerCase()) && (v === null || ['string','number','boolean'].includes(typeof v))).map(([key,v])=>[key.toLowerCase(),{label:label(key),value:v == null ? 'None' : String(v).slice(0,500)}]));
export function auditDetails(log: Audit) {
 const before=fields(log.oldData),after=fields(log.newData);
 return {action:label(log.action || 'Unknown action'),reference:after.bookingcode?.value || before.bookingcode?.value || log.entityId,
  changes:[...new Set([...Object.keys(before),...Object.keys(after)])].filter(key=>before[key]?.value!==after[key]?.value).map(key=>({field:after[key]?.label || before[key].label,before:before[key]?.value ?? 'Not recorded',after:after[key]?.value ?? 'Not recorded'}))};
}
export function auditActor(profileId: string, staff: {id:string;name:string}[]) {
 if (!profileId || profileId === '00000000-0000-0000-0000-000000000000') return 'Automated system';
 return staff.find(user=>user.id===profileId)?.name || 'Staff ' + profileId;
}
