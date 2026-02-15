# ClashGuard

ClashGuard is a timetable planning platform for FAST-style campus schedules.  
It lets students pick courses by section, generate a personal timetable, detect clashes, and review alternatives.

## Repository Structure

- `clashguard-web/`: React + Vite + Tailwind frontend
- `clashguard-sync-api/`: Node.js + Express sync API
- `clashguard-landing/`: static landing concept
- `Fast-Timetable/`: external reference project (ignored from this repo)

## Core Features

- Upload/sync campus timetable data through backend
- Section-based course browsing and selection
- Personal timetable view with day filters
- Clash report page
- Alternatives page with teacher, venue, section, and time details
- Teacher/course search across schedule data
- Mobile-friendly responsive UI

## Tech Stack

- Frontend: React 19, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express, CORS, dotenv
- Testing: Vitest + React Testing Library, Playwright
- Mobile packaging: Capacitor (Android)

## Quick Start

### 1) Clone

```bash
git clone https://github.com/MIR39X/ClashGuard.git
cd ClashGuard
```

### 2) Run Backend

```bash
cd clashguard-sync-api
copy .env.example .env
npm install
npm run dev
```

Backend default: `http://localhost:4000`

### 3) Run Frontend

Open a new terminal:

```bash
cd clashguard-web
copy .env.example .env
npm install
npm run dev
```

Frontend default: `http://localhost:5173`

## Environment Variables

### Backend (`clashguard-sync-api/.env`)

- `PORT`: API port (default `4000`)
- `SOURCE_DATA_API`: timetable source endpoint
- `SYNC_INTERVAL_MS`: auto-sync interval in milliseconds
- `CORS_ORIGIN`: allowed frontend origin(s)

### Frontend (`clashguard-web/.env`)

- `VITE_API_BASE_URL`: backend base URL (example: `http://localhost:4000`)

## API Endpoints

- `GET /health`
- `GET /sync/status`
- `POST /sync/trigger`
- `GET /classes`
- `GET /clashes?section=BCY-6A`

## Testing

From `clashguard-web/`:

```bash
npm run test
npm run test:e2e
```

If E2E browsers are not installed:

```bash
npx playwright install chromium
```

## Deployment

### Frontend (Vercel)

- Deploy `clashguard-web/`
- `vercel.json` includes SPA routing rewrite

### Backend (Render)

- Deploy `clashguard-sync-api/` via `render.yaml`
- Set environment variables in Render dashboard

## Android App (Capacitor)

From `clashguard-web/`:

```bash
npm run build
npx cap sync android
npx cap open android
```

### Build APK (Release)

From `clashguard-web/android/`:

```bash
gradlew assembleRelease
```

Release APK output:

`clashguard-web/android/app/build/outputs/apk/release/app-release.apk`

### Publish APK For Website Download

The web app Download APK button points to:

`https://github.com/MIR39X/ClashGuard/releases/latest/download/clashguard.apk`

To make this work:

1. Create a GitHub Release.
2. Upload your APK asset and name it exactly `clashguard.apk`.
3. Publish the release.

## License

This project is currently private/proprietary unless you add a license file.
