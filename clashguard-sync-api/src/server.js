import cors from 'cors';
import express from 'express';
import { createHash } from 'node:crypto';
import { onlineClassesRouter } from './onlineClasses/routes.js';
import { config } from './config.js';
import { sectionClashes } from './parser.js';
import { getSyncState, runSync, startAutoSync, stopAutoSync } from './syncService.js';

const app = express();
const shareStore = new Map();
const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS blocked'));
    },
  }),
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    service: 'clashguard-sync-api',
    message: 'API is running',
    endpoints: [
      'GET /health',
      'GET /sync/status',
      'POST /sync/trigger',
      'GET /classes?section=BCY-6A',
      'GET /clashes?section=BCY-6A',
      'GET /online-classes?section=BCS-8A',
      'GET /online-classes/status',
      'POST /share',
      'GET /share/:code',
    ],
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'clashguard-sync-api' });
});

app.get('/sync/status', (_req, res) => {
  const { status, startedAt, finishedAt, error, totalClasses, syncedSheets, sourceVersionCode } = getSyncState();
  res.json({ status, startedAt, finishedAt, error, totalClasses, syncedSheets, sourceVersionCode });
});

app.post('/sync/trigger', async (_req, res) => {
  await runSync();
  const { status, error, totalClasses, finishedAt } = getSyncState();
  res.json({ status, error, totalClasses, finishedAt });
});

const toEtag = (payload) => {
  const hash = createHash('sha1').update(payload).digest('base64url');
  return `"${hash}"`;
};

const matchesIfNoneMatch = (ifNoneMatch, currentEtag) => {
  if (!ifNoneMatch) return false;
  const normalizedCurrent = String(currentEtag || '').replace(/^W\//, '').trim();
  const parts = String(ifNoneMatch)
    .split(',')
    .map((part) => part.replace(/^W\//, '').trim());
  return parts.includes('*') || parts.includes(normalizedCurrent);
};

app.get('/classes', (req, res) => {
  const { section, day, course } = req.query;
  let data = getSyncState().classes;

  if (section) data = data.filter((item) => String(item.section || '').toLowerCase() === String(section).toLowerCase());
  if (day) data = data.filter((item) => String(item.day || '').toLowerCase() === String(day).toLowerCase());
  if (course) data = data.filter((item) => String(item.course || '').toLowerCase() === String(course).toLowerCase());

  const payload = JSON.stringify(data);
  const etag = toEtag(payload);
  res.set('ETag', etag);
  res.set('Cache-Control', 'private, no-cache');

  if (matchesIfNoneMatch(req.get('if-none-match'), etag)) {
    res.status(304).end();
    return;
  }

  res.json({ count: data.length, classes: data });
});

app.get('/clashes', (req, res) => {
  const { section } = req.query;
  if (!section) {
    res.status(400).json({ error: 'Query param "section" is required, e.g. /clashes?section=BCY-6A' });
    return;
  }

  const clashes = sectionClashes(getSyncState().classes, section);
  res.json({ section, count: clashes.length, clashes });
});

app.use('/online-classes', onlineClassesRouter);

const cleanupExpiredShares = () => {
  const now = Date.now();
  for (const [code, value] of shareStore.entries()) {
    if (value.expiresAt <= now) shareStore.delete(code);
  }
};

const createShareCode = () => Math.random().toString(36).slice(2, 8);

app.post('/share', (req, res) => {
  cleanupExpiredShares();
  const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
  if (entries.length === 0) {
    res.status(400).json({ error: 'entries array is required' });
    return;
  }

  let code = createShareCode();
  while (shareStore.has(code)) code = createShareCode();
  const createdAt = Date.now();
  shareStore.set(code, {
    createdAt,
    expiresAt: createdAt + SHARE_TTL_MS,
    payload: {
      v: 1,
      createdAt: new Date(createdAt).toISOString(),
      entries,
    },
  });
  res.json({ code, expiresInMs: SHARE_TTL_MS });
});

app.get('/share/:code', (req, res) => {
  cleanupExpiredShares();
  const code = String(req.params.code || '').toLowerCase();
  const found = shareStore.get(code);
  if (!found) {
    res.status(404).json({ error: 'Share code not found or expired' });
    return;
  }
  res.json({ code, expiresAt: new Date(found.expiresAt).toISOString(), ...found.payload });
});

const server = app.listen(config.port, async () => {
  await startAutoSync();
  // eslint-disable-next-line no-console
  console.log(`ClashGuard Sync API running on http://localhost:${config.port}`);
});

const shutdown = () => {
  stopAutoSync();
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
