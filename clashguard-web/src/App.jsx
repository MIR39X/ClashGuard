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

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  'https://clashguard.onrender.com'
).replace(/\/$/, '');
const DAY_SHORT = {
  All: 'All',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};
const BTN_BASE =
  'rounded-lg border border-signal px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-signal transition hover:bg-signal hover:text-white disabled:cursor-not-allowed disabled:border-signal/30 disabled:text-signal/35';
const ALT_LIMITS = ['5', '10', '20', 'all'];
const APK_DOWNLOAD_URL = '/clashguard.apk';
const ABOUT_ME = {
  name: 'Arsalan Mir',
  bio: 'I am just a chill guy.',
  linkedin: 'https://www.linkedin.com/in/arsalan-mir-24a62328a?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
  github: 'https://github.com/MIR39X',
  email: 'arsalanmir735@gmail.com',
};

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const items = [
    { label: 'Select', path: '/' },
    { label: 'Timetable', path: '/timetable' },
    { label: 'Clashes', path: '/clashes' },
    { label: 'Alt', path: '/alternatives' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-signal/25 bg-white/95 p-2 backdrop-blur-sm sm:hidden">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`rounded-md px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                active ? 'bg-signal text-white' : 'text-signal'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

const Shell = ({ children }) => {
  const [showAbout, setShowAbout] = useState(false);
  const isNativeApp =
    typeof window !== 'undefined' &&
    !!window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform();

  return (
    <div className="relative min-h-screen overflow-hidden px-3 pb-20 pt-4 sm:px-5 sm:pb-6 sm:pt-6 md:px-8 lg:px-10">
        <div className="pointer-events-none absolute -right-16 top-24 h-36 w-36 rounded-full bg-signal/20 blur-2xl animate-pulse-slow"></div>
        <div className="pointer-events-none absolute -left-20 bottom-12 h-44 w-44 rounded-full bg-blue-400/25 blur-2xl animate-pulse-slow"></div>
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between border-t-4 border-signal pt-4 sm:pt-5">
          <div className="flex items-center gap-2">
            <button
              aria-label="About Arsalan Mir"
              onClick={() => setShowAbout(true)}
              className="grid h-11 w-11 place-content-center rounded-md border border-signal/40 bg-white/40 hover:bg-signal/10"
            >
              <span className="mb-1 block h-0.5 w-5 bg-signal"></span>
              <span className="mb-1 block h-0.5 w-5 bg-signal"></span>
              <span className="block h-0.5 w-5 bg-signal"></span>
            </button>
            <button onClick={() => setShowAbout(true)} className={BTN_BASE}>
              About Me
            </button>
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden text-[10px] tracking-[0.22em] text-signal sm:block sm:text-xs sm:tracking-[0.3em] md:text-sm">
              CLASHGUARD / SPRING 2026
            </p>
            {!isNativeApp && (
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className={BTN_BASE}
              >
                Download APK
              </a>
            )}
          </div>
        </header>
        {children}
        <MobileBottomNav />

        {showAbout && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-3 backdrop-blur-sm sm:p-4"
            onClick={() => setShowAbout(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl border border-signal/35 bg-white/95 p-5 shadow-[0_18px_40px_rgba(20,20,20,0.25)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-signal/80">About</p>
                  <h3 className="font-display text-4xl leading-[0.9] tracking-wide text-signal sm:text-5xl">
                    {ABOUT_ME.name}
                  </h3>
                </div>
                <button onClick={() => setShowAbout(false)} className={BTN_BASE}>
                  Close
                </button>
              </div>
              <p className="mt-4 text-sm uppercase tracking-[0.08em] text-ink/80">{ABOUT_ME.bio}</p>
              <div className="mt-4 grid gap-2">
                <a
                  href={ABOUT_ME.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-signal/30 bg-white px-3 py-2 text-sm font-semibold text-signal hover:bg-signal/10"
                >
                  LinkedIn
                </a>
                <a
                  href={ABOUT_ME.github}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-signal/30 bg-white px-3 py-2 text-sm font-semibold text-signal hover:bg-signal/10"
                >
                  GitHub
                </a>
                <a
                  href={`mailto:${ABOUT_ME.email}`}
                  className="rounded-lg border border-signal/30 bg-white px-3 py-2 text-sm font-semibold text-signal hover:bg-signal/10"
                >
                  Email Me
                </a>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

const SelectPage = ({ sectionFilter, setSectionFilter, allClasses, setAllClasses, selectedCourses, setSelectedCourses }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showSelectedModal, setShowSelectedModal] = useState(false);

  const selectedMap = useMemo(
    () => new Map(selectedCourses.map((item) => [item.key, true])),
    [selectedCourses],
  );

  const courseOptions = useMemo(() => {
    const grouped = new Map();
    allClasses.forEach((item) => {
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

  const selectedClassEntries = useMemo(() => {
    return selectedCourses.flatMap((item) => item.entries || []);
  }, [selectedCourses]);

  const fetchClasses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/classes`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch classes');
      setAllClasses(data.classes || []);
    } catch (err) {
      setError(err.message);
      setAllClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCourse = (course) => {
    if (selectedMap.has(course.key)) {
      setSelectedCourses((prev) => prev.filter((item) => item.key !== course.key));
      return;
    }
    const entries = getEntriesForCourseKey(allClasses, course.key);
    setSelectedCourses((prev) => [...prev, { ...course, entries }]);
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

          <div className="mt-3 rounded-xl border border-signal/30 bg-white/70 p-3">
            <label className="block text-xs uppercase tracking-[0.2em] text-ink/60">Section Filter</label>
            <div className="mt-2">
              <input
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-signal/35 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-signal"
                placeholder="BCY-6A / BCS-4K"
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          </div>

          <div className="mt-3 rounded-xl border border-signal/30 bg-white/70 p-4">
            <div className="grid gap-2 sm:grid-cols-2 sm:items-center">
              <button
                onClick={() => setShowSelectedModal(true)}
                disabled={selectedCourses.length === 0}
                className={`${BTN_BASE} py-3 text-sm`}
              >
                Show My Selected Courses
              </button>
              <button
                onClick={() => navigate('/timetable')}
                disabled={selectedCourses.length < 1}
                className={`${BTN_BASE} py-3 text-sm sm:justify-self-end`}
              >
                View My Timetable
              </button>
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
    </Shell>
  );
};

const TimetablePage = ({ allClasses, selectedCourses }) => {
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState('All');

  const selectedEntries = useMemo(() => {
    return selectedEntriesFromCourses(selectedCourses, allClasses)
      .sort((a, b) => daySortValue(a.day) - daySortValue(b.day) || a.startMinutes - b.startMinutes);
  }, [allClasses, selectedCourses]);

  const byDay = useMemo(() => {
    const groups = new Map();
    selectedEntries.forEach((item) => {
      if (!groups.has(item.day)) groups.set(item.day, []);
      groups.get(item.day).push(item);
    });
    return [...groups.entries()];
  }, [selectedEntries]);

  const dayTabs = useMemo(
    () =>
      ['All', ...byDay.map(([day]) => day)].map((day) => ({
        value: day,
        short: DAY_SHORT[day] || day.slice(0, 3),
        full: day,
      })),
    [byDay],
  );
  const visibleDays = useMemo(
    () => (activeDay === 'All' ? byDay : byDay.filter(([day]) => day === activeDay)),
    [activeDay, byDay],
  );
  const activeDayIndex = Math.max(0, dayTabs.findIndex((d) => d.value === activeDay));

  if (selectedCourses.length < 1) return <Navigate to="/" replace />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.8rem,8vw,6rem)] leading-[0.9] tracking-wide">
              [02]_MY TIMETABLE
            </h1>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/clashes')} className={BTN_BASE}>
                Clash Report
              </button>
              <button onClick={() => navigate('/alternatives')} className={BTN_BASE}>
                Alternatives
              </button>
              <button onClick={() => navigate('/')} className={BTN_BASE}>
                Back To Selection
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-ink/70">
            Selected courses: {selectedCourses.length} | included time slots: {selectedEntries.length}
          </p>

          {byDay.length > 0 && (
            <div className="mt-4 rounded-2xl border border-signal/20 bg-white/70 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.22em] text-ink/60">Quick Day Filter</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-signal">
                  Viewing: {activeDay}
                </p>
              </div>
              <div className="overflow-x-auto">
                <div
                  className="relative grid min-w-full rounded-2xl border border-signal/35 bg-white/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:min-w-[560px]"
                  style={{ gridTemplateColumns: `repeat(${dayTabs.length}, minmax(0, 1fr))` }}
                >
                  <span
                    className="absolute top-1 h-[calc(100%-8px)] rounded-xl bg-signal shadow-[0_10px_22px_rgba(255,58,32,0.32)] transition-transform duration-300 ease-out"
                    style={{
                      left: '4px',
                      width: `calc((100% - 8px) / ${dayTabs.length})`,
                      transform: `translateX(${activeDayIndex * 100}%)`,
                    }}
                  />
                  {dayTabs.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => setActiveDay(day.value)}
                      className={`z-10 px-1.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors sm:px-3 sm:text-xs sm:tracking-[0.14em] ${
                        activeDay === day.value ? 'text-white' : 'text-signal/85 hover:text-signal'
                      }`}
                    >
                      <span className="sm:hidden">{day.short}</span>
                      <span className="hidden sm:inline">{day.full}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedEntries.length === 0 ? (
            <div className="mt-6 rounded-xl border border-amber-600/30 bg-amber-50 p-4 text-amber-800">
              No time slots found for selected courses in this section.
            </div>
          ) : (
            <div key={`day-view-${activeDay}`} className="mt-4 grid gap-4 animate-rise">
              {visibleDays.map(([day, entries]) => (
                <div key={day}>
                  <h2 className="mb-2 text-center text-3xl font-display tracking-wide text-signal">{day}</h2>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {entries.map((item) => (
                      <article key={item.id} className="rounded-xl border border-signal/20 bg-white p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="rounded-full border border-signal/25 bg-signal/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-signal">
                            {day}
                          </span>
                          <span className="rounded-full border border-ink/20 bg-ash px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">
                            {item.start}-{item.end}
                          </span>
                        </div>
                        <p className="text-xl font-semibold tracking-tight text-ink">{item.title}</p>
                        <div className="mt-2 rounded-lg border border-signal/25 bg-signal/5 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal/80">Location</p>
                          <p className="mt-1 text-sm font-semibold text-ink">{item.room}</p>
                        </div>
                        <p className="mt-2 text-sm text-ink/80">
                          Instructor: {item.teacher || 'Unknown Teacher'}
                        </p>
                        <p className="mt-0.5 text-sm text-ink/80">Time Slot: {item.start}-{item.end}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
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

  if (selectedCourses.length < 1) return <Navigate to="/" replace />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.9] tracking-wide">
              [03]_CLASH REPORT
            </h1>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/alternatives')} className={BTN_BASE}>
                Alternatives
              </button>
              <button onClick={() => navigate('/timetable')} className={BTN_BASE}>
                Back To Timetable
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
                  <p className="text-xs uppercase tracking-[0.18em] text-signal">
                    {clash.a.day} | {clash.a.start}-{clash.a.end}
                  </p>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{clash.a.title}</p>
                      <p className="text-xs text-ink/70">{clash.a.room}</p>
                      <p className="text-xs text-ink/70">{clash.a.teacher || 'Unknown Teacher'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{clash.b.title}</p>
                      <p className="text-xs text-ink/70">{clash.b.room}</p>
                      <p className="text-xs text-ink/70">{clash.b.teacher || 'Unknown Teacher'}</p>
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
              entries: option.entries,
            }
          : item,
      ),
    );
    setAppliedMsg(`Applied alternative: ${option.title}`);
  };

  if (selectedCourses.length < 1) return <Navigate to="/" replace />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.9] tracking-wide">
              [04]_ALTERNATIVES
            </h1>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/clashes')} className={BTN_BASE}>
                Clash Report
              </button>
              <button onClick={() => navigate('/timetable')} className={BTN_BASE}>
                Back To Timetable
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
                className="absolute top-1 h-[calc(100%-8px)] rounded-lg bg-signal shadow-[0_8px_20px_rgba(255,58,32,0.28)] transition-transform duration-300 ease-out"
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
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/70">Time Slots</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {option.entries.map((slot) => (
                                <span
                                  key={slot.id}
                                  className="rounded-full border border-ink/20 bg-ash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/75"
                                >
                                  {slot.day} {slot.start}-{slot.end}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-2 rounded-md border border-ink/15 bg-white px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/70">Venues</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {[...new Set(option.entries.map((slot) => slot.room).filter(Boolean))].map((room) => (
                                <span
                                  key={room}
                                  className="rounded-full border border-ink/20 bg-ash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/75"
                                >
                                  {room}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="mt-2 text-xs uppercase text-ink/65">
                            Section: {option.section || 'N/A'} | Time Slots: {option.entries.length}
                          </p>
                          <p
                            className={`mt-1 text-xs font-semibold uppercase ${
                              option.conflictCount === 0 ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            Conflicts if switched: {option.conflictCount}
                          </p>
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
      return raw.map((item) => {
        const fallback = item.entries?.[0] || item;
        return { ...item, key: getCourseKey(fallback) };
      });
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('clashguard_section_filter', sectionFilter);
  }, [sectionFilter]);

  useEffect(() => {
    localStorage.setItem('clashguard_all_classes', JSON.stringify(allClasses));
  }, [allClasses]);

  useEffect(() => {
    localStorage.setItem('clashguard_selected_courses', JSON.stringify(selectedCourses));
  }, [selectedCourses]);

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
