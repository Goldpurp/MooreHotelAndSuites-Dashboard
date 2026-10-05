import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const js = ts.transpileModule(await readFile(new URL('../lib/analytics.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {parseAnalytics}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const report={kpis:{netRevenue:900,occupancyRate:50,activeGuests:2,avgNightlyRate:100,revenueGrowthPercentage:10,occupancyGrowthPercentage:5},revenueDynamics:[{date:'2026-10-05',value:900}],fromDate:'2026-10-05',toDate:'2026-10-05',report:{payments:1000,refunds:100,revPar:50,adr:100,receivables:20,guestCredits:0}};
test('accepts the API accounting shape including refunds and negative receipts',()=>{
 assert.deepEqual(parseAnalytics(report),report);
 assert.equal(parseAnalytics({...report,kpis:{...report.kpis,netRevenue:-100}}).kpis.netRevenue,-100);
});
test('missing, legacy or malformed accounting data is unavailable, never booking-derived revenue',()=>{
 for(const value of [null,{}, {totalRevenue:999999}, {...report,kpis:{...report.kpis,netRevenue:'900'}}, {...report,report:null}, {...report,revenueDynamics:[{date:'2026-10-05',value:NaN}]}]) assert.throws(()=>parseAnalytics(value));
});
