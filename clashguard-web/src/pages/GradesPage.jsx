import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { BTN_BASE, DEFAULT_GRADE_RANGES } from '../constants';
import {
  achievedPercentFromStats,
  buildDefaultGradeComponents,
  calculateCourseStats,
  createGradeComponent,
  getEffectiveCreditHours,
  isFullyCompletedCourse,
  letterGradeToGpa,
  percentToGpa,
  percentToLetter,
  toNumber,
} from '../utils/gradeUtils';

const GradeDropdown = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDocMouseDown = (event) => {
      if (!rootRef.current || rootRef.current.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const selectedLabel = value || 'Select grade';

  return (
    <div ref={rootRef} className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-signal/35 bg-white px-3 text-sm font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition hover:border-signal focus:border-signal focus:ring-2 focus:ring-signal/20"
      >
        <span className={value ? 'text-ink' : 'text-ink/55'}>{selectedLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`text-signal/85 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-auto rounded-md border border-signal/30 bg-white p-1 shadow-[0_14px_30px_rgba(20,34,72,0.16)]">
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${
              !value ? 'bg-signal text-white' : 'text-ink/75 hover:bg-signal/10'
            }`}
          >
            Select grade
          </button>
          {options.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                onChange(label);
                setOpen(false);
              }}
              className={`mt-1 w-full rounded-md px-3 py-2 text-left text-sm font-semibold ${
                value === label ? 'bg-signal text-white' : 'text-ink hover:bg-signal/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const GradeCoursePage = ({ selectedCourses, gradesData, setGradesData, gradeRanges, courseCredits }) => {
  const navigate = useNavigate();
  const { courseKey: encodedCourseKey } = useParams();
  const courseKey = decodeURIComponent(encodedCourseKey || '');
  const course = selectedCourses.find((c) => c.key === courseKey);
  const fallbackCredits = getEffectiveCreditHours(course || {}, courseCredits);

  const upsertCourseGrade = (updater) => {
    setGradesData((prev) => {
      const current =
        prev[courseKey] || {
          targetWeightage: '',
          selectedGrade: '',
          components: buildDefaultGradeComponents(fallbackCredits),
        };
      return { ...prev, [courseKey]: updater(current) };
    });
  };

  const addComponent = () => {
    upsertCourseGrade((current) => ({
      ...current,
      components: [...(current.components || []), createGradeComponent()],
    }));
  };

  const removeComponent = (componentId) => {
    upsertCourseGrade((current) => {
      const next = (current.components || []).filter((c) => c.id !== componentId);
      return { ...current, components: next.length > 0 ? next : buildDefaultGradeComponents(fallbackCredits) };
    });
  };

  const updateComponent = (componentId, field, value) => {
    upsertCourseGrade((current) => ({
      ...current,
      components: (current.components || []).map((cmp) =>
        cmp.id === componentId ? { ...cmp, [field]: value } : cmp,
      ),
    }));
  };

  const updateTarget = (value) => {
    upsertCourseGrade((current) => ({ ...current, targetWeightage: value }));
  };

  const updateSelectedGrade = (value) => {
    upsertCourseGrade((current) => ({ ...current, selectedGrade: value }));
  };

  if (selectedCourses.length < 1) return <Navigate to="/" replace state={{ selectionRequired: true }} />;
  if (!course) return <Navigate to="/grades" replace />;

  const courseGrade =
    gradesData[courseKey] || {
      targetWeightage: '',
      selectedGrade: '',
      components: buildDefaultGradeComponents(fallbackCredits),
    };
  const stats = calculateCourseStats(courseGrade, gradeRanges);
  const inferredGrade = percentToLetter(stats.targetPercent, gradeRanges);
  const components = courseGrade.components || buildDefaultGradeComponents(fallbackCredits);
  const weightMismatch = Math.abs(stats.totalWeight - 100) > 0.01;
  const neededInRemainingWeightage =
    Number.isFinite(stats.requiredAverage) && stats.remainingWeight > 0
      ? (stats.requiredAverage / 100) * stats.remainingWeight
      : NaN;
  const progressPct =
    stats.totalWeight > 0 ? Math.max(0, Math.min(100, (stats.achievedPoints / stats.totalWeight) * 100)) : 0;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-5xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-signal text-[clamp(2rem,5vw,3.5rem)] leading-[0.9] tracking-wide">
              [05]_COURSE GRADE
            </h1>
            <button onClick={() => navigate('/grades')} className={BTN_BASE}>
              Back
            </button>
          </div>

          <div className="mt-3 rounded-xl border border-signal/25 bg-white p-4 shadow-[0_8px_24px_rgba(12,12,12,0.06)]">
            <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr] lg:items-stretch">
              <div className="rounded-lg border border-ink/15 bg-ash px-3 py-2">
                <p className="text-lg font-semibold text-ink">{course.title}</p>
                <p className="text-xs uppercase text-ink/65">
                  {course.code} | {course.section || 'N/A'} | Credit Hours: {course.slots || 1}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex h-full flex-col justify-center rounded-lg border border-ink/15 bg-ash px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-ink/60">Achieved Weightage</p>
                  <p className="mt-0.5 font-mono text-base font-semibold text-ink">
                    {stats.achievedPoints.toFixed(1)} / {stats.totalWeight.toFixed(1)}%
                  </p>
                </div>
                <div className="flex h-full flex-col justify-center rounded-lg border border-ink/15 bg-ash px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-signal/70">Needed In Remaining</p>
                  <p className="mt-0.5 font-mono text-base font-semibold text-signal">
                    {Number.isFinite(neededInRemainingWeightage)
                      ? `${neededInRemainingWeightage.toFixed(1)} / ${stats.remainingWeight.toFixed(1)}%`
                      : '--'}
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">
              Progress: {progressPct.toFixed(1)}%
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="w-full max-w-[240px]">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/65">Target Weightage %</label>
              <input
                value={courseGrade.targetWeightage ?? ''}
                onChange={(e) => updateTarget(e.target.value)}
                placeholder="e.g. 80"
                className="mt-1 h-10 w-full rounded-md border border-signal/30 bg-white px-3 font-mono text-sm leading-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] outline-none focus:border-signal"
              />
              {inferredGrade && (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-signal">
                  Target maps to grade: {inferredGrade}
                </p>
              )}
            </div>
            <div className="w-full max-w-[240px]">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/65">Course Grade</label>
              <GradeDropdown
                value={courseGrade.selectedGrade || ''}
                options={gradeRanges.map((r) => r.label)}
                onChange={updateSelectedGrade}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4">
            {components.map((cmp) => (
              <div key={cmp.id} className="rounded-xl border border-ink/15 bg-white p-3 shadow-[0_10px_22px_rgba(12,12,12,0.08)]">
                <div className="grid gap-3 lg:grid-cols-[2.7fr_1fr_1fr_1fr_56px] lg:items-end">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/65">Component</label>
                    <input
                      value={cmp.name}
                      onChange={(e) => updateComponent(cmp.id, 'name', e.target.value)}
                      placeholder="Quiz / Mid / Final / Lab"
                      className="mt-1 h-10 w-full rounded-md border border-ink/20 bg-white px-3 text-sm leading-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] outline-none focus:border-signal"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/65">Weight %</label>
                    <input
                      value={cmp.weight}
                      onChange={(e) => updateComponent(cmp.id, 'weight', e.target.value)}
                      placeholder="e.g. 20"
                      className="mt-1 h-10 w-full rounded-md border border-ink/20 bg-white px-3 font-mono text-sm leading-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] outline-none focus:border-signal"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/65">Score</label>
                    <input
                      value={cmp.score}
                      onChange={(e) => updateComponent(cmp.id, 'score', e.target.value)}
                      placeholder="17"
                      className="mt-1 h-10 w-full rounded-md border border-ink/20 bg-white px-3 font-mono text-sm leading-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] outline-none focus:border-signal"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/65">Total</label>
                    <input
                      value={cmp.total}
                      onChange={(e) => updateComponent(cmp.id, 'total', e.target.value)}
                      placeholder="25"
                      className="mt-1 h-10 w-full rounded-md border border-ink/20 bg-white px-3 font-mono text-sm leading-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] outline-none focus:border-signal"
                    />
                  </div>
                  <button
                    onClick={() => removeComponent(cmp.id)}
                    aria-label="Remove component"
                    title="Remove component"
                    className="h-10 w-10 place-self-start rounded-md border border-signal/35 text-sm text-signal transition hover:bg-signal hover:text-white lg:place-self-end"
                  >
                    <svg viewBox="0 0 24 24" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                  </button>
                </div>
                <div className="mt-3">
                  {(() => {
                    const total = toNumber(cmp.total);
                    const score = toNumber(cmp.score);
                    const weight = toNumber(cmp.weight);
                    const hasTotal = Number.isFinite(total) && total > 0;
                    const hasScore = Number.isFinite(score) && score >= 0;
                    const hasWeight = Number.isFinite(weight) && weight > 0;
                    const ratio = hasTotal && hasScore ? Math.max(0, Math.min(1, score / total)) : NaN;
                    const achievedWeight = hasTotal && hasScore && hasWeight ? weight * ratio : NaN;
                    const neededWeightForThis =
                      hasWeight &&
                      !hasScore &&
                      Number.isFinite(stats.targetPercent) &&
                      Number.isFinite(stats.remainingWeight) &&
                      stats.remainingWeight > 0
                        ? ((stats.targetPercent - stats.achievedPoints) * weight) / stats.remainingWeight
                        : NaN;
                    const neededForThis =
                      hasTotal &&
                      !hasScore &&
                      Number.isFinite(stats.requiredAverage) &&
                      Number.isFinite(total)
                        ? (stats.requiredAverage / 100) * total
                        : NaN;
                    const hasFooterData =
                      Number.isFinite(achievedWeight) || Number.isFinite(neededWeightForThis) || Number.isFinite(neededForThis);
                    const targetGap =
                      Number.isFinite(neededWeightForThis) && Number.isFinite(achievedWeight)
                        ? neededWeightForThis - achievedWeight
                        : NaN;
                    const targetTone =
                      Number.isFinite(targetGap) && targetGap > 0.15
                        ? 'border-amber-300/70 bg-amber-50 text-amber-700'
                        : 'border-emerald-300/60 bg-emerald-50 text-emerald-700';
                    return hasFooterData ? (
                      <div className="flex flex-wrap gap-2 rounded-md border-t border-ink/10 bg-ash/55 px-2.5 py-2">
                        {Number.isFinite(achievedWeight) && (
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${targetTone}`}>
                            Achieved Weightage: <span className="font-mono">{achievedWeight.toFixed(1)} / {weight.toFixed(1)} wt</span>
                          </span>
                        )}
                        {Number.isFinite(neededWeightForThis) && (
                          <span className="rounded-full border border-ink/20 bg-white px-3 py-1 text-[11px] font-semibold text-ink/75">
                            Needed In This: <span className="font-mono">{neededWeightForThis.toFixed(1)} / {weight.toFixed(1)} wt</span>
                          </span>
                        )}
                        {Number.isFinite(neededForThis) && (
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                              neededForThis > total
                                ? 'border-red-300/70 bg-red-50 text-red-700'
                                : neededForThis <= 0
                                  ? 'border-emerald-300/60 bg-emerald-50 text-emerald-700'
                                  : 'border-amber-300/70 bg-amber-50 text-amber-700'
                            }`}
                          >
                            Need Marks: <span className="font-mono">{neededForThis.toFixed(1)} / {total.toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            ))}
            <button onClick={addComponent} className={`${BTN_BASE} justify-self-start`}>
              Add Component
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-signal/20 bg-white/80 p-3 text-sm">
            <p className="text-ink/80">Configured Weight: <span className="font-mono">{stats.totalWeight.toFixed(2)}%</span></p>
            <p className="text-ink/80">Achieved Points: <span className="font-mono">{stats.achievedPoints.toFixed(2)}</span></p>
            {Number.isFinite(stats.targetPercent) && Number.isFinite(stats.requiredAverage) && (
              <p className={`mt-1 font-semibold ${stats.isImpossible ? 'text-red-700' : stats.alreadySafe ? 'text-emerald-700' : 'text-signal'}`}>
                {stats.isImpossible
                  ? `Target weightage not possible. Need ${stats.requiredAverage.toFixed(2)}% in remaining.`
                  : stats.alreadySafe
                    ? 'Target weightage already safe with current marks.'
                    : `Need ${stats.requiredAverage.toFixed(2)}% average in remaining components for target weightage.`}
              </p>
            )}
            {weightMismatch && (
              <div className="mt-2 rounded-md border border-dashed border-red-300 bg-red-50/70 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-red-700">
                  Set total component weight to 100% for accurate output.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </Shell>
  );
};

export const SettingsPage = ({ gradeRanges, setGradeRanges }) => {
  const navigate = useNavigate();

  const updateRow = (id, field, value) => {
    setGradeRanges((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setGradeRanges((prev) => [
      ...prev,
      {
        id: `G-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: '',
        min: '',
        max: '',
        gpa: '',
      },
    ]);
  };

  const removeRow = (id) => {
    setGradeRanges((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const resetDefault = () => setGradeRanges(DEFAULT_GRADE_RANGES);

  return (
    <Shell>
      <main className="mx-auto w-full max-w-6xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-signal text-[clamp(2.2rem,5vw,4rem)] leading-[0.9] tracking-wide">
              [06]_SETTINGS
            </h1>
            <div className="hidden w-full gap-2 sm:grid sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={resetDefault} className={BTN_BASE}>Reset Default</button>
              <button onClick={() => navigate('/grades')} className={BTN_BASE}>Back To Grades</button>
            </div>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-ink/70">
            Configure grade ranges used for GPA calculation.
          </p>

          <div className="mt-3 grid gap-2">
            {gradeRanges.map((r) => (
              <div key={r.id} className="rounded-xl border border-ink/15 bg-white p-3 shadow-[0_4px_14px_rgba(12,12,12,0.06)]">
                <div className="grid gap-2 sm:grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_auto] sm:items-end">
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-ink/55">Grade</label>
                    <input
                      value={r.label}
                      onChange={(e) => updateRow(r.id, 'label', e.target.value)}
                      placeholder="A / B+"
                      className="mt-1 rounded-md border border-ink/20 bg-white px-2 py-2 text-xs outline-none focus:border-signal"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-ink/55">Min %</label>
                    <input
                      value={r.min}
                      onChange={(e) => updateRow(r.id, 'min', e.target.value)}
                      placeholder="85"
                      className="mt-1 rounded-md border border-ink/20 bg-white px-2 py-2 text-xs outline-none focus:border-signal"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-ink/55">Max %</label>
                    <input
                      value={r.max}
                      onChange={(e) => updateRow(r.id, 'max', e.target.value)}
                      placeholder="100"
                      className="mt-1 rounded-md border border-ink/20 bg-white px-2 py-2 text-xs outline-none focus:border-signal"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.18em] text-ink/55">GPA</label>
                    <input
                      value={r.gpa}
                      onChange={(e) => updateRow(r.id, 'gpa', e.target.value)}
                      placeholder="4.0"
                      className="mt-1 rounded-md border border-ink/20 bg-white px-2 py-2 text-xs outline-none focus:border-signal"
                    />
                  </div>
                  <button
                    onClick={() => removeRow(r.id)}
                    className="rounded-md border border-signal/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-signal hover:bg-signal hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addRow} className={`${BTN_BASE} mt-3`}>
            Add Grade Range
          </button>
        </section>
      </main>
    </Shell>
  );
};

const GradesPage = ({ selectedCourses, gradesData, gradeRanges, courseCredits, setCourseCredits }) => {
  const navigate = useNavigate();
  const totalCreditHours = useMemo(
    () => selectedCourses.reduce((sum, course) => sum + getEffectiveCreditHours(course, courseCredits), 0),
    [courseCredits, selectedCourses],
  );
  const termGpa = useMemo(() => {
    if (selectedCourses.length === 0) return 0;
    let weightedPoints = 0;
    let credits = 0;
    selectedCourses.forEach((course) => {
      const courseGrade = gradesData[course.key] || {};
      const creditHours = getEffectiveCreditHours(course, courseCredits);
      let points = 0;
      const stats = calculateCourseStats(courseGrade, gradeRanges);
      const fullyCompleted = isFullyCompletedCourse(stats);
      const achievedPercent = achievedPercentFromStats(stats);
      const selectedGrade = String(courseGrade.selectedGrade || '').trim();

      if (fullyCompleted && Number.isFinite(achievedPercent)) {
        points = percentToGpa(achievedPercent, gradeRanges);
      } else if (selectedGrade) {
        points = letterGradeToGpa(selectedGrade, gradeRanges);
      } else {
        const target = stats.targetPercent;
        if (!Number.isFinite(target)) return;
        points = percentToGpa(target, gradeRanges);
      }
      weightedPoints += points * creditHours;
      credits += creditHours;
    });
    return credits > 0 ? weightedPoints / credits : 0;
  }, [courseCredits, gradesData, gradeRanges, selectedCourses]);

  if (selectedCourses.length < 1) return <Navigate to="/" replace state={{ selectionRequired: true }} />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.9] tracking-wide">
              [05]_GRADES
            </h1>
            <div className="hidden w-full gap-2 sm:grid sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/timetable')} className={BTN_BASE}>
                Timetable
              </button>
              <button onClick={() => navigate('/clashes')} className={BTN_BASE}>
                Clash Report
              </button>
              <button onClick={() => navigate('/alternatives')} className={BTN_BASE}>
                Alternatives
              </button>
              <button onClick={() => navigate('/grades')} className={`${BTN_BASE} bg-signal text-white`}>
                Grades
              </button>
              <button onClick={() => navigate('/friends')} className={BTN_BASE}>
                Friends
              </button>
              <button onClick={() => navigate('/')} className={BTN_BASE}>
                Back To Selection
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-signal/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/65">Estimated Term GPA</p>
            <p className="mt-1 text-4xl font-semibold text-signal">{termGpa.toFixed(2)}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70">
              Total Credit Hours: {totalCreditHours}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-ink/60">
              Uses achieved grade when course is fully completed; otherwise selected grade or target weightage
            </p>
            <button onClick={() => navigate('/settings')} className={`${BTN_BASE} mt-3 w-full sm:hidden`}>
              Settings
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            {selectedCourses.map((course) => {
              const stats = calculateCourseStats(gradesData[course.key] || {}, gradeRanges);
              const fullyCompleted = isFullyCompletedCourse(stats);
              const achievedPercent = achievedPercentFromStats(stats);
              const achievedGrade = percentToLetter(achievedPercent, gradeRanges);
              const defaultCredits = Math.max(1, Number(course.slots) || 1);
              const manualCredits = Number(courseCredits?.[course.key]);
              const effectiveCredits = getEffectiveCreditHours(course, courseCredits);
              const hasManualOverride =
                Number.isFinite(manualCredits) &&
                manualCredits > 0 &&
                Math.abs(manualCredits - defaultCredits) > 0.01;
              const required =
                !fullyCompleted && Number.isFinite(stats.targetPercent) && Number.isFinite(stats.requiredAverage)
                  ? stats.isImpossible
                    ? 'Impossible target'
                    : stats.alreadySafe
                      ? 'Target already safe'
                      : `Need ${stats.requiredAverage.toFixed(1)}%`
                  : '';
              const selectedGrade = String((gradesData[course.key] || {}).selectedGrade || '').trim();
              const targetGrade = String((gradesData[course.key] || {}).targetGrade || '').trim();
              const inferredGrade = percentToLetter(stats.targetPercent, gradeRanges);
              const resolvedGrade = fullyCompleted ? (achievedGrade || '--') : (selectedGrade || targetGrade || inferredGrade || '--');
              return (
                <button
                  key={course.key}
                  onClick={() => navigate(`/grades/${encodeURIComponent(course.key)}`)}
                  className="rounded-xl border border-signal/25 bg-white p-4 text-left hover:border-signal/45"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-ink">{course.title}</p>
                      <p className="text-xs uppercase text-ink/65">
                        {course.code} | {course.section || 'N/A'}
                      </p>
                      <div
                        className="mt-2 flex w-fit items-center gap-2 rounded-md border border-signal/20 bg-signal/5 px-2 py-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label htmlFor={`credits-${course.key}`} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-signal/80">
                          Credit Hours
                        </label>
                        <input
                          id={`credits-${course.key}`}
                          type="number"
                          min="1"
                          step="1"
                          value={courseCredits?.[course.key] ?? effectiveCredits}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setCourseCredits((prev) => ({
                                ...prev,
                                [course.key]: '',
                              }));
                              return;
                            }

                            const parsed = Number(raw);
                            setCourseCredits((prev) => ({
                              ...prev,
                              [course.key]: Number.isFinite(parsed) && parsed > 0 ? parsed : prev?.[course.key] ?? effectiveCredits,
                            }));
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== '') return;
                            setCourseCredits((prev) => {
                              const next = { ...prev };
                              delete next[course.key];
                              return next;
                            });
                          }}
                          className="h-7 w-16 rounded border border-signal/30 bg-white px-2 text-sm font-semibold text-ink outline-none focus:border-signal"
                        />
                        {hasManualOverride && (
                          <span className="rounded-full border border-emerald-300/70 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                            Manual Override
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full border border-signal/35 bg-signal/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-signal">
                      {resolvedGrade}
                    </span>
                  </div>
                  {fullyCompleted && (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Achieved (100% complete)
                    </p>
                  )}
                  {required && <p className="mt-1 text-xs font-semibold uppercase text-signal">{required}</p>}
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </Shell>
  );
};

export default GradesPage;
