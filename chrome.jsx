/* global React */
// ─────────────────────────────────────────────────────────────
// Chrome — Sidebar, TopNav, BotanicalAnchor, Footer
// Persistent across all pages
// ─────────────────────────────────────────────────────────────

const { useEffect } = React;

// ###### SVG ICON SET ######
// Stroke-based, forest green
function Ico({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'github') return React.createElement('svg', common,
    React.createElement('path', { d: 'M9 19c-4.3 1.4-4.3-2.5-6-3M15 22v-4a3 3 0 0 0-.9-2.4c3-.3 6-1.5 6-6.7A5.2 5.2 0 0 0 18.7 5a4.8 4.8 0 0 0-.1-3.6S17.3 1 15 2.7a13.4 13.4 0 0 0-7 0C5.7 1 4.4 1.4 4.4 1.4A4.8 4.8 0 0 0 4.3 5a5.2 5.2 0 0 0-1.4 3.6c0 5.2 3 6.4 6 6.7A3 3 0 0 0 8 18v4' })
  );
  if (name === 'linkedin') return React.createElement('svg', common,
    React.createElement('path', { d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z' }),
    React.createElement('rect', { x: 2, y: 9, width: 4, height: 12 }),
    React.createElement('circle', { cx: 4, cy: 4, r: 2 })
  );
  if (name === 'stack') return React.createElement('svg', common,
    React.createElement('path', { d: 'M3 12h14M3 16h14M3 8l13 2M5 4l11 4M17 18v3H3v-3' })
  );
  if (name === 'pin') return React.createElement('svg', common,
    React.createElement('path', { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' }),
    React.createElement('circle', { cx: 12, cy: 10, r: 3 })
  );
  if (name === 'mail') return React.createElement('svg', common,
    React.createElement('path', { d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' }),
    React.createElement('path', { d: 'M22 6l-10 7L2 6' })
  );
  return null;
}

// ###### SIDEBAR ######
function Sidebar() {
  return React.createElement('aside', { className: 'sidebar' },
    React.createElement('div', { className: 'brand' },
      // Asymmetric leaf-mark sigil — modern, minimal, logo-style
      React.createElement('a', { href: '#', className: 'brand-mark', onClick: (e) => e.preventDefault(), 'aria-label': 'Cristian Gabriel — Home' },
        React.createElement('svg', { viewBox: '0 0 40 56', width: 44, height: 60, fill: 'none' },
          // long curved stem
          React.createElement('path', {
            d: 'M 20 54 C 20 44 18 36 18 28',
            stroke: 'var(--forest)', strokeWidth: 1.4, strokeLinecap: 'round',
          }),
          // primary filled leaf (left-leaning)
          React.createElement('path', {
            d: 'M 18 28 C 4 22 2 10 6 2 C 18 4 22 18 18 28 Z',
            fill: 'var(--forest)',
          }),
          // secondary outlined leaf (right, smaller, offset down)
          React.createElement('path', {
            d: 'M 19 36 C 30 32 34 24 32 16 C 22 18 18 28 19 36 Z',
            stroke: 'var(--forest)', strokeWidth: 1.3,
          }),
          // tiny seed dot at base
          React.createElement('circle', { cx: 20, cy: 54, r: 1.4, fill: 'var(--forest)' }),
        )
      ),
      React.createElement('div', { className: 'brand-rule' }),
      React.createElement('div', { className: 'brand-name' },
        React.createElement('span', null, 'Cristian'),
        React.createElement('span', null, 'Gabriel'),
      ),
      React.createElement('div', { className: 'brand-role' }, 'Software Engineer'),
    ),
    React.createElement('nav', { className: 'sidebar-socials' },
      React.createElement('a', { className: 'social', href: 'https://github.com/cristiangabriel88', target: '_blank', rel: 'noopener' },
        React.createElement('span', { className: 'social-ico' }, React.createElement(Ico, { name: 'github' })),
        React.createElement('span', { className: 'social-label' }, 'GitHub'),
      ),
      React.createElement('a', { className: 'social', href: 'https://www.linkedin.com/in/cristian-gabriel-constantinescu-781a6b237', target: '_blank', rel: 'noopener' },
        React.createElement('span', { className: 'social-ico' }, React.createElement(Ico, { name: 'linkedin' })),
        React.createElement('span', { className: 'social-label' }, 'LinkedIn'),
      ),
      React.createElement('a', { className: 'social', href: 'https://stackoverflow.com/users/18754276/cristiangabriel', target: '_blank', rel: 'noopener' },
        React.createElement('span', { className: 'social-ico' }, React.createElement(Ico, { name: 'stack' })),
        React.createElement('span', { className: 'social-label' }, 'Stack Overflow'),
      ),
      React.createElement('a', { className: 'social', href: '#', onClick: (e) => e.preventDefault() },
        React.createElement('span', { className: 'social-ico' }, React.createElement(Ico, { name: 'pin' })),
        React.createElement('span', { className: 'social-label' }, 'Bucharest, RO'),
      ),
      React.createElement('a', { className: 'social', href: 'mailto:me@cristiangabriel.dev' },
        React.createElement('span', { className: 'social-ico' }, React.createElement(Ico, { name: 'mail' })),
        React.createElement('span', { className: 'social-label' }, 'me@cristiangabriel.dev'),
      ),
    ),
    React.createElement('div', { className: 'sidebar-footer' },
      'Est. ', React.createElement('span', { style: { fontFamily: 'var(--serif)', fontStyle: 'italic', textTransform: 'none', fontSize: 12, letterSpacing: 0 } }, '2021'),
    )
  );
}

// ###### TOP NAV ######
function TopNav({ page, onNav }) {
  const pages = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'projects', label: 'Projects' },
  ];
  return React.createElement('nav', { className: 'topnav' },
    pages.map(p =>
      React.createElement('button', {
        key: p.id,
        className: 'nav-btn' + (page === p.id ? ' active' : ''),
        onClick: () => onNav(p.id),
      }, p.label)
    )
  );
}

// ###### BOTANICAL ANCHOR ######
// Decorative plant photo per page, named after the page (home / about / projects).
// All three are PNGs with white backgrounds — mix-blend-multiply (in CSS) drops the
// white and leaves only the plant against the parchment.
function BotanicalAnchor({ page }) {
  const src = `resources/images/${page}.png`;
  return React.createElement('img', {
    key: page, // force reload+fade on page change
    className: `botanical ${page} fade-in`,
    src,
    alt: '',
    'aria-hidden': 'true',
    draggable: 'false',
  });
}

// ###### FOOTER ######
function PageFooter({ page }) {
  const year = new Date().getFullYear();
  return React.createElement('div', { className: 'footer' },
    React.createElement('span', null, '© 2021–', year),
    React.createElement('span', { className: 'sep' }, '·'),
    React.createElement('span', { style: { color: 'var(--forest)', letterSpacing: '0.22em' } }, 'Type "cg" for a surprise'),
  );
}

Object.assign(window, { Sidebar, TopNav, BotanicalAnchor, PageFooter, Ico });
