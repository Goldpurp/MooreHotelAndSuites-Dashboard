import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source = await readFile(new URL('../lib/pagination.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { loadAllPages } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const pageOf = (records, page, size=20) => ({items: records.slice((page-1)*size,page*size),totalCount:records.length,pageNumber:page,pageSize:size,totalPages:Math.ceil(records.length/size)});
test('loads records beyond the first page with no hard collection limit', async () => {
  const records=Array.from({length:231},(_,i)=>({id:String(i)}));
  const calls=[];
  const result=await loadAllPages(async page=>{calls.push(page);return pageOf(records,page);});
  assert.deepEqual(result,records); assert.equal(calls.length,12);
});
test('empty collections complete after one request',async()=>{
  let calls=0; assert.deepEqual(await loadAllPages(async page=>{calls++;return pageOf([],page);}),[]); assert.equal(calls,1);
});
test('a failed later page never returns a partial ledger',async()=>{
  const records=Array.from({length:21},(_,i)=>({id:String(i)}));
  await assert.rejects(loadAllPages(async page=>{if(page===2)throw new Error('offline');return pageOf(records,page);}),/offline/);
});
test('shifted, repeated and missing pages fail explicitly',async()=>{
  const records=Array.from({length:21},(_,i)=>({id:String(i)}));
  for(const change of [p=>({...p,items:[{id:'0'}]}),p=>({...p,totalCount:22}),p=>({...p,items:[]})]){
    await assert.rejects(loadAllPages(async page=>page===1?pageOf(records,page):change(pageOf(records,page))),/refresh/i);
  }
});
