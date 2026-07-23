# Moore Hotels Dashboard — Render deployment

Use this guide only after the API is deployed and
`https://api.moorehotelandsuites.com/api/health` reports a healthy connected
database.

## Render configuration

The checked-in `render.yaml` defines the secure static-site configuration.
Connect this repository as a Render Blueprint or reproduce the values exactly:

| Setting | Value |
|---|---|
| Service type | Static Site |
| Build command | `npm ci && npm run build:production` |
| Publish directory | `dist` |
| Production branch | protected release branch, then `main` |
| Auto deploy | only after CI checks pass |
| Custom domain | `admin.moorehotelandsuites.com` |

The Production Vite profile is public configuration, not a secret:

```text
VITE_APP_ENV=production
VITE_API_MODE=direct
VITE_API_BASE_URL=https://api.moorehotelandsuites.com/api
VITE_API_TIMEOUT_MS=15000
```

Do not put JWT keys, database credentials, Cloudinary secrets, Brevo keys,
administrator passwords or Monnify credentials in this repository or in any
`VITE_*` variable. Vite values are readable by every browser visitor.

## Release procedure

1. Confirm the API health, database migration and CORS checks are complete.
2. Review all repository changes and confirm `.env.production` contains only
   the public API configuration above.
3. Run:

   ```bash
   npm ci
   npm run check:profiles
   npm run build:production
   npm audit --audit-level=high
   ```

4. Commit the reviewed release.
5. Require the GitHub `Dashboard release gates` check.
6. Deploy the exact passing commit.
7. Attach `admin.moorehotelandsuites.com` and enforce HTTPS.
8. Confirm Render has applied every header and the SPA rewrite from
   `render.yaml`.

## Post-deploy acceptance

Test in a private browser window and with each staff role:

- unauthenticated visitors see only the sign-in screen;
- Client accounts cannot enter the dashboard;
- Admin, Manager and Staff permissions match their server roles;
- refresh and browser back/forward preserve the selected dashboard view;
- rooms can be created and edited, including replacing images;
- bookings can be searched, cancelled, checked in and checked out;
- direct transfer requires the exact typed `ACCEPT` acknowledgement;
- already-paid, cancelled and refunded bookings cannot be reconfirmed;
- audit, settlement and visit records show the expected data;
- logout clears the tab session and protected hotel data;
- no token, password or provider secret appears in the console or network
  response;
- response headers include CSP, HSTS, `nosniff`, frame denial, referrer policy
  and permissions policy.

Monnify verification controls may remain for historical transactions, but new
Monnify bookings are unavailable while the API feature flag is disabled.

## Rollback

Keep the previous successful Render deploy available. If the dashboard fails
acceptance testing, roll back the static site only; do not roll back the
database to match a frontend build. Record the failed commit and reason before
trying another release.
