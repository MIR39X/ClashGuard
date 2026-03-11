const parseGvizResponse = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Invalid online classes GViz response');
  }
  return JSON.parse(text.slice(start, end + 1));
};

const getCellValue = (cell) => {
  if (!cell) return '';
  if (cell.v === null || cell.v === undefined) return '';
  return String(cell.v).trim();
};

export const parseOnlineSheet = (gvizText, sheetName = '') => {
  const parsed = parseGvizResponse(gvizText);
  const cols = parsed?.table?.cols || [];
  const rows = parsed?.table?.rows || [];

  const labels = cols.map((col) => String(col?.label || '').trim().toLowerCase());
  const teacherIndex = labels.findIndex((label) => label === 'teacher name');
  const sectionIndex = labels.findIndex((label) => label === 'section');
  const courseIndex = labels.findIndex((label) => label === 'course');
  const timeIndex = labels.findIndex((label) => label === 'time');
  const linkIndex = labels.findIndex((label) => label === 'online class link');

  if ([teacherIndex, sectionIndex, courseIndex, timeIndex, linkIndex].some((index) => index === -1)) {
    throw new Error('Online classes sheet is missing required columns');
  }

  return rows
    .map((row, index) => {
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
    .filter((row) => row.teacher || row.section || row.course || row.time || row.link)
    .filter((row) => row.teacher && row.course);
};
