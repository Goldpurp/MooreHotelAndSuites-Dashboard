export const hotelDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const words = (value: unknown) => String(value ?? '').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^./,letter=>letter.toUpperCase());
export function maintenanceTransitions(status: string): string[] {
 return ({open:['Assigned','InProgress','Cancelled'],assigned:['InProgress','Resolved','Cancelled'],inprogress:['Resolved','Cancelled']} as Record<string,string[]>)[status.toLowerCase()] ?? [];
}
export function maintenancePayload(values: Record<string,string>) {
 if (!values.roomId || !values.title.trim() || values.description.trim().length < 10) throw new Error('Choose a room and describe the maintenance work.');
 if (values.outOfOrderUntil <= values.outOfOrderFrom) throw new Error('The release date must be after the first closed date.');
 return {...values,title:values.title.trim(),description:values.description.trim(),assignedToUserId:values.assignedToUserId || null};
}
