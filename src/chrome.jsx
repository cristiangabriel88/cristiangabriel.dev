(function () {
  /* global React */
  // ─────────────────────────────────────────────────────────────
  // Chrome — Sidebar, TopNav, BotanicalAnchor, Footer
  // Persistent across all pages
  // ─────────────────────────────────────────────────────────────

  const { useEffect, useState } = React;

  // ###### THEME (LIGHT / DARK) ######
  // Drives [data-theme="dark"] on <html>. theme-dark.css picks it up.
  // Persisted in localStorage so the choice sticks across reloads.
  const THEME_KEY = "cg.theme";
  function readStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }
  function applyTheme(theme) {
    if (theme === "dark")
      document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }

  // ###### SVG ICON SET ######
  // Stroke-based, forest green
  function Ico({ name }) {
    const common = {
      width: 18,
      height: 18,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };
    if (name === "github")
      return (
        <svg {...common}>
          <path d="M9 19c-4.3 1.4-4.3-2.5-6-3M15 22v-4a3 3 0 0 0-.9-2.4c3-.3 6-1.5 6-6.7A5.2 5.2 0 0 0 18.7 5a4.8 4.8 0 0 0-.1-3.6S17.3 1 15 2.7a13.4 13.4 0 0 0-7 0C5.7 1 4.4 1.4 4.4 1.4A4.8 4.8 0 0 0 4.3 5a5.2 5.2 0 0 0-1.4 3.6c0 5.2 3 6.4 6 6.7A3 3 0 0 0 8 18v4" />
        </svg>
      );
    if (name === "linkedin")
      return (
        <svg {...common}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x={2} y={9} width={4} height={12} />
          <circle cx={4} cy={4} r={2} />
        </svg>
      );
    if (name === "stack")
      return (
        <svg {...common}>
          <path d="M3 12h14M3 16h14M3 8l13 2M5 4l11 4M17 18v3H3v-3" />
        </svg>
      );
    if (name === "pin")
      return (
        <svg {...common}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx={12} cy={10} r={3} />
        </svg>
      );
    if (name === "mail")
      return (
        <svg {...common}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
      );
    return null;
  }

  // ###### SIDEBAR ######
  function Sidebar({ onNav }) {
    const [theme, setTheme] = useState(readStoredTheme);
    useEffect(() => {
      applyTheme(theme);
    }, [theme]);
    const toggleTheme = () =>
      setTheme((t) => (t === "dark" ? "light" : "dark"));
    return (
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (onNav) onNav("home");
          }}
          aria-label="Cristian Gabriel, Home"
          title="Home"
        >
          <span className="brand-mark">
            <svg viewBox="0 0 40 56" width={44} height={60} fill="none">
              <path
                d="M 20 54 C 20 44 18 36 18 28"
                stroke="var(--forest)"
                strokeWidth={1.4}
                strokeLinecap="round"
              />
              <path
                d="M 18 28 C 4 22 2 10 6 2 C 18 4 22 18 18 28 Z"
                fill="var(--forest)"
              />
              <path
                d="M 19 36 C 30 32 34 24 32 16 C 22 18 18 28 19 36 Z"
                stroke="var(--forest)"
                strokeWidth={1.3}
              />
              <circle cx={20} cy={54} r={1.4} fill="var(--forest)" />
            </svg>
          </span>
          <div className="brand-rule" />
          <div className="brand-name">
            <span>Cristian</span>
            <span>Gabriel</span>
          </div>
          <div className="brand-role">Software Developer</div>
        </a>
        <nav className="sidebar-socials">
          <a
            className="social"
            href="https://github.com/cristiangabriel88"
            target="_blank"
            rel="noopener"
          >
            <span className="social-ico">
              <Ico name="github" />
            </span>
            <span className="social-label">GitHub</span>
          </a>
          <a
            className="social"
            href="https://www.linkedin.com/in/cristian-gabriel-constantinescu-781a6b237"
            target="_blank"
            rel="noopener"
          >
            <span className="social-ico">
              <Ico name="linkedin" />
            </span>
            <span className="social-label">LinkedIn</span>
          </a>
          <a
            className="social"
            href="https://stackoverflow.com/users/18754276/cristiangabriel"
            target="_blank"
            rel="noopener"
          >
            <span className="social-ico">
              <Ico name="stack" />
            </span>
            <span className="social-label">Stack Overflow</span>
          </a>
          <a
            className="social"
            href="https://www.google.com/maps/search/?api=1&query=Bucharest%2C+Romania"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="social-ico">
              <Ico name="pin" />
            </span>
            <span className="social-label">Bucharest, RO</span>
          </a>
          <a className="social" href="mailto:me@cristiangabriel.dev">
            <span className="social-ico">
              <Ico name="mail" />
            </span>
            <span className="social-label">Email me</span>
          </a>
        </nav>
        <div className="sidebar-footer">
          <span>
            ©{" "}
            <span
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                textTransform: "none",
                fontSize: 12,
                letterSpacing: 0,
              }}
            >
              {new Date().getFullYear()}
            </span>
          </span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg
                viewBox="0 0 16 16"
                width={13}
                height={13}
                fill="currentColor"
                aria-hidden="true"
              >
                <circle cx={8} cy={8} r={3} />
                <g
                  stroke="currentColor"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                >
                  <line x1={8} y1={1} x2={8} y2={3} />
                  <line x1={8} y1={13} x2={8} y2={15} />
                  <line x1={1} y1={8} x2={3} y2={8} />
                  <line x1={13} y1={8} x2={15} y2={8} />
                  <line x1={3} y1={3} x2={4.4} y2={4.4} />
                  <line x1={11.6} y1={11.6} x2={13} y2={13} />
                  <line x1={3} y1={13} x2={4.4} y2={11.6} />
                  <line x1={11.6} y1={4.4} x2={13} y2={3} />
                </g>
              </svg>
            ) : (
              <svg
                viewBox="0 0 16 16"
                width={13}
                height={13}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M 8 1 A 7 7 0 1 0 15 8 A 5 5 0 0 1 8 1 Z" />
              </svg>
            )}
          </button>
        </div>
      </aside>
    );
  }

  // ###### TOP NAV ######
  function TopNav({ page, onNav }) {
    const pages = [
      {
        id: "home",
        label: "Home",
      },
      {
        id: "about",
        label: "About",
      },
      {
        id: "projects",
        label: "Projects",
      },
    ];
    return (
      <nav className="topnav">
        {pages.map((p) => (
          <button
            key={p.id}
            className={"nav-btn" + (page === p.id ? " active" : "")}
            onClick={() => onNav(p.id)}
          >
            {p.label}
          </button>
        ))}
      </nav>
    );
  }

  // ###### BOTANICAL ANCHOR ######
  // Decorative plant photo per page. home.png and about.png have black/colored
  // backgrounds and render as-is; the projects anchor is a white-bg PNG that
  // uses mix-blend-multiply (see styles.css) to drop the white cleanly.
  const BOTANICAL_SRC = {
    home: "resources/images/home.webp",
    about: "resources/images/about.webp",
    projects: "resources/images/contact2.webp",
  };
  function BotanicalAnchor({ page }) {
    return (
      <img
        key={page}
        className={`botanical ${page} fade-in`}
        src={BOTANICAL_SRC[page]}
        alt=""
        aria-hidden="true"
        draggable="false"
      />
    );
  }

  // ###### FOOTER ######
  function PageFooter({ page }) {
    return (
      <div className="footer">
        <span
          className="ssh-hint"
          style={{
            color: "var(--forest)",
            letterSpacing: "0.22em",
          }}
        >
          Type <span className="ssh-word">ssh</span> to open a shell
        </span>
      </div>
    );
  }
  Object.assign(window, {
    Sidebar,
    TopNav,
    BotanicalAnchor,
    PageFooter,
    Ico,
  });
})();
