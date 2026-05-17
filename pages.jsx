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
function useTypewriter(phrases, { speed = 70, pauseAfter = 1800, deleteSpeed = 35 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let text = '';
    let phraseIdx = 0;
    let deleting = false;
    let timer = 0;
    let cancelled = false;

    function paint() {
      // Non-breaking space when empty so the inline baseline stays put and
      // the cursor doesn't shift onto a different line for a frame.
      el.textContent = text === '' ? ' ' : text;
    }
    paint();

    function step() {
      if (cancelled) return;
      const current = phrases[phraseIdx % phrases.length];
      if (!deleting && text === current) {
        timer = setTimeout(() => { deleting = true; step(); }, pauseAfter);
      } else if (deleting && text === '') {
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

    return () => { cancelled = true; clearTimeout(timer); };
  }, [phrases, speed, pauseAfter, deleteSpeed]);

  return ref;
}

// Hero phrases live at module scope so the array reference is stable across
// renders — keeps the typewriter effect from re-mounting on every parent re-render.
const HERO_PHRASES = [
  'I build things on the JVM.',
  'Java, Spring Boot, PostgreSQL.',
  'Practical, well-structured solutions.',
  'Currently exploring LLM prompting.',
];

// ──────────── HOME ────────────
function HomePage({ onNav, tweaks }) {
  const tagRef = useTypewriter(HERO_PHRASES);

  return React.createElement('section', { className: 'page-inner hero fade-in' },
    React.createElement('div', { className: 'eyebrow' },
      React.createElement('span', { className: 'rule' }),
      React.createElement('span', null, 'PORTFOLIO · 2026'),
    ),
    React.createElement('h1', null,
      'Hey there, ',
      React.createElement('br'),
      'I’m ', React.createElement('em', null, 'Cristian'), '.'
    ),
    React.createElement('p', { className: 'tagline' },
      // Typewriter writes textContent directly to this span via tagRef — no
      // React re-renders fire while typing, so the leaf trail stays smooth.
      React.createElement('span', { ref: tagRef }, ' '),
      React.createElement('span', { className: 'cursor' }),
    ),
    React.createElement('p', { className: 'hero-blurb' },
      'A software engineer based in Bucharest, building server-side applications and personal side-quests outside of client work. This is my own little plot of the internet. Quiet, green, occasionally pixelated.'
    ),
    React.createElement('div', { className: 'cta-row' },
      React.createElement('button', { className: 'btn', onClick: () => onNav('projects') },
        'View projects',
        React.createElement('span', { className: 'arrow' }, '→')
      ),
      React.createElement('button', { className: 'btn ghost', onClick: () => onNav('about') },
        'About me'
      ),
    ),

    // pixel divider
    tweaks.showPixelArt && React.createElement(PixelDivider, { width: 460 }),

    // hero-meta strip
    React.createElement('div', { className: 'hero-meta' },
      React.createElement('div', null,
        'Based in',
        React.createElement('strong', null, 'Bucharest, Romania'),
      ),
      React.createElement('div', null,
        'Stack',
        React.createElement('strong', null, 'Java · Spring Boot · SQL'),
      ),
      React.createElement('div', null,
        'Status',
        React.createElement('strong', null,
          React.createElement('span', { className: 'status-dot', 'aria-hidden': 'true' }),
          'Open to collaboration',
        ),
      ),
    ),
  );
}

// ──────────── ABOUT ────────────
function AboutPage({ tweaks }) {
  const techStack = [
    'Java', 'Spring', 'PostgreSQL', 'MySQL',
    'Git', 'GitHub', 'Linux', 'Thymeleaf',
    'HTML', 'CSS', 'JS', 'Bootstrap',
    'SQL', 'LLM',
  ];

  const timeline = [
    { year: '2024 →', title: 'Server-side & data work', body: 'Application logic, data modeling, PDF report generation in Java / Spring Boot.' },
    { year: '2023', title: 'Personal portfolio launch', body: 'Built this site from scratch. Handwritten HTML, CSS, vanilla JS.' },
    { year: '2022', title: 'Deeper into the JVM', body: 'Picked up Spring Boot + Thymeleaf, started shipping passion projects.' },
    { year: '2021', title: 'First lines', body: 'HTML, CSS, JavaScript, Bootstrap. Followed the curiosity.' },
  ];

  return React.createElement('section', { className: 'page-inner about-wrap fade-in' },
    React.createElement('div', { className: 'about-kicker' }, 'About me'),
    React.createElement('h1', null,
      'A quiet ', React.createElement('em', null, 'engineer'),
      React.createElement('br'),
      'with a soft spot for systems.'
    ),

    React.createElement('div', { className: 'about-body', style: { marginTop: 28 } },
      React.createElement('p', null,
        'My name is Cristian Gabriel. I’m a software engineer focused on building practical, well-structured solutions, with a strong foundation in ',
        React.createElement('strong', null, 'HTML'), ', ',
        React.createElement('strong', null, 'CSS'), ', ',
        React.createElement('strong', null, 'JavaScript'), ', and ',
        React.createElement('strong', null, 'Bootstrap'), '.',
      ),
      React.createElement('p', null,
        'This website is a personal portfolio showcasing my private passion projects, built independently outside of client or commercial work. I primarily work with ',
        React.createElement('strong', null, 'Java'), ' and ',
        React.createElement('strong', null, 'Spring Boot'), ', building server-side applications using ',
        React.createElement('strong', null, 'Thymeleaf'), ' and working with relational databases through ',
        React.createElement('strong', null, 'SQL'), ', ',
        React.createElement('strong', null, 'PostgreSQL'), ', and ',
        React.createElement('strong', null, 'MySQL'), '. My work involves implementing application logic, handling data from the database, and generating documents such as ',
        React.createElement('strong', null, 'PDF reports'), '.'
      ),
      React.createElement('p', null,
        'I develop mainly on ',
        React.createElement('strong', null, 'Linux-based systems'),
        ', use ',
        React.createElement('strong', null, 'Git'), ' and ',
        React.createElement('strong', null, 'GitHub'),
        ' for version control, and follow clean, maintainable development practices. I also use ',
        React.createElement('strong', null, 'LLM prompting'),
        ' as a practical tool to support development and analysis tasks.'
      ),
    ),

    tweaks.showPixelArt && React.createElement(PixelDivider, { width: 480 }),

    React.createElement('div', { className: 'section-label' },
      React.createElement('h3', null, 'Tech ', React.createElement('em', null, 'stack')),
    ),
    React.createElement('div', { className: 'tech-grid' },
      techStack.map(name =>
        React.createElement('div', { key: name, className: 'tech-cell' },
          tweaks.showPixelArt
            ? React.createElement(PixelIcon, { name, scale: 2 })
            : React.createElement('div', { style: { width: 16, height: 16, background: 'var(--moss-soft)', borderRadius: 3 } }),
          React.createElement('span', { className: 'label' }, name)
        )
      )
    ),

    React.createElement('div', { className: 'section-label' },
      React.createElement('h3', null, 'A short ', React.createElement('em', null, 'timeline')),
    ),
    React.createElement('div', { className: 'timeline' },
      timeline.map(t =>
        React.createElement('div', { key: t.year, className: 'timeline-row' },
          React.createElement('div', { className: 'timeline-year' }, t.year),
          React.createElement('div', { className: 'timeline-body' },
            React.createElement('strong', null, t.title),
            React.createElement('span', null, t.body),
          )
        )
      )
    ),
  );
}

// ──────────── PROJECTS ────────────
function ProjectsPage({ tweaks, onCardHover }) {
  const projects = [
    {
      name: 'Impostor',
      tagline: 'A mobile-first social game where players try to spot the hidden impostor among friends.',
      tech: ['Java', 'Spring Boot', 'WebSocket'],
      url: 'https://impostorgame.top/',
      cta: 'Play the game',
      thumb: 'resources/images/Projects/impostorGame.png',
      thumbLabel: 'IMPOSTOR · LIVE',
    },
    {
      name: 'Loopretto',
      tagline: 'A transcription tool for musicians. Loop, slow down, find your notes.',
      tech: ['JavaScript', 'Web Audio API'],
      url: null,
      cta: 'In development',
      thumb: 'resources/images/Projects/Looptube.png',
      thumbLabel: 'LOOPRETTO',
    },
    {
      name: 'QuickPaste',
      tagline: 'Save text clips from any website as notes in a tidy collection. A Chrome extension that lives in your toolbar.',
      tech: ['Chrome API', 'JS', 'IndexedDB'],
      url: 'https://chromewebstore.google.com/detail/quickpaste/kdlcijllofgjnpdghojpdhjjhnnffcgb',
      cta: 'Install extension',
      thumb: 'resources/images/Projects/QuickPaste/ScreenShot2.jpg',
      thumbLabel: 'QUICKPASTE',
    },
    {
      name: 'Trendalizer',
      tagline: 'Scrapes a website for its 5 most common keywords and graphs their interest trend over time.',
      tech: ['Java', 'Trends API', 'JFreeChart'],
      url: null,
      cta: 'View on GitHub',
      thumb: 'resources/images/Projects/Trendalizer.png',
      thumbLabel: 'TRENDALIZER',
    },
    {
      name: 'Furniture Boutique',
      tagline: 'A landing page for a fictional furniture production woodshop. A studio in static HTML.',
      tech: ['HTML', 'CSS', 'GitHub Pages'],
      url: 'https://cristiangabriel88.github.io/furniture-boutique/',
      cta: 'Visit site',
      thumb: null,
      thumbLabel: 'FURNITURE BOUTIQUE',
    },
  ];

  return React.createElement('section', { className: 'page-inner projects-wrap fade-in' },
    React.createElement('div', { className: 'about-kicker' }, 'Projects'),
    React.createElement('h1', null,
      'Things I’ve ', React.createElement('em', null, 'made'), '.'
    ),
    React.createElement('p', { className: 'projects-intro' },
      'A handful of personal projects, built outside of client work, for the joy of it. Each one was a chance to learn something specific, ship something real, and overengineer a little.'
    ),

    tweaks.showPixelArt && React.createElement(PixelDivider, { width: 520 }),

    React.createElement('div', { className: 'project-grid' },
      projects.map((p, i) =>
        React.createElement(ProjectCard, { key: p.name, project: p, index: i, onCardHover })
      )
    ),
  );
}

function ProjectCard({ project, index, onCardHover }) {
  const ref = useRef(null);
  const handleEnter = (e) => {
    if (onCardHover) onCardHover(ref.current);
  };
  return React.createElement(
    project.url ? 'a' : 'div',
    {
      ref,
      className: 'project-card',
      href: project.url || undefined,
      target: project.url ? '_blank' : undefined,
      rel: project.url ? 'noopener noreferrer' : undefined,
      onMouseEnter: handleEnter,
    },
    project.thumb
      ? React.createElement('div', { className: 'project-thumb' },
          React.createElement('img', { src: project.thumb, alt: project.name, loading: 'lazy' })
        )
      : React.createElement('div', { className: 'project-thumb placeholder' }, project.thumbLabel),
    React.createElement('div', { className: 'project-body' },
      React.createElement('div', { className: 'project-tag' }, `0${index + 1} · Personal Project`),
      React.createElement('div', { className: 'project-name' },
        project.name.split(' ').map((w, i) =>
          i === 0
            ? React.createElement(React.Fragment, { key: i }, w, ' ')
            : React.createElement('em', { key: i }, w + ' ')
        )
      ),
      React.createElement('div', { className: 'project-desc' }, project.tagline),
      React.createElement('div', { className: 'project-tech' },
        project.tech.map(t => React.createElement('span', { key: t }, t))
      ),
      project.url && React.createElement('div', { className: 'project-cta' },
        project.cta, React.createElement('span', { className: 'arrow' }, '→')
      ),
    )
  );
}

Object.assign(window, { HomePage, AboutPage, ProjectsPage });
