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
  } }).outputText, { exports, document, window, require: name => {
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
