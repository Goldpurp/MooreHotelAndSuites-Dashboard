import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../pages/StaffManagement.tsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../components/CreateUserModal.tsx', import.meta.url), 'utf8');
const setup = readFileSync(new URL('../pages/StaffSetupPassword.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('staff edit passes the selected existing account and clears it for creation', () => {
  assert.match(page, /setEditingUser\(selectedStaff\)/);
  assert.match(page, /editingUser=\{editingUser\}/);
  assert.match(page, /setEditingUser\(null\); setIsModalOpen\(true\)/);
  assert.match(modal, /updateStaff\(editingUser.id/);
});

test('staff setup uses its own single-use route and endpoint', () => {
  assert.match(app, /\/setup-password/);
  assert.match(setup, /window\.location\.hash\.slice\(1\)/);
  assert.match(setup, /params\.get\("userId"\)/);
  assert.match(setup, /\/api\/Auth\/setup-password/);
  assert.match(setup, /Create your staff password/);
  assert.doesNotMatch(setup, /forgot-password|reset-password/);
});

test('staff setup password fields expose independent accessible visibility controls', () => {
  assert.match(setup, /aria-label=\{visible \? `Hide \$\{label\.toLowerCase\(\)\}` : `Show \$\{label\.toLowerCase\(\)\}`\}/);
  assert.match(setup, /aria-pressed=\{visible\}/);
  assert.match(setup, /showPassword/);
  assert.match(setup, /showConfirmation/);
});

test('setup recovery confirms saved recipient and distinguishes queueing from delivery', () => {
  assert.match(page, /const confirm = useConfirmation\(\)/);
  assert.match(page, /title: 'Send password setup link\?'/);
  assert.match(page, /message: `A new single-use password setup link will be sent to \$\{user.email\}/);
  assert.match(page, /confirmLabel: 'Send setup link'/);
  assert.doesNotMatch(page, /window\.confirm/);
  assert.match(page, /employees\/\$\{user.id\}\/resend-setup/);
  assert.match(page, /currentUser\?\.role === UserRole.Manager && user.role === UserRole.Staff/);
  assert.match(page, /setupPending \|\| String\(selectedStaff.status\).toLowerCase\(\) !== 'active'/);
  assert.match(page, /Delivery is not yet confirmed/);
  assert.match(modal, /Setup email queued; delivery is not yet confirmed/);
});
