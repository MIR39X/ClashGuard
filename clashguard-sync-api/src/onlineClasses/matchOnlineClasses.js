import {
  extractCourseCode,
  normalizeCourseName,
  normalizeFreeText,
  normalizeResolvedSection,
  normalizeTeacherName,
  teacherNameTokens,
} from './normalizeOnlineRow.js';

const uniq = (items) => [...new Set(items.filter(Boolean))];
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

const getSectionParts = (section) => {
  const match = String(section || '').toUpperCase().match(/^([A-Z]{2,5})-(\d)([A-Z0-9])$/);
  if (!match) return null;
  return { dept: match[1], semester: match[2], suffix: match[3] };
};

const getTimetableCourseAlias = (entry) => {
  const title = String(entry?.title || '').trim();
  const upper = title.toUpperCase();
  const tokens = upper.split(/\s+/).filter(Boolean);
  return tokens[0] || '';
};

const getTimetableCourseText = (entry) => {
  const alias = getTimetableCourseAlias(entry);
  const code = extractCourseCode(alias);
  if (!alias) return '';
  return normalizeCourseName(alias.replace(code, ''));
};

const teachersMatch = (left, right) => {
  const exactLeft = normalizeTeacherName(left);
  const exactRight = normalizeTeacherName(right);
  if (exactLeft && exactLeft === exactRight) return true;

  const leftTokens = teacherNameTokens(left);
  const rightTokens = teacherNameTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;

  const rightSet = new Set(rightTokens);
  const shared = leftTokens.filter((token) => rightSet.has(token));
  const overlapAgainstShorter = shared.length / Math.min(leftTokens.length, rightTokens.length);
  return shared.length >= 2 && overlapAgainstShorter >= 1;
};

const getRelevantEntries = (row, entries) => {
  const entriesForRowDay = row.sheetDay
    ? entries.filter((entry) => String(entry.day || '').toLowerCase() === String(row.sheetDay).toLowerCase())
    : entries;
  const scopedEntries = entriesForRowDay.length > 0 ? entriesForRowDay : entries;

  const teacherMatched = scopedEntries.filter((entry) => teachersMatch(row.teacher, entry.teacher));
  if (teacherMatched.length > 0) return teacherMatched;

  const codeMatched = row.normalized.courseCode
    ? scopedEntries.filter((entry) => String(entry.course || '').toUpperCase() === row.normalized.courseCode)
    : [];
  if (codeMatched.length > 0) return codeMatched;

  const textMatched = scopedEntries.filter((entry) => {
    const entryCourseText = getTimetableCourseText(entry);
    if (!entryCourseText || !row.normalized.courseNorm) return false;
    return (
      entryCourseText === row.normalized.courseNorm ||
      entryCourseText.includes(row.normalized.courseNorm) ||
      row.normalized.courseNorm.includes(entryCourseText)
    );
  });
  if (textMatched.length > 0) return textMatched;

  const aliasMatched = scopedEntries.filter((entry) => {
    const alias = getTimetableCourseAlias(entry);
    const code = extractCourseCode(alias);
    const shortAlias = normalizeFreeText(alias.replace(code, '')).replace(/\s+/g, '');
    return shortAlias && (shortAlias === row.normalized.courseInitialism || shortAlias.includes(row.normalized.courseInitialism));
  });
  if (aliasMatched.length > 0) return aliasMatched;

  return [];
};

const scoreCandidate = (row, section, entries) => {
  let score = 0;
  const reasons = [];
  const rowCourseCode = row.normalized.courseCode;
  const rowCourseNorm = row.normalized.courseNorm;
  const rowInitialism = row.normalized.courseInitialism;

  const sameTeacherEntries = entries.filter((entry) => teachersMatch(entry.teacher, row.teacher));
  if (sameTeacherEntries.length > 0) {
    score += 18;
    reasons.push('teacher-match');
  }

  const sectionParts = getSectionParts(section);
  if (row.normalized.partialSection && sectionParts) {
    if (sectionParts.dept === row.normalized.partialSection.dept) {
      score += 3;
      reasons.push('dept-match');
    }
    if (sectionParts.suffix === row.normalized.partialSection.suffix) {
      score += 6;
      reasons.push('suffix-match');
    }
  }

  if (row.normalized.fullSection && normalizeResolvedSection(section) === row.normalized.fullSection) {
    score += 20;
    reasons.push('full-section-match');
  }

  if (rowCourseCode && entries.some((entry) => String(entry.course || '').toUpperCase() === rowCourseCode)) {
    score += 15;
    reasons.push('course-code-match');
  }

  const courseTextMatch = entries.some((entry) => {
    const entryCourseText = getTimetableCourseText(entry);
    if (!entryCourseText || !rowCourseNorm) return false;
    return entryCourseText === rowCourseNorm || entryCourseText.includes(rowCourseNorm) || rowCourseNorm.includes(entryCourseText);
  });
  if (courseTextMatch) {
    score += 8;
    reasons.push('course-text-match');
  }

  const initialismMatch = entries.some((entry) => {
    const alias = getTimetableCourseAlias(entry);
    const code = extractCourseCode(alias);
    const shortAlias = normalizeFreeText(alias.replace(code, '')).replace(/\s+/g, '');
    return shortAlias && (shortAlias === rowInitialism || shortAlias.includes(rowInitialism) || rowInitialism.includes(shortAlias));
  });
  if (initialismMatch) {
    score += 5;
    reasons.push('course-alias-match');
  }

  return { score, reasons: uniq(reasons) };
};

const buildSectionIndex = (timetableClasses) => {
  const index = new Map();
  timetableClasses.forEach((entry) => {
    const section = normalizeResolvedSection(entry.section);
    if (!section) return;
    const current = index.get(section) || [];
    current.push(entry);
    index.set(section, current);
  });
  return index;
};

const resolveSection = (row, sectionIndex) => {
  const sections = [...sectionIndex.keys()];
  if (row.normalized.fullSection) {
    if (sectionIndex.has(row.normalized.fullSection)) {
      const entries = sectionIndex.get(row.normalized.fullSection);
      const relevantEntries = getRelevantEntries(row, entries);
      return {
        resolvedSection: row.normalized.fullSection,
        confidence: relevantEntries.length > 0 ? 'high' : 'medium',
        matchReasons: relevantEntries.length > 0
          ? ['direct-section-from-sheet', 'course-or-teacher-refined']
          : ['direct-section-from-sheet', 'no-course-or-teacher-refinement'],
        timetableMatches: relevantEntries,
      };
    }
    return {
      resolvedSection: row.normalized.fullSection,
      confidence: 'medium',
      matchReasons: ['direct-section-from-sheet-not-found-in-timetable'],
      timetableMatches: [],
    };
  }

  if (!row.normalized.partialSection) {
    return {
      resolvedSection: '',
      confidence: 'low',
      matchReasons: ['no-usable-section-pattern'],
      timetableMatches: [],
    };
  }

  const candidates = sections
    .filter((section) => {
      const parts = getSectionParts(section);
      if (!parts) return false;
      return parts.dept === row.normalized.partialSection.dept && parts.suffix === row.normalized.partialSection.suffix;
    })
    .map((section) => ({
      section,
      entries: sectionIndex.get(section) || [],
      ...scoreCandidate(row, section, sectionIndex.get(section) || []),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.section.localeCompare(b.section));

  if (candidates.length === 0) {
    return {
      resolvedSection: '',
      confidence: 'low',
      matchReasons: ['no-matching-timetable-section'],
      timetableMatches: [],
    };
  }

  const best = candidates[0];
  const confidence = best.score >= 20 ? 'high' : best.score >= 10 ? 'medium' : 'low';
  const relevantEntries = getRelevantEntries(row, best.entries);
  return {
    resolvedSection: best.section,
    confidence,
    matchReasons: best.reasons,
    timetableMatches: relevantEntries,
  };
};

export const matchOnlineClasses = (onlineRows, timetableClasses) => {
  const sectionIndex = buildSectionIndex(timetableClasses);

  return onlineRows.map((row) => {
    const resolved = resolveSection(row, sectionIndex);
    const timetableMatches = uniqBy(
      resolved.timetableMatches.map((entry) => ({
        title: entry.title,
        day: entry.day || '',
        slot: entry.slot || '',
        start: entry.start || '',
        end: entry.end || '',
      })),
      (entry) => `${entry.title}|${entry.day}|${entry.slot}|${entry.start}|${entry.end}`,
    );

    const matchedDays = row.sheetDay ? [row.sheetDay] : uniq(timetableMatches.map((entry) => entry.day));
    return {
      id: row.id,
      rowNumber: row.rowNumber,
      sheetDay: row.sheetDay || '',
      teacher: row.teacher,
      course: row.course,
      time: row.time,
      link: row.link,
      rawSection: row.section,
      resolvedSection: resolved.resolvedSection,
      matchedDays,
      confidence: resolved.confidence,
      matchReasons: resolved.matchReasons,
      timetableMatches,
    };
  });
};
