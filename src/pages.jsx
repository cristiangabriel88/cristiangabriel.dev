(function () {
  /* global React, PixelGrid, PixelIcon, PixelDivider, TECH_ICONS, SPRITES */
  // ─────────────────────────────────────────────────────────────
  // Pages — Home, About, Projects
  // ─────────────────────────────────────────────────────────────

  const { useState, useEffect, useRef } = React;

  // ###### TYPEWRITER (ref-driven, no React re-renders) ######
  // The previous version stored the in-progress text in useState, so every
  // character ticked a full HomePage re-render (~14–28×/s). That reconciliation
  // work blocked the main thread and made the leaf-trail RAF skip frames in
  // sync with the typing cadence. This version writes textContent directly to
  // a DOM node via a ref — React is at rest during typing.
  function useTypewriter(
    phrases,
    { speed = 70, pauseAfter = 1800, deleteSpeed = 35, paused = false } = {},
  ) {
    const ref = useRef(null);
    const pausedRef = useRef(paused);
    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      let text = "";
      let phraseIdx = 0;
      let deleting = false;
      let timer = 0;
      let cancelled = false;
      function paint() {
        // Non-breaking space when empty so the inline baseline stays put and
        // the cursor doesn't shift onto a different line for a frame.
        el.textContent = text === "" ? " " : text;
      }
      paint();
      function step() {
        if (cancelled) return;
        if (pausedRef.current) {
          timer = setTimeout(step, 150);
          return;
        }
        const current = phrases[phraseIdx % phrases.length];
        if (!deleting && text === current) {
          timer = setTimeout(() => {
            deleting = true;
            step();
          }, pauseAfter);
        } else if (deleting && text === "") {
          deleting = false;
          phraseIdx++;
          step();
        } else {
          timer = setTimeout(
            () => {
              text = deleting
                ? text.slice(0, -1)
                : current.slice(0, text.length + 1);
              paint();
              step();
            },
            deleting ? deleteSpeed : speed,
          );
        }
      }
      step();
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }, [phrases, speed, pauseAfter, deleteSpeed]);
    return ref;
  }

  // Hero phrases live at module scope so the array reference is stable across
  // renders — keeps the typewriter effect from re-mounting on every parent re-render.
  const HERO_PHRASES = [
    "Full Stack developer",
    "Still learning how to ask better questions.",
    "Currently debugging my prompts.",
    "Usually fixing something.",
    "I make things, then refine them too much.",
    "Still becoming whoever I’m supposed to be.",
  ];

  // ──────────── HOME ────────────
  function HomePage({ onNav, tweaks, paused = false }) {
    const tagRef = useTypewriter(HERO_PHRASES, {
      paused,
    });
    const goToStack = () => {
      onNav("about");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = document.getElementById("tech-stack");
          if (el)
            el.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        }),
      );
    };
    return (
      <section className="page-inner hero fade-in">
        <div className="eyebrow">
          <span className="rule" />
          <span>PORTFOLIO · 2026</span>
        </div>
        <h1>
          Hey there, <br />
          I’m <em>Cristian</em>.
        </h1>
        <p className="tagline">
          <span ref={tagRef}> </span>
          <span className="cursor" />
        </p>
        <p className="hero-blurb">
          A software developer based in Bucharest, building server-side
          applications and personal side-quests outside of client work. This is
          my own little plot of the internet. Quiet, green, occasionally
          pixelated.
        </p>
        <div className="cta-row">
          <button className="btn" onClick={() => onNav("projects")}>
            View projects<span className="arrow">→</span>
          </button>
          <button className="btn ghost" onClick={() => onNav("about")}>
            About me
          </button>
        </div>
        {
          // pixel divider
          tweaks.showPixelArt && <PixelDivider width={460} />
        }
        <div className="hero-meta">
          <div>
            Based in<strong>Bucharest, Romania</strong>
          </div>
          <div
            className="meta-link"
            role="button"
            tabIndex={0}
            onClick={goToStack}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                goToStack();
              }
            }}
            title="See full tech stack"
          >
            Stack<strong>Java · Spring Boot · SQL</strong>
          </div>
          <div>
            Status
            <strong>
              <span className="status-dot" aria-hidden="true" />
              Open to collaboration
            </strong>
          </div>
        </div>
      </section>
    );
  }

  // ──────────── ABOUT ────────────
  function AboutPage({ tweaks }) {
    const techStack = [
      "Java",
      "Spring Boot",
      "JPA",
      "Thymeleaf",
      "Python",
      "Flask",
      "PostgreSQL",
      "MySQL",
      "SQL",
      "Docker",
      "Postman",
      "REST APIs",
      "HTML",
      "CSS",
      "JavaScript",
      "Alpine.js",
      "Bootstrap",
      "Git",
      "GitHub",
      "Linux",
      "Prompting",
      "DaVinci Resolve",
    ];
    const timeline = [
      {
        year: "2025",
        title: "Systems, workflows & LLMs",
        body: "Exploring AI-assisted workflows, prompting, automation, and quieter ways to build useful things.",
      },
      {
        year: "2024",
        title: "Server-side & data work",
        body: "Application logic, PostgreSQL, PDF generation, registry systems in Java / Spring Boot.",
      },
      {
        year: "2023",
        title: "Freelance projects",
        body: "Small client sites, landing pages, and odd commissions. First taste of real briefs, real deadlines, and real feedback.",
      },
      {
        year: "2022",
        title: "Deeper into the JVM",
        body: "Picked up Spring Boot + Thymeleaf, started shipping passion projects.",
      },
      {
        year: "2021",
        title: "First serious front-end work",
        body: "HTML, CSS, JavaScript, Bootstrap. Started building interfaces from scratch.",
      },
      {
        year: "2015",
        title: "Recording & sound exploration",
        body: "Focused on recording, mixing, sound design, and home studio experimentation. Learned patience, repetition, and attention to detail.",
      },
      {
        year: "2010",
        title: "Music & instrument years",
        body: "Spent years learning instruments, music theory, practice discipline, and creative expression.",
      },
      {
        year: "2006",
        title: "First Turbo Pascal game",
        body: "Built a tiny text-based game in Turbo Pascal. Realized code could create worlds.",
      },
    ];
    return (
      <section className="page-inner about-wrap fade-in">
        <div className="about-kicker">About me</div>
        <div className="about-hero">
          <div className="about-hero-text">
            <h1>
              Full stack developer,
              <br />
              always improving and <em>refining</em>.
            </h1>
          </div>
          <div className="about-portrait">
            <img
              src="resources/images/me.webp"
              alt="Cristian Gabriel"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <div
          className="about-body"
          style={{
            marginTop: 28,
          }}
        >
          <p>
            My name is Cristian Gabriel. I’m a software developer focused on
            building practical, well-structured solutions, with a strong
            foundation in <strong>HTML</strong>, <strong>CSS</strong>,{" "}
            <strong>JavaScript</strong>, and <strong>Bootstrap</strong>.
          </p>
          <p>
            This website is a personal portfolio showcasing my private passion
            projects, built independently outside of client or commercial work.
            I primarily work with <strong>Java</strong> and{" "}
            <strong>Spring Boot</strong>, building server-side applications
            using <strong>Thymeleaf</strong> and working with relational
            databases through <strong>SQL</strong>, <strong>PostgreSQL</strong>,
            and <strong>MySQL</strong>. My work involves implementing
            application logic, handling data from the database, and generating
            documents such as <strong>PDF reports</strong>.
          </p>
          <p>
            I develop mainly on <strong>Linux-based systems</strong>, use{" "}
            <strong>Git</strong> and <strong>GitHub</strong> for version
            control, and follow clean, maintainable development practices. I
            also use <strong>LLM prompting</strong> as a practical tool to
            support development and analysis tasks.
          </p>
        </div>
        {tweaks.showPixelArt && <PixelDivider width={480} />}
        <div id="tech-stack" className="section-label">
          <h2>
            Tech <em>stack</em>
          </h2>
        </div>
        <div className="tech-grid">
          {techStack.map((name) => (
            <div key={name} className="tech-cell">
              {tweaks.showPixelArt ? (
                <PixelIcon name={name} scale={2} />
              ) : (
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: "var(--moss-soft)",
                    borderRadius: 3,
                  }}
                />
              )}
              <span className="label">{name}</span>
            </div>
          ))}
        </div>
        <div className="section-label">
          <h2>
            A short <em>timeline</em>
          </h2>
        </div>
        <div className="timeline">
          {timeline.map((t) => {
            const yearEl =
              t.year === "2023" ? (
                <a
                  className="timeline-year"
                  href="archive/old%20design/index.html"
                  target="_blank"
                  rel="noopener"
                >
                  {t.year}
                </a>
              ) : (
                <div className="timeline-year">{t.year}</div>
              );
            return (
              <div key={t.year} className="timeline-row">
                {yearEl}
                <div className="timeline-body">
                  <strong>{t.title}</strong>
                  <span>{t.body}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // ──────────── PROJECTS ────────────
  function ProjectsPage({ tweaks }) {
    const projects = [
      {
        name: "tapedeck.local",
        tagline:
          "A local-first web audio extractor. Pulls audio as MP3, M4A, Opus, WAV, or FLAC, all on your machine, locally and privately.",
        tech: ["Python", "Flask", "yt-dlp"],
        url: "tapedeck/tapedeck.html",
        cta: "See the project",
        thumb: "resources/images/Projects/02-queue-working.png",
        thumbLabel: "TAPEDECK.LOCAL",
        thumbFit: "contain",
      },
      {
        name: "Impostor",
        tagline:
          "A mobile-first social game where players try to spot the hidden impostor among friends.",
        tech: ["HTML", "CSS", "JavaScript"],
        url: "https://impostorgame.top/",
        cta: "Play the game",
        thumb: "resources/images/Projects/impostorGame.webp",
        thumbLabel: "IMPOSTOR · LIVE",
      },
      {
        name: "Loopretto",
        tagline:
          "A transcription tool for musicians. Loop, slow down, find your notes.",
        tech: ["Python"],
        url: "https://github.com/cristiangabriel88/loopretto#readme",
        cta: "View on GitHub",
        thumb: "resources/images/Projects/loopretto.webp",
        thumbLabel: "LOOPRETTO",
      },
      {
        name: "QuickPaste",
        tagline:
          "Save text clips from any website as notes in a tidy collection. A Chrome extension that lives in your toolbar.",
        tech: ["Chrome API", "JavaScript"],
        url: "Quickpaste/quickpaste.html",
        cta: "See the project",
        thumb: "resources/images/Projects/QuickPaste/small-promo-title.webp",
        thumbLabel: "QUICKPASTE",
      },
      {
        name: "Trendalizer",
        tagline:
          "Scrapes a website for its 5 most common keywords and graphs their interest trend over time.",
        tech: ["Python", "Trends API"],
        url: null,
        cta: "View on GitHub",
        thumb: "resources/images/Projects/Trendalizer.webp",
        thumbLabel: "TRENDALIZER",
        thumbFit: "contain",
      },
      {
        name: "Furniture Boutique",
        tagline:
          "A landing page for a fictional furniture production woodshop. A studio in static HTML.",
        tech: ["HTML", "CSS", "GitHub Pages"],
        url: "https://cristiangabriel88.github.io/furniture-boutique/",
        cta: "Visit site",
        thumb: "resources/images/Projects/furniture-boutique.webp",
        thumbLabel: "FURNITURE BOUTIQUE",
      },
    ];
    return (
      <section className="page-inner projects-wrap fade-in">
        <div className="about-kicker">Projects</div>
        <h1>
          Things I’ve <em>made</em>.
        </h1>
        <p className="projects-intro">
          A handful of personal projects, built outside of client work, for the
          joy of it. Each one was a chance to learn something specific, ship
          something real, and overengineer a little.
        </p>
        {tweaks.showPixelArt && <PixelDivider width={520} />}
        <div className="project-grid">
          {projects.map((p, i) => (
            <ProjectCard key={p.name} project={p} index={i} />
          ))}
        </div>
      </section>
    );
  }
  function ProjectCard({ project, index }) {
    return React.createElement(
      project.url ? "a" : "div",
      {
        className: "project-card",
        href: project.url || undefined,
        target: project.url ? "_blank" : undefined,
        rel: project.url ? "noopener noreferrer" : undefined,
      },
      project.thumb ? (
        <div className="project-thumb">
          <img
            src={project.thumb}
            alt={project.name}
            loading="lazy"
            decoding="async"
            style={
              project.thumbFit
                ? {
                    objectFit: project.thumbFit,
                  }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="project-thumb placeholder">{project.thumbLabel}</div>
      ),
      <div className="project-body">
        <div className="project-tag">{`0${index + 1} · Personal Project`}</div>
        <div className="project-name">
          {project.name
            .split(" ")
            .map((w, i) =>
              i === 0 ? (
                <React.Fragment key={i}>{w} </React.Fragment>
              ) : (
                <em key={i}>{w + " "}</em>
              ),
            )}
        </div>
        <div className="project-desc">{project.tagline}</div>
        <div className="project-tech">
          {project.tech.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        {project.url && (
          <div className="project-cta">
            {project.cta}
            <span className="arrow">→</span>
          </div>
        )}
      </div>,
    );
  }
  Object.assign(window, {
    HomePage,
    AboutPage,
    ProjectsPage,
  });
})();
