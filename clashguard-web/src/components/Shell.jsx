import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ABOUT_ME,
  APK_DOWNLOAD_URL,
  BTN_BASE,
  HEADER_MOBILE_LOGO,
  HEADER_WEBSITE_LOGO,
  STORAGE_KEYS,
} from '../constants';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const items = [
    { label: 'Timetable', path: '/timetable' },
    { label: 'Clashes', path: '/clashes' },
    { label: 'Alt', path: '/alternatives' },
    { label: 'Friends', path: '/friends' },
    { label: 'Grades', path: '/grades' },
  ];
  const currentIndex = items.findIndex(
    (item) =>
      location.pathname === item.path ||
      (item.path === '/grades' && location.pathname.startsWith('/grades/')),
  );
  const [indicatorIndex, setIndicatorIndex] = useState(() => {
    if (typeof window === 'undefined') return Math.max(0, currentIndex);
    const saved = Number(window.sessionStorage.getItem(STORAGE_KEYS.MOBILE_NAV_INDEX));
    return Number.isFinite(saved) ? saved : Math.max(0, currentIndex);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (currentIndex >= 0) {
      window.sessionStorage.setItem(STORAGE_KEYS.MOBILE_NAV_INDEX, String(currentIndex));
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
            className="pointer-events-none absolute top-1 h-[calc(100%-8px)] transform-gpu rounded-lg bg-signal shadow-[0_6px_14px_rgba(66,86,184,0.28)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
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

export const Shell = ({ children }) => {
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
      const dismissed = localStorage.getItem(STORAGE_KEYS.APK_PROMPT_DISMISSED);
      if (!dismissed) setShowApkPrompt(true);
    } catch {
      setShowApkPrompt(true);
    }
  }, [isNativeApp]);

  const dismissApkPrompt = () => {
    setShowApkPrompt(false);
    try {
      localStorage.setItem(STORAGE_KEYS.APK_PROMPT_DISMISSED, '1');
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
