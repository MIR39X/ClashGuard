import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
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
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const normalizeOnlineLink = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(raw)) return `https://${raw}`;
  return '';
};
const FREE_WINDOW_START = 8 * 60;
const FREE_WINDOW_END = 16 * 60;
const MIN_FREE_SLOT_MINUTES = 10;
const CLASSES_FETCHED_AT_KEY = 'clashguard_all_classes_fetched_at';
const CLASSES_ETAG_KEY = 'clashguard_all_classes_etag';
const CLASSES_CACHE_TTL_MS = 15 * 60 * 1000;
const APK_PROMPT_DISMISSED_KEY = 'clashguard_apk_prompt_dismissed';
const BTN_BASE =
  'rounded-lg border border-signal px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-signal transition hover:bg-signal hover:text-white disabled:cursor-not-allowed disabled:border-signal/30 disabled:text-signal/35';
const ALT_LIMITS = ['5', '10', '20', 'all'];
const APK_DOWNLOAD_URL = '/clashguard.apk';
const HEADER_WEBSITE_LOGO = '/logos/clashguard-logo-wordmark.png';
const HEADER_MOBILE_LOGO = '/logos/clashguard-logo-mark.png';
const ABOUT_ME = {
  name: 'Arsalan Mir',
  bio: 'I am just a chill guy.',
  linkedin: 'https://www.linkedin.com/in/arsalan-mir-24a62328a?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
  github: 'https://github.com/MIR39X',
  email: 'arsalanmir735@gmail.com',
};

const DEFAULT_GRADE_RANGES = [
  { id: 'A', label: 'A', min: 85, max: 100, gpa: 4.0 },
  { id: 'A-', label: 'A-', min: 80, max: 84.99, gpa: 3.67 },
  { id: 'B+', label: 'B+', min: 75, max: 79.99, gpa: 3.33 },
  { id: 'B', label: 'B', min: 71, max: 74.99, gpa: 3.0 },
  { id: 'B-', label: 'B-', min: 68, max: 70.99, gpa: 2.67 },
  { id: 'C+', label: 'C+', min: 64, max: 67.99, gpa: 2.33 },
  { id: 'C', label: 'C', min: 61, max: 63.99, gpa: 2.0 },
  { id: 'C-', label: 'C-', min: 58, max: 60.99, gpa: 1.67 },
  { id: 'D+', label: 'D+', min: 55, max: 57.99, gpa: 1.33 },
  { id: 'D', label: 'D', min: 50, max: 54.99, gpa: 1.0 },
  { id: 'F', label: 'F', min: 0, max: 49.99, gpa: 0.0 },
];

const createGradeComponent = (initial = {}) => ({
  id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: initial.name || '',
  weight: initial.weight ?? '',
  score: '',
  total: '',
});

const toNumber = (value) => {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'string' && value.trim() === '') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

const targetGradeToPercent = (targetGrade, gradeRanges) => {
  const matched = (gradeRanges || []).find(
    (r) => String(r.label || '').trim() === String(targetGrade || '').trim(),
  );
  if (!matched) return NaN;
  const min = Number(matched.min);
  return Number.isFinite(min) ? min : NaN;
};

const calculateCourseStats = (courseGrade, gradeRanges) => {
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

const percentToGpa = (percent, gradeRanges) => {
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

const letterGradeToGpa = (letter, gradeRanges) => {
  const found = (gradeRanges || []).find((r) => String(r.label || '').trim() === String(letter || '').trim());
  return found ? Number(found.gpa) || 0 : 0;
};

const percentToLetter = (percent, gradeRanges) => {
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

const isFullyCompletedCourse = (stats) =>
  Number.isFinite(stats?.totalWeight) &&
  Number.isFinite(stats?.completedWeight) &&
  stats.totalWeight > 0 &&
  Math.abs(stats.totalWeight - 100) <= 0.01 &&
  Math.abs(stats.completedWeight - stats.totalWeight) <= 0.01;

const achievedPercentFromStats = (stats) => {
  if (!Number.isFinite(stats?.achievedPoints) || !Number.isFinite(stats?.totalWeight) || stats.totalWeight <= 0) return NaN;
  return (stats.achievedPoints / stats.totalWeight) * 100;
};

const getEffectiveCreditHours = (course, courseCredits) => {
  const manual = Number(courseCredits?.[course?.key]);
  if (Number.isFinite(manual) && manual > 0) return manual;
  return Math.max(1, Number(course?.slots) || 1);
};

const buildDefaultGradeComponents = (creditHours) => {
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

const hasOnlyBlankComponents = (components) => {
  if (!Array.isArray(components) || components.length === 0) return true;
  return components.every((cmp) => {
    const name = String(cmp?.name || '').trim();
    const weight = String(cmp?.weight ?? '').trim();
    const score = String(cmp?.score ?? '').trim();
    const total = String(cmp?.total ?? '').trim();
    return !name && !weight && !score && !total;
  });
};

const minutesToLabel = (mins) => {
  const safe = Math.max(0, Number(mins) || 0);
  const h24 = Math.floor(safe / 60);
  const m = safe % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

const normalizeShareEntry = (item) => ({
  id: item.id || `${item.day}-${item.startMinutes}-${item.endMinutes}-${item.course || item.title}`,
  day: item.day,
  startMinutes: item.startMinutes,
  endMinutes: item.endMinutes,
  start: item.start,
  end: item.end,
  course: item.course,
  section: item.section,
  title: item.title,
  teacher: item.teacher,
  room: item.room,
});

const encodeSharePayload = (payload) => {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  } catch {
    return '';
  }
};

const decodeSharePayload = (encoded) => {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
};

const buildFreeByDay = (entries, windowStart = FREE_WINDOW_START, windowEnd = FREE_WINDOW_END) => {
  const busyByDay = Object.fromEntries(WEEK_DAYS.map((day) => [day, []]));
  (entries || []).forEach((entry) => {
    const day = entry?.day;
    const start = Number(entry?.startMinutes);
    const end = Number(entry?.endMinutes);
    if (!busyByDay[day]) return;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    busyByDay[day].push([Math.max(windowStart, start), Math.min(windowEnd, end)]);
  });

  const freeByDay = {};
  WEEK_DAYS.forEach((day) => {
    const busy = busyByDay[day]
      .filter(([s, e]) => e > s)
      .sort((a, b) => a[0] - b[0]);
    const merged = [];
    busy.forEach(([s, e]) => {
      const prev = merged[merged.length - 1];
      if (!prev || s > prev[1]) merged.push([s, e]);
      else prev[1] = Math.max(prev[1], e);
    });

    const free = [];
    let cursor = windowStart;
    merged.forEach(([s, e]) => {
      if (s - cursor >= MIN_FREE_SLOT_MINUTES) free.push([cursor, s]);
      cursor = Math.max(cursor, e);
    });
    if (windowEnd - cursor >= MIN_FREE_SLOT_MINUTES) free.push([cursor, windowEnd]);
    freeByDay[day] = free;
  });
  return freeByDay;
};

const intersectFreeByDay = (leftMap, rightMap) => {
  const out = {};
  WEEK_DAYS.forEach((day) => {
    const a = leftMap?.[day] || [];
    const b = rightMap?.[day] || [];
    const merged = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      const start = Math.max(a[i][0], b[j][0]);
      const end = Math.min(a[i][1], b[j][1]);
      if (end - start >= MIN_FREE_SLOT_MINUTES) merged.push([start, end]);
      if (a[i][1] < b[j][1]) i += 1;
      else j += 1;
    }
    out[day] = merged;
  });
  return out;
};

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

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const items = [
    { label: 'Timetable', path: '/timetable' },
    { label: 'Clashes', path: '/clashes' },
    { label: 'Alt', path: '/alternatives' },
    { label: 'Friends', path: '/friends' },
    { label: 'Grades', path: '/grades' },
    { label: 'Online', path: '/online-classes' },
  ];
  const currentIndex = items.findIndex(
    (item) =>
      location.pathname === item.path ||
      (item.path === '/grades' && location.pathname.startsWith('/grades/')),
  );
  const [indicatorIndex, setIndicatorIndex] = useState(() => {
    if (typeof window === 'undefined') return Math.max(0, currentIndex);
    const saved = Number(window.sessionStorage.getItem('clashguard_mobile_nav_index'));
    return Number.isFinite(saved) ? saved : Math.max(0, currentIndex);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (currentIndex >= 0) {
      window.sessionStorage.setItem('clashguard_mobile_nav_index', String(currentIndex));
    }
    const frame = window.requestAnimationFrame(() => setIndicatorIndex(Math.max(0, currentIndex)));
    return () => window.cancelAnimationFrame(frame);
  }, [currentIndex]);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-signal/25 bg-white shadow-[0_-10px_24px_rgba(20,20,20,0.12)] sm:hidden">
      <div className="mx-auto max-w-7xl px-2 pt-2 [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))]">
        <div
          className="relative grid rounded-xl border border-signal/25 bg-white/95 p-1"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          <span
            className="pointer-events-none absolute top-1 left-1 h-[calc(100%-8px)] transform-gpu rounded-lg bg-signal shadow-[0_6px_14px_rgba(66,86,184,0.28)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: currentIndex >= 0 ? 1 : 0,
              width: `calc((100% - 8px) / ${items.length})`,
              transform: `translateX(${indicatorIndex * 100}%)`,
            }}
          />
        {items.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path === '/grades' && location.pathname.startsWith('/grades/'));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`z-10 min-w-0 truncate rounded-md px-1 py-2 text-[9px] font-semibold uppercase leading-none tracking-[0.1em] transition-colors duration-200 ${
                active ? 'text-white' : 'text-signal/85'
              }`}
            >
              {item.label}
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
};

const Shell = ({ children }) => {
  const [showAbout, setShowAbout] = useState(false);
  const [showApkPrompt, setShowApkPrompt] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isNativeApp =
    typeof window !== 'undefined' &&
    !!window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform();
  const isAndroid =
    typeof navigator !== 'undefined' &&
    /android/i.test(navigator.userAgent || '');

  useEffect(() => {
    if (isNativeApp) return;
    try {
      const dismissed = localStorage.getItem(APK_PROMPT_DISMISSED_KEY);
      if (!dismissed) setShowApkPrompt(true);
    } catch {
      setShowApkPrompt(true);
    }
  }, [isNativeApp]);

  const dismissApkPrompt = () => {
    setShowApkPrompt(false);
    try {
      localStorage.setItem(APK_PROMPT_DISMISSED_KEY, '1');
    } catch {
      // ignore localStorage write issues
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-6 sm:pt-6 md:px-8 lg:px-10">
        <div className="pointer-events-none absolute -right-16 top-24 h-36 w-36 rounded-full bg-signal/20 blur-2xl animate-pulse-slow"></div>
        <div className="pointer-events-none absolute -left-20 bottom-12 h-44 w-44 rounded-full bg-blue-400/25 blur-2xl animate-pulse-slow"></div>
        <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-2 border-t-4 border-signal pt-4 sm:gap-3 sm:pt-5">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => navigate('/')} className={`${BTN_BASE} w-[84px] text-center sm:w-auto`}>
              Home
            </button>
            <button onClick={() => setShowAbout(true)} className={`${BTN_BASE} hidden sm:inline-flex`}>
              About Me
            </button>
          </div>
          <img
            src={HEADER_MOBILE_LOGO}
            alt="ClashGuard"
            className="theme-logo pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 object-contain sm:hidden"
          />
          <div className="pointer-events-none absolute left-1/2 top-[calc(50%+10px)] hidden -translate-x-1/2 -translate-y-1/2 sm:block">
            <img src={HEADER_WEBSITE_LOGO} alt="ClashGuard" className="theme-logo h-40 w-auto max-w-[1400px] object-contain" />
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <p className="hidden truncate text-[10px] tracking-[0.22em] text-signal lg:block lg:text-xs lg:tracking-[0.3em]">
              SPRING 2026
            </p>
            {!isNativeApp && (
              <a
                href={APK_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className={`${BTN_BASE} w-[84px] text-center sm:w-auto`}
              >
                <span className="sm:hidden">APK</span>
                <span className="hidden sm:inline">Download APK</span>
              </a>
            )}
          </div>
        </header>
        {children}
        {location.pathname === '/' && (
          <div className="mx-auto mt-2 w-full max-w-7xl text-center sm:hidden">
            <button
              onClick={() => setShowAbout(true)}
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal/80 underline underline-offset-4"
            >
              About Developer
            </button>
          </div>
        )}
        <footer className="mx-auto mt-3 w-full max-w-7xl pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/60 sm:mt-4 sm:text-xs">
          Clashguard 2026 All Rights Reserved
        </footer>
        <MobileBottomNav />

        {showApkPrompt && !isNativeApp && (
          <div
            className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-3 backdrop-blur-sm sm:place-items-center sm:p-4"
            onClick={dismissApkPrompt}
          >
            <div
              className="w-full max-w-lg overflow-hidden rounded-[28px] border border-signal/25 bg-white/95 shadow-[0_24px_60px_rgba(18,24,48,0.22)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[linear-gradient(135deg,rgba(66,86,184,0.14),rgba(86,170,255,0.08))] px-5 py-4 sm:px-6 sm:py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-signal/80">ClashGuard App</p>
                <h3 className="mt-2 font-display text-3xl leading-[0.92] tracking-wide text-signal sm:text-4xl">
                  Take ClashGuard with you
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-ink/75">
                  Download the Android app for faster access, a cleaner mobile experience, and your latest timetable tools on-device.
                </p>
              </div>
              <div className="px-5 py-4 sm:px-6 sm:py-5">
                <div className="rounded-2xl border border-signal/15 bg-signal/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal/80">
                    {isAndroid ? 'Recommended for this device' : 'Android app available'}
                  </p>
                  <p className="mt-1 text-sm text-ink/70">
                    {isAndroid
                      ? 'Install the APK directly on this Android device.'
                      : 'You can download the APK now and install it on an Android phone later.'}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={dismissApkPrompt}
                    className="inline-flex flex-1 items-center justify-center rounded-xl bg-signal px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-signal/90"
                  >
                    Download APK
                  </a>
                  <button
                    onClick={dismissApkPrompt}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-signal/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-signal transition hover:bg-signal/5"
                  >
                    Continue On Web
                  </button>
                </div>
                <button
                  onClick={dismissApkPrompt}
                  className="mt-3 w-full text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55 transition hover:text-ink/75"
                >
                  Don&apos;t show this again
                </button>
              </div>
            </div>
          </div>
        )}

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
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

const SelectPage = ({ sectionFilter, setSectionFilter, allClasses, setAllClasses, selectedCourses, setSelectedCourses }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(() => allClasses.length === 0);
  const [error, setError] = useState('');
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

  const fetchClasses = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const knownEtag = localStorage.getItem(CLASSES_ETAG_KEY);
      const headers = knownEtag ? { 'If-None-Match': knownEtag } : {};
      const response = await fetch(`${API_BASE}/classes`, { headers });
      const responseEtag = response.headers.get('etag');

      if (response.status === 304) {
        const now = Date.now();
        setLastSyncedAt(now);
        localStorage.setItem(CLASSES_FETCHED_AT_KEY, String(now));
        if (responseEtag) localStorage.setItem(CLASSES_ETAG_KEY, responseEtag);
        if (silent) setError('');
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
    } catch (err) {
      if (allClasses.length === 0) {
        setAllClasses([]);
        setError(err.message);
      } else if (!silent) {
        setError(err.message);
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
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          </div>

          <div className="mt-3 rounded-xl border border-signal/30 bg-white/70 p-4">
            <div className="grid gap-2 sm:grid-cols-2 sm:items-center">
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
            <button onClick={() => navigate('/online-classes')} className={`${BTN_BASE} mt-2 w-full py-2 text-[11px]`}>
              Temporary Online Classes
            </button>
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

const OnlineClassesPage = ({ sectionFilter }) => {
  const navigate = useNavigate();
  const [sectionQuery, setSectionQuery] = useState(() => String(sectionFilter || '').toUpperCase());
  const [activeDay, setActiveDay] = useState('All');
  const [showExperimentalNotice, setShowExperimentalNotice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [openEvidenceById, setOpenEvidenceById] = useState({});
  const [lastFetchedAt, setLastFetchedAt] = useState('');
  const showPrimaryLoadingState = loading && results.length === 0 && schedule.length === 0;
  const filteredResults = useMemo(() => {
    if (activeDay === 'All') return results;
    return results.filter((item) => Array.isArray(item.matchedDays) && item.matchedDays.includes(activeDay));
  }, [activeDay, results]);
  const filteredSchedule = useMemo(() => {
    if (activeDay === 'All') return schedule;
    return schedule.filter((entry) => entry.day === activeDay);
  }, [activeDay, schedule]);

  const fetchOnlineClasses = async (section, { refresh = false } = {}) => {
    const cleanSection = String(section || '').trim().toUpperCase();
    if (!cleanSection) {
      setResults([]);
      setError('Enter a section like BCS-8A or BSFT-2B.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ section: cleanSection });
      if (refresh) params.set('refresh', 'true');
      const response = await fetch(`${API_BASE}/online-classes?${params.toString()}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error('Online classes service is not available yet. The backend route still needs to be deployed.');
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch online classes');
      setResults(Array.isArray(data.items) ? data.items : []);
      setSchedule(Array.isArray(data.schedule) ? data.schedule : []);
      setOpenEvidenceById({});
      setLastFetchedAt(data.fetchedAt || '');
    } catch (err) {
      setResults([]);
      setSchedule([]);
      setError(err.message || 'Failed to fetch online classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sectionFilter) return;
    fetchOnlineClasses(sectionFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell>
      <main className="mx-auto w-full max-w-5xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="font-display text-signal text-[clamp(2rem,5vw,3.5rem)] leading-[0.9] tracking-wide">
                [08]_ONLINE CLASSES
              </h1>
            </div>
            <button onClick={() => navigate('/')} className={BTN_BASE}>Back To Selection</button>
          </div>

          <div className="mt-4 rounded-xl border border-signal/25 bg-white/90 p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <div>
                <label className="block text-xs uppercase tracking-[0.18em] text-ink/60">Section</label>
                <input
                  value={sectionQuery}
                  onChange={(e) => setSectionQuery(e.target.value.toUpperCase())}
                  placeholder="BCS-8A / BSFT-2B"
                  className="mt-2 w-full rounded-xl border border-signal/30 bg-white px-3 py-3 text-sm uppercase outline-none focus:border-signal"
                />
              </div>
              <button
                onClick={() => fetchOnlineClasses(sectionQuery)}
                disabled={loading}
                className={`${BTN_BASE} h-12 px-5 disabled:opacity-50`}
              >
                {loading ? 'Searching...' : 'Find Classes'}
              </button>
              <button
                onClick={() => fetchOnlineClasses(sectionQuery, { refresh: true })}
                disabled={loading}
                className={`${BTN_BASE} h-12 px-5 disabled:opacity-50`}
              >
                Refresh Live Sheet
              </button>
            </div>
            {lastFetchedAt && (
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/55">
                Live Sync: {new Date(lastFetchedAt).toLocaleString()}
              </p>
            )}
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </div>

          <div className="mt-4 rounded-xl border border-signal/25 bg-white/90 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-ink/60">Day Filter</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['All', ...WEEK_DAYS].map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                    activeDay === day
                      ? 'border-signal bg-signal text-white'
                      : 'border-signal/25 bg-white text-signal hover:bg-signal/5'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {loading && (
              <div className={`rounded-xl border px-4 text-center ${showPrimaryLoadingState ? 'border-signal/30 bg-signal/10 py-8' : 'border-signal/20 bg-signal/5 py-5'}`}>
                <div className="mx-auto h-10 w-10 rounded-full border-2 border-signal/20 border-t-signal animate-spin" />
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-signal">
                  {showPrimaryLoadingState ? 'Loading Live Online Classes' : 'Refreshing Live Online Classes'}
                </p>
                <p className="mt-2 text-sm text-ink/70">
                  Reading the latest teacher sheet, checking each day tab, and matching entries with ClashGuard timetable data.
                </p>
              </div>
            )}

            {!loading && filteredResults.length === 0 && filteredSchedule.length === 0 && !error && (
              <div className="rounded-xl border border-dashed border-signal/25 bg-white/70 px-4 py-5 text-center text-sm text-ink/65">
                No temporary online classes are listed for {sectionQuery || 'this section'}{activeDay !== 'All' ? ` on ${activeDay}` : ''} right now.
              </div>
            )}

            {!loading && filteredResults.length === 0 && filteredSchedule.length > 0 && !error && (
              <div className="rounded-xl border border-signal/20 bg-amber-50 px-4 py-5 text-center text-sm text-ink/75">
                {sectionQuery || 'This section'} has scheduled classes{activeDay !== 'All' ? ` on ${activeDay}` : ''}, but no live online link is currently listed in the temporary sheet.
              </div>
            )}

            {filteredResults.map((item) => {
              const inferredDays = Array.isArray(item.matchedDays) ? item.matchedDays : [];
              const actionDay = activeDay !== 'All' && inferredDays.includes(activeDay)
                ? activeDay
                : inferredDays[0] || '';
              const isEvidenceOpen = Boolean(openEvidenceById[item.id]);
              const normalizedLink = normalizeOnlineLink(item.link);

              return (
                <article key={item.id} className="rounded-2xl border border-signal/25 bg-white/95 p-4 shadow-[0_8px_24px_rgba(12,12,12,0.06)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-signal/75">
                        {item.resolvedSection || item.rawSection || 'Unresolved Section'}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-ink">{item.course || 'Course not listed'}</h2>
                      <p className="mt-1 text-sm text-ink/75">{item.teacher || 'Teacher not listed'}</p>
                    </div>
                    <span className="rounded-full border border-signal/25 bg-signal/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-signal">
                      {item.confidence} confidence
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-ink/12 bg-ash px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Time</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{item.time || 'Time not provided'}</p>
                    </div>
                    <div className="rounded-xl border border-ink/12 bg-ash px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Sheet Entry</p>
                      <p className="mt-1 text-sm font-semibold text-ink">{item.rawSection || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl border border-ink/12 bg-ash px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Class Day</p>
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {inferredDays.length > 0 ? inferredDays.join(', ') : 'Day could not be inferred yet'}
                    </p>
                  </div>

                  {item.link ? (
                    normalizedLink ? (
                      <a
                        href={normalizedLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-lg bg-signal px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-signal/90"
                      >
                        {actionDay ? `Open ${actionDay} Class` : 'Open Online Class'}
                      </a>
                    ) : (
                      <div className="mt-3 inline-flex rounded-lg border border-amber-300 bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                        {item.link}
                      </div>
                    )
                  ) : (
                    <p className="mt-3 text-sm text-ink/60">Online link not provided in the sheet.</p>
                  )}

                  {Array.isArray(item.timetableMatches) && item.timetableMatches.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setOpenEvidenceById((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                        className="rounded-lg border border-signal/20 bg-signal/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-signal/80 transition hover:bg-signal/10"
                      >
                        {isEvidenceOpen ? 'Hide Timetable Evidence' : 'Show Timetable Evidence'}
                      </button>
                      {isEvidenceOpen && (
                        <div className="mt-2 rounded-xl border border-signal/15 bg-signal/5 px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.timetableMatches.map((match) => (
                              <span key={`${match.title}-${match.day}-${match.slot}`} className="rounded-full border border-signal/20 bg-white px-3 py-1 text-[11px] font-medium text-ink/80">
                                {match.title}{match.day ? ` | ${match.day}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {!loading && filteredResults.length === 0 && filteredSchedule.length > 0 && (
              <div className="space-y-3">
                {filteredSchedule.map((entry) => (
                  <article key={`schedule-${entry.id}-${entry.day}-${entry.slot}`} className="rounded-2xl border border-amber-200 bg-white/95 p-4 shadow-[0_8px_24px_rgba(12,12,12,0.05)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                          {entry.section || sectionQuery || 'Section'}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-ink">{entry.title || entry.course || 'Scheduled class'}</h2>
                        <p className="mt-1 text-sm text-ink/75">{entry.teacher || 'Teacher not listed'}</p>
                      </div>
                      <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                        No live link yet
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className="rounded-xl border border-ink/12 bg-ash px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Class Day</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{entry.day || 'Day not available'}</p>
                      </div>
                      <div className="rounded-xl border border-ink/12 bg-ash px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-ink/55">Time</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{entry.slot || (entry.start && entry.end ? `${entry.start} - ${entry.end}` : 'Time not available')}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {showExperimentalNotice && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-3 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-signal/35 bg-white/95 p-5 shadow-[0_18px_40px_rgba(20,20,20,0.25)] md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-signal/70">Experimental Feature</p>
            <h2 className="mt-2 font-display text-3xl tracking-wide text-signal sm:text-4xl">ONLINE CLASS NOTICE</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/80">
              This feature is experimental. Because teachers update the live sheet manually, some online class details may be incomplete or incorrect.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Please verify important details with Google Classroom or your instructor.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button onClick={() => navigate('/')} className={BTN_BASE}>Back</button>
              <button
                onClick={() => setShowExperimentalNotice(false)}
                className="rounded-lg bg-signal px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-signal/90"
              >
                Continue
              </button>
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

  if (selectedCourses.length < 1) return <Navigate to="/" replace state={{ selectionRequired: true }} />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.8rem,8vw,6rem)] leading-[0.9] tracking-wide">
              [02]_MY TIMETABLE
            </h1>
            <div className="hidden w-full gap-2 sm:grid sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/timetable')} className={`${BTN_BASE} bg-signal text-white`}>
                Timetable
              </button>
              <button onClick={() => navigate('/clashes')} className={BTN_BASE}>
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
              <button onClick={() => navigate('/online-classes')} className={BTN_BASE}>
                Online
              </button>
              <button onClick={() => navigate('/')} className={BTN_BASE}>
                Back To Selection
              </button>
            </div>
          </div>
          <p className="mt-2 hidden text-sm uppercase tracking-[0.2em] text-ink/70 sm:block">
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
                    className="absolute top-1 h-[calc(100%-8px)] rounded-xl bg-signal shadow-[0_10px_22px_rgba(66,86,184,0.28)] transition-transform duration-300 ease-out"
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
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="text-xl font-semibold tracking-tight text-ink">{item.title}</p>
                          <span className="shrink-0 rounded-full border border-ink/25 bg-ash px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                            {item.start}-{item.end}
                          </span>
                        </div>
                        <div className="mt-2 rounded-lg border border-signal/25 bg-signal/5 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-signal/80">Location</p>
                          <p className="mt-1 text-sm font-semibold text-ink">{item.room}</p>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-signal/80">Instructor</p>
                          <p className="mt-1 text-sm font-semibold text-ink/95">{item.teacher || 'Unknown Teacher'}</p>
                        </div>
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
              <button onClick={() => navigate('/online-classes')} className={BTN_BASE}>
                Online
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
              <button onClick={() => navigate('/online-classes')} className={BTN_BASE}>
                Online
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
              <button onClick={() => navigate('/online-classes')} className={BTN_BASE}>
                Online
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

const GradeCoursePage = ({ selectedCourses, gradesData, setGradesData, gradeRanges, courseCredits }) => {
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

const SettingsPage = ({ gradeRanges, setGradeRanges }) => {
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

const FriendsPage = ({ allClasses, selectedCourses, friends, setFriends }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [friendName, setFriendName] = useState('');
  const [shareInput, setShareInput] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState(() => friends[0]?.id || '');
  const [msg, setMsg] = useState('');

  const myEntries = useMemo(
    () =>
      selectedEntriesFromCourses(selectedCourses, allClasses).sort(
        (a, b) => daySortValue(a.day) - daySortValue(b.day) || a.startMinutes - b.startMinutes,
      ),
    [allClasses, selectedCourses],
  );

  useEffect(() => {
    let cancelled = false;
    const createShare = async () => {
      if (myEntries.length === 0) {
        setShareCode('');
        return;
      }
      setShareBusy(true);
      try {
        const response = await fetch(`${API_BASE}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries: myEntries.map(normalizeShareEntry) }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create share link');
        if (!cancelled) setShareCode(String(data.code || ''));
      } catch {
        // fallback for compatibility if share endpoint is not deployed yet
        const fallback = encodeSharePayload({
          v: 1,
          createdAt: new Date().toISOString(),
          entries: myEntries.map(normalizeShareEntry),
        });
        if (!cancelled) setShareCode(fallback);
      } finally {
        if (!cancelled) setShareBusy(false);
      }
    };
    createShare();
    return () => {
      cancelled = true;
    };
  }, [myEntries]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !shareCode) return '';
    const isShortCode = /^[a-z0-9]{6,}$/i.test(shareCode);
    return isShortCode
      ? `${window.location.origin}/friends?share=${encodeURIComponent(shareCode)}`
      : `${window.location.origin}/friends?payload=${encodeURIComponent(shareCode)}`;
  }, [shareCode]);

  useEffect(() => {
    if (!selectedFriendId && friends[0]?.id) setSelectedFriendId(friends[0].id);
    if (selectedFriendId && !friends.some((f) => f.id === selectedFriendId)) {
      setSelectedFriendId(friends[0]?.id || '');
    }
  }, [friends, selectedFriendId]);

  const fetchPayloadByCode = async (code) => {
    const response = await fetch(`${API_BASE}/share/${encodeURIComponent(code)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Invalid share code');
    return data;
  };

  const resolvePayloadFromInput = async (input) => {
    const raw = String(input || '').trim();
    if (!raw) return null;
    const maybeCode = /^[a-z0-9]{6,}$/i.test(raw);
    if (maybeCode) return fetchPayloadByCode(raw);

    try {
      const parsed = new URL(raw);
      const share = parsed.searchParams.get('share');
      if (share) return fetchPayloadByCode(share);
      const payload = parsed.searchParams.get('payload');
      if (payload) return decodeSharePayload(payload);
      const shareMatch = parsed.pathname.match(/\/share\/([a-z0-9]+)/i);
      if (shareMatch?.[1]) return fetchPayloadByCode(shareMatch[1]);
      return null;
    } catch {
      return decodeSharePayload(raw);
    }
  };

  const saveFriendFromPayload = async (name, payloadText) => {
    try {
      const payload = await resolvePayloadFromInput(payloadText);
      if (!payload || !Array.isArray(payload.entries) || payload.entries.length === 0) {
        setMsg('Invalid or empty share link.');
        return;
      }
      const cleanName = String(name || '').trim() || `Friend ${friends.length + 1}`;
      const entries = payload.entries
        .map((entry) => ({
          ...entry,
          startMinutes: Number(entry.startMinutes),
          endMinutes: Number(entry.endMinutes),
        }))
        .filter((entry) => entry.day && Number.isFinite(entry.startMinutes) && Number.isFinite(entry.endMinutes));

      const existing = friends.find((f) => f.name.toLowerCase() === cleanName.toLowerCase());
      const nextFriend = {
        id: existing?.id || `fr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: cleanName,
        entries,
        updatedAt: new Date().toISOString(),
      };
      setFriends((prev) => {
        const without = prev.filter((f) => f.id !== nextFriend.id);
        return [nextFriend, ...without];
      });
      setSelectedFriendId(nextFriend.id);
      setMsg(`Linked friend: ${cleanName}`);
      setShareInput('');
    } catch (error) {
      setMsg(error?.message || 'Failed to link friend.');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const share = params.get('share');
    const payload = params.get('payload');
    if (!share && !payload) return;
    if (friends.length === 0) {
      setMsg('Incoming share link detected. Enter friend name and tap Link Friend.');
      setShareInput(share || payload || '');
    }
  }, [friends.length, location.search]);

  const selectedFriend = friends.find((f) => f.id === selectedFriendId) || null;
  const myFreeByDay = useMemo(() => buildFreeByDay(myEntries), [myEntries]);
  const friendFreeByDay = useMemo(
    () => buildFreeByDay(selectedFriend?.entries || []),
    [selectedFriend?.entries],
  );
  const mutualFreeByDay = useMemo(
    () => intersectFreeByDay(myFreeByDay, friendFreeByDay),
    [friendFreeByDay, myFreeByDay],
  );

  const renderDayRows = (map, emptyLabel) => (
    <div className="mt-2 grid gap-2">
      {WEEK_DAYS.map((day) => {
        const slots = map?.[day] || [];
        return (
          <div key={day} className="rounded-lg border border-ink/15 bg-white p-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/65">{day}</p>
            {slots.length === 0 ? (
              <p className="mt-1 text-xs text-ink/55">{emptyLabel}</p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-1">
                {slots.map(([start, end], idx) => (
                  <span
                    key={`${day}-${start}-${end}-${idx}`}
                    className="rounded-full border border-ink/20 bg-ash px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/75"
                  >
                    {minutesToLabel(start)} - {minutesToLabel(end)}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const removeFriend = (id) => {
    setFriends((prev) => prev.filter((f) => f.id !== id));
    if (selectedFriendId === id) setSelectedFriendId('');
  };

  if (selectedCourses.length < 1) return <Navigate to="/" replace state={{ selectionRequired: true }} />;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-8 md:pt-12">
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <h1 className="font-display text-signal text-[clamp(2.2rem,6vw,4.8rem)] leading-[0.9] tracking-wide">
              [07]_FRIENDS
            </h1>
            <div className="hidden w-full gap-2 sm:grid sm:w-auto sm:grid-flow-col sm:auto-cols-max">
              <button onClick={() => navigate('/timetable')} className={BTN_BASE}>Timetable</button>
              <button onClick={() => navigate('/clashes')} className={BTN_BASE}>Clash Report</button>
              <button onClick={() => navigate('/alternatives')} className={BTN_BASE}>Alternatives</button>
              <button onClick={() => navigate('/grades')} className={BTN_BASE}>Grades</button>
              <button onClick={() => navigate('/friends')} className={`${BTN_BASE} bg-signal text-white`}>Friends</button>
              <button onClick={() => navigate('/online-classes')} className={BTN_BASE}>Online</button>
              <button onClick={() => navigate('/')} className={BTN_BASE}>Back To Selection</button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-signal/30 bg-white/85 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-signal">Share My Timetable</p>
              <p className="mt-1 text-xs text-ink/70">Send this link or QR to your friend.</p>
              <input
                readOnly
                value={shareBusy ? 'Generating short link...' : shareUrl}
                className="mt-2 w-full rounded-md border border-ink/20 bg-ash px-2 py-2 text-xs outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    if (!shareUrl || shareBusy) return;
                    await navigator.clipboard.writeText(shareUrl);
                    setMsg('Share link copied.');
                  }}
                  className={BTN_BASE}
                >
                  Copy Link
                </button>
              </div>
              {shareUrl && (
                <img
                  alt="Share timetable QR"
                  className="mt-3 h-44 w-44 rounded-lg border border-signal/30 bg-white p-2"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`}
                />
              )}
            </div>

            <div className="rounded-xl border border-signal/30 bg-white/85 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-signal">Add / Update Friend</p>
              <input
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="Friend name (e.g., Gotham)"
                className="mt-2 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-signal"
              />
              <textarea
                value={shareInput}
                onChange={(e) => setShareInput(e.target.value)}
                placeholder="Paste shared link or short share code"
                className="mt-2 h-24 w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-xs outline-none focus:border-signal"
              />
              <button
                onClick={() => saveFriendFromPayload(friendName, shareInput)}
                className={`${BTN_BASE} mt-2`}
              >
                Link Friend
              </button>
              {msg && <p className="mt-2 text-xs font-semibold uppercase text-signal">{msg}</p>}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-signal/30 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-signal">Friends</p>
            {friends.length === 0 ? (
              <p className="mt-2 text-sm text-ink/70">No friends linked yet.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedFriendId(friend.id)}
                      className={`rounded-md border px-3 py-1 text-xs uppercase ${
                        selectedFriendId === friend.id
                          ? 'border-signal bg-signal text-white'
                          : 'border-signal/35 text-signal'
                      }`}
                    >
                      {friend.name}
                    </button>
                    <button
                      onClick={() => removeFriend(friend.id)}
                      className="rounded-md border border-signal/35 px-2 py-1 text-[10px] uppercase text-signal"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-signal/25 bg-signal/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-signal">Mutual Free Slots</p>
              {selectedFriend ? renderDayRows(mutualFreeByDay, 'No mutual free slot') : <p className="mt-2 text-sm text-ink/65">Select a friend first.</p>}
            </div>
            <div className="rounded-xl border border-ink/15 bg-white/90 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/70">
                {selectedFriend ? `${selectedFriend.name} Free Slots` : 'Friend Free Slots'}
              </p>
              {selectedFriend ? renderDayRows(friendFreeByDay, 'No free slot') : <p className="mt-2 text-sm text-ink/65">Select a friend first.</p>}
            </div>
            <div className="rounded-xl border border-ink/15 bg-white/90 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/70">My Free Slots</p>
              {renderDayRows(myFreeByDay, 'No free slot')}
            </div>
          </div>
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
        <Route path="/online-classes" element={<OnlineClassesPage sectionFilter={sectionFilter} />} />
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

