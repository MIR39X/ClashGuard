import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { BTN_BASE, DAY_SHORT } from '../constants';
import { daySortValue, selectedEntriesFromCourses } from '../lib/schedule';

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
              <button onClick={() => navigate('/select')} className={BTN_BASE}>
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

export default TimetablePage;
