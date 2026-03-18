import { ONLINE_CLASSES_CACHE_TTL_MS } from './constants.js';
import { fetchOnlineSheets } from './fetchOnlineSheet.js';
import { matchOnlineClasses } from './matchOnlineClasses.js';
import { normalizeCourseName, normalizeOnlineRow, normalizeResolvedSection, normalizeTeacherName } from './normalizeOnlineRow.js';
import { parseOnlineSheet } from './parseOnlineSheet.js';

const uniqBy = (items, getKey) => {
  const seen = new Set();
  const next = [];
  items.forEach((item) => {
    const key = getKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    next.push(item);
  });
  return next;
};

const state = {
  items: [],
  fetchedAt: 0,
  status: 'idle',
  error: null,
};

let onlineClassesRefreshTimer = null;
let onlineClassesLoadPromise = null;

const shouldRefresh = () => Date.now() - state.fetchedAt > ONLINE_CLASSES_CACHE_TTL_MS;

export const getOnlineClassesState = () => ({ ...state, items: [...state.items] });

const dedupeMatchedItems = (items) =>
  uniqBy(
    [...items].sort((a, b) => b.rowNumber - a.rowNumber),
    (item) => [
      String(item.sheetDay || '').toLowerCase(),
      normalizeResolvedSection(item.resolvedSection || item.rawSection),
      normalizeTeacherName(item.teacher),
      normalizeCourseName(item.course),
    ].join('|'),
  );

export const loadOnlineClasses = async (timetableClasses, { force = false } = {}) => {
  if (!force && state.items.length > 0 && !shouldRefresh()) return getOnlineClassesState();
  if (onlineClassesLoadPromise) return onlineClassesLoadPromise;

  onlineClassesLoadPromise = (async () => {
    state.status = 'syncing';
    state.error = null;

    try {
      const sheets = await fetchOnlineSheets();
      const parsedRows = sheets
        .flatMap(({ sheetName, text }) => {
          try {
            return parseOnlineSheet(text, sheetName);
          } catch {
            return [];
          }
        })
        .map(normalizeOnlineRow);

      if (parsedRows.length === 0) {
        throw new Error('Online classes sheet could not be parsed right now. Please try again shortly.');
      }

      const matched = dedupeMatchedItems(matchOnlineClasses(parsedRows, timetableClasses));

      state.items = matched;
      state.fetchedAt = Date.now();
      state.status = 'ok';
      return getOnlineClassesState();
    } catch (error) {
      state.status = 'error';
      state.error = error.message;
      throw error;
    } finally {
      onlineClassesLoadPromise = null;
    }
  })();

  return onlineClassesLoadPromise;
};

export const warmOnlineClasses = async (timetableClasses, { force = false } = {}) => {
  if (!Array.isArray(timetableClasses) || timetableClasses.length === 0) return null;
  try {
    return await loadOnlineClasses(timetableClasses, { force });
  } catch {
    return null;
  }
};

export const startOnlineClassesRefresh = (getTimetableClasses) => {
  if (onlineClassesRefreshTimer) clearInterval(onlineClassesRefreshTimer);

  const refresh = () => {
    const classes = typeof getTimetableClasses === 'function' ? getTimetableClasses() : [];
    void warmOnlineClasses(classes, { force: true });
  };

  refresh();
  onlineClassesRefreshTimer = setInterval(refresh, ONLINE_CLASSES_CACHE_TTL_MS);
};

export const stopOnlineClassesRefresh = () => {
  if (onlineClassesRefreshTimer) clearInterval(onlineClassesRefreshTimer);
  onlineClassesRefreshTimer = null;
};

export const queryOnlineClasses = async (timetableClasses, query = {}) => {
  const { section, teacher, refresh } = query;
  const stateSnapshot = await loadOnlineClasses(timetableClasses, { force: String(refresh || '').toLowerCase() === 'true' });
  let items = stateSnapshot.items;
  let schedule = [];
  let requestedSection = '';

  if (section) {
    const normalizedSection = normalizeResolvedSection(section);
    requestedSection = normalizedSection;
    items = items.filter((item) => normalizeResolvedSection(item.resolvedSection || item.rawSection) === normalizedSection);
    schedule = uniqBy(
      timetableClasses
        .filter((entry) => normalizeResolvedSection(entry.section) === normalizedSection)
        .map((entry) => ({
          id: entry.id,
          title: entry.title,
          teacher: entry.teacher,
          day: entry.day,
          slot: entry.slot,
          start: entry.start,
          end: entry.end,
          course: entry.course,
          section: entry.section,
        }))
        .sort((a, b) => {
          const leftDay = String(a.day || '');
          const rightDay = String(b.day || '');
          return leftDay.localeCompare(rightDay) || String(a.start || '').localeCompare(String(b.start || ''));
        }),
      (entry) => `${entry.title}|${entry.teacher}|${entry.day}|${entry.slot}|${entry.start}|${entry.end}`,
    );
  }

  if (teacher) {
    const teacherNorm = normalizeTeacherName(teacher);
    items = items.filter((item) => normalizeTeacherName(item.teacher) === teacherNorm);
  }

  return {
    status: stateSnapshot.status,
    fetchedAt: stateSnapshot.fetchedAt ? new Date(stateSnapshot.fetchedAt).toISOString() : null,
    section: requestedSection || null,
    count: items.length,
    schedule,
    items,
  };
};
