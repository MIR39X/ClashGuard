import './App.css';

const REPOSITORY_URL = 'https://github.com/MIR39X/ClashGuard';

function App() {
  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ClashGuard home">
          CLASHGUARD
        </a>
        <a className="header-link" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
          GITHUB REPOSITORY
        </a>
      </header>

      <main className="page-grid" id="top">
        <section className="card hero-card animate-rise">
          <p className="section-code">[00]_PROJECT ARCHIVE</p>
          <h1>CLASHGUARD</h1>
          <p className="hero-copy">
            A timetable clash detector created for FAST students. The source code and project history remain available on GitHub.
          </p>

          <a className="repo-button" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            VIEW GITHUB REPOSITORY
          </a>

          <dl className="project-facts">
            <div>
              <dt>ACTIVE FROM</dt>
              <dd>FEBRUARY 2026</dd>
            </div>
            <div>
              <dt>ACTIVE UNTIL</dt>
              <dd>JUNE 2026</dd>
            </div>
            <div>
              <dt>STATUS</dt>
              <dd>PROJECT COMPLETE</dd>
            </div>
          </dl>
        </section>

        <section className="card status-card animate-rise delay-one">
          <p className="section-code">[01]_CURRENT STATUS</p>
          <h2>NO LONGER REQUIRED</h2>
          <p>
            FAST now provides its new timetable, so ClashGuard is no longer needed for regular timetable checks.
          </p>
          <div className="status-line">
            <span>FEB 2026</span>
            <span>JUN 2026</span>
          </div>
        </section>

        <section className="card thanks-card animate-rise delay-two">
          <div>
            <p className="section-code">[02]_THANK YOU</p>
            <h2>THANK YOU FOR USING CLASHGUARD</h2>
          </div>
          <p>
            Thank you to every student who used the app to check courses, find clashes, and plan a timetable. You can still review how the project was created in the repository.
          </p>
        </section>
      </main>

      <footer>
        <span>CLASHGUARD 2026</span>
        <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">GITHUB.COM/MIR39X/CLASHGUARD</a>
      </footer>
    </div>
  );
}

export default App;
