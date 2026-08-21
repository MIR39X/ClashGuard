import './App.css';

const REPOSITORY_URL = 'https://github.com/MIR39X/ClashGuard';

const GithubMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .7C5.7.7.6 5.8.6 12.1c0 5 3.3 9.2 7.8 10.7.6.1.8-.3.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C15.2 4.6 16.3 5 16.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.1v3.2c0 .4.2.7.8.6a11.4 11.4 0 0 0 7.8-10.7C23.4 5.8 18.3.7 12 .7Z" />
  </svg>
);

function App() {
  return (
    <main className="site-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <nav className="topbar" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="ClashGuard home">
          <span className="wordmark-mark">CG</span>
          <span>ClashGuard</span>
        </a>
        <a className="nav-repo" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
          <GithubMark />
          <span>GitHub</span>
        </a>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow reveal reveal-one">
          <span className="pulse-dot" aria-hidden="true" />
          Archived with gratitude
        </div>

        <h1 className="hero-title reveal reveal-two">
          It guarded the
          <span>clashes.</span>
          Now it rests.
        </h1>

        <p className="hero-copy reveal reveal-three">
          ClashGuard helped FAST students make sense of course conflicts. With FAST&apos;s new timetable now in place,
          the app is no longer much needed, but the complete project remains open for anyone curious about how it was made.
        </p>

        <div className="hero-actions reveal reveal-four">
          <a className="primary-action" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            <GithubMark />
            <span>Explore the repository</span>
            <span className="arrow" aria-hidden="true">↗</span>
          </a>
          <p>No sign-in. No app routes. Just the source.</p>
        </div>
      </section>

      <section className="story-grid" aria-label="ClashGuard project summary">
        <article className="panel timeline-panel reveal reveal-five">
          <div className="panel-heading">
            <p>Time online</p>
            <span>2026</span>
          </div>
          <div className="timeline" aria-label="Project ran from February to June 2026">
            <div className="timeline-track" aria-hidden="true">
              <span className="timeline-progress" />
            </div>
            <div className="timeline-dates">
              <div>
                <span className="date-dot" aria-hidden="true" />
                <p>February</p>
                <strong>Launch</strong>
              </div>
              <div className="date-end">
                <span className="date-dot" aria-hidden="true" />
                <p>June</p>
                <strong>Final bell</strong>
              </div>
            </div>
          </div>
          <p className="panel-note">Four months of finding overlaps before they found you.</p>
        </article>

        <article className="panel note-panel reveal reveal-six">
          <div className="panel-heading">
            <p>A small note</p>
            <span>01 / 01</span>
          </div>
          <blockquote>
            “FAST has a new timetable now, so ClashGuard has completed the job it was built to do.”
          </blockquote>
          <div className="stamp" aria-hidden="true">Job done</div>
        </article>
      </section>

      <section className="thanks reveal reveal-seven">
        <p className="section-label">To everyone who used it</p>
        <div className="thanks-layout">
          <h2>Thank you.</h2>
          <p>
            Whether you checked one clash or planned an entire semester, thank you for giving this small student project a place in your routine.
          </p>
        </div>
      </section>

      <footer>
        <p>ClashGuard · February—June 2026</p>
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">MIR39X / ClashGuard ↗</a>
      </footer>
    </main>
  );
}

export default App;
