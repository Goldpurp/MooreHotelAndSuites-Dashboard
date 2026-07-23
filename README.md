# Moore Hotels & Suites staff dashboard

The staff dashboard uses explicit Local, Development, cloud-development, and
Production profiles. A frontend profile can never silently fall back to the
Production API.

## Connection matrix

| Tier | Command | Dashboard | API connection |
|---|---|---|---|
| Local | `npm run dev:local` | `http://127.0.0.1:3000` | Same-origin `/api` proxy to `http://127.0.0.1:5222` |
| Development | `npm run dev:development` | `http://127.0.0.1:3100` | Same-origin `/api` proxy to `http://127.0.0.1:5223` |
| Cloud development | `npm run dev:cloud` | configured development host | Development-only HTTPS API |
| Production | `npm run build:production` | `https://admin.moorehotelandsuites.com` | `https://api.moorehotelandsuites.com/api` |

Every browser request carries `X-Moore-App-Environment`. The API returns
`X-Moore-API-Environment` and rejects an explicit cross-tier mismatch with HTTP
409. Server-to-server clients can omit the optional browser-tier header.

## Run the complete Local stack

Start PostgreSQL and the API from the API repository:

```bash
bash scripts/run-local.sh
```

Then start this dashboard:

```bash
npm ci
npm run dev:local
```

Open `http://127.0.0.1:3000`. The local administrator email and password are
the ignored `AdminSeed__Email` and `AdminSeed__Password` values in the API
repository's `.env.local`. Never copy that password into source control.

## Release gates

```bash
npm run typecheck
npm run check:profiles
npm audit --audit-level=high
```

The dashboard stores its access token in tab-scoped `sessionStorage`, clears
sensitive hotel state on logout/session revocation, confirms sensitive actions,
and blocks guest accounts from entering the staff interface.

For the complete Render configuration, security headers, release sequence and
post-deploy acceptance checklist, follow `DASHBOARD_RENDER_DEPLOYMENT.md`.
