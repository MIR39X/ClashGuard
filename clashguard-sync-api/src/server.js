import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { sectionClashes } from './parser.js';
import { shareStore } from './shareStore.js';
import { getSyncState, runSync, startAutoSync, stopAutoSync } from './syncService.js';

const app = express();
const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SHARE_ENTRIES = 80;
const MAX_TEXT_LENGTH = 160;
const VALID_DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
const SECTION_PATTERN = /^[A-Z]{2,4}-\d[A-Z0-9]?$/i;
const COURSE_PATTERN = /^[A-Z]{2,4}\d{3,4}[A-Z]?$/i;
const SHARE_CODE_PATTERN = /^[a-f0-9]{18}$/;
const isAllowedOrigin = (origin) => !origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin);

if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(helmet());
app.use((req, res, next) => {
  if (!isAllowedOrigin(req.get('origin'))) {
    res.status(403).json({ error: 'Origin is not allowed.' });
    return;
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }),
);
app.use(express.json({ limit: '100kb' }));

const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many share requests. Please try again later.' },
});

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sync requests. Please try again later.' },
});

const badRequest = (res, message) => res.status(400).json({ error: message });

const getQueryString = (req, name) => {
  const value = req.query[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const validateOptionalQuery = (res, name, value, pattern) => {
  if (value === null) return badRequest(res, `Query param "${name}" must be a single string.`);
  if (value !== undefined && !pattern.test(value)) {
    return badRequest(res, `Query param "${name}" has an invalid format.`);
  }
  return null;
};

const validateDayQuery = (res, value) => {
  if (value === null) return badRequest(res, 'Query param "day" must be a single string.');
  if (value !== undefined) {
    const normalized = value[0]?.toUpperCase() + value.slice(1).toLowerCase();
    if (!VALID_DAYS.has(normalized)) return badRequest(res, 'Query param "day" has an invalid value.');
  }
  return null;
};

const safeText = (value, field) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) throw new Error(`${field} is too long.`);
  return trimmed;
};

const validateShareEntries = (entries) => {
  if (!Array.isArray(entries)) throw new Error('entries array is required.');
  if (entries.length === 0) throw new Error('entries array must not be empty.');
  if (entries.length > MAX_SHARE_ENTRIES) throw new Error(`entries array cannot exceed ${MAX_SHARE_ENTRIES} items.`);

  return entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`entries[${index}] must be an object.`);
    }

    const day = safeText(entry.day, `entries[${index}].day`);
    if (!VALID_DAYS.has(day)) throw new Error(`entries[${index}].day is invalid.`);

    const startMinutes = Number(entry.startMinutes);
    const endMinutes = Number(entry.endMinutes);
    if (!Number.isInteger(startMinutes) || !Number.isInteger(endMinutes)) {
      throw new Error(`entries[${index}] must include integer startMinutes and endMinutes.`);
    }
    if (startMinutes < 0 || endMinutes > 24 * 60 || endMinutes <= startMinutes) {
      throw new Error(`entries[${index}] has an invalid time range.`);
    }

    const section = safeText(entry.section, `entries[${index}].section`);
    const course = safeText(entry.course, `entries[${index}].course`);
    if (section && !SECTION_PATTERN.test(section)) throw new Error(`entries[${index}].section is invalid.`);
    if (course && !COURSE_PATTERN.test(course)) throw new Error(`entries[${index}].course is invalid.`);

    return {
      id: safeText(entry.id, `entries[${index}].id`),
      day,
      startMinutes,
      endMinutes,
      start: safeText(entry.start, `entries[${index}].start`),
      end: safeText(entry.end, `entries[${index}].end`),
      course,
      section,
      title: safeText(entry.title, `entries[${index}].title`),
      teacher: safeText(entry.teacher, `entries[${index}].teacher`),
      room: safeText(entry.room, `entries[${index}].room`),
    };
  });
};

const tokenMatches = (provided, expected) => {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(String(provided));
  const expectedBuffer = Buffer.from(String(expected));
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
};

const requireAdminToken = (req, res, next) => {
  if (!tokenMatches(req.get('x-admin-token'), config.adminSyncToken)) {
    res.status(401).json({ error: 'Valid x-admin-token header is required.' });
    return;
  }
  next();
};

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

app.post('/sync/trigger', syncLimiter, requireAdminToken, async (_req, res) => {
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
  const section = getQueryString(req, 'section');
  const day = getQueryString(req, 'day');
  const course = getQueryString(req, 'course');

  const validationError =
    validateOptionalQuery(res, 'section', section, SECTION_PATTERN) ||
    validateDayQuery(res, day) ||
    validateOptionalQuery(res, 'course', course, COURSE_PATTERN);
  if (validationError) return;

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
  const section = getQueryString(req, 'section');
  if (section === null) {
    badRequest(res, 'Query param "section" must be a single string.');
    return;
  }
  if (!section) {
    res.status(400).json({ error: 'Query param "section" is required, e.g. /clashes?section=BCY-6A' });
    return;
  }
  if (!SECTION_PATTERN.test(section)) {
    badRequest(res, 'Query param "section" has an invalid format.');
    return;
  }

  const clashes = sectionClashes(getSyncState().classes, section);
  res.json({ section, count: clashes.length, clashes });
});

const cleanupExpiredShares = () => {
  const now = Date.now();
  for (const [code, value] of shareStore.entries()) {
    if (value.expiresAt <= now) shareStore.delete(code);
  }
};

const createShareCode = () => randomBytes(9).toString('hex');

app.post('/share', shareLimiter, (req, res) => {
  cleanupExpiredShares();
  let entries;
  try {
    entries = validateShareEntries(req.body?.entries);
  } catch (error) {
    badRequest(res, error.message);
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

app.get('/share/:code', shareLimiter, (req, res) => {
  cleanupExpiredShares();
  const code = String(req.params.code || '').toLowerCase();
  if (!SHARE_CODE_PATTERN.test(code)) {
    badRequest(res, 'Share code has an invalid format.');
    return;
  }

  const found = shareStore.get(code);
  if (!found) {
    res.status(404).json({ error: 'Share code not found or expired' });
    return;
  }
  res.json({ code, expiresAt: new Date(found.expiresAt).toISOString(), ...found.payload });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((err, _req, res, _next) => {
  const status = Number(err.status || err.statusCode || 500);
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: 'Invalid request.' });
    return;
  }

  // Keep detailed errors out of API responses while preserving a server-side signal.
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
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
