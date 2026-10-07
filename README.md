# Mentor Management System — Web (V1: Spring Boot · Heroku · JawsDB)

The React single-page app for the University of Dundee Graduate Apprenticeship **Mentor Management
System (MMS)**. It talks to the `mms-api` (V1) Spring Boot REST API with a bearer token.

**Stack:** React 18 + TypeScript, Vite, React Router, TanStack Query, React Hook Form + Zod,
Fluent UI v9 (matches Microsoft 365), MSAL.js for Entra ID. Served on Heroku by a small Express
server (`server.js`) with security headers.

## Screens (Section 8.1)

| # | Screen | Route | Who |
|---|---|---|---|
| S1 | Sign in — email + password + TOTP code, or "Sign in with university account" (Entra ID) | `/login` | All |
| S2 | My advisees — advisee cards, status badges, *New meeting*, *My drafts* | `/advisees` | AoS (and Director/Lead acting as AoS) |
| S3 | New / edit meeting — form on the left, previous meeting read-only on the right, autosave every 60 s | `/meetings/new?studentId=`, `/meetings/:id/edit` | AoS |
| S4 | Meeting view — laid out like the form, *Download PDF*, *Amend* within window, revision history, delete/restore | `/meetings/:id` | Per role |
| S5 | Student record — details, mentor, AoS history, timeline newest first, reassign AoS | `/students/:id` | Director, Lead, AoS |
| S6 | Dashboard — tiles, *By student* / *By AoS*, filters, drill-down, CSV export | `/dashboard` | Director, Lead, Admin |
| S7 | Admin — data: programmes, employers, mentors, academic years and periods | `/admin/data` | Admin, Director (Lead: employers/mentors) |
| S8 | Admin — import wizard, users and roles, audit log | `/admin/import`, `/admin/users`, `/admin/audit` | Admin (Director: import, audit) |
| — | Deleted records (soft delete, restore) | `/admin/deleted` | Admin, Director |
| — | Students list | `/students` | Admin, Director, Lead, AoS |
| — | My meetings (Phase 2, read-only) | `/my-meetings` | Student |
| — | Messages (carried over from MentorSync) | `/messages` | All (when enabled) |
| — | My account — two-step verification (QR code), change password | `/account` | All |
| — | Accept invitation / set password (carried over from MentorSync) | `/invite?token=` | New users |

Accessibility (NFR-02): keyboard-operable, skip link, labelled controls, status badges always carry
their word, focus-visible tiles, reduced-motion support, light and dark themes. Responsive down to phone
width; the meeting form stacks the previous meeting above the form on small screens (NFR-03).

## Run locally

Requirements: Node 20 or 22. Start the API first (`mms-api`: `mvn spring-boot:run` → http://localhost:8080).

```bash
npm install
npm run dev          # http://localhost:5173
```

Sign in with a demo account from the API README, e.g. `aos1@mms.local` / `Password123!` (AoS) or
`director@mms.local` / `Password123!` (Director).

The API URL comes from `public/config.js` (runtime) or `VITE_API_BASE_URL`. The API must allow the web
origin in `CORS_ALLOWED_ORIGIN` (default `http://localhost:5173`).

```bash
npm test             # Vitest + Testing Library
npm run lint
npm run build        # type-check + production build into dist/
npm start            # serve dist/ with server.js (like Heroku)
```

## Deploy to Heroku (EU)

> **Full step-by-step procedure, verification checks and troubleshooting: [DEPLOY-HEROKU.md](DEPLOY-HEROKU.md)** (the same guide is in both V1 repositories).

```bash
heroku create uod-ga-mms-web --region eu
heroku buildpacks:set heroku/nodejs -a uod-ga-mms-web
heroku config:set -a uod-ga-mms-web NODE_ENV=production API_BASE_URL=https://<api-web-url-from-heroku-apps:info>
git push heroku main
```

Then set `CORS_ALLOWED_ORIGIN=https://uod-ga-mms-web.herokuapp.com` on the API app.
Heroku runs `npm run build` (the `heroku-postbuild` script) and starts `node server.js` (`Procfile`).

`server.js` generates `/config.js` from config vars at runtime, so changing the API URL or Entra ids needs
only a restart, not a rebuild. It also sets CSP (API origin and `login.microsoftonline.com` only),
`frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, HSTS and HTTP→HTTPS redirects.

| Config var | Purpose |
|---|---|
| `API_BASE_URL` | The mms-api URL |
| `ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID`, `ENTRA_API_SCOPE` | Only when the API runs with `AUTH_MODE=entra` (SPA app registration, tenant, `api://mms-api/access_as_user`) |

## Sign-in modes

* **Local accounts** (`AUTH_MODE=local` on the API, the default while UoD IT has not approved SSO):
  email + password, then a 6-digit TOTP code if two-step verification is on. Access tokens are short-lived
  and refreshed while you are active; you are signed out after 30 minutes idle (FR-04). Tokens are kept
  in session storage only (cleared when the tab closes).
* **Entra ID** (`AUTH_MODE=entra`): Authorization Code + PKCE with MSAL.js; tokens renewed silently.

## Project structure

```
src/
  api/          typed client (bearer token, correlation ID, problem-details errors), endpoints, types
  auth/         AuthProvider (local tokens + idle timeout), MSAL helper
  components/   AppShell, nav, StatusBadge, tiles, tables, dialogs, MeetingReadOnly, notifications
  lib/          runtime config, theme (university blue), formatting, meeting form Zod schema
  pages/        screens S1–S8 and admin pages
  test/         Vitest tests
server.js       Express server for Heroku
```
