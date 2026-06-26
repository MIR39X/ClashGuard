import { useNavigate } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { BTN_BASE } from '../constants';

const VIBES = [
  { tag: 'Beach', headline: 'Hit The Waves', body: 'Trade your lecture hall for shoreline. You have absolutely nowhere to be.' },
  { tag: 'Sleep', headline: 'Sleep In', body: 'No 8 AM classes. No alarms. Just blissful, consequence-free unconsciousness.' },
  { tag: 'Games', headline: 'Conquer The Backlog', body: 'That pile of unfinished games has been judging you all semester. Time to settle it.' },
  { tag: 'Food', headline: 'Eat Junk Food', body: 'Canteen is closed and nobody is keeping score. Feast accordingly.' },
  { tag: 'Skills', headline: 'Learn Something Useless', body: 'Pick up a hobby with zero career value. Juggling, origami, whatever — it doesn\'t matter.' },
  { tag: 'Nights', headline: 'Stay Up Late', body: 'No deadlines, no morning labs. The night is yours with zero consequences.' },
];

const SummerPage = () => {
  const navigate = useNavigate();

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl pt-6 md:pt-10">

        <section className="animate-rise rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-10 [animation-delay:60ms]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-signal text-[clamp(3rem,10vw,8rem)] leading-[0.85] tracking-wide">
                SUMMER
                <br />
                BREAK
              </h1>
              <p className="mt-1 text-xs uppercase tracking-[0.28em] text-signal/60">[00]_No Classes Detected</p>
            </div>
            <button onClick={() => navigate('/')} className={`${BTN_BASE} shrink-0`}>
              Back To Home
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:mt-8 lg:grid-cols-3">
            <div className="col-span-full rounded-xl border border-signal/30 bg-signal/8 p-5 md:p-6">
              <p className="text-[10px] uppercase tracking-[0.28em] text-signal/70">Status Report</p>
              <p className="mt-2 font-display text-[clamp(1.6rem,4vw,3rem)] leading-tight tracking-wide text-signal">
                Zero Lectures. Zero Assignments. Infinite Potential.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/75 md:text-base">
                Semester is over. The timetable is empty. ClashGuard has nothing to guard against — and for once,
                that is a wonderful thing. Go be a person.
              </p>
            </div>
          </div>
        </section>

        <section className="animate-rise mt-4 rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8 [animation-delay:160ms]">
          <p className="text-[10px] uppercase tracking-[0.28em] text-signal/70">Approved Summer Activities</p>
          <h2 className="mt-1 font-display text-[clamp(1.8rem,4vw,3.2rem)] leading-tight tracking-wide text-signal">
            Your Official Break Agenda
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VIBES.map((v, i) => (
              <article
                key={v.tag}
                className="animate-rise rounded-xl border border-ink/12 bg-white p-4"
                style={{ animationDelay: `${200 + i * 60}ms` }}
              >
                <span className="inline-block rounded-full border border-signal/30 bg-ash px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-signal">
                  {v.tag}
                </span>
                <p className="mt-2 font-display text-xl tracking-wide text-ink">{v.headline}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/65">{v.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="animate-rise mt-4 grid gap-4 sm:grid-cols-2 [animation-delay:320ms]">
          <div className="rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
            <p className="text-[10px] uppercase tracking-[0.28em] text-signal/70">Friendly Reminder</p>
            <h2 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.8rem)] leading-tight tracking-wide text-signal">
              You Survived The Semester
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70 md:text-base">
              Clashes resolved. Grades calculated. Timetable conquered. Whatever the semester threw at you — you
              made it to the other side. That deserves actual rest.
            </p>
          </div>

          <div className="rounded-2xl border border-signal/35 bg-white/65 p-6 backdrop-blur-sm md:p-8">
            <p className="text-[10px] uppercase tracking-[0.28em] text-signal/70">When It&apos;s Time</p>
            <h2 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.8rem)] leading-tight tracking-wide text-signal">
              We&apos;ll Be Here
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70 md:text-base">
              New semester, new courses, new clashes waiting to be found. When registration opens up again,
              ClashGuard is ready. Until then — close the tab.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-5 rounded-xl border border-signal/40 bg-signal px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-signal/90"
            >
              Go To App
            </button>
          </div>
        </section>

      </main>
    </Shell>
  );
};

export default SummerPage;
