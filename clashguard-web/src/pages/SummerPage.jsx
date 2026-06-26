import { useState } from 'react';
import {
  ABOUT_ME,
  APK_DOWNLOAD_URL,
  BTN_BASE,
  HEADER_MOBILE_LOGO,
  HEADER_WEBSITE_LOGO,
} from '../constants';

const VIBES = [
  {
    tag: 'Rest',
    headline: 'Sleep In',
    line: 'Sleep past noon. Set zero alarms. Your body has been running on caffeine and panic since January. It deserves actual rest.',
  },
  {
    tag: 'Beach',
    headline: 'Hit The Waves',
    line: 'Trade lectures for shoreline. Swap assignment deadlines for actual horizons. Go outside for once. It still exists.',
  },
  {
    tag: 'Games',
    headline: 'Clear The Backlog',
    line: "You've been adding games to your library all semester with zero time to play. That excuse is officially gone.",
  },
  {
    tag: 'Food',
    headline: 'Eat Whatever',
    line: 'No dining hall schedules. No eating between back-to-back classes. Cook something, order something, eat at 2 AM. Your call.',
  },
  {
    tag: 'Skills',
    headline: 'Learn For Fun',
    line: 'Pick up something with zero career value. Juggling, painting, a new language. Anything that has nothing to do with your degree.',
  },
  {
    tag: 'Nights',
    headline: 'Stay Up Late',
    line: 'No 8 AM labs. No morning quizzes. The night is yours. Use it however you want with zero guilt.',
  },
];

const SummerPage = () => {
  const [showAbout, setShowAbout] = useState(false);
  const isNativeApp =
    typeof window !== 'undefined' &&
    !!window.Capacitor &&
    typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform();

  return (
    <div
      className="min-h-screen px-3 pt-4 pb-8 sm:px-5 sm:pt-6 md:px-8 lg:px-10"
      style={{
        background:
          'radial-gradient(circle at 12% 8%, rgba(74,124,214,0.2) 0%, transparent 38%), radial-gradient(circle at 86% 84%, rgba(30,103,135,0.16) 0%, transparent 36%), linear-gradient(180deg,#d9e3f3 0%,#d3deef 100%)',
      }}
    >
      <div className="pointer-events-none fixed -right-16 top-24 h-36 w-36 rounded-full bg-signal/20 blur-2xl animate-pulse-slow" />
      <div className="pointer-events-none fixed -left-20 bottom-12 h-44 w-44 rounded-full bg-blue-400/25 blur-2xl animate-pulse-slow" />

      {/* Header */}
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-2 border-t-4 border-signal pt-4 sm:gap-3 sm:pt-5">
        <button onClick={() => setShowAbout(true)} className={BTN_BASE}>
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
          <a href={APK_DOWNLOAD_URL} target="_blank" rel="noreferrer" className={BTN_BASE}>
            <span className="sm:hidden">APK</span>
            <span className="hidden sm:inline">Download APK</span>
          </a>
        )}
      </header>

      <main className="mx-auto mt-4 w-full max-w-7xl space-y-3 sm:mt-6 sm:space-y-4">

        {/* Hero */}
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-4 backdrop-blur-sm sm:p-6 [animation-delay:60ms]">
          <p className="text-sm uppercase tracking-[0.22em] text-signal/70 sm:text-base md:text-lg">[00]_No Classes Detected</p>
          <h1 className="font-display text-signal mt-0.5 text-[clamp(3rem,11vw,9rem)] leading-[0.85] tracking-wide">
            SUMMER
            <br />
            BREAK
          </h1>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {['JUN', 'JUL', 'AUG'].map((m, i) => (
              <div key={m} className="rounded-xl border border-signal/20 bg-signal/5 px-2 py-2 text-center sm:px-3">
                <p className="font-display text-signal text-lg tracking-wide sm:text-2xl">{m}</p>
                <p className="text-[8px] uppercase tracking-[0.15em] text-ink/40 mt-0.5 sm:text-[9px]">Month {i + 1}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 max-w-2xl text-xs uppercase tracking-[0.14em] text-ink/55 leading-relaxed">
            Semester over. ClashGuard has nothing to guard against. And for once, that is a wonderful thing. Go be a person.
          </p>
        </section>

        {/* Status */}
        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-4 backdrop-blur-sm sm:p-6 [animation-delay:140ms]">
          <p className="text-[9px] uppercase tracking-[0.24em] text-signal/60">Status Report</p>
          <p className="font-display mt-1.5 text-signal leading-tight tracking-wide text-[clamp(1.4rem,4.5vw,3.5rem)]">
            Zero Lectures. Zero Assignments. Infinite Potential.
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink/65 sm:text-sm">
            The timetable is empty. Every slot that used to be a lecture is now yours. Use it badly, use it brilliantly. Just use it however you want.
          </p>
        </section>

        {/* Activity grid */}
        <section className="animate-rise [animation-delay:220ms]">
          <p className="mb-2 px-1 text-[9px] uppercase tracking-[0.24em] text-signal/60">Approved Summer Activities</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VIBES.map((v, i) => (
              <article
                key={v.tag}
                className="animate-rise rounded-2xl border border-ink/10 bg-white/80 p-4 backdrop-blur-sm sm:p-5"
                style={{ animationDelay: `${280 + i * 60}ms` }}
              >
                <span className="inline-block rounded-full border border-signal/30 bg-ash px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-signal sm:text-[9px]">
                  {v.tag}
                </span>
                <p className="font-display mt-2 text-signal tracking-wide text-[clamp(1rem,3.5vw,1.8rem)] leading-tight">
                  {v.headline}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink/60">{v.line}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Footer cards */}
        <section className="animate-rise grid gap-3 sm:grid-cols-2 [animation-delay:360ms]">
          <div className="rounded-2xl border border-signal/35 bg-white/65 p-4 backdrop-blur-sm sm:p-6">
            <p className="text-[9px] uppercase tracking-[0.24em] text-signal/60">Friendly Reminder</p>
            <p className="font-display mt-1.5 text-signal leading-tight tracking-wide text-[clamp(1.2rem,3vw,2.4rem)]">
              You Survived The Semester
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink/65 sm:text-sm">
              Clashes resolved. Grades calculated. Timetable conquered. Whatever it threw at you, you made it to the other side. That deserves actual rest.
            </p>
          </div>
          <div className="rounded-2xl border border-signal/35 bg-white/65 p-4 backdrop-blur-sm sm:p-6">
            <p className="text-[9px] uppercase tracking-[0.24em] text-signal/60">When It&apos;s Time</p>
            <p className="font-display mt-1.5 text-signal leading-tight tracking-wide text-[clamp(1.2rem,3vw,2.4rem)]">
              We&apos;ll Be Here
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink/65 sm:text-sm">
              New semester, new courses, new clashes to find. When registration opens again ClashGuard is ready. Until then, close the tab and go live your life.
            </p>
          </div>
        </section>

      </main>

      <footer className="mx-auto mt-6 w-full max-w-7xl pb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/50">
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
