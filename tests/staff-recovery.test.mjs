import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../pages/StaffManagement.tsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../components/CreateUserModal.tsx', import.meta.url), 'utf8');

test('staff edit passes the selected existing account and clears it for creation', () => {
  assert.match(page, /setEditingUser\(selectedStaff\)/);
  assert.match(page, /editingUser=\{editingUser\}/);
  assert.match(page, /setEditingUser\(null\); setIsModalOpen\(true\)/);
  assert.match(modal, /updateStaff\(editingUser.id/);
});

test('setup recovery confirms saved recipient and distinguishes queueing from delivery', () => {
  assert.match(page, /window.confirm\(`Send a password setup link to \$\{user.email\}/);
  assert.match(page, /employees\/\$\{user.id\}\/resend-setup/);
  assert.match(page, /currentUser\?\.role === UserRole.Manager && user.role === UserRole.Staff/);
  assert.match(page, /setupPending \|\| String\(selectedStaff.status\).toLowerCase\(\) !== 'active'/);
  assert.match(page, /Delivery is not yet confirmed/);
  assert.match(modal, /Setup email queued; delivery is not yet confirmed/);
});
