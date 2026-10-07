import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const load = async path => {
  const source = await readFile(new URL('../' + path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
};
const { parseClientAccounts } = await load('lib/clientAccounts.ts');
const { parsePrivacyRequestPage } = await load('lib/privacyRequests.ts');
const client = {id: 'client-1', name: 'Example Client', email: 'client@example.test', role: 'client', status: 'active', onboardingDate: '2026-10-01T12:00:00Z'};

test('client accounts use real wire roles, statuses and onboarding dates', () => {
  const [active, suspended] = parseClientAccounts([client, {...client, id: 'client-2', status: 'suspended'}]);
  assert.equal(active.role, 'Client');
  assert.equal(active.status, 'Active');
  assert.equal(active.createdAt, client.onboardingDate);
  assert.equal(suspended.status, 'Suspended');
  assert.equal(parseClientAccounts([Object.fromEntries(Object.entries(client).map(([key,value]) => [key[0].toUpperCase()+key.slice(1),value]))])[0].email, client.email);
  assert.deepEqual(parseClientAccounts([]), []);
});

test('invalid client responses never turn into an empty or partial directory', () => {
  for (const response of [undefined, null, {}, {message:'unavailable'}, {items:[]}, [null], [client, {...client,id:'2',role:'admin'}], [client, client], [{...client,status:'unknown'}]]) {
    assert.throws(() => parseClientAccounts(response), /refresh/i);
  }
});

const request = index => ({id: `request-${index}`, type:'rectification', status:'pending', guestId:'guest-1', requestedAtUtc:'2026-10-01T12:00:00Z', dueAtUtc:'2026-10-31T12:00:00Z'});
test('privacy pages retain every record, including the last page, and canonicalize enums', () => {
  const first = parsePrivacyRequestPage({items:Array.from({length:50}, (_,i)=>request(i)),totalCount:51,page:1,pageSize:50},1,50);
  const last = parsePrivacyRequestPage({Items:[request(50)],TotalCount:51,Page:2,PageSize:50},2,50);
  assert.equal(first.items.length,50);
  assert.equal(first.items[0].type,'Rectification');
  assert.equal(last.items[0].id,'request-50');
  assert.equal(last.totalCount,51);
  assert.deepEqual(parsePrivacyRequestPage({items:[],totalCount:0,page:1,pageSize:50},1,50), {items:[],totalCount:0});
});

test('privacy failures and incomplete, stale or duplicate pages do not look empty', () => {
  for (const response of [undefined, {}, {items:[]}, {items:[],totalCount:1,page:1,pageSize:50}, {items:[request(1)],totalCount:1,page:2,pageSize:50}, {items:[request(1),request(1)],totalCount:2,page:1,pageSize:50}, {items:[{...request(1),status:'unknown'}],totalCount:1,page:1,pageSize:50}]) {
    assert.throws(() => parsePrivacyRequestPage(response,1,50), /refresh/i);
  }
});
