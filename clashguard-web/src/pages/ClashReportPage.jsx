import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { BTN_BASE } from '../constants';
import { buildClashes, daySortValue, selectedEntriesFromCourses } from '../lib/schedule';

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
              <button onClick={() => navigate('/select')} className={BTN_BASE}>
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

export default ClashReportPage;
