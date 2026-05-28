import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { ALT_LIMITS, BTN_BASE } from '../constants';
import {
  buildClashes,
  daySortValue,
  getCourseCode,
  getCourseKey,
  overlaps,
  selectedEntriesFromCourses,
} from '../lib/schedule';

const AlternativesPage = ({ allClasses, selectedCourses, setSelectedCourses }) => {
  const navigate = useNavigate();
  const [teacherQuery, setTeacherQuery] = useState('');
  const [appliedMsg, setAppliedMsg] = useState('');
  const [altLimit, setAltLimit] = useState('5');
  const altLimitIndex = Math.max(0, ALT_LIMITS.indexOf(altLimit));
  const selectedEntries = useMemo(
    () =>
      selectedEntriesFromCourses(selectedCourses, allClasses).sort(
        (a, b) => daySortValue(a.day) - daySortValue(b.day) || a.startMinutes - b.startMinutes,
      ),
    [allClasses, selectedCourses],
  );
  const clashes = useMemo(() => buildClashes(selectedEntries), [selectedEntries]);

  const clashCourseKeys = useMemo(() => {
    const keys = new Set();
    clashes.forEach((item) => {
      keys.add(getCourseKey(item.a));
      keys.add(getCourseKey(item.b));
    });
    return [...keys];
  }, [clashes]);

  const alternatives = useMemo(() => {
    return clashCourseKeys.map((courseKey) => {
      const current = selectedEntries.filter((entry) => getCourseKey(entry) === courseKey);
      const currentCode = current[0] ? getCourseCode(current[0]) : '';
      const fixed = selectedEntries.filter((entry) => getCourseKey(entry) !== courseKey);

      const candidateGroups = new Map();
      allClasses
        .filter((entry) => getCourseCode(entry) === currentCode && getCourseKey(entry) !== courseKey)
        .forEach((entry) => {
          const key = getCourseKey(entry);
          if (!candidateGroups.has(key)) {
            candidateGroups.set(key, {
              key,
              title: entry.title,
              teacher: entry.teacher,
              section: entry.section,
              entries: [],
            });
          }
          candidateGroups.get(key).entries.push(entry);
        });

      const ranked = [...candidateGroups.values()]
        .map((candidate) => {
          const conflictMap = new Map();
          candidate.entries.forEach((entry) => {
            fixed.forEach((fixedEntry) => {
              if (overlaps(entry, fixedEntry)) {
                conflictMap.set(fixedEntry.id, fixedEntry);
              }
            });
          });
          const conflictsWith = [...conflictMap.values()];
          return { ...candidate, conflictCount: conflictsWith.length, conflictsWith };
        })
        .sort((a, b) => a.conflictCount - b.conflictCount || a.entries.length - b.entries.length);

      return {
        courseKey,
        currentTitle: current[0]?.title || courseKey,
        currentCode,
        currentSection: current[0]?.section || '',
        options: ranked,
      };
    });
  }, [allClasses, clashCourseKeys, selectedEntries]);

  const filteredAlternatives = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    if (!q) return alternatives;
    return alternatives
      .map((group) => ({
        ...group,
        options: group.options.filter((opt) => String(opt.teacher || '').toLowerCase().includes(q)),
      }))
      .filter((group) => group.options.length > 0);
  }, [alternatives, teacherQuery]);

  const applyAlternative = (courseKey, currentCode, option) => {
    setSelectedCourses((prev) =>
      prev.map((item) =>
        item.key === courseKey
          ? {
              key: option.key,
              code: currentCode || getCourseCode(option.entries[0] || {}),
              title: option.title,
              section: option.section,
              teacher: option.teacher,
              slots: option.entries.length,
            }
          : item,
      ),
    );
    setAppliedMsg(`Applied alternative: ${option.title}`);
  };

  if (selectedCourses.length < 1) return <Navigate to="/" replace state={{ selectionRequired: true }} />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.9] tracking-wide">
              [04]_ALTERNATIVES
            </h1>
            <div className="hidden w-full gap-2 sm:grid sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/timetable')} className={BTN_BASE}>
                Timetable
              </button>
              <button onClick={() => navigate('/clashes')} className={BTN_BASE}>
                Clash Report
              </button>
              <button onClick={() => navigate('/alternatives')} className={`${BTN_BASE} bg-signal text-white`}>
                Alternatives
              </button>
              <button onClick={() => navigate('/grades')} className={BTN_BASE}>
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
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <input
              value={teacherQuery}
              onChange={(e) => setTeacherQuery(e.target.value)}
              placeholder="Filter alternatives by teacher"
              className="w-full rounded-lg border border-signal/30 bg-white px-3 py-2 text-xs uppercase outline-none focus:border-signal"
            />
            <div className="relative grid min-w-[230px] grid-cols-4 rounded-xl border border-signal/35 bg-white/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
              <span
                className="absolute top-1 h-[calc(100%-8px)] rounded-lg bg-signal shadow-[0_8px_20px_rgba(66,86,184,0.25)] transition-transform duration-300 ease-out"
                style={{
                  left: '4px',
                  width: `calc((100% - 8px) / ${ALT_LIMITS.length})`,
                  transform: `translateX(${altLimitIndex * 100}%)`,
                }}
              />
              {ALT_LIMITS.map((limit) => (
                <button
                  key={limit}
                  onClick={() => setAltLimit(limit)}
                  className={`z-10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] transition-colors ${
                    altLimit === limit ? 'text-white' : 'text-signal/85 hover:text-signal'
                  }`}
                >
                  {limit === 'all' ? 'All' : `Top ${limit}`}
                </button>
              ))}
            </div>
            {appliedMsg && <span className="text-xs font-semibold uppercase text-emerald-700">{appliedMsg}</span>}
          </div>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-ink/70">
            Courses with clashes: {filteredAlternatives.length}
          </p>

          {filteredAlternatives.length === 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-emerald-800">
              No alternatives needed. No clashes found.
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {filteredAlternatives.map((group) => (
                <article key={group.courseKey} className="rounded-xl border border-signal/25 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-signal">For Course</p>
                    <span className="rounded-full border border-ink/20 bg-ash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/75">
                      {group.currentSection || 'N/A'}
                    </span>
                  </div>
                  <p className="text-2xl font-semibold leading-tight text-ink">{group.currentTitle}</p>
                  <p className="text-sm uppercase text-ink/65">{group.currentCode}</p>
                  {group.options.length === 0 ? (
                    <p className="mt-2 text-sm text-ink/70">No alternative sections found for this course code.</p>
                  ) : (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {(altLimit === 'all' ? group.options : group.options.slice(0, Number(altLimit))).map((option) => (
                        <div key={option.key} className="rounded-lg border border-ink/15 bg-ash/60 p-3">
                          <p className="text-sm font-semibold text-ink">{option.title}</p>
                          <div className="mt-2 rounded-md border border-signal/25 bg-white px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-signal/80">Teacher</p>
                            <p className="mt-1 text-sm font-semibold text-ink">{option.teacher || 'Unknown Teacher'}</p>
                          </div>
                          <div className="mt-2 rounded-md border border-ink/15 bg-white px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/70">Schedule/Venue</p>
                            <div className="mt-1 divide-y divide-ink/10">
                              {option.entries.map((slot) => (
                                <div key={slot.id} className="py-1.5 first:pt-0 last:pb-0">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-signal/85">
                                    {slot.day} - {slot.start}-{slot.end}
                                  </p>
                                  <p className="mt-0.5 text-[11px] font-medium leading-4 text-ink/85">
                                    {slot.room || 'Room N/A'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-2 flex w-fit rounded-md border border-signal/35 bg-signal/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-signal">
                            Section: {option.section || 'N/A'}
                          </div>
                          {option.conflictCount > 0 && (
                            <div className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 p-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                                Conflicts With
                              </p>
                              <div className="mt-1 space-y-1">
                                {option.conflictsWith.map((c) => (
                                  <p key={c.id} className="text-xs text-amber-800">
                                    {c.title} ({c.day} {c.start}-{c.end})
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => applyAlternative(group.courseKey, group.currentCode, option)}
                            className="mt-2 rounded-md border border-signal/40 px-3 py-1 text-xs uppercase text-signal hover:bg-signal hover:text-white"
                          >
                            Apply Alternative
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
};

export default AlternativesPage;
