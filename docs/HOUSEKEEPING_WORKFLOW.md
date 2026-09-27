# Housekeeping dashboard

- Available to Admin, Manager, and Staff in the Housekeeping department, matching the existing API policy.
- Housekeeping staff default to this screen and do not gain bookings, guest, or payment access.
- An open CheckoutCleaning task becomes overdue two hours after its server-generated creation timestamp (created during guest checkout).
- While an authorized user's dashboard is open, polling checks tasks every 30 seconds and on focus/reconnection. The reminder has a 30-minute in-memory snooze; reloading or signing in again resets that snooze. This is not an email or background push notification.
- The reminder opens the Housekeeping screen. Cleaning completion requires confirmation and leaves a room awaiting inspection.
- Stayover service is different: completion records the service without changing availability or creating a release inspection. Deploy the API occupancy safeguard before exposing this dashboard workflow in production.
- The dashboard exposes inspection/release to management. Existing server permissions and transition validation remain authoritative; this change does not introduce a new backend inspection permission.
- Failed fetches pause actions and suppress potentially stale reminders. Completed/cancelled tasks do not trigger reminders.
- Room availability is changed only by the existing server workflow, including its maintenance checks.
- The API safeguard rejects turnover/inspection updates for occupied rooms or checked-in reservations and prevents release while another turnover task remains unfinished.
- Existing housekeeping tasks are used; no database migration, production test bookings, or data reset is needed.

## Verification

`npm test` covers timing boundaries, closed/invalid/future tasks, role routing and exclusion of automatic-payment actions. `npm run build:production` checks types and bundles production assets.

`node scripts/preview-housekeeping.mjs` serves a loopback-only isolated visual fixture at http://127.0.0.1:5176. It replaces the hotel context and API module with sample data in memory; it does not call the hotel API. This fixture was used to check the reminder, cleaner completion, manager inspection and empty state. It is not imported by the production application.

Production checkout-to-release validation should use a separately approved test room, not a real guest stay. Maintenance and night-audit dashboard pages are not part of this change.

## Payment scope

The staff dashboard no longer offers Monnify verification or Monnify refund selection. Existing accounting history is retained. Guest checkout already excludes automatic payments. Booking.com/Expedia connectors are not added or enabled by this release.
