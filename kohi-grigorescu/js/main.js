/* Kōhī Grigorescu — interactions
   Lenis smooth scroll + GSAP (ScrollTrigger, SplitText, Flip).
   Everything degrades to a static, fully readable page. */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var I = window.KohiI18n;
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger && window.SplitText);
  var lenis = null;
  var mm = null;

  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    if (window.Flip) gsap.registerPlugin(Flip);
    root.classList.add('has-gsap');
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------------------------------------------------------
     Opening hours → live status (Europe/Bucharest time)
     --------------------------------------------------------- */
  var HOURS = { 0: ['08:00', '18:00'], 1: ['07:30', '18:00'], 2: ['07:30', '18:00'], 3: ['07:30', '18:00'],
                4: ['07:30', '18:00'], 5: ['07:30', '18:00'], 6: ['08:00', '18:00'] };
  var toMin = function (s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; };

  function nowBucharest() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Bucharest', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var get = function (t) { return parts.filter(function (x) { return x.type === t; })[0].value; };
      return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), min: +get('hour') * 60 + +get('minute') };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  }

  function updateStatus() {
    var n = nowBucharest();
    var h = HOURS[n.day];
    var open = n.min >= toMin(h[0]) && n.min < toMin(h[1]);
    var text = open ? I.t('status.open').replace('{t}', h[1])
      : n.min < toMin(h[0]) ? I.t('status.closed').replace('{t}', h[0])
      : I.t('status.closedTomorrow').replace('{t}', HOURS[(n.day + 1) % 7][0]);
    $$('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', open);
      $('[data-status-text]', el).textContent = text;
    });
    $$('.hours tr').forEach(function (tr) {
      var today = +tr.getAttribute('data-day') === n.day;
      tr.classList.toggle('is-today', today);
      $('th', tr).setAttribute('data-today', today ? I.t('today') : '');
    });
  }

  function formatCounts() {
    var sep = I.lang === 'ro' ? ',' : '.';
    $$('.count').forEach(function (el) {
      var dec = +(el.getAttribute('data-dec') || 0);
      el.textContent = parseFloat(el.getAttribute('data-to')).toFixed(dec).replace('.', sep);
    });
  }

  /* ---------------------------------------------------------
     Live Google rating + review count (Places API, New)
     Needs a browser key restricted to this site's domain and to the
     Places API (New). Empty key → the hardcoded fallback numbers stay.
     --------------------------------------------------------- */
  var PLACES_KEY = '';
  var PLACE_ID = 'ChIJE7YCXlb_sUARA2MuQ5eKyZQ';
  var GOOGLE_CACHE = 'kohi-google';
  var GOOGLE_TTL = 6 * 60 * 60 * 1000; /* reuse a visitor's last fetch for 6h to limit API cost */

  function applyGoogle(rating, total) {
    if (!(rating > 0) || !(total > 0)) return;
    var reviews = total >= 20 ? Math.floor(total / 10) * 10 : total; /* "380+" style */
    I.vars.rating = rating;
    I.vars.reviews = reviews;
    $$('[data-g]').forEach(function (el) {
      el.setAttribute('data-to', el.getAttribute('data-g') === 'rating' ? rating : reviews);
      /* counters waiting for their scroll trigger will read the new value themselves */
      if (el._countTween && el._countTween.progress() < 1) return;
      var dec = +(el.getAttribute('data-dec') || 0);
      el.textContent = parseFloat(el.getAttribute('data-to')).toFixed(dec).replace('.', I.lang === 'ro' ? ',' : '.');
    });
    $$('[data-g-stars]').forEach(function (el) {
      el.style.setProperty('--r', rating);
      el.setAttribute('aria-label', rating.toFixed(1) + ' / 5');
    });
    $$('[data-i18n="reviews.sub"]').forEach(function (el) { el.innerHTML = I.t('reviews.sub'); });
    buildMarquee();
  }

  function loadGoogle() {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(GOOGLE_CACHE)); } catch (e) {}
    if (cached) applyGoogle(cached.rating, cached.total);
    if (!PLACES_KEY || !window.fetch || (cached && Date.now() - cached.at < GOOGLE_TTL)) return;
    fetch('https://places.googleapis.com/v1/places/' + PLACE_ID + '?fields=rating,userRatingCount&key=' + PLACES_KEY)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        applyGoogle(d.rating, d.userRatingCount);
        try { localStorage.setItem(GOOGLE_CACHE, JSON.stringify({ rating: d.rating, total: d.userRatingCount, at: Date.now() })); } catch (e) {}
      })
      .catch(function () { /* keep whatever is shown */ });
  }

  /* ---------------------------------------------------------
     Marquee content (from i18n)
     --------------------------------------------------------- */
  var DOT = '<svg class="marquee__dot" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 0c1 5.5 4.5 9 10 10-5.5 1-9 4.5-10 10-1-5.5-4.5-9-10-10C5.5 9 9 5.5 10 0Z"/></svg>';
  function buildMarquee() {
    $$('[data-marquee]').forEach(function (track) {
      var items = I.t('marquee.' + track.getAttribute('data-marquee'));
      var one = items.map(function (i) { return '<span class="marquee__item">' + i + '</span>' + DOT; }).join('');
      var group = '<div class="marquee__group">' + one + one + one + '</div>';
      track.innerHTML = group + group;
    });
  }

  /* ---------------------------------------------------------
     Smooth scroll
     --------------------------------------------------------- */
  if (hasGSAP && window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var el = document.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    setMenu(false);
    if (a.classList.contains('totop')) {
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    scrollToEl(el);
  });

  /* ---------------------------------------------------------
     Nav: solid on scroll, progress bar
     --------------------------------------------------------- */
  var nav = $('.nav');
  var bar = $('.progress span');
  var ticking = false, menuOpen = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    nav.classList.toggle('is-solid', y > 40);
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------------------------------------------------------
     Mobile menu
     --------------------------------------------------------- */
  var burger = $('.nav__burger');
  var mmenu = $('.mmenu');
  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    mmenu.classList.toggle('is-open', open);
    mmenu.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && hasGSAP && !reduce) {
      gsap.fromTo('.mmenu__links a', { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06, delay: 0.25, ease: 'expo.out' });
    }
  }
  burger.addEventListener('click', function () { setMenu(!menuOpen); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  /* ---------------------------------------------------------
     Language toggle (crossfade + rebuild split animations)
     --------------------------------------------------------- */
  $$('[data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = b.getAttribute('data-lang');
      if (next === I.lang) return;
      if (hasGSAP && !reduce) {
        gsap.to('main, .nav__links, .mmenu__links', { opacity: 0, duration: 0.25, onComplete: function () {
          I.set(next);
          gsap.to('main, .nav__links, .mmenu__links', { opacity: 1, duration: 0.45 });
        } });
      } else {
        I.set(next);
      }
    });
  });

  I.on(function (lang, phase) {
    if (phase === 'before') {
      if (mm) { mm.revert(); mm = null; }
      return;
    }
    buildMarquee();
    updateStatus();
    formatCounts();
    if (hasGSAP) {
      var y = window.scrollY;
      initScroll();
      ScrollTrigger.refresh();
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
    }
  });

  /* ---------------------------------------------------------
     Scroll effects (all inside one matchMedia so they revert cleanly)
     --------------------------------------------------------- */
  function initScroll() {
    mm = gsap.matchMedia();
    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 901px)',
      fine: '(hover: hover) and (pointer: fine)'
    }, function (ctx) {
      var c = ctx.conditions;
      var cleanups = [];
      if (!c.motion) return;

      /* marquee: constant drift, speeds up and flips with scroll velocity */
      (function () {
        var rows = $$('.marquee__row').map(function (row) {
          return { track: $('.marquee__track', row), dir: +row.getAttribute('data-dir'), x: 0, speed: row.classList.contains('marquee__row--alt') ? 1.6 : 1.1 };
        });
        var vel = 0, sign = 1;
        var wrap = gsap.utils.wrap(-100 / 2, 0);
        ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: function (s) { vel = Math.abs(s.getVelocity()); sign = s.direction; } });
        var tick = function (time, dt) {
          vel *= 0.92;
          var boost = 1 + Math.min(vel / 260, 7);
          rows.forEach(function (r) {
            r.x = wrap(r.x - r.dir * sign * r.speed * boost * (dt / 1000));
            gsap.set(r.track, { xPercent: r.x });
          });
        };
        gsap.ticker.add(tick);
        cleanups.push(function () { gsap.ticker.remove(tick); });
      })();

      /* hero parallax */
      gsap.to('.hero__media', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__content', { yPercent: -18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

      /* story: quick curtain open + punchy word rise, then gentle parallax (no pin) */
      (function () {
        var title = SplitText.create('.story__title span', { type: 'words', mask: 'words' });
        var tl = gsap.timeline({ scrollTrigger: { trigger: '.story__pin', start: 'top 70%', toggleActions: 'play none none reverse' } });
        tl.fromTo('.story__media',
            { clipPath: c.desktop ? 'inset(14% 14% 14% 14% round 28px)' : 'inset(10% 5% 10% 5% round 20px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1.1, ease: 'expo.out' }, 0)
          .from(title.words, { yPercent: 120, rotate: 6, duration: 0.9, stagger: 0.07, ease: 'expo.out' }, 0.15);
        gsap.fromTo('.story__media img', { yPercent: -8, scale: 1.18 }, { yPercent: 8, scale: 1.18, ease: 'none',
          scrollTrigger: { trigger: '.story__pin', start: 'top bottom', end: 'bottom top', scrub: true } });
      })();

      gsap.fromTo('.story__sun', { yPercent: 140, scale: 0.7 }, { yPercent: -30, scale: 1, ease: 'none',
        scrollTrigger: { trigger: '.story__body', start: 'top bottom', end: 'bottom 30%', scrub: true } });

      /* word-by-word paragraph */
      $$('[data-words]').forEach(function (el) {
        var s = SplitText.create(el, { type: 'words' });
        gsap.fromTo(s.words, { opacity: 0.14 }, { opacity: 1, stagger: 0.1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 55%', scrub: true } });
      });

      /* masked line reveals for headings */
      $$('.reveal-lines').forEach(function (el) {
        var s = SplitText.create(el, { type: 'lines', mask: 'lines' });
        gsap.from(s.lines, { yPercent: 105, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });

      $$('.eyebrow').forEach(function (el) {
        if (el.closest('.hero')) return;
        gsap.from(el, { opacity: 0, x: -24, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
      });

      /* counters */
      $$('.count').forEach(function (el) {
        var dec = +(el.getAttribute('data-dec') || 0);
        var sep = I.lang === 'ro' ? ',' : '.';
        var o = { p: 0 };
        el.textContent = (0).toFixed(dec).replace('.', sep);
        /* animate progress, read data-to live so late Google data is picked up */
        el._countTween = gsap.to(o, { p: 1, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' },
          onUpdate: function () { el.textContent = (o.p * parseFloat(el.getAttribute('data-to'))).toFixed(dec).replace('.', sep); } });
        cleanups.push(function () { el._countTween = null; });
      });

      /* menu: sticky stacked cards */
      var cards = $$('.card');
      cards.forEach(function (card, i) {
        var img = $('.card__media img', card);
        gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 25%', scrub: true } });
        gsap.from($$('.items li', card), { opacity: 0, y: 18, stagger: 0.06, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 65%' } });
        var next = cards[i + 1];
        if (!next) return;
        /* only a soft scale-back as the next card slides over — no darkening */
        gsap.to(card, { scale: 0.95, ease: 'none', force3D: true, scrollTrigger: { trigger: next, start: 'top 85%',
          end: function () { return 'top ' + (parseFloat(getComputedStyle(next).top) || 0) + 'px'; }, scrub: 0.4, invalidateOnRefresh: true } });
      });

      /* the space: pinned horizontal scroll on desktop */
      if (c.desktop) {
        var sec = $('.space');
        var track = $('.space__track');
        sec.classList.add('is-h');
        var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
        var hTween = gsap.to(track, { x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true } });
        $$('.space__img img', sec).forEach(function (img) {
          gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none',
            scrollTrigger: { trigger: img.parentNode, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true } });
        });
        $$('.space__fig', sec).forEach(function (fig, i) {
          gsap.from(fig, { y: i % 2 ? -50 : 50, rotate: i % 2 ? -2.5 : 2.5, ease: 'none',
            scrollTrigger: { trigger: fig, containerAnimation: hTween, start: 'left right', end: 'center 60%', scrub: true } });
        });
        cleanups.push(function () { sec.classList.remove('is-h'); });
      } else {
        gsap.from('.space__fig', { opacity: 0, x: 60, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.space', start: 'top 70%' } });
      }

      /* image curtain reveals */
      $$('.reveal-img').forEach(function (el) {
        var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 80%' } });
        tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 30px)' }, { clipPath: 'inset(0% 0% 0% 0% round 30px)', duration: 1.5, ease: 'expo.inOut' })
          .from($('img', el), { scale: 1.35, duration: 2, ease: 'expo.out' }, 0.2);
      });

      /* gallery tiles */
      gsap.from('.tile', { y: 70, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: { each: 0.06 },
        scrollTrigger: { trigger: '.bento', start: 'top 82%' } });

      /* reviews + chips */
      gsap.from('.quote', { x: 90, opacity: 0, stagger: 0.12, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.quotes', start: 'top 80%' } });
      gsap.from('.chips li', { y: 24, opacity: 0, stagger: 0.05, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: '.chips', start: 'top 88%' } });
      gsap.from('.stars__fill', { width: 0, duration: 1.8, ease: 'power3.inOut', scrollTrigger: { trigger: '.stars', start: 'top 90%' } });

      /* footer wordmark rises */
      gsap.from('.foot__word span', { yPercent: 55, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });

      /* magnetic buttons (mouse only) */
      if (c.fine) {
        $$('.magnetic').forEach(function (el) {
          var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
          var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
          var move = function (e) {
            var r = el.getBoundingClientRect();
            xTo((e.clientX - (r.left + r.width / 2)) * 0.3);
            yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
          };
          var leave = function () { xTo(0); yTo(0); };
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerleave', leave);
          cleanups.push(function () { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); gsap.set(el, { x: 0, y: 0 }); });
        });
      }

      return function () { cleanups.forEach(function (fn) { fn(); }); };
    });
  }

  /* ---------------------------------------------------------
     Preloader + hero entrance
     --------------------------------------------------------- */
  function intro() {
    var loader = $('.loader');
    if (!hasGSAP || reduce) { if (loader) loader.remove(); return; }
    loader.style.animation = 'none';
    if (lenis) lenis.stop();

    var seen = false;
    try { seen = sessionStorage.getItem('kohi-seen') === '1'; sessionStorage.setItem('kohi-seen', '1'); } catch (e) {}

    var letters = $$('.loader__word span');
    var count = $('.loader__count');
    var heroChars = SplitText.create('.hero__word', { type: 'chars', mask: 'chars' }).chars;
    var o = { v: 0 };

    var tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: function () {
      loader.remove();
      if (lenis) lenis.start();
    } });
    tl.from(letters, { yPercent: 120, duration: 1.1, stagger: 0.08 }, 0)
      .from('.loader .steam', { opacity: 0, y: 12, duration: 1 }, 0.3)
      .to(o, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: function () { count.textContent = String(Math.round(o.v)).padStart(3, '0'); } }, 0)
      .to(letters, { yPercent: -120, duration: 0.7, stagger: 0.05, ease: 'expo.in' }, 1.6)
      .to('.loader__meta, .loader .steam', { opacity: 0, duration: 0.4 }, 1.6)
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, 2.1)
      .from('.hero__media img', { scale: 1.35, duration: 2.4, ease: 'expo.out' }, 2.3)
      .from(heroChars, { yPercent: 110, duration: 1.4, stagger: 0.07 }, 2.45)
      .from('.hero__eyebrow, .hero__lead, .hero__ctas .btn, .nav > *, .hero__side, .hero__scroll', { opacity: 0, y: 24, duration: 1.1, stagger: 0.06 }, 2.7);
    if (seen) tl.timeScale(2.2);
  }

  /* ---------------------------------------------------------
     Gallery lightbox (Flip from tile to fullscreen)
     --------------------------------------------------------- */
  (function () {
    var tiles = $$('.tile');
    var lb = $('.lightbox');
    var lbImg = $('.lightbox__img');
    var counter = $('.lightbox__count');
    var idx = 0, isOpen = false, busy = false;
    var canFlip = hasGSAP && window.Flip && !reduce;

    function thumb(i) { return $('img', tiles[i]); }
    function setCount() { counter.textContent = (idx + 1) + ' / ' + tiles.length; }
    function ready(img) { return img.decode ? img.decode().catch(function () {}) : Promise.resolve(); }

    function open(i) {
      if (busy) return;
      idx = i; isOpen = true; busy = true;
      var t = thumb(i);
      lbImg.src = t.currentSrc || t.src;
      lbImg.alt = t.alt;
      setCount();
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop();
      ready(lbImg).then(function () {
        if (canFlip) {
          t.setAttribute('data-flip-id', 'lb');
          lbImg.setAttribute('data-flip-id', 'lb');
          var state = Flip.getState(t);
          gsap.set(t, { opacity: 0 });
          Flip.from(state, { targets: lbImg, duration: 0.9, ease: 'expo.inOut', onComplete: function () {
            gsap.set(lbImg, { clearProps: 'all' });
            busy = false;
          } });
        } else { busy = false; }
        $('.lightbox__close').focus({ preventScroll: true });
      });
    }

    function close() {
      if (!isOpen || busy) return;
      busy = true;
      var t = thumb(idx);
      var done = function () {
        lb.classList.remove('is-open');
        lb.setAttribute('aria-hidden', 'true');
        if (window.gsap) gsap.set([t, lbImg], { clearProps: "all" });
        lbImg.removeAttribute('src');
        isOpen = false; busy = false;
        if (lenis) lenis.start();
        tiles[idx].focus({ preventScroll: true });
      };
      if (canFlip) {
        gsap.set(t, { opacity: 0 });
        Flip.fit(lbImg, t, { duration: 0.75, ease: 'expo.inOut', scale: false, onComplete: function () { gsap.set(t, { opacity: 1 }); done(); } });
      } else done();
    }

    function go(d) {
      if (!isOpen || busy) return;
      if (canFlip) gsap.set(thumb(idx), { opacity: 1 });
      idx = (idx + d + tiles.length) % tiles.length;
      var t = thumb(idx);
      var swap = function () {
        lbImg.src = t.currentSrc || t.src;
        setCount();
        return ready(lbImg);
      };
      if (hasGSAP && !reduce) {
        busy = true;
        gsap.to(lbImg, { opacity: 0, x: -40 * d, duration: 0.25, ease: 'power2.in', onComplete: function () {
          swap().then(function () {
            gsap.fromTo(lbImg, { opacity: 0, x: 40 * d }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out', onComplete: function () { busy = false; } });
          });
        } });
      } else swap();
    }

    tiles.forEach(function (tile, i) { tile.addEventListener('click', function () { open(i); }); });
    $('.lightbox__close').addEventListener('click', close);
    $('.lightbox__bg').addEventListener('click', close);
    $('.lightbox__prev').addEventListener('click', function () { go(-1); });
    $('.lightbox__next').addEventListener('click', function () { go(1); });
    addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    });
    var sx = null;
    lb.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    lb.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    });
  })();

  /* ---------------------------------------------------------
     Reviews: buttons + mouse drag
     --------------------------------------------------------- */
  (function () {
    var row = $('.quotes__row');
    if (!row) return;
    $$('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = $('.quote', row);
        var step = q ? q.getBoundingClientRect().width + 16 : 300;
        row.scrollBy({ left: step * +b.getAttribute('data-q'), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
    var down = false, startX = 0, startL = 0;
    row.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; startX = e.clientX; startL = row.scrollLeft;
      row.classList.add('is-drag');
      row.setPointerCapture(e.pointerId);
    });
    row.addEventListener('pointermove', function (e) { if (down) row.scrollLeft = startL - (e.clientX - startX); });
    var up = function () { if (!down) return; down = false; row.classList.remove('is-drag'); };
    row.addEventListener('pointerup', up);
    row.addEventListener('pointercancel', up);
  })();

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  buildMarquee();
  updateStatus();
  formatCounts();
  loadGoogle();
  setInterval(updateStatus, 60 * 1000);
  onScroll();

  if (hasGSAP) {
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (r) { setTimeout(r, 1800); });
    Promise.race([fontsReady, timeout]).then(function () {
      intro();
      initScroll();
      addEventListener('load', function () { ScrollTrigger.refresh(); });
    });
  } else {
    var l = $('.loader');
    if (l) l.remove();
  }
})();
