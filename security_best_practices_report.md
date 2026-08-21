# ClashGuard Security Review

## Executive summary

The public website has been reduced to a static React landing page with one hard-coded HTTPS destination: the ClashGuard GitHub repository. Legacy application routes are no longer present in the shipped bundle. Vercel now redirects every non-asset path to `/` and sends a restrictive Content Security Policy plus clickjacking, MIME-sniffing, referrer, cross-origin, and browser-permission protections.

The review found three material issues. All three were fixed in this change. Production dependency audits now report zero known vulnerabilities for both the website and sync API. No unresolved critical, high, or medium finding remains in the reviewed code.

## Fixed findings

### CG-SEC-001 — Missing edge security headers

- Rule ID: REACT-CSP-001 / REACT-HEADERS-001
- Severity: Medium
- Location: `clashguard-web/vercel.json`, lines 10–23
- Evidence: The previous Vercel configuration only rewrote requests to `index.html`; it did not define browser security headers.
- Impact: A future frontend injection bug would have had fewer browser-enforced containment controls, and the site could be framed by another origin.
- Fix: Added a CSP without `unsafe-inline` or `unsafe-eval`, blocked framing and forms, and added COOP, CORP, Permissions Policy, Referrer Policy, `nosniff`, and `DENY` framing headers.
- Mitigation: The new landing page also avoids user input, remote content, dynamic HTML, and user-controlled URLs.
- False positive notes: Vercel dashboard settings could previously have supplied some headers, but no such protection was visible in source control. The repository configuration is now explicit and reproducible.

### CG-SEC-002 — Arbitrary app paths remained directly addressable

- Rule ID: REACT-REDIRECT-001 / defense in depth
- Severity: Low
- Location: `clashguard-web/vercel.json`, lines 3–9; `clashguard-web/src/main.jsx`, lines 8–11
- Evidence: The prior catch-all rewrite served the SPA at every requested path while leaving that path in the address bar.
- Impact: Old or attacker-crafted paths could appear to be distinct ClashGuard pages, which increased phishing ambiguity and exposed legacy client routes when present.
- Fix: Replaced the catch-all rewrite with a temporary edge redirect from every non-asset path to `/`. A fixed, same-origin History API fallback also normalizes the path before React renders on hosts that do not apply Vercel rules.
- Mitigation: The shipped React entry point now renders only the archive landing page and contains no router.
- False positive notes: Static build assets and Vercel Analytics infrastructure paths must remain reachable for the landing page to load; they do not render alternate application pages.

### CG-SEC-003 — Sync provider could control secondary fetch destinations

- Rule ID: EXPRESS-SSRF-001 / EXPRESS-DOS-001
- Severity: High
- Location: `clashguard-sync-api/src/syncService.js`, lines 16–24 and 42–73
- Evidence: The sync service previously concatenated `source.karachi.url` and each returned `gid`, then fetched the result without an origin allowlist, redirect restriction, item cap, or timeout.
- Impact: If the upstream timetable provider were compromised, it could direct the API to request internal or link-local services, or hold connections open and amplify requests.
- Fix: Allowlisted HTTPS Google Sheets URLs and the `/spreadsheets/` path, restricted sheet identifiers to digits, capped a sync at 50 sheets, rejected redirects, and added 15-second request timeouts.
- Mitigation: Added regression tests for accepted Google Sheets URLs and rejected internal/malformed destinations.
- False positive notes: The first provider URL is deployment-controlled, but the secondary URL comes from its network response and therefore crosses a trust boundary.

## Dependency findings

The initial API audit reported four production advisories: one high-severity `ip-address` issue and moderate issues in `express`, `body-parser`, and `qs`. The API now uses Express 5.2.1 and `ip-address` 10.5.0 through the updated lockfile. `npm audit --omit=dev` reports zero known vulnerabilities in both projects.

## Verification performed

- Frontend unit tests: 5 passed.
- Frontend production build: passed; no source maps emitted and only the landing-page assets are produced.
- Browser test: passed in installed Chrome at 1440×1000 and 375×812, including no horizontal overflow and `/select` normalization to `/`.
- API security regression tests: 2 passed.
- API syntax checks and runtime health check under Express 5: passed.
- Production dependency audits: zero known vulnerabilities for the frontend and API.
