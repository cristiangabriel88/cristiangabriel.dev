(function () {
  /* global React, PixelGrid, PixelIcon, PixelDivider, TECH_ICONS, SPRITES */
  // ─────────────────────────────────────────────────────────────
  // Pages — Home, About, Projects
  // ─────────────────────────────────────────────────────────────

  const {
    useState,
    useEffect,
    useRef
  } = React;

  // ###### TYPEWRITER (ref-driven, no React re-renders) ######
  // The previous version stored the in-progress text in useState, so every
  // character ticked a full HomePage re-render (~14–28×/s). That reconciliation
  // work blocked the main thread and made the leaf-trail RAF skip frames in
  // sync with the typing cadence. This version writes textContent directly to
  // a DOM node via a ref — React is at rest during typing.
  function useTypewriter(phrases, {
    speed = 70,
    pauseAfter = 1800,
    deleteSpeed = 35,
    paused = false
  } = {}) {
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
          timer = setTimeout(() => {
            text = deleting ? text.slice(0, -1) : current.slice(0, text.length + 1);
            paint();
            step();
          }, deleting ? deleteSpeed : speed);
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
  const HERO_PHRASES = ["Full Stack developer", "Still learning how to ask better questions.", "Currently debugging my prompts.", "Usually fixing something.", "I make things, then refine them too much.", "Still becoming whoever I’m supposed to be."];

  // ──────────── HOME ────────────
  function HomePage({
    onNav,
    tweaks,
    paused = false
  }) {
    const tagRef = useTypewriter(HERO_PHRASES, {
      paused
    });
    const goToStack = () => {
      onNav("about");
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = document.getElementById("tech-stack");
        if (el) el.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }));
    };
    return /*#__PURE__*/React.createElement("section", {
      className: "page-inner hero fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "eyebrow"
    }, /*#__PURE__*/React.createElement("span", {
      className: "rule"
    }), /*#__PURE__*/React.createElement("span", null, "PORTFOLIO \xB7 2026")), /*#__PURE__*/React.createElement("h1", null, "Hey there, ", /*#__PURE__*/React.createElement("br", null), "I\u2019m ", /*#__PURE__*/React.createElement("em", null, "Cristian"), "."), /*#__PURE__*/React.createElement("p", {
      className: "tagline"
    }, /*#__PURE__*/React.createElement("span", {
      ref: tagRef
    }, "\xA0"), /*#__PURE__*/React.createElement("span", {
      className: "cursor"
    })), /*#__PURE__*/React.createElement("p", {
      className: "hero-blurb"
    }, "A software developer based in Bucharest, building server-side applications and personal side-quests outside of client work. This is my own little plot of the internet. Quiet, green, occasionally pixelated."), /*#__PURE__*/React.createElement("div", {
      className: "cta-row"
    }, /*#__PURE__*/React.createElement("button", {
      className: "btn",
      onClick: () => onNav("projects")
    }, "View projects", /*#__PURE__*/React.createElement("span", {
      className: "arrow"
    }, "\u2192")), /*#__PURE__*/React.createElement("button", {
      className: "btn ghost",
      onClick: () => onNav("about")
    }, "About me")),
    // pixel divider
    tweaks.showPixelArt && /*#__PURE__*/React.createElement(PixelDivider, {
      width: 460
    }), /*#__PURE__*/React.createElement("div", {
      className: "hero-meta"
    }, /*#__PURE__*/React.createElement("div", null, "Based in", /*#__PURE__*/React.createElement("strong", null, "Bucharest, Romania")), /*#__PURE__*/React.createElement("div", {
      className: "meta-link",
      role: "button",
      tabIndex: 0,
      onClick: goToStack,
      onKeyDown: e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToStack();
        }
      },
      title: "See full tech stack"
    }, "Stack", /*#__PURE__*/React.createElement("strong", null, "Java \xB7 Spring Boot \xB7 SQL")), /*#__PURE__*/React.createElement("div", null, "Status", /*#__PURE__*/React.createElement("strong", null, /*#__PURE__*/React.createElement("span", {
      className: "status-dot",
      "aria-hidden": "true"
    }), "Open to collaboration"))));
  }

  // ──────────── ABOUT ────────────
  function AboutPage({
    tweaks
  }) {
    const techStack = ["Java", "Spring Boot", "JPA", "Thymeleaf", "Python", "Flask", "PostgreSQL", "MySQL", "SQL", "Docker", "Postman", "REST APIs", "HTML", "CSS", "JavaScript", "Alpine.js", "Bootstrap", "Git", "GitHub", "Linux", "Prompting", "DaVinci Resolve"];
    const timeline = [{
      year: "2025",
      title: "Systems, workflows & LLMs",
      body: "Exploring AI-assisted workflows, prompting, automation, and quieter ways to build useful things."
    }, {
      year: "2024",
      title: "Server-side & data work",
      body: "Application logic, PostgreSQL, PDF generation, registry systems in Java / Spring Boot."
    }, {
      year: "2023",
      title: "Freelance projects",
      body: "Small client sites, landing pages, and odd commissions. First taste of real briefs, real deadlines, and real feedback."
    }, {
      year: "2022",
      title: "Deeper into the JVM",
      body: "Picked up Spring Boot + Thymeleaf, started shipping passion projects."
    }, {
      year: "2021",
      title: "First serious front-end work",
      body: "HTML, CSS, JavaScript, Bootstrap. Started building interfaces from scratch."
    }, {
      year: "2015",
      title: "Recording & sound exploration",
      body: "Focused on recording, mixing, sound design, and home studio experimentation. Learned patience, repetition, and attention to detail."
    }, {
      year: "2010",
      title: "Music & instrument years",
      body: "Spent years learning instruments, music theory, practice discipline, and creative expression."
    }, {
      year: "2006",
      title: "First Turbo Pascal game",
      body: "Built a tiny text-based game in Turbo Pascal. Realized code could create worlds."
    }];
    return /*#__PURE__*/React.createElement("section", {
      className: "page-inner about-wrap fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "about-kicker"
    }, "About me"), /*#__PURE__*/React.createElement("div", {
      className: "about-hero"
    }, /*#__PURE__*/React.createElement("div", {
      className: "about-hero-text"
    }, /*#__PURE__*/React.createElement("h1", null, "Full stack developer,", /*#__PURE__*/React.createElement("br", null), "always improving and ", /*#__PURE__*/React.createElement("em", null, "refining"), ".")), /*#__PURE__*/React.createElement("div", {
      className: "about-portrait"
    }, /*#__PURE__*/React.createElement("img", {
      src: "resources/images/me.webp",
      alt: "Cristian Gabriel",
      loading: "lazy",
      decoding: "async"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "about-body",
      style: {
        marginTop: 28
      }
    }, /*#__PURE__*/React.createElement("p", null, "My name is Cristian Gabriel. I\u2019m a software developer focused on building practical, well-structured solutions, with a strong foundation in ", /*#__PURE__*/React.createElement("strong", null, "HTML"), ", ", /*#__PURE__*/React.createElement("strong", null, "CSS"), ",", " ", /*#__PURE__*/React.createElement("strong", null, "JavaScript"), ", and ", /*#__PURE__*/React.createElement("strong", null, "Bootstrap"), "."), /*#__PURE__*/React.createElement("p", null, "This website is a personal portfolio showcasing my private passion projects, built independently outside of client or commercial work. I primarily work with ", /*#__PURE__*/React.createElement("strong", null, "Java"), " and", " ", /*#__PURE__*/React.createElement("strong", null, "Spring Boot"), ", building server-side applications using ", /*#__PURE__*/React.createElement("strong", null, "Thymeleaf"), " and working with relational databases through ", /*#__PURE__*/React.createElement("strong", null, "SQL"), ", ", /*#__PURE__*/React.createElement("strong", null, "PostgreSQL"), ", and ", /*#__PURE__*/React.createElement("strong", null, "MySQL"), ". My work involves implementing application logic, handling data from the database, and generating documents such as ", /*#__PURE__*/React.createElement("strong", null, "PDF reports"), "."), /*#__PURE__*/React.createElement("p", null, "I develop mainly on ", /*#__PURE__*/React.createElement("strong", null, "Linux-based systems"), ", use", " ", /*#__PURE__*/React.createElement("strong", null, "Git"), " and ", /*#__PURE__*/React.createElement("strong", null, "GitHub"), " for version control, and follow clean, maintainable development practices. I also use ", /*#__PURE__*/React.createElement("strong", null, "LLM prompting"), " as a practical tool to support development and analysis tasks.")), tweaks.showPixelArt && /*#__PURE__*/React.createElement(PixelDivider, {
      width: 480
    }), /*#__PURE__*/React.createElement("div", {
      id: "tech-stack",
      className: "section-label"
    }, /*#__PURE__*/React.createElement("h3", null, "Tech ", /*#__PURE__*/React.createElement("em", null, "stack"))), /*#__PURE__*/React.createElement("div", {
      className: "tech-grid"
    }, techStack.map(name => /*#__PURE__*/React.createElement("div", {
      key: name,
      className: "tech-cell"
    }, tweaks.showPixelArt ? /*#__PURE__*/React.createElement(PixelIcon, {
      name: name,
      scale: 2
    }) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 16,
        height: 16,
        background: "var(--moss-soft)",
        borderRadius: 3
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "label"
    }, name)))), /*#__PURE__*/React.createElement("div", {
      className: "section-label"
    }, /*#__PURE__*/React.createElement("h3", null, "A short ", /*#__PURE__*/React.createElement("em", null, "timeline"))), /*#__PURE__*/React.createElement("div", {
      className: "timeline"
    }, timeline.map(t => {
      const yearEl = t.year === "2023" ? /*#__PURE__*/React.createElement("a", {
        className: "timeline-year",
        href: "archive/old%20design/index.html",
        target: "_blank",
        rel: "noopener"
      }, t.year) : /*#__PURE__*/React.createElement("div", {
        className: "timeline-year"
      }, t.year);
      return /*#__PURE__*/React.createElement("div", {
        key: t.year,
        className: "timeline-row"
      }, yearEl, /*#__PURE__*/React.createElement("div", {
        className: "timeline-body"
      }, /*#__PURE__*/React.createElement("strong", null, t.title), /*#__PURE__*/React.createElement("span", null, t.body)));
    })));
  }

  // ──────────── PROJECTS ────────────
  function ProjectsPage({
    tweaks
  }) {
    const projects = [{
      name: "tapedeck.local",
      tagline: "A local-first web audio extractor. Pulls audio as MP3, M4A, Opus, WAV, or FLAC, all on your machine, locally and privately.",
      tech: ["Python", "Flask", "yt-dlp"],
      url: "tapedeck/tapedeck.html",
      cta: "See the project",
      thumb: "resources/images/Projects/02-queue-working.png",
      thumbLabel: "TAPEDECK.LOCAL",
      thumbFit: "contain"
    }, {
      name: "Impostor",
      tagline: "A mobile-first social game where players try to spot the hidden impostor among friends.",
      tech: ["HTML", "CSS", "JavaScript"],
      url: "https://impostorgame.top/",
      cta: "Play the game",
      thumb: "resources/images/Projects/impostorGame.webp",
      thumbLabel: "IMPOSTOR · LIVE"
    }, {
      name: "Loopretto",
      tagline: "A transcription tool for musicians. Loop, slow down, find your notes.",
      tech: ["Python"],
      url: "https://github.com/cristiangabriel88/loopretto#readme",
      cta: "View on GitHub",
      thumb: "resources/images/Projects/loopretto.webp",
      thumbLabel: "LOOPRETTO"
    }, {
      name: "QuickPaste",
      tagline: "Save text clips from any website as notes in a tidy collection. A Chrome extension that lives in your toolbar.",
      tech: ["Chrome API", "JavaScript"],
      url: "Quickpaste/quickpaste.html",
      cta: "See the project",
      thumb: "resources/images/Projects/QuickPaste/small-promo-title.webp",
      thumbLabel: "QUICKPASTE"
    }, {
      name: "Trendalizer",
      tagline: "Scrapes a website for its 5 most common keywords and graphs their interest trend over time.",
      tech: ["Python", "Trends API"],
      url: null,
      cta: "View on GitHub",
      thumb: "resources/images/Projects/Trendalizer.webp",
      thumbLabel: "TRENDALIZER",
      thumbFit: "contain"
    }, {
      name: "Furniture Boutique",
      tagline: "A landing page for a fictional furniture production woodshop. A studio in static HTML.",
      tech: ["HTML", "CSS", "GitHub Pages"],
      url: "https://cristiangabriel88.github.io/furniture-boutique/",
      cta: "Visit site",
      thumb: "resources/images/Projects/furniture-boutique.webp",
      thumbLabel: "FURNITURE BOUTIQUE"
    }];
    return /*#__PURE__*/React.createElement("section", {
      className: "page-inner projects-wrap fade-in"
    }, /*#__PURE__*/React.createElement("div", {
      className: "about-kicker"
    }, "Projects"), /*#__PURE__*/React.createElement("h1", null, "Things I\u2019ve ", /*#__PURE__*/React.createElement("em", null, "made"), "."), /*#__PURE__*/React.createElement("p", {
      className: "projects-intro"
    }, "A handful of personal projects, built outside of client work, for the joy of it. Each one was a chance to learn something specific, ship something real, and overengineer a little."), tweaks.showPixelArt && /*#__PURE__*/React.createElement(PixelDivider, {
      width: 520
    }), /*#__PURE__*/React.createElement("div", {
      className: "project-grid"
    }, projects.map((p, i) => /*#__PURE__*/React.createElement(ProjectCard, {
      key: p.name,
      project: p,
      index: i
    }))));
  }
  function ProjectCard({
    project,
    index
  }) {
    return React.createElement(project.url ? "a" : "div", {
      className: "project-card",
      href: project.url || undefined,
      target: project.url ? "_blank" : undefined,
      rel: project.url ? "noopener noreferrer" : undefined
    }, project.thumb ? /*#__PURE__*/React.createElement("div", {
      className: "project-thumb"
    }, /*#__PURE__*/React.createElement("img", {
      src: project.thumb,
      alt: project.name,
      loading: "lazy",
      decoding: "async",
      style: project.thumbFit ? {
        objectFit: project.thumbFit
      } : undefined
    })) : /*#__PURE__*/React.createElement("div", {
      className: "project-thumb placeholder"
    }, project.thumbLabel), /*#__PURE__*/React.createElement("div", {
      className: "project-body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "project-tag"
    }, `0${index + 1} · Personal Project`), /*#__PURE__*/React.createElement("div", {
      className: "project-name"
    }, project.name.split(" ").map((w, i) => i === 0 ? /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, w, " ") : /*#__PURE__*/React.createElement("em", {
      key: i
    }, w + " "))), /*#__PURE__*/React.createElement("div", {
      className: "project-desc"
    }, project.tagline), /*#__PURE__*/React.createElement("div", {
      className: "project-tech"
    }, project.tech.map(t => /*#__PURE__*/React.createElement("span", {
      key: t
    }, t))), project.url && /*#__PURE__*/React.createElement("div", {
      className: "project-cta"
    }, project.cta, /*#__PURE__*/React.createElement("span", {
      className: "arrow"
    }, "\u2192"))));
  }
  Object.assign(window, {
    HomePage,
    AboutPage,
    ProjectsPage
  });
})();
