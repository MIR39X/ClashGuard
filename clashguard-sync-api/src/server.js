import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { sectionClashes } from './parser.js';
import { getSyncState, runSync, startAutoSync, stopAutoSync } from './syncService.js';

const app = express();

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

app.get('/classes', (req, res) => {
  const { section, day, course } = req.query;
  let data = getSyncState().classes;

  if (section) data = data.filter((item) => item.section.toLowerCase() === String(section).toLowerCase());
  if (day) data = data.filter((item) => item.day.toLowerCase() === String(day).toLowerCase());
  if (course) data = data.filter((item) => item.course.toLowerCase() === String(course).toLowerCase());

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
