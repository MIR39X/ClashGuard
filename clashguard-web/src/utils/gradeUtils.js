export const createGradeComponent = (initial = {}) => ({
  id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: initial.name || '',
  weight: initial.weight ?? '',
  score: '',
  total: '',
});

export const toNumber = (value) => {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'string' && value.trim() === '') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

export const targetGradeToPercent = (targetGrade, gradeRanges) => {
  const matched = (gradeRanges || []).find(
    (r) => String(r.label || '').trim() === String(targetGrade || '').trim(),
  );
  if (!matched) return NaN;
  const min = Number(matched.min);
  return Number.isFinite(min) ? min : NaN;
};

export const calculateCourseStats = (courseGrade, gradeRanges) => {
  const components = courseGrade?.components || [];
  const weightedTarget = toNumber(courseGrade?.targetWeightage);
  const numericTarget = toNumber(courseGrade?.targetPercent);
  const gradeTarget = targetGradeToPercent(courseGrade?.targetGrade, gradeRanges);
  const targetPercent = Number.isFinite(weightedTarget)
    ? weightedTarget
    : Number.isFinite(gradeTarget)
      ? gradeTarget
      : numericTarget;
  let totalWeight = 0;
  let completedWeight = 0;
  let achievedPoints = 0;

  components.forEach((cmp) => {
    const weight = toNumber(cmp.weight);
    if (!Number.isFinite(weight) || weight <= 0) return;
    totalWeight += weight;
    const score = toNumber(cmp.score);
    const total = toNumber(cmp.total);
    if (Number.isFinite(score) && Number.isFinite(total) && total > 0) {
      const ratio = Math.max(0, Math.min(1, score / total));
      completedWeight += weight;
      achievedPoints += weight * ratio;
    }
  });

  const remainingWeight = Math.max(0, totalWeight - completedWeight);
  const requiredAverage =
    Number.isFinite(targetPercent) && remainingWeight > 0
      ? ((targetPercent - achievedPoints) / remainingWeight) * 100
      : NaN;

  return {
    totalWeight,
    completedWeight,
    remainingWeight,
    achievedPoints,
    targetPercent,
    requiredAverage,
    isImpossible: Number.isFinite(requiredAverage) && requiredAverage > 100,
    alreadySafe: Number.isFinite(requiredAverage) && requiredAverage <= 0,
  };
};

export const percentToGpa = (percent, gradeRanges) => {
  if (!Number.isFinite(percent)) return 0;
  const ranges = [...(gradeRanges || [])]
    .map((r) => ({
      ...r,
      min: Number(r.min),
      max: Number(r.max),
      gpa: Number(r.gpa),
    }))
    .filter((r) => Number.isFinite(r.min) && Number.isFinite(r.max) && Number.isFinite(r.gpa))
    .sort((a, b) => b.min - a.min);
  const matched = ranges.find((r) => percent >= r.min && percent <= r.max);
  return matched ? matched.gpa : 0;
};

export const letterGradeToGpa = (letter, gradeRanges) => {
  const found = (gradeRanges || []).find((r) => String(r.label || '').trim() === String(letter || '').trim());
  return found ? Number(found.gpa) || 0 : 0;
};

export const percentToLetter = (percent, gradeRanges) => {
  if (!Number.isFinite(percent)) return '';
  const ranges = [...(gradeRanges || [])]
    .map((r) => ({
      ...r,
      min: Number(r.min),
      max: Number(r.max),
      label: String(r.label || '').trim(),
    }))
    .filter((r) => Number.isFinite(r.min) && Number.isFinite(r.max) && r.label)
    .sort((a, b) => b.min - a.min);
  const matched = ranges.find((r) => percent >= r.min && percent <= r.max);
  return matched ? matched.label : '';
};

export const isFullyCompletedCourse = (stats) =>
  Number.isFinite(stats?.totalWeight) &&
  Number.isFinite(stats?.completedWeight) &&
  stats.totalWeight > 0 &&
  Math.abs(stats.totalWeight - 100) <= 0.01 &&
  Math.abs(stats.completedWeight - stats.totalWeight) <= 0.01;

export const achievedPercentFromStats = (stats) => {
  if (!Number.isFinite(stats?.achievedPoints) || !Number.isFinite(stats?.totalWeight) || stats.totalWeight <= 0) return NaN;
  return (stats.achievedPoints / stats.totalWeight) * 100;
};

export const getEffectiveCreditHours = (course, courseCredits) => {
  const manual = Number(courseCredits?.[course?.key]);
  if (Number.isFinite(manual) && manual > 0) return manual;
  return Math.max(1, Number(course?.slots) || 1);
};

export const buildDefaultGradeComponents = (creditHours) => {
  if (Number(creditHours) === 1) {
    return [
      createGradeComponent({ name: 'Mid Term', weight: '25' }),
      createGradeComponent({ name: 'Lab Tasks', weight: '25' }),
      createGradeComponent({ name: 'Final', weight: '50' }),
    ];
  }
  return [
    createGradeComponent({ name: 'Mid Term 1', weight: '15' }),
    createGradeComponent({ name: 'Mid Term 2', weight: '15' }),
    createGradeComponent({ name: 'Quizzes', weight: '10' }),
    createGradeComponent({ name: 'Assignments', weight: '10' }),
    createGradeComponent({ name: 'Final', weight: '50' }),
  ];
};

export const hasOnlyBlankComponents = (components) => {
  if (!Array.isArray(components) || components.length === 0) return true;
  return components.every((cmp) => {
    const name = String(cmp?.name || '').trim();
    const weight = String(cmp?.weight ?? '').trim();
    const score = String(cmp?.score ?? '').trim();
    const total = String(cmp?.total ?? '').trim();
    return !name && !weight && !score && !total;
  });
};
