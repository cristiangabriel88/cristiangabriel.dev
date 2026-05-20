(function () {
  /* global React, ReactDOM,
     Sidebar, TopNav, BotanicalAnchor, PageFooter,
     HomePage, AboutPage, ProjectsPage,
     LeafParticles, PixelCharacter, IdleGarden, Terminal,
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
    accent: "#2D5016",
    headlineSize: 1.0,
    showPixelArt: true,
    showPixelCharacter: true,
    showLeafParticles: true,
    showIdleGarden: true,
    soundEnabled: false
  };
  const ACCENT_PALETTES = [["#2D5016", "#7AA355", "#B5DFAA"],
  // deep forest (default)
  ["#3F5F1B", "#8BAE4C", "#C7DEA0"],
  // sage
  ["#1F4D2B", "#5C8A65", "#A5C2A8"],
  // pine
  ["#5C4A1E", "#A38A55", "#D9C896"] // bark / olive accent
  ];

  // ###### HASH ROUTING ######
  // Page state is mirrored into the URL hash so views are shareable/bookmarkable
  // (`#about`, `#projects`) and the browser back/forward buttons work. Home stays
  // on the bare URL (no hash). Purely behavioral — no visual change.
  const ROUTES = ["home", "about", "projects"];
  function readHashPage() {
    const h = (window.location.hash || "").replace(/^#\/?/, "").toLowerCase();
    return ROUTES.includes(h) ? h : "home";
  }
  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [page, setPage] = useState(readHashPage);

    // Navigate: update the URL, let the hash listener (or pushState) drive `page`.
    const navigate = useCallback(p => {
      if (p === "home") {
        // Clear the hash for a clean root URL; pushState keeps back/forward intact.
        history.pushState("", document.title, window.location.pathname + window.location.search);
        setPage("home");
      } else if (window.location.hash.slice(1) !== p) {
        window.location.hash = p; // fires hashchange → setPage below
      } else {
        setPage(p);
      }
    }, []);

    // Mirror the opt-in sound setting into the cgSound module (default off).
    useEffect(() => {
      if (window.cgSound) window.cgSound.setEnabled(t.soundEnabled);
    }, [t.soundEnabled]);

    // Browser back/forward (and any manual hash edit) re-sync `page`.
    useEffect(() => {
      const sync = () => setPage(readHashPage());
      window.addEventListener("hashchange", sync);
      window.addEventListener("popstate", sync);
      return () => {
        window.removeEventListener("hashchange", sync);
        window.removeEventListener("popstate", sync);
      };
    }, []);

    // The three pages stay mounted (display toggled via `hidden`), so the window
    // scroll position would otherwise carry over from the previous page and leave
    // you partway down the new one. Reset to the top on every page change.
    useEffect(() => {
      window.scrollTo(0, 0);
    }, [page]);
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
        const isDark = html.getAttribute("data-theme") === "dark";
        if (isDark) {
          root.removeProperty("--forest");
          root.removeProperty("--moss");
          root.removeProperty("--moss-soft");
        } else {
          root.setProperty("--forest", t.accent);
          const palette = ACCENT_PALETTES.find(p => p[0] === t.accent);
          if (palette) {
            root.setProperty("--moss", palette[1]);
            root.setProperty("--moss-soft", palette[2]);
          }
        }
        root.setProperty("--headline-scale", String(t.headlineSize));
      };
      apply();
      const mo = new MutationObserver(apply);
      mo.observe(html, {
        attributes: true,
        attributeFilter: ["data-theme"]
      });
      return () => mo.disconnect();
    }, [t.accent, t.headlineSize]);

    // ###### SHORTCUTS ######
    // Type "ssh" anywhere → toggle terminal (witty trigger: literally "open a shell")
    // Type "cg" anywhere → also toggles terminal (legacy trigger, kept as backup)
    useSecretShortcut("ssh", useCallback(() => setTermOpen(o => !o), []));
    useSecretShortcut("cg", useCallback(() => setTermOpen(o => !o), []));
    // Type "tweak" anywhere → toggle the design tweaks panel
    // The panel listens for __activate_edit_mode / __deactivate_edit_mode postMessages
    // (its built-in host protocol). It also posts __edit_mode_dismissed when the user
    // clicks its own X — we mirror that into our local state.
    useSecretShortcut("tweak", useCallback(() => setTweaksOpen(o => !o), []));
    useEffect(() => {
      window.postMessage({
        type: tweaksOpen ? "__activate_edit_mode" : "__deactivate_edit_mode"
      }, "*");
    }, [tweaksOpen]);
    useEffect(() => {
      const onMsg = e => {
        if (e?.data?.type === "__edit_mode_dismissed") setTweaksOpen(false);
      };
      window.addEventListener("message", onMsg);
      return () => window.removeEventListener("message", onMsg);
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
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Sidebar, {
      onNav: navigate
    }), /*#__PURE__*/React.createElement(TopNav, {
      page: page,
      onNav: navigate
    }), /*#__PURE__*/React.createElement(BotanicalAnchor, {
      page: page
    }), /*#__PURE__*/React.createElement("main", {
      className: "page"
    }, /*#__PURE__*/React.createElement("div", {
      className: "page-slot",
      hidden: page !== "home"
    }, /*#__PURE__*/React.createElement(HomePage, {
      onNav: navigate,
      tweaks: t,
      paused: termOpen
    })), /*#__PURE__*/React.createElement("div", {
      className: "page-slot",
      hidden: page !== "about"
    }, /*#__PURE__*/React.createElement(AboutPage, {
      tweaks: t
    })), /*#__PURE__*/React.createElement("div", {
      className: "page-slot",
      hidden: page !== "projects"
    }, /*#__PURE__*/React.createElement(ProjectsPage, {
      tweaks: t
    })), /*#__PURE__*/React.createElement(PageFooter, {
      page: page
    })),
    // ###### EASTER EGGS ######
    t.showLeafParticles && /*#__PURE__*/React.createElement(LeafParticles, {
      enabled: true
    }),
    // Walking pixel character disabled — uncomment to bring it back:
    // t.showPixelCharacter && React.createElement(PixelCharacter,  { enabled: true }),

    // Idle garden — pixel plants grow from the bottom after 10s of stillness.
    // Paused (retreats) while the terminal or tweaks panel is open.
    t.showIdleGarden && /*#__PURE__*/React.createElement(IdleGarden, {
      enabled: true,
      paused: termOpen || tweaksOpen
    }), /*#__PURE__*/React.createElement(Terminal, {
      open: termOpen,
      onClose: closeTerminal,
      autoLaunchGame: autoLaunchGame
    }), /*#__PURE__*/React.createElement(TweaksPanel, {
      title: "Tweaks"
    }, /*#__PURE__*/React.createElement(TweakSection, {
      label: "Identity"
    }), /*#__PURE__*/React.createElement(TweakColor, {
      label: "Accent",
      value: t.accent,
      options: ACCENT_PALETTES.map(p => p[0]),
      onChange: v => setTweak("accent", v)
    }), /*#__PURE__*/React.createElement(TweakSlider, {
      label: "Headline scale",
      value: t.headlineSize,
      min: 0.8,
      max: 1.3,
      step: 0.05,
      unit: "\xD7",
      onChange: v => setTweak("headlineSize", v)
    }), /*#__PURE__*/React.createElement(TweakSection, {
      label: "Pixel layer"
    }), /*#__PURE__*/React.createElement(TweakToggle, {
      label: "Pixel art icons + dividers",
      value: t.showPixelArt,
      onChange: v => setTweak("showPixelArt", v)
    }), /*#__PURE__*/React.createElement(TweakToggle, {
      label: "Walking pixel character",
      value: t.showPixelCharacter,
      onChange: v => setTweak("showPixelCharacter", v)
    }), /*#__PURE__*/React.createElement(TweakSection, {
      label: "Interactivity"
    }), /*#__PURE__*/React.createElement(TweakToggle, {
      label: "Leaf particles on cursor",
      value: t.showLeafParticles,
      onChange: v => setTweak("showLeafParticles", v)
    }), /*#__PURE__*/React.createElement(TweakToggle, {
      label: "Idle garden (grows after 10s)",
      value: t.showIdleGarden,
      onChange: v => setTweak("showIdleGarden", v)
    }), /*#__PURE__*/React.createElement(TweakToggle, {
      label: "Sound effects (opt-in)",
      value: t.soundEnabled,
      onChange: v => setTweak("soundEnabled", v)
    })));
  }
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(/*#__PURE__*/React.createElement(App, null));
})();
