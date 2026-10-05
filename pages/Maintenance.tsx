import React,{useEffect,useState} from 'react';
import {api} from '../lib/api';
import {useHotel} from '../store/HotelContext';
import {useConfirmation} from '../components/ConfirmationProvider';
import {Field,StatusMessage,inputClass,buttonClass} from '../components/OperationalFields';
import {hotelDate,words,maintenanceTransitions,maintenancePayload} from '../lib/operations';
type RoomOption={id:string;name:string;roomNumber:string;status:string};
type Order={id:string;roomId:string;roomNumber:string;title:string;description:string;priority:string;status:string;outOfOrderFrom:string;outOfOrderUntil:string;assignedToUserId?:string;resolutionNotes?:string};
const blank=()=>({roomId:'',title:'',description:'',priority:'Normal',outOfOrderFrom:hotelDate(),outOfOrderUntil:hotelDate(new Date(Date.now()+86400000)),assignedToUserId:''});
export default function Maintenance(){
 const {currentUser,staff,refreshData}=useHotel(),confirm=useConfirmation();
 const [rooms,setRooms]=useState<RoomOption[]>([]),[orders,setOrders]=useState<Order[]>([]),[values,setValues]=useState(blank),[selected,setSelected]=useState<string|null>(null);
 const [status,setStatus]=useState(''),[assignee,setAssignee]=useState(''),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let disposed=false;setLoading(true);setError('');
  Promise.all([api.get<RoomOption[]>('/api/maintenance/rooms'),api.get<Order[]>('/api/maintenance/work-orders')]).then(([r,o])=>{if(!Array.isArray(r)||!Array.isArray(o))throw new Error('Maintenance records could not be read.');if(!disposed){setRooms(r);setOrders(o);}}).catch(e=>{if(!disposed)setError(e.message);}).finally(()=>{if(!disposed)setLoading(false);});
  return()=>{disposed=true;};
 },[revision,currentUser?.id]);
 const selectedOrder=orders.find(order=>order.id===selected),options=[...(currentUser?[{id:currentUser.id,name:currentUser.name+' (me)'}]:[]),...staff.filter(user=>user.id!==currentUser?.id&&String(user.status).toLowerCase()==='active'&&(['Admin','Manager'].includes(user.role)||['maintenance','engineering'].includes((user.department||'').toLowerCase())))];
 const set=(key:string,value:string)=>setValues(v=>({...v,[key]:value}));
 const select=(order:Order)=>{setSelected(order.id);setStatus('');setAssignee(order.assignedToUserId||currentUser?.id||'');setNotes(order.resolutionNotes||'');setError('');setMessage('');};
 async function create(event:React.FormEvent){event.preventDefault();if(busy)return;setError('');setMessage('');let body;try{body=maintenancePayload(values);}catch(e){setError((e as Error).message);return;}
  if(!await confirm({title:'Create maintenance work order?',message:'The selected room will be unavailable for new reservations during the closed dates. Existing booking conflicts are checked before saving.',confirmLabel:'Create work order',tone:'warning'}))return;
  setBusy(true);try{await api.post('/api/maintenance/work-orders',body);setValues(blank());setMessage('Work order created.');setRevision(v=>v+1);await refreshData({silent:true});}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function update(event:React.FormEvent){event.preventDefault();if(busy||!selectedOrder||!status)return;setError('');setMessage('');
  if(!await confirm({title:'Update '+selectedOrder.title+'?',message:status==='Resolved'?'The room will move to cleaning and inspection before it can return to service.':'Save the selected status and assigned staff member.',confirmLabel:'Save work order',tone:'warning'}))return;
  setBusy(true);try{await api.put('/api/maintenance/work-orders/'+selectedOrder.id,{status,assignedToUserId:assignee||null,resolutionNotes:notes||null});setSelected(null);setMessage('Work order updated.');setRevision(v=>v+1);await refreshData({silent:true});}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <div className="space-y-5"><header><h1 className="text-2xl font-bold">Maintenance</h1><p className="text-sm text-slate-400">Room work orders, closure dates and recovery to housekeeping.</p></header><StatusMessage error={error} message={message}/><button className={buttonClass} disabled={loading||busy} onClick={()=>setRevision(v=>v+1)}>Refresh work orders</button>
 <div className="grid gap-5 xl:grid-cols-2"><section className="glass-card rounded-2xl p-5"><h2 className="mb-4 text-lg font-bold">Create work order</h2><form onSubmit={create} className="space-y-3"><fieldset disabled={busy||loading} className="space-y-3">
 <Field label="Room"><select className={inputClass} required value={values.roomId} onChange={e=>set('roomId',e.target.value)}><option value="">Choose room</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name} · {words(room.status)}</option>)}</select></Field>
 <Field label="Work order title"><input className={inputClass} required minLength={4} maxLength={160} value={values.title} onChange={e=>set('title',e.target.value)}/></Field>
 <Field label="Description"><textarea className={inputClass} required minLength={10} maxLength={2000} value={values.description} onChange={e=>set('description',e.target.value)}/></Field>
 <div className="grid grid-cols-2 gap-3"><Field label="First closed date"><input className={inputClass} type="date" required value={values.outOfOrderFrom} onChange={e=>set('outOfOrderFrom',e.target.value)}/></Field><Field label="Release date (exclusive)"><input className={inputClass} type="date" required min={values.outOfOrderFrom} value={values.outOfOrderUntil} onChange={e=>set('outOfOrderUntil',e.target.value)}/></Field></div>
 <Field label="Priority"><select className={inputClass} value={values.priority} onChange={e=>set('priority',e.target.value)}>{['Low','Normal','High','Urgent'].map(v=><option key={v}>{v}</option>)}</select></Field>
 <Field label="Assign to"><select className={inputClass} value={values.assignedToUserId} onChange={e=>set('assignedToUserId',e.target.value)}><option value="">Unassigned</option>{options.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
 <button className={buttonClass} type="submit">Create work order</button></fieldset></form></section>
 <section className="space-y-3"><h2 className="text-lg font-bold">Work orders</h2>{loading&&<p role="status">Loading work orders…</p>}{!loading&&!orders.length&&<p>No work orders.</p>}{orders.map(order=><button key={order.id} onClick={()=>select(order)} className="block w-full rounded-xl border border-white/15 p-4 text-left hover:bg-white/5"><strong>{order.title}</strong><p className="text-sm text-slate-300">Room {order.roomNumber} · {words(order.status)} · {words(order.priority)}</p><p className="text-xs text-slate-400">{order.outOfOrderFrom} to {order.outOfOrderUntil}</p></button>)}
 {selectedOrder&&<form onSubmit={update} className="glass-card space-y-3 rounded-2xl p-5"><h3 className="font-bold">{selectedOrder.title}</h3><p className="text-sm">{selectedOrder.description}</p><fieldset disabled={busy} className="space-y-3">
 {maintenanceTransitions(selectedOrder.status).length ? <><Field label="New status"><select required className={inputClass} value={status} onChange={e=>setStatus(e.target.value)}><option value="">Choose status</option>{maintenanceTransitions(selectedOrder.status).map(v=><option key={v} value={v}>{words(v)}</option>)}</select></Field>
 <Field label="Assigned staff"><select className={inputClass} value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Unassigned</option>{options.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>
 <Field label="Resolution notes"><textarea className={inputClass} required={status==='Resolved'} maxLength={1000} value={notes} onChange={e=>setNotes(e.target.value)}/></Field><button className={buttonClass} type="submit">Save work order</button></> : <p>This work order is closed. {selectedOrder.resolutionNotes}</p>}
 <button type="button" className="ml-3 text-sm underline" onClick={()=>setSelected(null)}>Close details</button></fieldset></form>}</section></div></div>;
}
