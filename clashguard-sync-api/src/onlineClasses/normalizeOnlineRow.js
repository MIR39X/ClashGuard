const FULL_SECTION_REGEX = /\b([A-Z]{2,5})\s*-\s*(\d)\s*([A-Z0-9])\b/i;
const LOOSE_FULL_SECTION_REGEX = /\b([A-Z]{2,5})\s+(\d)\s*([A-Z0-9])\b/i;
const EMBEDDED_SECTION_REGEX = /\b[A-Z]{2,6}\d{3,4}[A-Z]?\s*-\s*([A-Z]{2,5}\s*-?\s*\d\s*[A-Z0-9])\b/i;
const PARTIAL_SECTION_REGEX = /\b([A-Z]{2,5})\s*-?\s*([A-Z])\b/i;
const COURSE_CODE_REGEX = /\b([A-Z]{2,6}\d{3,4}[A-Z]?)\b/i;
const HONORIFICS_REGEX = /\b(dr|mr|mrs|ms|miss|prof|engr)\b\.?/gi;

const toAsciiLower = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const compact = (value) => toAsciiLower(value).replace(/\s+/g, '');

export const normalizeTeacherName = (value) =>
  compact(String(value || '').replace(HONORIFICS_REGEX, ''));

export const teacherNameTokens = (value) =>
  toAsciiLower(String(value || '').replace(HONORIFICS_REGEX, ''))
    .split(' ')
    .filter((token) => token.length > 1);

export const normalizeCourseName = (value) => compact(value);

export const normalizeFreeText = (value) => toAsciiLower(value);

export const toSectionCode = (dept, semester, letter) =>
  `${String(dept || '').toUpperCase()}-${semester}${String(letter || '').toUpperCase()}`;

export const extractCourseCode = (value) => {
  const match = String(value || '').toUpperCase().match(COURSE_CODE_REGEX);
  return match ? match[1] : '';
};

export const extractFullSection = (...values) => {
  for (const value of values) {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) continue;

    const embedded = raw.match(EMBEDDED_SECTION_REGEX);
    if (embedded) {
      const full = extractFullSection(embedded[1]);
      if (full) return full;
    }

    const direct = raw.match(FULL_SECTION_REGEX) || raw.match(LOOSE_FULL_SECTION_REGEX);
    if (direct) return toSectionCode(direct[1], direct[2], direct[3]);
  }
  return '';
};

export const extractPartialSection = (...values) => {
  for (const value of values) {
    const raw = String(value || '').trim().toUpperCase();
    if (!raw) continue;
    if (extractFullSection(raw)) continue;

    const match = raw.match(PARTIAL_SECTION_REGEX);
    if (match) {
      return {
        dept: String(match[1] || '').toUpperCase(),
        suffix: String(match[2] || '').toUpperCase(),
      };
    }
  }
  return null;
};

export const normalizeResolvedSection = (value) => extractFullSection(value) || String(value || '').trim().toUpperCase();

export const toInitialism = (value) =>
  toAsciiLower(value)
    .split(' ')
    .filter(Boolean)
    .map((token) => token[0])
    .join('');

export const normalizeOnlineRow = (row) => {
  const rawSection = String(row.section || '').trim();
  const rawCourse = String(row.course || '').trim();
  const rawTeacher = String(row.teacher || '').trim();
  const fullSection = extractFullSection(rawSection, rawCourse);
  const partialSection = fullSection ? null : extractPartialSection(rawSection, rawCourse);
  const courseCode = extractCourseCode(rawCourse);
  const teacherNorm = normalizeTeacherName(rawTeacher);
  const courseNorm = normalizeCourseName(rawCourse);

  return {
    ...row,
    rawSection,
    rawCourse,
    rawTeacher,
    normalized: {
      fullSection,
      partialSection,
      courseCode,
      teacherNorm,
      courseNorm,
      courseInitialism: toInitialism(rawCourse),
    },
  };
};
