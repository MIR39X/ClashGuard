import { useState } from 'react';
import {
  ABOUT_ME,
  APK_DOWNLOAD_URL,
  BTN_BASE,
  HEADER_MOBILE_LOGO,
  HEADER_WEBSITE_LOGO,
} from '../constants';

const VIBES = [
  { tag: 'Rest', line: 'Sleep past noon. Set zero alarms.' },
  { tag: 'Beach', line: 'Trade lectures for shoreline.' },
  { tag: 'Games', line: 'The backlog won\'t clear itself.' },
  { tag: 'Nights', line: 'No morning labs. The night is yours.' },
];

const SummerPage = () => {
  const [showAbout, setShowAbout] = useState(false);
  const isNativeApp =
    typeof window !== 'undefined' &&
    !!window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform();

  return (
    <div className="h-screen overflow-hidden flex flex-col px-3 pt-4 sm:px-5 sm:pt-6 md:px-8 lg:px-10"
      style={{ background: 'radial-gradient(circle at 12% 8%, rgba(74,124,214,0.2) 0%, transparent 38%), radial-gradient(circle at 86% 84%, rgba(30,103,135,0.16) 0%, transparent 36%), linear-gradient(180deg,#d9e3f3 0%,#d3deef 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed -right-16 top-24 h-36 w-36 rounded-full bg-signal/20 blur-2xl animate-pulse-slow" />
      <div className="pointer-events-none fixed -left-20 bottom-12 h-44 w-44 rounded-full bg-blue-400/25 blur-2xl animate-pulse-slow" />

      {/* Header */}
      <header className="relative mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between gap-2 border-t-4 border-signal pt-4 sm:gap-3 sm:pt-5">
        <button onClick={() => setShowAbout(true)} className={`${BTN_BASE}`}>
          About Me
        </button>

        <img
          src={HEADER_MOBILE_LOGO}
          alt="ClashGuard"
          className="theme-logo pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 object-contain sm:hidden"
        />
        <div className="pointer-events-none absolute left-1/2 top-[calc(50%+10px)] hidden -translate-x-1/2 -translate-y-1/2 sm:block">
          <img src={HEADER_WEBSITE_LOGO} alt="ClashGuard" className="theme-logo h-40 w-auto object-contain" />
        </div>

        {!isNativeApp && (
          <a
            href={APK_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            className={BTN_BASE}
          >
            <span className="sm:hidden">APK</span>
            <span className="hidden sm:inline">Download APK</span>
          </a>
        )}
      </header>

      {/* Main content — fills remaining height */}
      <main className="mx-auto mt-4 flex w-full max-w-7xl flex-1 min-h-0 flex-col gap-3 pb-4 sm:mt-5 sm:pb-5 lg:flex-row lg:gap-4">

        {/* Left — hero */}
        <section className="animate-rise flex flex-col justify-between rounded-2xl border border-signal/35 bg-white/65 p-5 backdrop-blur-sm lg:w-[42%] lg:p-8 [animation-delay:60ms]">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-signal/60">[00]_No Classes Detected</p>
            <h1 className="font-display text-signal mt-1 text-[clamp(4rem,12vw,9rem)] leading-[0.85] tracking-wide sm:text-[clamp(5rem,14vw,10rem)] lg:text-[clamp(4rem,7vw,8rem)]">
              SUMMER
              <br />
              BREAK
            </h1>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink/55 sm:text-sm">
              Semester over &mdash; ClashGuard has nothing to guard against.
              <br className="hidden sm:block" /> Go be a person.
            </p>
            <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-signal/50">
              See you next semester.
            </p>
          </div>
        </section>

        {/* Right — status + vibes */}
        <section className="animate-rise flex min-h-0 flex-1 flex-col gap-3 [animation-delay:140ms]">

          {/* Status card */}
          <div className="rounded-2xl border border-signal/35 bg-white/65 p-5 backdrop-blur-sm sm:p-6">
            <p className="text-[9px] uppercase tracking-[0.28em] text-signal/60">Status Report</p>
            <p className="font-display mt-1 text-signal text-[clamp(1.3rem,3.5vw,2.6rem)] leading-tight tracking-wide">
              Zero Lectures. Zero Assignments. Infinite Potential.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink/65 sm:text-sm">
              The timetable is empty. ClashGuard has nothing to guard against — and for once, that is a wonderful thing.
            </p>
          </div>

          {/* Vibe cards grid */}
          <div className="grid flex-1 min-h-0 grid-cols-2 gap-3">
            {VIBES.map((v, i) => (
              <article
                key={v.tag}
                className="animate-rise flex flex-col justify-between rounded-2xl border border-ink/12 bg-white/80 p-4 backdrop-blur-sm sm:p-5"
                style={{ animationDelay: `${200 + i * 55}ms` }}
              >
                <span className="inline-block self-start rounded-full border border-signal/30 bg-ash px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-signal">
                  {v.tag}
                </span>
                <p className="mt-2 text-xs leading-relaxed text-ink/65 sm:text-sm">{v.line}</p>
              </article>
            ))}
          </div>

        </section>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-7xl shrink-0 pb-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/50">
        Clashguard 2026 All Rights Reserved
      </footer>

      {/* About modal */}
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
              <button onClick={() => setShowAbout(false)} className={BTN_BASE}>Close</button>
            </div>
            <p className="mt-4 text-sm uppercase tracking-[0.08em] text-ink/80">{ABOUT_ME.bio}</p>
            <div className="mt-4 grid gap-2">
              <a href={ABOUT_ME.linkedin} target="_blank" rel="noreferrer"
                className="rounded-lg border border-signal/30 bg-white px-3 py-2 text-sm font-semibold text-signal hover:bg-signal/10">
                LinkedIn
              </a>
              <a href={ABOUT_ME.github} target="_blank" rel="noreferrer"
                className="rounded-lg border border-signal/30 bg-white px-3 py-2 text-sm font-semibold text-signal hover:bg-signal/10">
                GitHub
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummerPage;
