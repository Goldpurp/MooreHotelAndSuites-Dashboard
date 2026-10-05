export const channelTransitions=(status:string):string[]=>({pending:['Processed','Failed','DeadLetter'],failed:['Pending','Processed','DeadLetter']} as Record<string,string[]>)[status.toLowerCase()]??[];
export function validateInbound(body:Record<string,any>){
 const payload=String(body.payloadJson||'');if(new TextEncoder().encode(payload).length>128*1024)throw new Error('Channel payload cannot exceed 128 KiB.');
 try{JSON.parse(payload);}catch{throw new Error('Enter valid event JSON.');}return {...body,externalReservationId:body.externalReservationId||null};
}
