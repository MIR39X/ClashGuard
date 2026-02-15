# Project Handoff Summary

## What Was Built
- Separate product created in `D:\Semester 06\ClashGaurd\clashguard-web` (React + Vite + Tailwind).
- Backend service created in `D:\Semester 06\ClashGaurd\clashguard-sync-api` for auto-sync timetable ingestion and API endpoints.
- Android wrapper support added in `clashguard-web` via Capacitor.

## Backend (`clashguard-sync-api`)
- Purpose: fetch latest timetable from source and expose normalized data.
- Source: `SOURCE_DATA_API/data` (default `https://server-timetable2.vercel.app`).
- Endpoints:
  - `GET /health`
  - `GET /sync/status`
  - `POST /sync/trigger`
  - `GET /classes`
  - `GET /clashes?section=...`
- `.env` created and configured.
- Verified sync success with network (`~1534` classes, 6 sheets).

## Frontend (`clashguard-web`)
- Routes/pages:
  - `/` Select Courses
  - `/timetable`
  - `/clashes`
  - `/alternatives`
- Selection:
  - Loads classes from backend `/classes`.
  - Section filter is live client-side filter.
  - Stable key now `COURSE_CODE|SECTION`.
  - Persistence in localStorage:
    - `clashguard_selected_courses`
    - `clashguard_all_classes`
    - `clashguard_section_filter`
  - Added migration for older saved selections.

## Timetable
- Day order fixed to weekday order.
- Quick Day Filter is a sliding segmented control.
- Mobile version improved with compact labels (`Mon`, `Tue`, etc.).
- Cards show:
  - course title
  - focused location block
  - instructor
  - time slot

## Clash Report
- Separate `/clashes` page.
- Computes clashes from selected entries and shows details.

## Alternatives
- Separate `/alternatives` page.
- Generates alternatives by same course code across sections.
- Shows:
  - teacher (focused)
  - time slots
  - venues
  - section badge
  - conflict count
  - exact “Conflicts With” course/time list
- Features:
  - Teacher filter
  - Top-N limiter (`Top 5/10/20/All`) with sliding segmented UI
  - Apply Alternative (replaces selected course and entries)

## UI/UX Changes Completed
- Added responsive behavior across pages and cards.
- Added mobile bottom nav: Select / Timetable / Clashes / Alt.
- Removed sync-status panel.
- Removed “(Optional)” from section label.
- Removed “My Courses | Included Time Slots” summary line.
- Removed visible scrollbar in available courses pane (scroll still works).
- Wording standardized to `Time Slot(s)` where requested.
- Dark mode was added then fully removed (no dark feature remains).

## Capacitor / Android Setup
- Installed:
  - `@capacitor/core`
  - `@capacitor/cli`
  - `@capacitor/android`
- Ran:
  - `npx.cmd cap init ClashGuard com.clashguard.app`
  - set `capacitor.config.json` `webDir` to `dist`
  - `npx.cmd cap add android`
- Android project path: `clashguard-web/android`.

## Test Coverage Added
- Test stack:
  - Vitest + jsdom
  - React Testing Library + jest-dom + user-event
- Scripts:
  - `npm run test`
  - `npm run test:watch`
- Core logic extracted for testability:
  - `src/lib/schedule.js`
- Tests:
  - `src/lib/schedule.test.js` (unit)
  - `src/App.test.jsx` (integration)
- Current status: **7 passing tests**.

## E2E Setup (Playwright)
- Added Playwright:
  - `playwright.config.js`
  - `tests/e2e/core-flow.spec.js`
  - scripts:
    - `npm run test:e2e`
    - `npm run test:e2e:headed`
- Pending local step:
  - `npx.cmd playwright install chromium`
- Then run:
  - `npm.cmd run test:e2e`

## Important Note
- ESLint may scan generated Android web assets under:
  - `android/app/src/main/assets/public/**`
- If lint noise appears, add ignore rule for generated artifacts.

