export const DAY_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();

export const getCourseKey = (item) => {
  const code = normalize(item?.course || (item?.title || '').split(/\s+/)[0] || '');
  const section = normalize(item?.section || '');
  if (code || section) return `${code}|${section}`;
  return normalize(item?.title || '');
};

export const getCourseCode = (item) =>
  String(item?.course || (item?.title || '').split(/\s+/)[0] || '').toUpperCase();

export const daySortValue = (day) => DAY_ORDER[day] || 99;

export const getEntriesForCourseKey = (classes, key) =>
  classes.filter((item) => getCourseKey(item) === key);

export const overlaps = (a, b) =>
  a.day === b.day && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;

export const dedupeById = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
};

export const selectedEntriesFromCourses = (selectedCourses, allClasses) => {
  const fromSaved = selectedCourses.flatMap((item) => item.entries || []);
  if (fromSaved.length > 0) return dedupeById(fromSaved);
  const keys = new Set(selectedCourses.map((item) => item.key));
  return dedupeById(allClasses.filter((item) => keys.has(getCourseKey(item))));
};

export const buildClashes = (entries) => {
  const sorted = [...entries].sort(
    (a, b) => daySortValue(a.day) - daySortValue(b.day) || a.startMinutes - b.startMinutes,
  );
  const list = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (daySortValue(sorted[j].day) > daySortValue(sorted[i].day)) break;
      if (sorted[j].startMinutes >= sorted[i].endMinutes) break;
      if (overlaps(sorted[i], sorted[j])) list.push({ a: sorted[i], b: sorted[j] });
    }
  }
  return list;
};

