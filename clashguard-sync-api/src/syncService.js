import { config } from './config.js';
import { parseSheetClasses } from './parser.js';

const state = {
  classes: [],
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  error: null,
  totalClasses: 0,
  syncedSheets: [],
  sourceVersionCode: null,
};

let syncTimer = null;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_SHEETS_PER_SYNC = 50;
const ALLOWED_SHEET_ORIGINS = new Set(['https://docs.google.com']);

const fetchWithLimits = (url) =>
  fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

const fetchText = async (url) => {
  const response = await fetchWithLimits(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  return response.text();
};

const fetchJson = async (url) => {
  const response = await fetchWithLimits(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }
  return response.json();
};

export const toAllowedSheetUrl = (baseUrl, gid) => {
  const normalizedGid = String(gid ?? '').trim();
  if (!/^\d{1,20}$/.test(normalizedGid)) {
    throw new Error('Invalid timetable sheet identifier');
  }

  const url = new URL(baseUrl);
  if (!ALLOWED_SHEET_ORIGINS.has(url.origin) || !url.pathname.startsWith('/spreadsheets/')) {
    throw new Error('Timetable sheet URL is not allowlisted');
  }

  url.searchParams.set('gid', normalizedGid);
  return url.toString();
};

export const runSync = async () => {
  state.status = 'syncing';
  state.error = null;
  state.startedAt = new Date().toISOString();

  try {
    const source = await fetchJson(`${config.sourceDataApi}/data`);
    const baseUrl = source?.karachi?.url;
    const codes = source?.karachi?.codes || [];

    if (!baseUrl || !Array.isArray(codes) || codes.length === 0 || codes.length > MAX_SHEETS_PER_SYNC) {
      throw new Error('Invalid source /data payload');
    }

    const results = await Promise.all(
      codes.map(async (code) => {
        const text = await fetchText(toAllowedSheetUrl(baseUrl, code.gid));
        return {
          sheet: code.name,
          classes: parseSheetClasses(code.name, text),
        };
      }),
    );

    const allClasses = results.flatMap((result) => result.classes);

    state.classes = allClasses;
    state.totalClasses = allClasses.length;
    state.syncedSheets = results.map((r) => r.sheet);
    state.sourceVersionCode = source?.versionCode ?? null;
    state.status = 'ok';
    state.finishedAt = new Date().toISOString();
  } catch (error) {
    state.status = 'error';
    state.error = error.message;
    state.finishedAt = new Date().toISOString();
  }
};

export const startAutoSync = async () => {
  await runSync();
  syncTimer = setInterval(runSync, config.syncIntervalMs);
};

export const stopAutoSync = () => {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
};

export const getSyncState = () => ({ ...state, classes: [...state.classes] });
