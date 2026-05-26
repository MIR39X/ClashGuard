# ClashGuard Sync API

Auto-sync backend that fetches timetable data from a source endpoint and keeps your web app updated.

## Setup

1. Copy env file:
`copy .env.example .env`

2. Install dependencies:
`npm install`

3. Start:
`npm run start`

## Hosting (Render)

1. Push this repository to GitHub.
2. In Render: New + > Blueprint, select your repo.
3. Use `clashguard-sync-api/render.yaml`.
4. Deploy and copy your backend URL.
5. Verify:
   - `/health`
   - `/sync/status`

### Environment variables
- `SOURCE_DATA_API` (default already set)
- `SYNC_INTERVAL_MS` (default 15 min)
- `CORS_ORIGIN`:
  - dev: `*`
  - production: set your frontend domain(s), comma-separated
    - example: `https://your-frontend.vercel.app,https://your-frontend.onrender.com`
- `ADMIN_SYNC_TOKEN`:
  - required for `POST /sync/trigger`
  - send it as the `x-admin-token` header when manually triggering a sync

## Auto-Sync

- Default source: `https://server-timetable2.vercel.app/data`
- Default interval: every 15 minutes (`SYNC_INTERVAL_MS=900000`)
- On startup it performs one sync immediately.

## Endpoints

- `GET /health`
- `GET /sync/status`
- `POST /sync/trigger`
  - requires `x-admin-token`
- `GET /classes`
  - optional filters: `section`, `day`, `course`
- `GET /clashes?section=BCY-6A`
- `POST /share`
- `GET /share/:code`

## Example

- `GET /classes?section=BCY-6A`
- `GET /clashes?section=BCY-6A`
