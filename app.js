(function () {
/* global React, ReactDOM,
   Sidebar, TopNav, BotanicalAnchor, PageFooter,
   HomePage, AboutPage, ProjectsPage,
   LeafParticles, PixelCharacter, Terminal,
   useSecretShortcut, useKonamiCode,
   useTweaks, TweaksPanel, TweakSection, TweakColor, TweakSlider, TweakToggle,
   PixelGrid, SPRITES
*/

const {
  useState,
  useEffect,
  useCallback
} = React;

// ###### DESIGN TOKENS ######
// These drive the tweaks panel (hidden behind the `tweak` shortcut) when it's open.
// Defaults match the design's parchment + forest palette.
const TWEAK_DEFAULTS = {
  accent: '#2D5016',
  headlineSize: 1.0,
  showPixelArt: true,
  showPixelCharacter: true,
  showLeafParticles: true
};
const ACCENT_PALETTES = [['#2D5016', '#7AA355', '#B5DFAA'],
// deep forest (default)
['#3F5F1B', '#8BAE4C', '#C7DEA0'],
// sage
['#1F4D2B', '#5C8A65', '#A5C2A8'],
// pine
['#5C4A1E', '#A38A55', '#D9C896'] // bark / olive accent
];
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [page, setPage] = useState('home');
  const [termOpen, setTermOpen] = useState(false);
  const [autoLaunchGame, setAutoLaunchGame] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  // ###### APPLY DESIGN TOKENS ######
  // The accent overrides write inline custom properties on <html>, which would
  // otherwise beat theme-dark.css (selector specificity loses to inline styles).
  // In dark mode we clear those three so the dark theme's lifted greens win.
  useEffect(() => {
    const html = document.documentElement;
    const root = html.style;
    const apply = () => {
      const isDark = html.getAttribute('data-theme') === 'dark';
      if (isDark) {
        root.removeProperty('--forest');
        root.removeProperty('--moss');
        root.removeProperty('--moss-soft');
      } else {
        root.setProperty('--forest', t.accent);
        const palette = ACCENT_PALETTES.find(p => p[0] === t.accent);
        if (palette) {
          root.setProperty('--moss', palette[1]);
          root.setProperty('--moss-soft', palette[2]);
        }
      }
      root.setProperty('--headline-scale', String(t.headlineSize));
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(html, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => mo.disconnect();
  }, [t.accent, t.headlineSize]);

  // ###### SHORTCUTS ######
  // Type "ssh" anywhere → toggle terminal (witty trigger: literally "open a shell")
  // Type "cg" anywhere → also toggles terminal (legacy trigger, kept as backup)
  useSecretShortcut('ssh', useCallback(() => setTermOpen(o => !o), []));
  useSecretShortcut('cg', useCallback(() => setTermOpen(o => !o), []));
  // Type "tweak" anywhere → toggle the design tweaks panel
  // The panel listens for __activate_edit_mode / __deactivate_edit_mode postMessages
  // (its built-in host protocol). It also posts __edit_mode_dismissed when the user
  // clicks its own X — we mirror that into our local state.
  useSecretShortcut('tweak', useCallback(() => setTweaksOpen(o => !o), []));
  useEffect(() => {
    window.postMessage({
      type: tweaksOpen ? '__activate_edit_mode' : '__deactivate_edit_mode'
    }, '*');
  }, [tweaksOpen]);
  useEffect(() => {
    const onMsg = e => {
      if (e?.data?.type === '__edit_mode_dismissed') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  // Konami code (↑↑↓↓←→←→BA) → open terminal in mini-game mode
  useKonamiCode(useCallback(() => {
    setAutoLaunchGame(true);
    setTermOpen(true);
  }, []));
  const closeTerminal = useCallback(() => {
    setTermOpen(false);
    setAutoLaunchGame(false);
  }, []);
  return React.createElement(React.Fragment, null, React.createElement(Sidebar, {
    onNav: setPage
  }), React.createElement(TopNav, {
    page,
    onNav: setPage
  }), React.createElement(BotanicalAnchor, {
    page
  }),
  // All three pages mount once and stay mounted. The `hidden` attribute toggles
  // display:none so inactive pages keep their DOM (and decoded <img> bitmaps)
  // intact — return visits to Projects don't refetch or re-decode anything.
  React.createElement('main', {
    className: 'page'
  }, React.createElement('div', {
    className: 'page-slot',
    hidden: page !== 'home'
  }, React.createElement(HomePage, {
    onNav: setPage,
    tweaks: t,
    paused: termOpen
  })), React.createElement('div', {
    className: 'page-slot',
    hidden: page !== 'about'
  }, React.createElement(AboutPage, {
    tweaks: t
  })), React.createElement('div', {
    className: 'page-slot',
    hidden: page !== 'projects'
  }, React.createElement(ProjectsPage, {
    tweaks: t
  })), React.createElement(PageFooter, {
    page
  })),
  // ###### EASTER EGGS ######
  t.showLeafParticles && React.createElement(LeafParticles, {
    enabled: true
  }),
  // Walking pixel character disabled — uncomment to bring it back:
  // t.showPixelCharacter && React.createElement(PixelCharacter,  { enabled: true }),

  React.createElement(Terminal, {
    open: termOpen,
    onClose: closeTerminal,
    autoLaunchGame
  }),
  // ###### TWEAKS PANEL (hidden behind `tweak` shortcut) ######
  // Always mounted — it manages its own visibility via the postMessage protocol above.
  React.createElement(TweaksPanel, {
    title: 'Tweaks'
  }, React.createElement(TweakSection, {
    label: 'Identity'
  }), React.createElement(TweakColor, {
    label: 'Accent',
    value: t.accent,
    options: ACCENT_PALETTES.map(p => p[0]),
    onChange: v => setTweak('accent', v)
  }), React.createElement(TweakSlider, {
    label: 'Headline scale',
    value: t.headlineSize,
    min: 0.8,
    max: 1.3,
    step: 0.05,
    unit: '×',
    onChange: v => setTweak('headlineSize', v)
  }), React.createElement(TweakSection, {
    label: 'Pixel layer'
  }), React.createElement(TweakToggle, {
    label: 'Pixel art icons + dividers',
    value: t.showPixelArt,
    onChange: v => setTweak('showPixelArt', v)
  }), React.createElement(TweakToggle, {
    label: 'Walking pixel character',
    value: t.showPixelCharacter,
    onChange: v => setTweak('showPixelCharacter', v)
  }), React.createElement(TweakSection, {
    label: 'Interactivity'
  }), React.createElement(TweakToggle, {
    label: 'Leaf particles on cursor',
    value: t.showLeafParticles,
    onChange: v => setTweak('showLeafParticles', v)
  })));
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
})();
