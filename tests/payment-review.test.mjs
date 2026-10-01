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

test('replacement room choices require complete, unique, server-provided room data', () => {
  const value = {
    bookingCode: 'MHS123456',
    requiredRooms: 1,
    roomTypeId: '1d98c229-7e79-43fd-b6ec-7ae67518867b',
    roomTypeName: 'Deluxe',
    rooms: [{ roomId: '8ee13a35-57f6-4ee9-b3ec-c18fe011b64e', roomNumber: 'D-01', roomName: 'Deluxe One' }],
  };
  assert.equal(exports.parsePaymentReviewRoomOptions(value).rooms[0].roomNumber, 'D-01');
  for (const bad of [
    null,
    { ...value, requiredRooms: 0 },
    { ...value, rooms: [{ ...value.rooms[0], roomName: '' }] },
    { ...value, rooms: [value.rooms[0], value.rooms[0]] },
  ]) assert.throws(() => exports.parsePaymentReviewRoomOptions(bad));
});

test('selected transfer review uses the standard dialog and hands released rooms to Bookings', async () => {
  const ui = await read('components/PaymentReviewQueue.tsx');
  const app = await read('App.tsx');
  const bookings = await read('pages/Bookings.tsx');
  const bookingModal = await read('components/BookingModal.tsx');
  const settlements = await read('pages/Settlements.tsx');
  assert.match(ui, /review-transfer/);
  assert.match(ui, /confirmationText: 'VERIFY'/);
  assert.match(ui, /bankReference: bankReference\.trim\(\)/);
  assert.match(ui, /statementChecked/);
  assert.match(ui, /The booking reference is not a bank transaction ID/);
  assert.match(ui, /review-transfer\/rooms/);
  assert.doesNotMatch(ui, /Refresh queue|Booking reference<input|items\.map\(item/);
  assert.match(ui, /onChooseReplacement/);
  assert.match(ui, /onOpenSettlements/);
  assert.match(bookings, /paymentReviewRebooking=\{paymentReviewRebooking\}/);
  assert.match(bookingModal, /Only clean, online rooms in the originally paid category are shown/);
  assert.match(bookingModal, /Availability is locked and checked again when you confirm/);
  assert.match(bookingModal, /replacementRoomIds/);
  assert.match(bookingModal, /Updated confirmation queued for delivery/);
  assert.match(ui, /It does not send money automatically/);
  assert.doesNotMatch(ui, /confirm-transfer|localStorage/);
  assert.match(app, /requestedBooking=\{paymentReviewRequest\?\.booking\}/);
  assert.match(app, /setActiveTab\("bookings"\)/);
  assert.match(settlements, /onReviewTransfer\(folio\)/);
  assert.match(settlements, /Review transfer/);
  assert.match(settlements, /b\.paymentStatus !== PaymentStatus\.PaymentReported/);
  assert.match(settlements, /Payment transaction ID/);
  assert.match(settlements, /Booking \/ Transaction ID/);
  assert.match(settlements, /getPaymentTransactionId\(booking\) \|\| booking\?\.bookingCode/);
  assert.match(settlements, /Copy booking or transaction ID/);
  assert.match(settlements, /Refund Transaction ID/);
  assert.match(ui, /right-3/);
  assert.doesNotMatch(ui, /bottom-4 left-4/);
  assert.match(await read('store/HotelContext.tsx'), /lower === "paymentreported"/);
});
