import React,{useEffect,useState} from 'react';
import SchemaForm,{FieldSpec} from './SchemaForm';
import {Field,inputClass,buttonClass} from './OperationalFields';
export default function CatalogueEditor({title,items,fields,busy,onSave,onRemove,describe}: {title:string;items:Record<string,any>[];fields:FieldSpec[];busy:boolean;onSave:(id:string|null,body:Record<string,any>)=>Promise<boolean>;onRemove?:(item:Record<string,any>)=>Promise<void>;describe:(item:Record<string,any>)=>string}){
 const [id,setId]=useState(''),[version,setVersion]=useState(0);const selected=items.find(item=>item.id===id);
 useEffect(()=>{if(id&&!busy&&!items.some(item=>item.id===id))setId('');},[id,items,busy]);
 return <section className="glass-card space-y-4 rounded-2xl p-5"><h2 className="font-bold">{title}</h2><Field label={title+' record'}><select className={inputClass} value={id} disabled={busy} onChange={e=>setId(e.target.value)}><option value="">Create new</option>{items.map(item=><option key={item.id} value={item.id}>{describe(item)}</option>)}</select></Field>{selected&&<p className="text-sm text-slate-400">{describe(selected)}</p>}<SchemaForm key={id+'-'+version} fields={fields} initial={selected} busy={busy} submitLabel={selected?'Save changes':'Create '+title.toLowerCase()} onSubmit={async body=>{if(await onSave(selected?.id||null,body)){setId('');setVersion(v=>v+1);}}}/>{selected&&onRemove&&<button className={buttonClass} disabled={busy} onClick={()=>onRemove(selected)}>Remove daily rate</button>}</section>;
}
