(function () {
  /* global React */
  // ─────────────────────────────────────────────────────────────
  // Chrome — Sidebar, TopNav, BotanicalAnchor, Footer
  // Persistent across all pages
  // ─────────────────────────────────────────────────────────────

  const {
    useEffect,
    useState
  } = React;

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
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }

  // ###### SVG ICON SET ######
  // Stroke-based, forest green
  function Ico({
    name
  }) {
    const common = {
      width: 18,
      height: 18,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      focusable: false
    };
    if (name === "github") return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M9 19c-4.3 1.4-4.3-2.5-6-3M15 22v-4a3 3 0 0 0-.9-2.4c3-.3 6-1.5 6-6.7A5.2 5.2 0 0 0 18.7 5a4.8 4.8 0 0 0-.1-3.6S17.3 1 15 2.7a13.4 13.4 0 0 0-7 0C5.7 1 4.4 1.4 4.4 1.4A4.8 4.8 0 0 0 4.3 5a5.2 5.2 0 0 0-1.4 3.6c0 5.2 3 6.4 6 6.7A3 3 0 0 0 8 18v4"
    }));
    if (name === "linkedin") return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"
    }), /*#__PURE__*/React.createElement("rect", {
      x: 2,
      y: 9,
      width: 4,
      height: 12
    }), /*#__PURE__*/React.createElement("circle", {
      cx: 4,
      cy: 4,
      r: 2
    }));
    if (name === "stack") return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M3 12h14M3 16h14M3 8l13 2M5 4l11 4M17 18v3H3v-3"
    }));
    if (name === "pin") return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: 12,
      cy: 10,
      r: 3
    }));
    if (name === "mail") return /*#__PURE__*/React.createElement("svg", common, /*#__PURE__*/React.createElement("path", {
      d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M22 6l-10 7L2 6"
    }));
    return null;
  }

  // ###### SIDEBAR ######
  function Sidebar({
    onNav
  }) {
    const [theme, setTheme] = useState(readStoredTheme);
    useEffect(() => {
      applyTheme(theme);
    }, [theme]);
    const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
    return /*#__PURE__*/React.createElement("aside", {
      className: "sidebar"
    }, /*#__PURE__*/React.createElement("a", {
      className: "brand",
      href: "#",
      onClick: e => {
        e.preventDefault();
        if (onNav) onNav("home");
      },
      "aria-label": "Cristian Gabriel, Home",
      title: "Home"
    }, /*#__PURE__*/React.createElement("span", {
      className: "brand-mark"
    }, /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 40 56",
      width: 44,
      height: 60,
      fill: "none"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M 20 54 C 20 44 18 36 18 28",
      stroke: "var(--forest)",
      strokeWidth: 1.4,
      strokeLinecap: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M 18 28 C 4 22 2 10 6 2 C 18 4 22 18 18 28 Z",
      fill: "var(--forest)"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M 19 36 C 30 32 34 24 32 16 C 22 18 18 28 19 36 Z",
      stroke: "var(--forest)",
      strokeWidth: 1.3
    }), /*#__PURE__*/React.createElement("circle", {
      cx: 20,
      cy: 54,
      r: 1.4,
      fill: "var(--forest)"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "brand-rule"
    }), /*#__PURE__*/React.createElement("div", {
      className: "brand-name"
    }, /*#__PURE__*/React.createElement("span", null, "Cristian"), /*#__PURE__*/React.createElement("span", null, "Gabriel")), /*#__PURE__*/React.createElement("div", {
      className: "brand-role"
    }, "Software Developer")), /*#__PURE__*/React.createElement("nav", {
      className: "sidebar-socials",
      "aria-label": "Social and contact links"
    }, /*#__PURE__*/React.createElement("a", {
      className: "social",
      href: "https://github.com/cristiangabriel88",
      target: "_blank",
      rel: "noopener"
    }, /*#__PURE__*/React.createElement("span", {
      className: "social-ico"
    }, /*#__PURE__*/React.createElement(Ico, {
      name: "github"
    })), /*#__PURE__*/React.createElement("span", {
      className: "social-label"
    }, "GitHub")), /*#__PURE__*/React.createElement("a", {
      className: "social",
      href: "https://www.linkedin.com/in/cristian-gabriel-constantinescu-781a6b237",
      target: "_blank",
      rel: "noopener"
    }, /*#__PURE__*/React.createElement("span", {
      className: "social-ico"
    }, /*#__PURE__*/React.createElement(Ico, {
      name: "linkedin"
    })), /*#__PURE__*/React.createElement("span", {
      className: "social-label"
    }, "LinkedIn")), /*#__PURE__*/React.createElement("a", {
      className: "social",
      href: "https://stackoverflow.com/users/18754276/cristiangabriel",
      target: "_blank",
      rel: "noopener"
    }, /*#__PURE__*/React.createElement("span", {
      className: "social-ico"
    }, /*#__PURE__*/React.createElement(Ico, {
      name: "stack"
    })), /*#__PURE__*/React.createElement("span", {
      className: "social-label"
    }, "Stack Overflow")), /*#__PURE__*/React.createElement("a", {
      className: "social",
      href: "https://www.google.com/maps/search/?api=1&query=Bucharest%2C+Romania",
      target: "_blank",
      rel: "noopener noreferrer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "social-ico"
    }, /*#__PURE__*/React.createElement(Ico, {
      name: "pin"
    })), /*#__PURE__*/React.createElement("span", {
      className: "social-label"
    }, "Bucharest, RO")), /*#__PURE__*/React.createElement("a", {
      className: "social",
      href: "mailto:me@cristiangabriel.dev"
    }, /*#__PURE__*/React.createElement("span", {
      className: "social-ico"
    }, /*#__PURE__*/React.createElement(Ico, {
      name: "mail"
    })), /*#__PURE__*/React.createElement("span", {
      className: "social-label"
    }, "Email me"))), /*#__PURE__*/React.createElement("div", {
      className: "sidebar-footer"
    }, /*#__PURE__*/React.createElement("span", null, "\xA9", " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--serif)",
        fontStyle: "italic",
        textTransform: "none",
        fontSize: 12,
        letterSpacing: 0
      }
    }, new Date().getFullYear())), /*#__PURE__*/React.createElement("button", {
      className: "theme-toggle",
      onClick: toggleTheme,
      title: theme === "dark" ? "Light mode" : "Dark mode",
      "aria-label": "Toggle theme"
    }, theme === "dark" ? /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 16 16",
      width: 13,
      height: 13,
      fill: "currentColor",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: 8,
      cy: 8,
      r: 3
    }), /*#__PURE__*/React.createElement("g", {
      stroke: "currentColor",
      strokeWidth: 1.2,
      strokeLinecap: "round"
    }, /*#__PURE__*/React.createElement("line", {
      x1: 8,
      y1: 1,
      x2: 8,
      y2: 3
    }), /*#__PURE__*/React.createElement("line", {
      x1: 8,
      y1: 13,
      x2: 8,
      y2: 15
    }), /*#__PURE__*/React.createElement("line", {
      x1: 1,
      y1: 8,
      x2: 3,
      y2: 8
    }), /*#__PURE__*/React.createElement("line", {
      x1: 13,
      y1: 8,
      x2: 15,
      y2: 8
    }), /*#__PURE__*/React.createElement("line", {
      x1: 3,
      y1: 3,
      x2: 4.4,
      y2: 4.4
    }), /*#__PURE__*/React.createElement("line", {
      x1: 11.6,
      y1: 11.6,
      x2: 13,
      y2: 13
    }), /*#__PURE__*/React.createElement("line", {
      x1: 3,
      y1: 13,
      x2: 4.4,
      y2: 11.6
    }), /*#__PURE__*/React.createElement("line", {
      x1: 11.6,
      y1: 4.4,
      x2: 13,
      y2: 3
    }))) : /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 16 16",
      width: 13,
      height: 13,
      fill: "currentColor",
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M 8 1 A 7 7 0 1 0 15 8 A 5 5 0 0 1 8 1 Z"
    })))));
  }

  // ###### TOP NAV ######
  function TopNav({
    page,
    onNav
  }) {
    const pages = [{
      id: "home",
      label: "Home"
    }, {
      id: "about",
      label: "About"
    }, {
      id: "projects",
      label: "Projects"
    }];
    return /*#__PURE__*/React.createElement("nav", {
      className: "topnav",
      "aria-label": "Primary"
    }, pages.map(p => /*#__PURE__*/React.createElement("button", {
      key: p.id,
      className: "nav-btn" + (page === p.id ? " active" : ""),
      onClick: () => onNav(p.id),
      "aria-current": page === p.id ? "page" : undefined
    }, p.label)));
  }

  // ###### BOTANICAL ANCHOR ######
  // Decorative plant photo per page. home.png and about.png have black/colored
  // backgrounds and render as-is; the projects anchor is a white-bg PNG that
  // uses mix-blend-multiply (see styles.css) to drop the white cleanly.
  const BOTANICAL_SRC = {
    home: "resources/images/home.webp",
    about: "resources/images/about.webp",
    projects: "resources/images/contact2.webp"
  };
  function BotanicalAnchor({
    page
  }) {
    return /*#__PURE__*/React.createElement("img", {
      key: page,
      className: `botanical ${page} fade-in`,
      src: BOTANICAL_SRC[page],
      alt: "",
      "aria-hidden": "true",
      draggable: "false"
    });
  }

  // ###### FOOTER ######
  function PageFooter({
    page
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "footer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ssh-hint",
      style: {
        color: "var(--forest)",
        letterSpacing: "0.22em"
      }
    }, "Type ", /*#__PURE__*/React.createElement("span", {
      className: "ssh-word"
    }, "ssh"), " to open a shell"));
  }
  Object.assign(window, {
    Sidebar,
    TopNav,
    BotanicalAnchor,
    PageFooter,
    Ico
  });
})();
