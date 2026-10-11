import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import ts from 'typescript';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
async function load(path, dependencies = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, { exports, document, window, Error, require: name => {
    if (name === 'react') return React;
    if (name === 'react-dom') return ReactDOM;
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected import: ${name}`);
  }});
  return exports;
}

test('staff labels show departments while preserving management roles', async () => {
  const { staffLabel } = await load('lib/staffLabel.ts');
  for (const [department, expected] of [['Housekeeping', 'Housekeeper'], ['Reception', 'Receptionist'], ['Front Desk', 'Receptionist'], ['Engineering', 'Engineer'], ['Finance', 'Finance']]) {
    assert.equal(staffLabel({role:'Staff',department}), expected);
  }
  assert.equal(staffLabel({role:'Admin',department:'Reception'}), 'Admin');
  assert.equal(staffLabel({role:'Manager',department:'Housekeeping'}), 'Manager');
  assert.equal(staffLabel({role:'Staff'}), 'Staff');
});

test('failed login renders one inline error and does not also toast it', async t => {
  const errors = [];
  const { default: Auth } = await load('pages/Auth.tsx', {
    qrcode: {}, 'lucide-react': new Proxy({}, { get: () => () => null }),
    '../store/HotelContext': {useHotel: () => ({login: async () => { throw new Error('Invalid email or password.'); }})},
    sileo: {sileo:{error: value => errors.push(value),success:()=>{}}},
    '../components/Logo': {__esModule: true, default: () => null}, '../lib/api': {api:{}},
    '../lib/utils': {calculateStrength:()=>0},
  });
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  t.after(async () => { await React.act(() => root.unmount()); container.remove(); });
  await React.act(() => root.render(React.createElement(Auth)));
  await React.act(async () => { container.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})); });
  assert.equal(container.querySelectorAll('[role="alert"]').length, 1);
  assert.equal(container.querySelector('[role="alert"]').textContent, 'Invalid email or password.');
  assert.equal(container.textContent.split('Invalid email or password.').length - 1, 1);
  assert.equal(errors.length, 0);
});

test('dialog portal escapes the page container and is removed on unmount', async () => {
  const { default: ModalPortal } = await load('components/ModalPortal.tsx');
  const container = document.createElement('main'); document.body.append(container);
  const root = createRoot(container);
  await React.act(() => root.render(React.createElement(ModalPortal, null, React.createElement('div',{role:'dialog'},'Room editor'))));
  assert.equal(container.querySelector('[role="dialog"]'), null);
  assert.equal(document.body.querySelector('[role="dialog"]').textContent, 'Room editor');
  await React.act(() => root.unmount()); container.remove();
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test('payment review accepts a blank bank ID only for acknowledged confirmation, not refunds', async t => {
  const parser = await load('lib/paymentReview.ts');
  const portal = await load('components/ModalPortal.tsx');
  let authenticated = true;
  const { default: Review } = await load('components/PaymentReviewQueue.tsx', {
    'lucide-react': new Proxy({}, {get:()=>()=>null}),
    './ModalPortal': {__esModule:true, ...portal},
    '../lib/paymentReview': parser,
    '../store/HotelContext': {useHotel:()=>({currentUser:{id:'admin',role:'Admin'},isAuthenticated:authenticated,refreshData:async()=>{}})},
    '../hooks/useAccessibleModal': {useAccessibleModal:()=>React.useRef(null)},
    '../lib/api': {api:{get:async()=>[]}}, sileo:{sileo:{success:()=>{},error:()=>{}}},
  });
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container);
  t.after(async()=>{await React.act(()=>root.unmount());container.remove();});
  const booking={bookingCode:'QA123456',amount:30000,guestFirstName:'Test',guestLastName:'Guest',status:'Pending',createdAt:'2026-10-11T10:00:00Z',checkIn:'2026-11-20',checkOut:'2026-11-21'};
  const render = request => React.act(()=>root.render(React.createElement(Review,{requestedBooking:request,onChooseReplacement:()=>{},onOpenSettlements:()=>{}})));
  const button = label => Array.from(document.querySelectorAll('[role="dialog"] button')).find(b=>b.textContent.trim()===label);
  await render(booking);
  await React.act(()=>button('Payment arrived').click());
  assert.equal(button('Confirm payment').disabled,true);
  assert.equal(document.querySelector('input[autocomplete="off"]').required,false);
  await React.act(()=>document.querySelector('input[type="checkbox"]').click());
  assert.equal(button('Confirm payment').disabled,false);
  await React.act(()=>button('Queue refund').click());
  assert.equal(document.querySelector('button[type="submit"]').disabled,true);
  assert.equal(document.querySelector('input[autocomplete="off"]').required,true);
  authenticated=false;
  await render(undefined);
  assert.equal(document.querySelector('[role="dialog"]'),null);
  authenticated=true;
  await render(undefined);
  assert.equal(document.querySelector('[role="dialog"]'),null);
});


test('responsive detail panels portal only on small screens and Escape closes the top dialog', async t => {
  let compact = false;
  const listeners = new Set();
  window.matchMedia = () => ({matches:compact, addEventListener:(_,fn)=>listeners.add(fn), removeEventListener:(_,fn)=>listeners.delete(fn)});
  const hook = await load('hooks/useAccessibleModal.ts');
  const portal = await load('components/ModalPortal.tsx');
  const {default: DetailPanel} = await load('components/DetailPanel.tsx', {'./ModalPortal': {__esModule:true,...portal}, '../hooks/useAccessibleModal':hook});
  const container = document.createElement('main'); document.body.append(container);
  const root=createRoot(container);
  t.after(async()=>{await React.act(()=>root.unmount());container.remove();});
  const closed=[];
  function Fixture(){
    const [open,setOpen]=React.useState(true);
    const [nested,setNested]=React.useState(false);
    return open && React.createElement(DetailPanel,{label:'Guest details',onClose:()=>{closed.push('details');setOpen(false);}},
      React.createElement('button',{onClick:()=>setOpen(false)},'Close details'),
      React.createElement('button',{onClick:()=>setNested(true)},'Check out'),
      nested && React.createElement(DetailPanel,{label:'Checkout',onClose:()=>{closed.push('checkout');setNested(false);}},React.createElement('button',null,'Cancel checkout')));
  }
  await React.act(()=>root.render(React.createElement(Fixture)));
  assert.ok(container.querySelector('[role="complementary"]'));
  assert.equal(document.querySelector('[role="dialog"]'),null);
  await React.act(()=>{compact=true;listeners.forEach(fn=>fn());});
  assert.equal(container.querySelector('[role="dialog"]'),null);
  assert.equal(document.querySelector('[role="dialog"]').getAttribute('aria-label'),'Guest details');
  await React.act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Check out').click());
  assert.equal(document.querySelectorAll('[role="dialog"]').length,2);
  await React.act(()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.deepEqual(closed,['checkout']);
  assert.equal(document.querySelectorAll('[role="dialog"]').length,1);
  await React.act(()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.deepEqual(closed,['checkout','details']);
  assert.equal(document.querySelector('[role="dialog"]'),null);
});

test('staff details open on selection and stay closed after dismissal or refresh', async t => {
  window.matchMedia = () => ({matches:false, addEventListener:()=>{}, removeEventListener:()=>{}});
  const types = await load('types.ts');
  const hook = await load('hooks/useAccessibleModal.ts');
  const portal = await load('components/ModalPortal.tsx');
  const detail = await load('components/DetailPanel.tsx', {'./ModalPortal': {__esModule:true,...portal}, '../hooks/useAccessibleModal':hook});
  const user={id:'housekeeper',name:'Test Housekeeper',email:'test@example.test',role:'Staff',department:'Housekeeping',status:'Active',createdAt:'2026-10-11'};
  const {default: Staff} = await load('pages/StaffManagement.tsx', {
    '../components/DetailPanel': {__esModule:true,...detail},
    '../store/HotelContext':{useHotel:()=>({staff:[user],currentUser:{role:'Admin'},setSelectedProfileId:()=>{},refreshData:async()=>true})},
    'lucide-react':new Proxy({},{get:()=>()=>null}), sileo:{sileo:{success:()=>{},error:()=>{}}},
    '../components/RoleBadge':{__esModule:true,default:()=>null},
    '../components/PermissionWrapper':{__esModule:true,default:({children})=>children},
    '../components/CreateUserModal':{__esModule:true,default:()=>null},
    '../components/StaffSuspensionModal':{__esModule:true,default:()=>null},
    '../components/ConfirmationProvider':{useConfirmation:()=>async()=>false},
    '../types':types,'../lib/api':{api:{}},
  });
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container);
  t.after(async()=>{await React.act(()=>root.unmount());container.remove();});
  await React.act(()=>root.render(React.createElement(Staff)));
  assert.equal(document.querySelector('[aria-label="Staff details"]'),null);
  await React.act(()=>container.querySelector('tr[tabindex="0"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  assert.ok(document.querySelector('[aria-label="Staff details"]'));
  await React.act(()=>container.querySelector('button[aria-label="Close details"]').click());
  await React.act(()=>root.render(React.createElement(Staff)));
  assert.equal(document.querySelector('[aria-label="Staff details"]'),null);
});

test('booking rows open details with status-appropriate actions outside the shared cache', async t => {
  const records=['Pending','Confirmed','Reserved','CheckedIn','CheckedOut','Cancelled','NoShow'].map((status,i)=>({
    id:`booking-${i}`,bookingCode:`MHS20000${i}`,status,paymentStatus:i===0?'Unpaid':'Paid',
    roomId:'room',guestId:'guest',guestFirstName:'Test',guestLastName:`Guest ${i}`,
    amount:30000,checkIn:'2026-11-20',checkOut:'2026-11-21',
  }));
  const empty=[];
  const rooms=[{id:'room',name:'Test room'}];
  const Detail = ({children}) => React.createElement('aside',{'aria-label':'Booking details'},children);
  const {default: Bookings} = await load('pages/Bookings.tsx', {
    '../components/DetailPanel':{__esModule:true,default:Detail},
    '../store/HotelContext':{normalizeBooking:x=>x,useHotel:()=>{
      const [selectedBookingId,setSelectedBookingId]=React.useState(null);
      return {bookings:empty,guests:empty,rooms,selectedBookingId,setSelectedBookingId,
        setSelectedGuestId:()=>{},setActiveTab:()=>{},refreshData:async()=>true};
    }},
    '../lib/api':{api:{get:async()=>({items:records,totalCount:records.length,totalPages:1})}},
    'lucide-react':new Proxy({},{get:()=>()=>null}),sileo:{sileo:{success:()=>{},error:()=>{}}},
    '../components/BookingModal':{__esModule:true,default:()=>null},
    '../components/VoidBookingModal':{__esModule:true,default:()=>null},
    '../components/CheckInConfirmModal':{__esModule:true,default:()=>null},
  });
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container);
  t.after(async()=>{await React.act(()=>root.unmount());container.remove();});
  await React.act(()=>root.render(React.createElement(Bookings)));
  await React.act(()=>new Promise(resolve=>setTimeout(resolve,230)));
  assert.equal(container.querySelectorAll('tbody tr[tabindex="0"]').length,7);
  assert.equal([...container.querySelectorAll('th')].some(cell=>cell.textContent==='Actions'),false);
  for(const record of records){
    await React.act(()=>container.querySelector(`tr[aria-label="Booking ${record.bookingCode}"]`).click());
    const details=container.querySelector('[aria-label="Booking details"]');
    assert.ok(details.textContent.includes(record.bookingCode));
    const canCheckIn=['Pending','Confirmed','Reserved'].includes(record.status);
    assert.equal(Boolean(details.querySelector('[aria-label^="Check in"]')),canCheckIn);
    assert.equal(details.textContent.includes('Cancel booking'),canCheckIn);
    if(canCheckIn)assert.equal(details.querySelector('[aria-label^="Check in"]').disabled,record.paymentStatus!=='Paid');
    assert.equal(Boolean(details.querySelector('[aria-label^="Manage stay"]')),record.status==='CheckedIn');
    await React.act(()=>container.querySelector('button[aria-label="Close booking details"]').click());
    assert.equal(container.querySelector('[aria-label="Booking details"]'),null);
  }
  assert.equal(container.querySelector('tr[aria-label="Booking MHS200005"]').querySelector('[aria-label^="Check in"]'),null);
  await React.act(()=>container.querySelector('tr[aria-label="Booking MHS200006"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  assert.ok(container.querySelector('[aria-label="Booking details"]').textContent.includes('MHS200006'));
});

test('Privacy queue refreshes on return, preserves open details, and distinguishes load failures from empty data', async t => {
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  const privacy=await load('lib/privacyRequests.ts');
  const request=(id,type='Access')=>({id,guestId:'qa-guest',type,status:'Pending',requestedAtUtc:'2026-10-11',dueAtUtc:'2026-11-10'});
  let items=[],calls=0,fail=false;
  const {default: Privacy} = await load('pages/PrivacyRequests.tsx',{
    '../components/DetailPanel':{__esModule:true,default:({children})=>React.createElement('aside',{'aria-label':'Privacy details'},children)},
    '../lib/privacyRequests':privacy,
    '../lib/api':{api:{get:async()=>{calls++;if(fail)throw new Error('Privacy service unavailable');return {items,totalCount:items.length,page:1,pageSize:50};}}},
    'lucide-react':new Proxy({},{get:()=>()=>null}),sileo:{sileo:{success:()=>{},error:()=>{}}},
  });
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container);
  t.after(async()=>{await React.act(()=>root.unmount());container.remove();});
  await React.act(()=>root.render(React.createElement(Privacy)));
  assert.match(container.textContent,/No privacy requests submitted/);
  items=[request('one')];
  await React.act(()=>window.dispatchEvent(new window.Event('focus')));
  assert.ok(container.querySelector('button[aria-label="View Access request"]'));
  await React.act(()=>container.querySelector('button[aria-label="View Access request"]').click());
  const callsWhileEditing=calls;
  items=[...items,request('two','Rectification')];
  await React.act(()=>window.dispatchEvent(new window.Event('focus')));
  assert.equal(calls,callsWhileEditing);
  assert.ok(container.querySelector('[aria-label="Privacy details"]'));
  await React.act(()=>container.querySelector('button[aria-label="Close request details"]').click());
  await React.act(()=>window.dispatchEvent(new window.Event('focus')));
  assert.ok(container.querySelector('button[aria-label="View Rectification request"]'));
  fail=true;
  await React.act(()=>window.dispatchEvent(new window.Event('focus')));
  assert.match(container.querySelector('[role="alert"]').textContent,/Privacy service unavailable/);
  assert.doesNotMatch(container.textContent,/No privacy requests submitted/);
  assert.ok(container.querySelector('button[aria-label="View Access request"]'));
});

test('a confirmation stays above its details and owns Escape after a desktop-to-phone resize', async t => {
  let compact=false;
  const listeners=new Set();
  window.matchMedia=()=>({matches:compact,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)});
  const hook=await load('hooks/useAccessibleModal.ts');
  const portal=await load('components/ModalPortal.tsx');
  const {default:Detail}=await load('components/DetailPanel.tsx',{'./ModalPortal':{__esModule:true,...portal},'../hooks/useAccessibleModal':hook});
  function Confirmation({onClose}){
    const ref=hook.useAccessibleModal(true,onClose);
    return React.createElement(portal.default,null,React.createElement('div',{ref,role:'alertdialog'},React.createElement('button',{onClick:onClose},'Cancel operation')));
  }
  function Fixture(){
    const [details,setDetails]=React.useState(true),[confirm,setConfirm]=React.useState(false);
    return React.createElement(React.Fragment,null,
      details&&React.createElement(Detail,{label:'Booking details',onClose:()=>setDetails(false)},React.createElement('button',{onClick:()=>setConfirm(true)},'Check in')),
      confirm&&React.createElement(Confirmation,{onClose:()=>setConfirm(false)}));
  }
  const container=document.createElement('div');document.body.append(container);
  const root=createRoot(container);
  t.after(async()=>{await React.act(()=>root.unmount());container.remove();});
  await React.act(()=>root.render(React.createElement(Fixture)));
  await React.act(()=>container.querySelector('button').click());
  await React.act(()=>{compact=true;listeners.forEach(fn=>fn());});
  assert.ok(document.querySelector('[role="alertdialog"]'));
  assert.ok(document.querySelector('[role="dialog"]'));
  await React.act(()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(document.querySelector('[role="alertdialog"]'),null);
  assert.ok(document.querySelector('[aria-label="Booking details"]'));
  await React.act(()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(document.querySelector('[aria-label="Booking details"]'),null);
});
