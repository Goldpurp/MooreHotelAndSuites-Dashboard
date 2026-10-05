import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const load=async path=>{const js=ts.transpileModule(await readFile(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));};
const {recoverStaffSession}=await load('lib/sessionRecovery.ts');
const {normalizePrivacyRequest,privacyRequestClosed}=await load('lib/privacyRequests.ts');
const credentials=()=>{let token='test-token';return {getToken:()=>token,removeToken:()=>{token=null;},replace:value=>{token=value;}};};
test('transient timeout, network and server errors retain sign-in for retry',async()=>{
 for(const message of ['Connection timed out','Network unavailable','Service unavailable']){
  const auth=credentials(); const result=await recoverStaffSession(async()=>{throw new Error(message);},auth);
  assert.equal(result.kind,'retry'); assert.equal(auth.getToken(),'test-token');
  const retry=await recoverStaffSession(async()=>({role:'Admin',id:'staff'}),auth); assert.equal(retry.kind,'ready');
 }
});
test('revoked sessions and guest accounts cannot recover staff access',async()=>{
 const auth=credentials();assert.equal((await recoverStaffSession(async()=>{auth.removeToken();throw new Error('401');},auth)).kind,'signedOut');
 const guest=credentials(); assert.equal((await recoverStaffSession(async()=>({role:'Client'}),guest)).kind,'signedOut'); assert.equal(guest.getToken(),null);
});
test('late responses cannot replace a new account or resurrect logout',async()=>{
 const auth=credentials();assert.equal((await recoverStaffSession(async()=>{auth.replace('new-account');return {role:'Admin'};},auth)).kind,'stale');
 assert.equal(auth.getToken(),'new-account');
 const logout=credentials();assert.equal((await recoverStaffSession(async()=>{logout.removeToken();return {role:'Admin'};},logout)).kind,'stale');assert.equal(logout.getToken(),null);
});
test('privacy wire enums activate the intended fields and preserve terminal state',()=>{
 for(const type of ['access','rectification','erasure','restriction','portability','objection']){
  for(const status of ['pending','inProgress','completed','rejected']){
   const result=normalizePrivacyRequest({id:'request',type,status});
   assert.equal(result.type.toLowerCase(),type);assert.equal(result.status.toLowerCase(),status.toLowerCase());
   assert.equal(privacyRequestClosed(result.status),['completed','rejected'].includes(status));
  }
 }
 assert.equal(normalizePrivacyRequest({Id:'a',Type:'Rectification',Status:'Pending'}).type,'Rectification');
 for(const raw of [{id:'a',type:'rectification',status:'unknown'},{id:'a',type:'unknown',status:'pending'}])assert.throws(()=>normalizePrivacyRequest(raw));
});

const {paymentStatusLabel,roomStateCounts}=await load('lib/displayStates.ts');
test('dashboard counts every physical room once including unknown and cleaning states',()=>{
 const states=['Available','Occupied','Dirty','Cleaning','Clean','Inspected','Reserved','Maintenance','OutOfOrder','FutureStatus'];
 const counts=roomStateCounts(states.map(status=>({status})));
 assert.equal(counts.reduce((sum,item)=>sum+item.value,0),10);
 assert.ok(counts.every(item=>item.value===1));
 assert.equal(paymentStatusLabel('paymentReported'),'Payment reported');
 assert.equal(paymentStatusLabel('PartiallyPaid'),'Partially paid');
 assert.equal(paymentStatusLabel('futureStatus'),'Unknown');
});

const {auditDetails,auditActor}=await load('lib/auditPresentation.ts');
test('audit details retain reference, real action and approved changes without credentials',()=>{
 const log={action:'PaymentReported',entityId:'record-1',profileId:'staff-1',oldData:JSON.stringify({Status:'Pending',Amount:10}),newData:JSON.stringify({Status:'Confirmed',Amount:20,BookingCode:'MHS123456',Reason:'Checked statement',Password:'secret',GuestAccessToken:'token',Nested:{password:'secret'}})};
 const details=auditDetails(log);
 assert.equal(details.action,'Payment Reported');assert.equal(details.reference,'MHS123456');
 assert.ok(details.changes.some(change=>change.field==='Status'&&change.before==='Pending'&&change.after==='Confirmed'));
 assert.doesNotMatch(JSON.stringify(details),/secret|token|Nested/);
 assert.equal(auditActor('staff-1',[{id:'staff-1',name:'QA Admin'}]),'QA Admin');
 assert.equal(auditDetails({...log,newData:'bad-json'}).reference,'record-1');
});

const {maintenanceTransitions,maintenancePayload,hotelDate}=await load('lib/operations.ts');
test('maintenance transitions keep terminal work orders closed and enforce closure dates',()=>{
 assert.deepEqual(maintenanceTransitions('resolved'),[]);
 assert.deepEqual(maintenanceTransitions('cancelled'),[]);
 assert.ok(!maintenanceTransitions('open').includes('Resolved'));
 assert.ok(maintenanceTransitions('inProgress').includes('Resolved'));
 assert.throws(()=>maintenancePayload({roomId:'r',title:'Test job',description:'Fix the air conditioning',outOfOrderFrom:'2026-10-05',outOfOrderUntil:'2026-10-05'}),/release date/);
 assert.equal(maintenancePayload({roomId:'r',title:'Test job',description:'Fix the air conditioning',outOfOrderFrom:'2026-10-05',outOfOrderUntil:'2026-10-06',assignedToUserId:''}).assignedToUserId,null);
 assert.equal(hotelDate(new Date('2026-10-04T23:30:00Z')),'2026-10-05');
});

const {initialFields,fieldPayload}=await load('lib/formFields.ts');
test('operational forms preserve optional text and normalize nullable dates, IDs and numeric values',()=>{
 const fields=[{name:'description'},{name:'roomId',choices:[{value:'one',label:'One'}]},{name:'end',type:'date'},{name:'limit',type:'number'},{name:'active',type:'checkbox'},{name:'amount',type:'number',required:true},{name:'amenities',type:'list'}];
 const values=initialFields(fields,{amount:12.5,amenities:['WiFi','Pool'],active:true});
 assert.deepEqual(fieldPayload(fields,values),{description:'',roomId:null,end:null,limit:null,active:true,amount:12.5,amenities:['WiFi','Pool']});
 assert.equal(initialFields([{name:'status',choices:[{value:'InProgress',label:'In progress'}]}],{status:'inProgress'}).status,'InProgress');
});

const {validatePricing}=await load('lib/pricingForms.ts');
test('pricing form rejects ambiguous daily targets and impossible limits before confirmation',()=>{
 assert.throws(()=>validatePricing('daily-rates',{roomId:'r',roomTypeId:'t'}),/exactly one/);
 assert.throws(()=>validatePricing('daily-rates',{}),/exactly one/);
 assert.doesNotThrow(()=>validatePricing('daily-rates',{roomTypeId:'t'}));
 assert.throws(()=>validatePricing('rate-plans',{minimumNights:4,maximumNights:2}),/Maximum nights/);
 assert.throws(()=>validatePricing('promotions',{discountType:'Percentage',value:101}),/100/);
 assert.throws(()=>validatePricing('promotions',{validFromUtc:'2026-10-06T00:00:00Z',validUntilUtc:'2026-10-05T00:00:00Z'}),/end date/);
});

const {channelTransitions,validateInbound}=await load('lib/channelOperations.ts');
test('channel event controls keep processed/dead-letter records terminal and validate inbound JSON',()=>{
 assert.deepEqual(channelTransitions('processed'),[]);assert.deepEqual(channelTransitions('deadLetter'),[]);
 assert.ok(channelTransitions('failed').includes('Pending'));
 assert.throws(()=>validateInbound({payloadJson:'not JSON'}),/valid event JSON/);
 assert.equal(validateInbound({payloadJson:'{}',externalReservationId:''}).externalReservationId,null);
 assert.throws(()=>validateInbound({payloadJson:JSON.stringify('x'.repeat(131073))}),/128 KiB/);
});
