import { ONLINE_CLASSES_CACHE_TTL_MS } from './constants.js';
import { fetchOnlineSheets } from './fetchOnlineSheet.js';
import { matchOnlineClasses } from './matchOnlineClasses.js';
import { normalizeOnlineRow, normalizeResolvedSection, normalizeTeacherName } from './normalizeOnlineRow.js';
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

const shouldRefresh = () => Date.now() - state.fetchedAt > ONLINE_CLASSES_CACHE_TTL_MS;

export const getOnlineClassesState = () => ({ ...state, items: [...state.items] });

export const loadOnlineClasses = async (timetableClasses, { force = false } = {}) => {
  if (!force && state.items.length > 0 && !shouldRefresh()) return getOnlineClassesState();

  state.status = 'syncing';
  state.error = null;

  try {
    const sheets = await fetchOnlineSheets();
    const parsedRows = sheets.flatMap(({ sheetName, text }) => parseOnlineSheet(text, sheetName)).map(normalizeOnlineRow);
    const matched = matchOnlineClasses(parsedRows, timetableClasses);

    state.items = matched;
    state.fetchedAt = Date.now();
    state.status = 'ok';
    return getOnlineClassesState();
  } catch (error) {
    state.status = 'error';
    state.error = error.message;
    throw error;
  }
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
