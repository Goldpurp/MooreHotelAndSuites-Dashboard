import React from 'react';
export const inputClass='w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2.5 text-sm text-white';
export const buttonClass='rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40';
export function Field({label,children}: {label:string;children:React.ReactNode}) {return <label className="block space-y-1 text-xs text-slate-300"><span>{label}</span>{children}</label>;}
export function StatusMessage({error,message}: {error?:string;message?:string}) {return <>{error&&<p role="alert" className="rounded-xl border border-rose-500/30 p-3 text-sm text-rose-300">{error}</p>}{message&&<p role="status" className="rounded-xl border border-emerald-500/30 p-3 text-sm text-emerald-300">{message}</p>}</>;}
