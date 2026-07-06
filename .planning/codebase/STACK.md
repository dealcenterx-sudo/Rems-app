# Technology Stack

**Analysis Date:** 2026-07-06

## Languages

**Primary:**
- JavaScript (ES2021+) — React 19 frontend (JSX/components), API serverless functions
- Firestore rules language — Database access control (`firestore.rules`)

**Secondary:**
- JSON — Configuration, package manifests, Firestore indexes

## Runtime

**Environment:**
- Node.js 22.x (required; see `package.json` `engines.node`)
- Browser (React 19, modern Chrome/Firefox/Safari)

**Package Manager:**
- npm 10.x (inferred from Node 22)
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 19.2.3 — SPA frontend (Create React App with react-scripts 5.0.1)
- Firebase 12.8.0 — Web SDK (Auth, Firestore, Storage client)
- firebase-admin 13.10.0 — Server-side admin API (modular: `firebase-admin/app`, `/firestore`, `/auth`)

**UI & Charting:**
- Recharts 3.7.0 — Data visualization (charts, analytics dashboard)
- react-pdf 10.4.1 — PDF viewing (with pdfjs-dist 5.4.624 worker at `public/pdf.worker.min.mjs`)

**Testing:**
- Jest (via react-scripts) — Unit tests, test runner
- @testing-library/react 16.3.1 — Component testing
- @testing-library/jest-dom 6.9.1 — Custom matchers
- @testing-library/user-event 13.5.0 — User interaction simulation
- Puppeteer 24.38.0 — Browser automation (for E2E/screenshot tests)

**Build/Dev:**
- react-scripts 5.0.1 — CRA build tooling, webpack, Babel, ESLint, Jest config
- Web Vitals 2.1.4 — Performance metrics reporting

## Key Dependencies

**Critical:**
- cloudinary 2.9.0 — Image/file uploads (unsigned preset `rems_unsigned`, cloud name `dcirl3j3v`)
- Firebase SDKs (client + admin) — Serverless function integrations, real-time DB, auth, file storage

**Infrastructure:**
- react-dom 19.2.3 — React renderer
- pdfjs-dist 5.4.624 — PDF parsing (worker: `public/pdf.worker.min.mjs`)

## Configuration

**Environment:**
- Runtime env vars (set in Vercel):
  - `FIREBASE_SERVICE_ACCOUNT` — Service account JSON (double-escaped newlines tolerated; see `api/_lib/firebaseAdmin.js`)
  - `RESEND_API_KEY` — Email service authentication
  - `EMAIL_FROM` — Default sender email (fallback: `'REMS <onboarding@resend.dev>'`)
  - `LEAD_INTAKE_KEY` — Shared secret for external lead POST requests
- No local `.env` file in repo; all config via Vercel secrets or hardcoded Firebase web config

**Build:**
- `react-scripts` handles Webpack, Babel, ESLint, Jest
- `.eslintConfig` in `package.json` extends `react-app` + `react-app/jest`
- Entry point: `src/index.js` → `src/App.js` (lazy-loaded page components)
- Output: `build/` (Create React App standard)

**Linting & Formatting:**
- ESLint (via react-scripts, config in `package.json`)
- No Prettier config detected — CRA default formatting

## Security Headers

Vercel security headers configured in `vercel.json`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (no embedding)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains` (2 years, includes subdomains)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (all disabled)

## Platform Requirements

**Development:**
- Node 22.x
- npm 10.x
- Modern browser (Chrome/Firefox/Safari)
- Git (version control)

**Production:**
- Vercel hosting (auto-deploys from `main` branch)
- Firebase project (`rems-app-44205`) — Auth, Firestore, Storage provisioned
- Cloudinary account (image uploads)
- Resend API account (email service)
- Serverless functions runtime (Node.js on Vercel)

## Package Scripts

```bash
npm start        # React dev server (localhost:3000)
npm run build    # Production build → build/
npm run lint     # ESLint src/
npm run test     # Jest watch mode
npm run test:ci  # Jest non-interactive (CI mode)
```

## CI/CD

- GitHub Actions (`.github/workflows/ci.yml`)
- Runs on push/PR to `main`: lint → test:ci → build
- Node 24 in CI (matches development)
- Auto-merge on pass (`auto-merge-to-main.yml`)

---

*Stack analysis: 2026-07-06*
