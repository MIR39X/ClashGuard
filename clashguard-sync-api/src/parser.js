const DAYS = new Set(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);

const courseRegex = /\b([A-Z]{2,4}\d{3,4}[A-Z]?)\b/;
const sectionRegex = /\b([A-Z]{2,4}-\d[A-Z0-9]?)\b/;
const timeRegex = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/;

const toMinutes = (clock) => {
  const [h, m] = clock.split(':').map(Number);
  const hour = h < 7 ? h + 12 : h;
  return hour * 60 + m;
};

const parseTimeRange = (value) => {
  if (!value) return null;
  const normalized = String(value).replace(':-', '-');
  const match = normalized.match(timeRegex);
  if (!match) return null;

  return {
    start: match[1],
    end: match[2],
    startMinutes: toMinutes(match[1]),
    endMinutes: toMinutes(match[2]),
  };
};

const parseGvizResponse = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Invalid GViz response format');
  }
  return JSON.parse(text.slice(start, end + 1));
};

const normalizeDayName = (name) => String(name || '').trim().toUpperCase();

export const parseSheetClasses = (sheetName, gvizText) => {
  const dayUpper = normalizeDayName(sheetName);
  if (!DAYS.has(dayUpper)) return [];

  const day = dayUpper[0] + dayUpper.slice(1).toLowerCase();
  const parsed = parseGvizResponse(gvizText);
  const rows = parsed?.table?.rows || [];
  if (rows.length < 4) return [];

  const classes = [];
  const timeRow = rows[1]?.c || [];

  for (let rowIndex = 3; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]?.c || [];
    const room = String(row[0]?.v || '').trim();
    if (!room) continue;

    for (let colIndex = 1; colIndex < row.length; colIndex += 1) {
      const cellValue = row[colIndex]?.v;
      if (!cellValue) continue;

      const raw = String(cellValue).trim();
      if (!raw || raw.toLowerCase().startsWith('reserved for')) continue;

      const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
      const title = lines[0] || raw;
      const teacher = lines[1] || '';

      let slotText = String(timeRow[colIndex]?.v || '').trim();
      if (raw.toLowerCase().includes('lab') && timeRow[colIndex + 2]?.v) {
        const startPart = slotText.split('-')[0] || '';
        const endPart = String(timeRow[colIndex + 2]?.v).split('-')[1] || '';
        slotText = `${startPart}-${endPart}`;
      }

      const range = parseTimeRange(slotText);
      if (!range) continue;

      const course = raw.match(courseRegex)?.[1] || '';
      const section = raw.match(sectionRegex)?.[1] || '';

      classes.push({
        id: `${dayUpper}-${rowIndex}-${colIndex}`,
        day,
        room,
        slot: slotText,
        start: range.start,
        end: range.end,
        startMinutes: range.startMinutes,
        endMinutes: range.endMinutes,
        course,
        section,
        teacher,
        title,
        raw,
      });
    }
  }

  return classes;
};

export const overlap = (a, b) =>
  a.day === b.day && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;

export const sectionClashes = (entries, section) => {
  const key = String(section || '').trim().toLowerCase();
  const selected = entries.filter((item) => item.section.toLowerCase() === key);
  const sorted = [...selected].sort(
    (a, b) => a.day.localeCompare(b.day) || a.startMinutes - b.startMinutes,
  );

  const clashes = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (sorted[i].day !== sorted[j].day) break;
      if (sorted[j].startMinutes >= sorted[i].endMinutes) break;
      if (overlap(sorted[i], sorted[j])) {
        clashes.push({ type: 'section', section, a: sorted[i], b: sorted[j] });
      }
    }
  }
  return clashes;
};

