export type Choice={value:string;label:string};
export type FieldSpec={name:string;label:string;type?:'text'|'number'|'date'|'datetime-local'|'checkbox'|'textarea'|'list'|'email';required?:boolean;min?:number;max?:number;step?:string;minLength?:number;maxLength?:number;choices?:Choice[];default?:unknown};
export function initialFields(fields:FieldSpec[],initial:Record<string,any>={}){
 return Object.fromEntries(fields.map(field=>{let value=initial[field.name]??field.default??(field.type==='checkbox'?false:'');
 if(field.type==='list'&&Array.isArray(value))value=value.join(', ');
 if(field.type==='datetime-local'&&value){const d=new Date(String(value));if(!Number.isNaN(d.getTime()))value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
 if(field.choices)value=field.choices.find(choice=>choice.value.toLowerCase()===String(value).toLowerCase())?.value??value;
 return [field.name,value];}));
}
export function fieldPayload(fields:FieldSpec[],values:Record<string,any>){
 return Object.fromEntries(fields.map(field=>{const value=values[field.name];return [field.name,
 field.type==='checkbox'?Boolean(value):field.type==='list'?String(value).split(',').map(v=>v.trim()).filter(Boolean):
 value===''&&!field.required&&(field.choices||['date','datetime-local','number'].includes(field.type||''))?null:field.type==='number'?Number(value):field.type==='datetime-local'?new Date(value).toISOString():typeof value==='string'?value.trim():value];}));
}
