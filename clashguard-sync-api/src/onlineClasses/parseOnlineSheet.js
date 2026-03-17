const parseGvizResponse = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Invalid online classes GViz response');
  }
  return JSON.parse(text.slice(start, end + 1));
};

const normalizeHeaderLabel = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const getCellValue = (cell) => {
  if (!cell) return '';
  if (cell.v === null || cell.v === undefined) return '';
  return String(cell.v).trim();
};

const REQUIRED_COLUMNS = {
  teacher: ['teacher name', 'teacher', 'teachername'],
  section: ['section', 'sec', 'class section'],
  course: ['course', 'subject', 'course title'],
  time: ['time', 'timing', 'slot'],
  link: ['online class link', 'link', 'online link', 'class link', 'meeting link'],
};

const findColumnIndex = (labels, aliases) =>
  labels.findIndex((label) => aliases.includes(normalizeHeaderLabel(label)));

const resolveIndexesFromLabels = (labels) => {
  const normalizedLabels = labels.map(normalizeHeaderLabel);
  const teacherIndex = findColumnIndex(normalizedLabels, REQUIRED_COLUMNS.teacher);
  const sectionIndex = findColumnIndex(normalizedLabels, REQUIRED_COLUMNS.section);
  const courseIndex = findColumnIndex(normalizedLabels, REQUIRED_COLUMNS.course);
  const timeIndex = findColumnIndex(normalizedLabels, REQUIRED_COLUMNS.time);
  const linkIndex = findColumnIndex(normalizedLabels, REQUIRED_COLUMNS.link);

  return {
    teacherIndex,
    sectionIndex,
    courseIndex,
    timeIndex,
    linkIndex,
    isComplete: [teacherIndex, sectionIndex, courseIndex, timeIndex, linkIndex].every((index) => index !== -1),
  };
};

export const parseOnlineSheet = (gvizText, sheetName = '') => {
  const parsed = parseGvizResponse(gvizText);
  const cols = parsed?.table?.cols || [];
  const rows = parsed?.table?.rows || [];

  let headerRowIndex = -1;
  let { teacherIndex, sectionIndex, courseIndex, timeIndex, linkIndex, isComplete } =
    resolveIndexesFromLabels(cols.map((col) => String(col?.label || '')));

  if (!isComplete) {
    for (let rowIndex = 0; rowIndex < Math.min(rows.length, 6); rowIndex += 1) {
      const headerLabels = (rows[rowIndex]?.c || []).map((cell) => getCellValue(cell));
      const headerIndexes = resolveIndexesFromLabels(headerLabels);
      if (headerIndexes.isComplete) {
        headerRowIndex = rowIndex;
        ({ teacherIndex, sectionIndex, courseIndex, timeIndex, linkIndex } = headerIndexes);
        isComplete = true;
        break;
      }
    }
  }

  if (!isComplete) {
    return [];
  }

  return rows
    .map((row, index) => {
      if (headerRowIndex !== -1 && index <= headerRowIndex) return null;
      const cells = row?.c || [];
      return {
        id: `online-${index + 1}`,
        rowNumber: index + 2,
        sheetDay: String(sheetName || '').trim(),
        teacher: getCellValue(cells[teacherIndex]),
        section: getCellValue(cells[sectionIndex]),
        course: getCellValue(cells[courseIndex]),
        time: getCellValue(cells[timeIndex]),
        link: getCellValue(cells[linkIndex]),
      };
    })
    .filter(Boolean)
    .filter((row) => row.teacher || row.section || row.course || row.time || row.link)
    .filter((row) => row.teacher && row.course);
};
