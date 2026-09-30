import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(await read('lib/paymentReview.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });

test('only administrators and managers have payment review controls', () => {
  for (const role of ['Admin', 'Manager', 'manager']) assert.equal(exports.canReviewPayments(role), true);
  for (const role of ['Staff', 'Guest', 'Housekeeping', undefined, null, 1]) assert.equal(exports.canReviewPayments(role), false);
});

test('payment review data fails closed when amounts, timestamps or hold flags are malformed', () => {
  const item = { bookingCode: 'MHS123456', guestName: 'Test Guest', bookingStatus: 'Pending', amount: 35000, currency: 'NGN', reportedAtUtc: '2026-09-28T10:00:00Z', overdue: true, roomHeld: true };
  assert.equal(exports.parsePaymentReviews([item])[0].roomHeld, true);
  for (const bad of [null, {}, [null], [{ ...item, amount: '35000' }], [{ ...item, roomHeld: 'true' }], [{ ...item, reportedAtUtc: 'invalid' }]]) {
    assert.throws(() => exports.parsePaymentReviews(bad));
  }
});

test('review UI requires explicit bank evidence and does not use the legacy confirmation shortcut', async () => {
  const ui = await read('components/PaymentReviewQueue.tsx');
  const app = await read('App.tsx');
  const settlements = await read('pages/Settlements.tsx');
  assert.match(ui, /review-transfer/);
  assert.match(ui, /confirmationText: confirmation/);
  assert.match(ui, /bankReference, amount: Number\(amount\)/);
  assert.match(ui, /pattern="VERIFY"/);
  assert.match(ui, /No money is sent here/);
  assert.doesNotMatch(ui, /confirm-transfer|localStorage/);
  assert.match(app, /requestedBookingCode=\{paymentReviewRequest\?\.bookingCode\}/);
  assert.match(settlements, /onReviewTransfer\(folio.bookingCode\)/);
  assert.match(settlements, /Review transfer/);
  assert.match(ui, /right-3/);
  assert.doesNotMatch(ui, /bottom-4 left-4/);
  assert.match(await read('store/HotelContext.tsx'), /lower === "paymentreported"/);
});
