import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  buildClashes,
  daySortValue,
  getCourseCode,
  getCourseKey,
  getEntriesForCourseKey,
  overlaps,
  selectedEntriesFromCourses,
} from './lib/schedule';
import {
  ALT_LIMITS,
  API_BASE,
  BTN_BASE,
  CLASSES_CACHE_TTL_MS,
  DEFAULT_GRADE_RANGES,
  STORAGE_KEYS,
} from './constants';
import { Shell } from './components/Shell';
import TimetablePage from './pages/TimetablePage';
import GradesPage, { GradeCoursePage, SettingsPage } from './pages/GradesPage';
import FriendsPage from './pages/FriendsPage';
import { buildDefaultGradeComponents, getEffectiveCreditHours, hasOnlyBlankComponents } from './utils/gradeUtils';

const CLASSES_FETCHED_AT_KEY = STORAGE_KEYS.CLASSES_FETCHED_AT;
const CLASSES_ETAG_KEY = STORAGE_KEYS.CLASSES_ETAG;

const isReservedOrPlaceholderClass = (item) => {
  const text = `${item?.title || ''} ${item?.raw || ''}`.toLowerCase();
  const code = String(item?.course || '').trim().toUpperCase();
  if (!text && !code) return true;
  if (text.includes('reserved for')) return true;
  if (text.includes('reserved')) return true;
  if (!code && text.includes('reserve')) return true;
  return false;
};

const getStableSelectedKey = (item) => {
  const existingKey = String(item?.key || '').trim();
  if (existingKey) return existingKey.toUpperCase();
  return getCourseKey({
    course: item?.code || item?.course || '',
    section: item?.section || '',
    title: item?.title || '',
  });
};

const SelectPage = ({ sectionFilter, setSectionFilter, allClasses, setAllClasses, selectedCourses, setSelectedCourses }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(() => allClasses.length === 0);
  const [error, setError] = useState('');
  const [coldStart, setColdStart] = useState(false);
  const [query, setQuery] = useState('');
  const [showSelectedModal, setShowSelectedModal] = useState(false);
  const [showSelectionRequiredModal, setShowSelectionRequiredModal] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => {
    const raw = Number(localStorage.getItem(CLASSES_FETCHED_AT_KEY) || '0');
    return Number.isFinite(raw) ? raw : 0;
  });

  const selectedMap = useMemo(
    () => new Map(selectedCourses.map((item) => [item.key, true])),
    [selectedCourses],
  );

  const courseOptions = useMemo(() => {
    const grouped = new Map();
    allClasses.forEach((item) => {
      if (isReservedOrPlaceholderClass(item)) return;
      const key = getCourseKey(item);
      if (!key) return;
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          code: getCourseCode(item),
          title: item.title,
          section: item.section,
          teacher: item.teacher,
          slots: 1,
        });
      } else {
        grouped.get(key).slots += 1;
      }
    });
    let all = [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
    const sectionQ = sectionFilter.trim().toLowerCase();
    if (sectionQ) {
      all = all.filter((item) => String(item.section || '').toLowerCase().includes(sectionQ));
    }
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        (item.section || '').toLowerCase().includes(q) ||
        (item.teacher || '').toLowerCase().includes(q),
    );
  }, [allClasses, query, sectionFilter]);

  const fetchClasses = async ({ silent = false, _retryCount = 0 } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
      setColdStart(false);
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      const knownEtag = localStorage.getItem(CLASSES_ETAG_KEY);
      const headers = knownEtag ? { 'If-None-Match': knownEtag } : {};
      const response = await fetch(`${API_BASE}/classes`, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      const responseEtag = response.headers.get('etag');

      if (response.status === 304) {
        const now = Date.now();
        setLastSyncedAt(now);
        localStorage.setItem(CLASSES_FETCHED_AT_KEY, String(now));
        if (responseEtag) localStorage.setItem(CLASSES_ETAG_KEY, responseEtag);
        if (silent) setError('');
        setColdStart(false);
        return;
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch classes');
      const cleaned = (data.classes || []).filter((item) => !isReservedOrPlaceholderClass(item));
      setAllClasses(cleaned);
      const now = Date.now();
      setLastSyncedAt(now);
      localStorage.setItem(CLASSES_FETCHED_AT_KEY, String(now));
      if (responseEtag) localStorage.setItem(CLASSES_ETAG_KEY, responseEtag);
      if (silent) setError('');
      setColdStart(false);
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      if (isTimeout && _retryCount < 4) {
        setColdStart(true);
        setError('');
        setTimeout(() => fetchClasses({ silent, _retryCount: _retryCount + 1 }), 8_000);
        return;
      }
      setColdStart(false);
      const message = isTimeout ? 'Server took too long to respond. Please try again.' : err.message;
      if (allClasses.length === 0) {
        setAllClasses([]);
        setError(message);
      } else if (!silent) {
        setError(message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const hasCache = allClasses.length > 0;
    if (!hasCache) {
      fetchClasses();
      return;
    }
    const cacheAge = Date.now() - lastSyncedAt;
    if (cacheAge > CLASSES_CACHE_TTL_MS) {
      fetchClasses({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!location.state?.selectionRequired) return;
    setShowSelectionRequiredModal(true);
    navigate('/', { replace: true, state: null });
  }, [location.state, navigate]);

  const toggleCourse = (course) => {
    if (selectedMap.has(course.key)) {
      setSelectedCourses((prev) => prev.filter((item) => item.key !== course.key));
      return;
    }
    setSelectedCourses((prev) => [...prev, { ...course }]);
  };

  const navigateWithSelectionCheck = (path) => {
    if (selectedCourses.length < 1) {
      setShowSelectionRequiredModal(true);
      return;
    }
    navigate(path);
  };

  return (
    <Shell>
      <main className="mx-auto grid w-full max-w-7xl gap-4 pt-3 sm:gap-5 sm:pt-4 md:pt-5 lg:h-[calc(100vh-120px)] xl:grid-cols-[0.95fr_1.05fr]">
        <section className="animate-rise flex min-h-0 flex-col rounded-2xl border border-signal/35 bg-white/65 p-5 backdrop-blur-sm [animation-delay:80ms]">
          <h1 className="font-display text-signal text-[clamp(2.8rem,6vw,5.8rem)] leading-[0.88] tracking-wide">
            [01]_SELECT
            <br />
            MY COURSES
          </h1>
          <p className="mt-3 max-w-xl text-xs uppercase leading-relaxed tracking-wide text-ink/80 md:text-sm">
            Select your courses from the campus timetable and build your personal schedule.
          </p>

          <div className="mt-auto space-y-3 pt-6">
            <div className="rounded-xl border border-signal/30 bg-white/70 p-3">
              <label className="block text-xs uppercase tracking-[0.2em] text-ink/60">Section Filter</label>
              <div className="mt-2">
                <input
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-signal/35 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-signal"
                  placeholder="BCY-6A / BCS-4K"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                <button
                  onClick={() => fetchClasses()}
                  disabled={loading}
                  className={`${BTN_BASE} px-3 py-1.5 text-[10px] disabled:opacity-50`}
                >
                  {loading ? 'Refreshing...' : 'Refresh Courses'}
                </button>
                {lastSyncedAt > 0 && (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-ink/55">
                    Last Sync: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              {coldStart && !error && (
                <p className="mt-2 text-sm text-amber-700">
                  Server is warming up â€” this takes ~30s on first load. Retrying automatically...
                </p>
              )}
              {error && !coldStart && <p className="mt-2 text-sm text-red-700">{error}</p>}
            </div>

            <div className="rounded-xl border border-signal/30 bg-white/70 p-4 sm:pt-5">
              <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
                <button
                  onClick={() => setShowSelectedModal(true)}
                  disabled={selectedCourses.length === 0}
                  className={`${BTN_BASE} flex h-12 w-full items-center justify-center whitespace-normal px-3 text-center text-[11px] leading-tight sm:h-14`}
                >
                  Show My Selected Courses
                </button>
                <button
                  onClick={() => navigateWithSelectionCheck('/timetable')}
                  className={`${BTN_BASE} flex h-12 w-full items-center justify-center whitespace-normal px-3 text-center text-[11px] leading-tight sm:h-14`}
                >
                  View My Timetable
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="animate-rise flex min-h-0 flex-col rounded-2xl border border-signal/35 bg-white/65 p-5 backdrop-blur-sm [animation-delay:200ms]">
          <div className="grid gap-2 border-b border-signal/20 pb-3 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-3">
            <p className="text-sm uppercase tracking-[0.2em] text-signal">Available Courses</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code / title / teacher"
              className="w-full rounded-lg border border-signal/30 bg-white px-3 py-2 text-xs uppercase outline-none focus:border-signal sm:justify-self-end"
            />
          </div>
          <div className="themed-scroll mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {loading && courseOptions.length === 0 && (
              <div className="rounded-xl border border-signal/25 bg-signal/5 px-4 py-5 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-signal">Courses Are Loading</p>
                <p className="mt-2 text-sm text-ink/70">
                  Fetching the latest timetable data. Please wait a moment.
                </p>
              </div>
            )}
            {courseOptions.map((item) => (
              <article key={item.key} className="rounded-xl border border-ink/12 bg-white p-3">
                <p className="text-base font-semibold leading-snug text-ink">{item.title}</p>
                <p className="mt-1 text-sm font-medium text-ink/85">{item.teacher || 'Instructor not listed'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] uppercase text-ink/60">
                  <span className="rounded-full border border-ink/20 bg-ash px-2 py-0.5">{item.code}</span>
                  <span className="rounded-full border border-ink/20 bg-ash px-2 py-0.5">{item.section || 'N/A'}</span>
                  <span className="rounded-full border border-ink/20 bg-ash px-2 py-0.5">Credit Hours: {item.slots}</span>
                </div>
                <button
                  onClick={() => toggleCourse(item)}
                  className={`mt-3 rounded-md border px-3 py-1 text-xs uppercase ${
                    selectedMap.has(item.key)
                      ? 'border-signal bg-signal text-white'
                      : 'border-signal/40 text-signal hover:bg-signal hover:text-white'
                  }`}
                >
                  {selectedMap.has(item.key) ? 'Selected' : 'Add'}
                </button>
              </article>
            ))}
            {!loading && courseOptions.length === 0 && (
              <p className="text-sm text-ink/60">
                {sectionFilter ? 'No courses found for this section filter.' : 'No courses found.'}
              </p>
            )}
          </div>
        </section>
      </main>

      {showSelectedModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-2 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-signal/35 bg-white/95 p-4 shadow-[0_18px_40px_rgba(20,20,20,0.25)] md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-3xl tracking-wide text-signal sm:text-4xl">MY SELECTED COURSES</h3>
              <button
                onClick={() => setShowSelectedModal(false)}
                className={BTN_BASE}
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
              {selectedCourses.map((item) => (
                <div key={item.key} className="rounded-lg border border-signal/30 bg-white/90 p-3">
                  <p className="text-sm font-semibold uppercase text-signal">{item.title}</p>
                  <p className="text-xs uppercase text-ink/70">{item.code}</p>
                  <button
                    onClick={() => toggleCourse(item)}
                    className="mt-2 rounded-md border border-signal/40 px-3 py-1 text-xs uppercase text-signal hover:bg-signal hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSelectionRequiredModal && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/35 p-2 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-signal/35 bg-white/95 p-4 shadow-[0_18px_40px_rgba(20,20,20,0.25)] md:p-5">
            <h3 className="font-display text-3xl tracking-wide text-signal sm:text-4xl">SELECT COURSES FIRST</h3>
            <p className="mt-2 text-sm uppercase tracking-[0.08em] text-ink/75">
              Please add at least one course before opening timetable, clashes, alternatives, friends, or grades.
            </p>
            <div className="mt-4">
              <button onClick={() => setShowSelectionRequiredModal(false)} className={`${BTN_BASE} w-full`}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
};

const ClashReportPage = ({ allClasses, selectedCourses }) => {
  const navigate = useNavigate();
  const selectedEntries = useMemo(
    () =>
      selectedEntriesFromCourses(selectedCourses, allClasses).sort(
        (a, b) => daySortValue(a.day) - daySortValue(b.day) || a.startMinutes - b.startMinutes,
      ),
    [allClasses, selectedCourses],
  );
  const clashes = useMemo(() => buildClashes(selectedEntries), [selectedEntries]);

  if (selectedCourses.length < 1) return <Navigate to="/" replace state={{ selectionRequired: true }} />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.9] tracking-wide">
              [03]_CLASH REPORT
            </h1>
            <div className="hidden w-full gap-2 sm:grid sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/timetable')} className={BTN_BASE}>
                Timetable
              </button>
              <button onClick={() => navigate('/clashes')} className={`${BTN_BASE} bg-signal text-white`}>
                Clash Report
              </button>
              <button onClick={() => navigate('/alternatives')} className={BTN_BASE}>
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
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-ink/70">
            Selected time slots: {selectedEntries.length} | clashes found: {clashes.length}
          </p>

          {clashes.length === 0 ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-emerald-800">
              No clashes found in selected courses.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {clashes.map((clash, idx) => (
                <article key={`${clash.a.id}-${clash.b.id}-${idx}`} className="rounded-xl border border-signal/25 bg-white p-4">
                  <div className="inline-flex rounded-md border border-signal/30 bg-signal/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-signal">
                    Clash {idx + 1}: {clash.a.title} vs {clash.b.title}
                  </div>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-signal/20 bg-signal/5 p-3">
                      <p className="text-sm font-semibold text-ink">{clash.a.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-signal">
                        {clash.a.day} | {clash.a.start}-{clash.a.end}
                      </p>
                      <p className="mt-1 text-xs text-ink/70">{clash.a.room}</p>
                      <p className="mt-1 text-xs text-ink/70">
                        Instructor: <span className="font-bold text-ink">{clash.a.teacher || 'Unknown Teacher'}</span>
                      </p>
                    </div>
                    <div className="rounded-lg border border-signal/20 bg-signal/5 p-3">
                      <p className="text-sm font-semibold text-ink">{clash.b.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-signal">
                        {clash.b.day} | {clash.b.start}-{clash.b.end}
                      </p>
                      <p className="mt-1 text-xs text-ink/70">{clash.b.room}</p>
                      <p className="mt-1 text-xs text-ink/70">
                        Instructor: <span className="font-bold text-ink">{clash.b.teacher || 'Unknown Teacher'}</span>
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
};

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


function App() {
  const [sectionFilter, setSectionFilter] = useState(() => localStorage.getItem('clashguard_section_filter') || '');
  const [allClasses, setAllClasses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clashguard_all_classes') || '[]');
    } catch {
      return [];
    }
  });
  const [selectedCourses, setSelectedCourses] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('clashguard_selected_courses') || '[]');
      return raw
        .map((item) => {
          const fallback = item.entries?.[0] || item;
          const key = getStableSelectedKey({
            ...fallback,
            key: item.key,
            code: item.code || fallback?.course,
            section: item.section || fallback?.section,
            title: item.title || fallback?.title,
          });
          return {
            key,
            code: item.code || getCourseCode(fallback),
            title: item.title || fallback?.title || key,
            section: item.section || fallback?.section || '',
            teacher: item.teacher || fallback?.teacher || '',
            slots: Number(item.slots) || 0,
          };
        })
        .filter((item) => {
          return !isReservedOrPlaceholderClass(item);
        });
    } catch {
      return [];
    }
  });
  const [gradesData, setGradesData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clashguard_grades_data') || '{}');
    } catch {
      return {};
    }
  });
  const [gradeRanges, setGradeRanges] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('clashguard_grade_ranges') || 'null');
      if (Array.isArray(raw) && raw.length > 0) return raw;
      return DEFAULT_GRADE_RANGES;
    } catch {
      return DEFAULT_GRADE_RANGES;
    }
  });
  const [courseCredits, setCourseCredits] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('clashguard_course_credits') || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  });
  const [friends, setFriends] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('clashguard_friends') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let cancelled = false;
    const fetchClassesIfNeeded = async () => {
      const hasCache = allClasses.length > 0;
      const lastFetchedAt = Number(localStorage.getItem(CLASSES_FETCHED_AT_KEY) || '0');
      const cacheAge = Date.now() - (Number.isFinite(lastFetchedAt) ? lastFetchedAt : 0);
      const shouldFetch = !hasCache || cacheAge > CLASSES_CACHE_TTL_MS;
      if (!shouldFetch) return;

      try {
        const knownEtag = localStorage.getItem(CLASSES_ETAG_KEY);
        const headers = knownEtag ? { 'If-None-Match': knownEtag } : {};
        const response = await fetch(`${API_BASE}/classes`, { headers });
        const responseEtag = response.headers.get('etag');

        if (response.status === 304) {
          localStorage.setItem(CLASSES_FETCHED_AT_KEY, String(Date.now()));
          if (responseEtag) localStorage.setItem(CLASSES_ETAG_KEY, responseEtag);
          return;
        }

        const data = await response.json();
        if (!response.ok) return;
        const cleaned = (data.classes || []).filter((item) => !isReservedOrPlaceholderClass(item));
        if (!cancelled) setAllClasses(cleaned);
        localStorage.setItem(CLASSES_FETCHED_AT_KEY, String(Date.now()));
        if (responseEtag) localStorage.setItem(CLASSES_ETAG_KEY, responseEtag);
      } catch {
        // keep cached classes on network failures
      }
    };

    fetchClassesIfNeeded();
    return () => {
      cancelled = true;
    };
  }, [allClasses.length]);

  useEffect(() => {
    localStorage.setItem('clashguard_section_filter', sectionFilter);
  }, [sectionFilter]);

  useEffect(() => {
    localStorage.setItem('clashguard_all_classes', JSON.stringify(allClasses));
  }, [allClasses]);

  useEffect(() => {
    localStorage.setItem('clashguard_selected_courses', JSON.stringify(selectedCourses));
  }, [selectedCourses]);

  useEffect(() => {
    setSelectedCourses((prev) => {
      const normalized = prev
        .map((item) => {
          const key = getStableSelectedKey(item);
          const entries = getEntriesForCourseKey(allClasses, key);
          const first = entries[0];
          return {
            key,
            code: first ? getCourseCode(first) : item.code || '',
            title: first?.title || item.title || key,
            section: first?.section || item.section || '',
            teacher: first?.teacher || item.teacher || '',
            slots: entries.length || Number(item.slots) || 0,
          };
        })
        .filter((item) => !isReservedOrPlaceholderClass(item));
      return JSON.stringify(normalized) === JSON.stringify(prev) ? prev : normalized;
    });
  }, [allClasses]);

  useEffect(() => {
    setGradesData((prev) => {
      const allowed = new Set(selectedCourses.map((c) => c.key));
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (allowed.has(key)) next[key] = value;
      });
      selectedCourses.forEach((course) => {
        const creditHours = getEffectiveCreditHours(course, courseCredits);
        if (!next[course.key]) {
          next[course.key] = {
            targetWeightage: '',
            selectedGrade: '',
            components: buildDefaultGradeComponents(creditHours),
          };
          return;
        }

        if (hasOnlyBlankComponents(next[course.key]?.components)) {
          next[course.key] = {
            ...next[course.key],
            components: buildDefaultGradeComponents(creditHours),
          };
        }
      });
      return next;
    });
  }, [courseCredits, selectedCourses]);

  useEffect(() => {
    setCourseCredits((prev) => {
      const allowed = new Set(selectedCourses.map((c) => c.key));
      const next = {};
      selectedCourses.forEach((course) => {
        const existing = Number(prev?.[course.key]);
        next[course.key] = Number.isFinite(existing) && existing > 0 ? existing : Math.max(1, Number(course.slots) || 1);
      });
      Object.keys(prev || {}).forEach((key) => {
        if (!allowed.has(key)) return;
        if (next[key] === undefined) {
          const existing = Number(prev[key]);
          if (Number.isFinite(existing) && existing > 0) next[key] = existing;
        }
      });
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
    });
  }, [selectedCourses]);

  useEffect(() => {
    localStorage.setItem('clashguard_grades_data', JSON.stringify(gradesData));
  }, [gradesData]);

  useEffect(() => {
    localStorage.setItem('clashguard_grade_ranges', JSON.stringify(gradeRanges));
  }, [gradeRanges]);
  useEffect(() => {
    localStorage.setItem('clashguard_course_credits', JSON.stringify(courseCredits));
  }, [courseCredits]);
  useEffect(() => {
    localStorage.setItem('clashguard_friends', JSON.stringify(friends));
  }, [friends]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <SelectPage
              sectionFilter={sectionFilter}
              setSectionFilter={setSectionFilter}
              allClasses={allClasses}
              setAllClasses={setAllClasses}
              selectedCourses={selectedCourses}
              setSelectedCourses={setSelectedCourses}
            />
          }
        />
        <Route path="/timetable" element={<TimetablePage allClasses={allClasses} selectedCourses={selectedCourses} />} />
        <Route path="/clashes" element={<ClashReportPage allClasses={allClasses} selectedCourses={selectedCourses} />} />
        <Route
          path="/alternatives"
          element={
            <AlternativesPage
              allClasses={allClasses}
              selectedCourses={selectedCourses}
              setSelectedCourses={setSelectedCourses}
            />
          }
        />
        <Route
          path="/friends"
          element={
            <FriendsPage
              allClasses={allClasses}
              selectedCourses={selectedCourses}
              friends={friends}
              setFriends={setFriends}
            />
          }
        />
        <Route
          path="/grades"
          element={
            <GradesPage
              selectedCourses={selectedCourses}
              gradesData={gradesData}
              gradeRanges={gradeRanges}
              courseCredits={courseCredits}
              setCourseCredits={setCourseCredits}
            />
          }
        />
        <Route
          path="/grades/:courseKey"
          element={
            <GradeCoursePage
              selectedCourses={selectedCourses}
              gradesData={gradesData}
              setGradesData={setGradesData}
              gradeRanges={gradeRanges}
              courseCredits={courseCredits}
            />
          }
        />
        <Route path="/settings" element={<SettingsPage gradeRanges={gradeRanges} setGradeRanges={setGradeRanges} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

