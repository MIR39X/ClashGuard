<div align="center">

<img src="https://raw.githubusercontent.com/MIR39X/ClashGuard/main/clashguard-web/public/logos/clashguard-logo-wordmark.png" alt="ClashGuard" height="80" />

<br/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=2BB673&center=true&vCenter=true&width=600&lines=Smart+Timetable+Planner;Clash+Detection+%E2%80%94+Instant;Grade+Tracker+%2B+Friend+Sharing;Built+for+FAST+Students)](https://git.io/typing-svg)

<br/>

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

<br/>

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest_%2B_Playwright-6E9F18?style=flat-square&logo=vitest&logoColor=white)](#)
[![Android](https://img.shields.io/badge/Android-APK_Available-3DDC84?style=flat-square&logo=android&logoColor=white)](#get-the-app)
[![License](https://img.shields.io/badge/License-MIT-0F2A4A?style=flat-square)](#)

</div>

---

## What is ClashGuard?

**ClashGuard** is a timetable planning companion built specifically for FAST-NUCES Karachi students. It fetches the live semester timetable, lets you pick sections, and instantly surfaces clashes, alternatives, and grade targets — all without an account.

> Works in the browser, installs as an Android APK, and stores your data locally — zero sign-up required.

---

## Demo

<div align="center">

![ClashGuard Demo](https://raw.githubusercontent.com/MIR39X/ClashGuard/main/docs/demo.gif)

*Browse sections → detect clashes → plan grades → share with friends*

</div>

---

## Features

| | Feature | What it does |
|---|---|---|
| 📅 | **Timetable Builder** | Pick sections and get a personal weekly grid instantly |
| ⚡ | **Clash Detection** | Real-time overlap report across all selected sections |
| 🔀 | **Alternatives View** | Swap to a different section for the same course in one click |
| 🎓 | **Grade Planner** | Track components, set target grades, calculate required scores |
| 🔍 | **Smart Search** | Filter by course code or teacher name |
| 🤝 | **Friend Sharing** | Share your draft schedule via an expiring link |
| 📱 | **Android APK** | Install directly from the web — no Play Store needed |
| 🌙 | **Offline-friendly** | localStorage cache keeps data available between sessions |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Browser / APK                  │
│                                                  │
│   React 19  ·  Vite  ·  Tailwind  ·  Capacitor  │
└────────────────────┬─────────────────────────────┘
                     │ REST + ETag
┌────────────────────▼─────────────────────────────┐
│           clashguard-sync-api (Express)          │
│                                                  │
│  Helmet · CORS · Rate Limit · Input Validation   │
│  Secure share codes · Admin-token sync trigger   │
└────────────────────┬─────────────────────────────┘
                     │ fetch
              Upstream timetable source
```

---

## Security Highlights

ClashGuard's backend was hardened as part of a **Secure Software Design** course:

- `helmet` — baseline HTTP security headers, no `X-Powered-By` fingerprint
- **Strict CORS** — production origin allow-list, not `*`
- **Input validation** — section, day, course query params checked via regex; share entries validated as bounded arrays
- **Rate limiting** — 5 sync / 30 share requests per 15-minute window
- **Admin-token sync** — `timingSafeEqual` comparison against env var
- **Cryptographic share codes** — `crypto.randomBytes(9)` → 18 hex chars (72-bit entropy)
- **100 KB body cap** — POST routes reject oversized payloads

---

## Get the App

<div align="center">

[![Download APK](https://img.shields.io/badge/Download_APK-2BB673?style=for-the-badge&logo=android&logoColor=white)](https://clashguard.vercel.app/clashguard.apk)
[![Open Web App](https://img.shields.io/badge/Open_Web_App-0F2A4A?style=for-the-badge&logo=googlechrome&logoColor=white)](https://clashguard.vercel.app)

</div>

---

## Run Locally

### 1 — Backend

```bash
cd clashguard-sync-api
cp .env.example .env        # fill in ADMIN_SYNC_TOKEN + SOURCE_DATA_API
npm install
npm run dev
```

### 2 — Frontend

```bash
cd clashguard-web
cp .env.example .env        # set VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev
```

### 3 — Android APK (optional)

```bash
# from clashguard-web/
npm run build
npx cap sync android

# from clashguard-web/android/
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

---

## Project Structure

```
ClashGuard/
├── clashguard-web/          # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx          # Main planner UI
│   │   └── lib/schedule.js  # Clash detection helpers
│   ├── tests/               # Playwright e2e
│   └── android/             # Capacitor Android project
│
├── clashguard-sync-api/     # Express backend
│   └── src/
│       ├── server.js        # Routes, validation, rate limits
│       ├── syncService.js   # Timetable sync loop
│       └── parser.js        # Sheet → structured records
│
└── clashguard-landing/      # Static landing page
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 19 |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| Mobile | Capacitor 8 (Android) |
| Analytics | Vercel Analytics |
| Backend | Node.js + Express 5 |
| Security | Helmet, express-rate-limit, node:crypto |
| Testing | Vitest, Playwright |
| Hosting | Vercel (frontend) · Render (backend) |

---

## Testing

```bash
# Unit tests (schedule helpers + app)
cd clashguard-web && npm run test

# End-to-end
npm run test:e2e

# Backend audit
cd clashguard-sync-api && npm audit --audit-level=high
```

12 unit tests · e2e suite · 0 high-severity dependency vulnerabilities

---

<div align="center">

Made for FAST-NUCES Karachi students &nbsp;·&nbsp; **Arsalan Mir** (23K-2085)

[![GitHub](https://img.shields.io/badge/GitHub-MIR39X-181717?style=flat-square&logo=github)](https://github.com/MIR39X)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Arsalan_Mir-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/arsalan-mir-24a62328a)

</div>
