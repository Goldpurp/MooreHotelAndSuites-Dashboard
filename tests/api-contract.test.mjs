import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("staff booking supplies occupancy and policy evidence", async () => {
  const modal = await read("components/BookingModal.tsx");

  assert.match(modal, /AdultCount: formData\.adultCount/);
  assert.match(modal, /ChildCount: formData\.childCount/);
  assert.match(modal, /AcceptPrivacyPolicy: true/);
  assert.match(modal, /AcceptBookingTerms: true/);
  assert.match(modal, /privacy\/policies\/current/);
});

test("cancellation and refund accounting use JSON request bodies", async () => {
  const context = await read("store/HotelContext.tsx");

  assert.match(context, /`\/api\/bookings\/\$\{id\}\/cancel`, \{ reason \}/);
  assert.match(context, /`\/api\/bookings\/\$\{id\}\/complete-refund`, details/);
});

test("dashboard implements privacy queue and single-use realtime tickets", async () => {
  const [privacy, realtime] = await Promise.all([
    read("pages/PrivacyRequests.tsx"),
    read("hooks/useStaffRealtime.ts"),
  ]);

  assert.match(privacy, /"\/api\/privacy\/requests"/);
  assert.match(privacy, /\/api\/privacy\/requests\/\$\{request\.id\}\/status/);
  assert.match(realtime, /notifications\/realtime-ticket/);
  assert.match(realtime, /skipNegotiation: true/);
  assert.match(realtime, /AccessRevoked/);
});
