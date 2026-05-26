import { FREE_WINDOW_END, FREE_WINDOW_START, MIN_FREE_SLOT_MINUTES, WEEK_DAYS } from '../constants';

export const minutesToLabel = (mins) => {
  const safe = Math.max(0, Number(mins) || 0);
  const h24 = Math.floor(safe / 60);
  const m = safe % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const normalizeShareEntry = (item) => ({
  id: item.id || `${item.day}-${item.startMinutes}-${item.endMinutes}-${item.course || item.title}`,
  day: item.day,
  startMinutes: item.startMinutes,
  endMinutes: item.endMinutes,
  start: item.start,
  end: item.end,
  course: item.course,
  section: item.section,
  title: item.title,
  teacher: item.teacher,
  room: item.room,
});

export const encodeSharePayload = (payload) => {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return '';
  }
};

export const decodeSharePayload = (encoded) => {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
};

export const buildFreeByDay = (entries, windowStart = FREE_WINDOW_START, windowEnd = FREE_WINDOW_END) => {
  const busyByDay = Object.fromEntries(WEEK_DAYS.map((day) => [day, []]));
  (entries || []).forEach((entry) => {
    const day = entry?.day;
    const start = Number(entry?.startMinutes);
    const end = Number(entry?.endMinutes);
    if (!busyByDay[day]) return;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    busyByDay[day].push([Math.max(windowStart, start), Math.min(windowEnd, end)]);
  });

  const freeByDay = {};
  WEEK_DAYS.forEach((day) => {
    const busy = busyByDay[day]
      .filter(([s, e]) => e > s)
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    busy.forEach(([s, e]) => {
      const prev = merged[merged.length - 1];
      if (!prev || s > prev[1]) merged.push([s, e]);
      else prev[1] = Math.max(prev[1], e);
    });

    const free = [];
    let cursor = windowStart;
    merged.forEach(([s, e]) => {
      if (s - cursor >= MIN_FREE_SLOT_MINUTES) free.push([cursor, s]);
      cursor = Math.max(cursor, e);
    });
    if (windowEnd - cursor >= MIN_FREE_SLOT_MINUTES) free.push([cursor, windowEnd]);
    freeByDay[day] = free;
  });
  return freeByDay;
};

export const intersectFreeByDay = (leftMap, rightMap) => {
  const out = {};
  WEEK_DAYS.forEach((day) => {
    const a = leftMap?.[day] || [];
    const b = rightMap?.[day] || [];
    const merged = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      const start = Math.max(a[i][0], b[j][0]);
      const end = Math.min(a[i][1], b[j][1]);
      if (end - start >= MIN_FREE_SLOT_MINUTES) merged.push([start, end]);
      if (a[i][1] < b[j][1]) i += 1;
      else j += 1;
    }
    out[day] = merged;
  });
  return out;
};
