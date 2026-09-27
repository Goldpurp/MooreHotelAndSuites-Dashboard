import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
async function moduleAt(path, dependencies = {}) {
  const source = ts.transpileModule(await read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => dependencies[name] });
  return exports;
}
test('checkout reminder starts exactly at two hours, excluding closed and unrelated tasks', async () => {
  const { overdueCleaning } = await moduleAt('lib/housekeeping.ts');
  const created = Date.parse('2026-09-27T10:00:00Z');
  const task = { id: '1', type: 'CheckoutCleaning', status: 'Pending', createdAtUtc: new Date(created).toISOString() };
  assert.equal(overdueCleaning([task], created + 7_199_999).length, 0);
  assert.equal(overdueCleaning([task], created + 7_200_000).length, 1);
  for (const status of ['Assigned', 'InProgress']) assert.equal(overdueCleaning([{ ...task, status }], created + 7_200_000).length, 1);
  for (const status of ['Completed', 'Cancelled']) assert.equal(overdueCleaning([{ ...task, status }], created + 7_200_000).length, 0);
  for (const type of ['Inspection', 'StayoverService', 'MaintenanceRecovery', 'RoomMoveCleaning']) assert.equal(overdueCleaning([{ ...task, type }], created + 7_200_000).length, 0);
  assert.equal(overdueCleaning([{ ...task, createdAtUtc: 'invalid' }], created).length, 0);
  assert.equal(overdueCleaning([task], created - 1).length, 0);
});
test('housekeeping staff land on cleaning without access to guest or payment screens', async () => {
  const roles = { Admin: 'Admin', Manager: 'Manager', Staff: 'Staff', Guest: 'Guest' };
  const access = await moduleAt('lib/access.ts', { '../types': { UserRole: roles } });
  const cleaner = { role: 'Staff', department: 'Housekeeping' };
  assert.equal(access.firstAllowedTab(cleaner), 'housekeeping');
  assert.equal(access.canOpenTab(cleaner, 'housekeeping'), true);
  for (const tab of ['bookings', 'guests', 'settlements', 'reports', 'staff']) assert.equal(access.canOpenTab(cleaner, tab), false);
  for (const role of ['Admin', 'Manager']) assert.equal(access.canOpenTab({ role }, 'housekeeping'), true);
  assert.equal(access.canOpenTab({ role: 'Staff', department: 'Finance' }, 'housekeeping'), false);
  assert.equal(access.canOpenTab(null, 'housekeeping'), false);
});
test('automatic payment actions stay unavailable without removing historical records', async () => {
  const source = await read('pages/Settlements.tsx');
  assert.doesNotMatch(source, /await verifyMonnify/);
  assert.doesNotMatch(source, /<option value="Monnify"/);
  assert.match(source, /Automatic payments unavailable/);
});
