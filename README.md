# ClashGuard

ClashGuard is a course timetable planner for FAST-style campus schedules.
It helps students select courses, generate a personal timetable, detect clashes, explore alternatives, and track grades.

## Main Features
- Section-based course browsing and selection
- Personal timetable with day filter
- Clash report for overlapping classes
- Alternatives view for section switching
- Search support (course/teacher)
- Grade planner with per-course component tracking
- Target weightage (%) based grade requirement calculation
- Mobile-responsive UI + Android APK support

## Project Structure
- `clashguard-web/` - React frontend (Vite, Tailwind, Capacitor)
- `clashguard-sync-api/` - Node/Express sync backend
- `clashguard-landing/` - static landing concept

## Tech Stack
- React 19 + Vite
- Tailwind CSS
- React Router
- Node.js + Express
- Vitest + Playwright
- Capacitor (Android)

## Run Locally

### Backend
```bash
cd clashguard-sync-api
copy .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd clashguard-web
copy .env.example .env
npm install
npm run dev
```

Frontend expects backend URL via:
- `VITE_API_BASE_URL`

## Build APK
From `clashguard-web/`:
```bash
npm run build
npx cap sync android
```

Then from `clashguard-web/android/`:
```bash
gradlew assembleDebug
```

APK output:
- `clashguard-web/android/app/build/outputs/apk/debug/app-debug.apk`

Website download file:
- `clashguard-web/public/clashguard.apk`

## Deployment
- Frontend: Vercel
- Backend: Render

## Notes
- Current backend data sync may depend on an upstream timetable source.
- Recommended next step: migrate to an owned timetable source endpoint for long-term reliability.
