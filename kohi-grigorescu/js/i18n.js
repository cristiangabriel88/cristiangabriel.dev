/* Kōhī Grigorescu — RO / EN copy.
   Menu prices are placeholders: edit them in index.html. */
(function () {
  var dict = {
    ro: {
      'nav.story': 'Poveste', 'nav.menu': 'Meniu', 'nav.space': 'Spațiul', 'nav.reviews': 'Recenzii', 'nav.visit': 'Vizită',
      'alt.hero': 'Interiorul cafenelei Kohi Grigorescu', 'alt.story': 'Barul Kohi',
      'alt.espresso': 'Espresso cu cremă', 'alt.filter': 'Pungi de cafea din Kenya și Etiopia pe raft', 'alt.cold': 'Două frappé-uri cu caramel pe o bancă de lemn', 'alt.food': 'Băutură caldă cu lapte și condimente',
      'hero.eyebrow': 'Specialty coffee · Grigorescu, București',
      'hero.lead': 'Coffee &amp; more. Un coffee-bar mic pe bulevardul Nicolae Grigorescu, chiar vizavi de Piața Sălăjan.',
      'hero.cta1': 'Vezi meniul', 'hero.cta2': 'Cum ajungi', 'hero.scroll': 'Scroll',
      'story.eyebrow': 'Povestea',
      'story.title': 'Căutau soare de dimineață.',
      'story.text': 'Alex și Marcu au descoperit cafeaua de specialitate acum câțiva ani. Când și-au ales locul, au căutat doar două lucruri: soare de dimineață și un cartier în care nu exista încă specialty coffee. Așa a apărut Kohi, un coffee-bar pe bulevardul Nicolae Grigorescu, chiar vizavi de Piața Sălăjan.',
      'facts.rating': 'nota pe Google', 'facts.reviews': 'recenzii', 'facts.open': 'deschidem în zilele lucrătoare', 'facts.days': 'zile pe săptămână',
      'menu.eyebrow': 'Meniu', 'menu.title': 'Ce e în ceașcă.',
      'menu.lead': 'De la espresso la filtru, cu single origin din Etiopia și blend-ul Columbia. Plus ceva dulce lângă.',
      'menu.note': 'Prețuri orientative, în lei · meniul complet la bar',
      'menu.c1': 'Espresso bar', 'menu.c2': 'Filtru &amp; origini', 'menu.c3': 'Reci', 'menu.c4': 'Ceva cald &amp; ceva dulce',
      'menu.sig': 'preferatul oaspeților', 'menu.col': 'Blend Columbia', 'menu.frappe': 'Frappé caramel', 'menu.batch': 'Batch brew', 'menu.eth': 'Etiopia, single origin',
      'menu.choc': 'Ciocolată caldă', 'menu.tea': 'Ceai', 'menu.lemon': 'Limonadă', 'menu.cake': 'Prăjitura zilei', 'menu.brunch': 'Mic dejun / brunch',
      'space.eyebrow': 'Spațiul', 'space.title': 'Un mic colț de rai, în spate.',
      'space.quote': '„Cafea de top și grădină liniștită în zona Grigorescu”',
      'space.hint': 'Derulează →',
      'space.f1': 'Grădina', 'space.f2': 'Copacul din spate', 'space.f3': 'Seara, sub luminițe', 'space.f4': 'Colțul portocaliu', 'space.f5': 'Vitrina de pe bulevard', 'space.f6': 'Sub lămpile de aramă',
      'gallery.eyebrow': 'Galerie', 'gallery.title': 'O zi obișnuită la Kohi.',
      'gallery.credit': 'Fotografii de la oaspeții noștri, via Google Maps.',
      'reviews.eyebrow': 'Recenzii Google', 'reviews.sub': 'din peste {reviews} de recenzii', 'reviews.cta': 'Citește pe Google',
      'amen.title': 'Bine de știut',
      'amen.garden': 'Grădină în spate', 'amen.dogs': 'Câinii sunt bineveniți', 'amen.laptop': 'Bun pentru lucru pe laptop',
      'amen.access': 'Intrare accesibilă', 'amen.card': 'Card &amp; NFC', 'amen.take': 'La pachet', 'amen.brunch': 'Mic dejun &amp; brunch',
      'visit.eyebrow': 'Vizită', 'visit.title': 'Treci pe la noi.',
      'visit.near': 'Vizavi de Piața Sălăjan · aproape de metroul Nicolae Grigorescu',
      'visit.hours': 'Program', 'visit.dir': 'Indicații de drum',
      'd.0': 'Duminică', 'd.1': 'Luni', 'd.2': 'Marți', 'd.3': 'Miercuri', 'd.4': 'Joi', 'd.5': 'Vineri', 'd.6': 'Sâmbătă',
      'foot.top': 'Sus ↑',
      'status.open': 'Deschis acum · până la {t}',
      'status.closed': 'Închis · deschidem la {t}',
      'status.closedTomorrow': 'Închis · mâine de la {t}',
      'today': 'azi',
      'marquee.a': ['Specialty coffee', 'Flat white', 'Coffee &amp; more', 'Grădină în spate', 'Etiopia single origin', 'Câinii sunt bineveniți', 'Vizavi de Sălăjan'],
      'marquee.b': ['Bd. Nicolae Grigorescu 34D', 'L–V 07:30–18:00', 'S–D 08:00–18:00', 'コーヒー', '{rating} ★ pe Google']
    },
    en: {
      'nav.story': 'Story', 'nav.menu': 'Menu', 'nav.space': 'The space', 'nav.reviews': 'Reviews', 'nav.visit': 'Visit',
      'alt.hero': 'Inside Kohi Grigorescu coffee bar', 'alt.story': 'The bar at Kohi',
      'alt.espresso': 'Espresso with crema', 'alt.filter': 'Bags of Kenyan and Ethiopian coffee on a shelf', 'alt.cold': 'Two caramel frappés on a wooden bench', 'alt.food': 'Spiced hot milk drink',
      'hero.eyebrow': 'Specialty coffee · Grigorescu, Bucharest',
      'hero.lead': 'Coffee &amp; more. A small coffee bar on Nicolae Grigorescu boulevard, right across from the Sălăjan market.',
      'hero.cta1': 'See the menu', 'hero.cta2': 'Find us', 'hero.scroll': 'Scroll',
      'story.eyebrow': 'The story',
      'story.title': 'They were looking for morning sun.',
      'story.text': 'Alex and Marcu discovered specialty coffee a few years ago. When choosing a spot, they wanted just two things: morning sun and a neighbourhood with no specialty coffee yet. That is how Kohi came to be, a coffee bar on Nicolae Grigorescu boulevard, right across from the Sălăjan fresh market.',
      'facts.rating': 'rating on Google', 'facts.reviews': 'reviews', 'facts.open': 'we open on weekdays', 'facts.days': 'days a week',
      'menu.eyebrow': 'Menu', 'menu.title': 'What’s in the cup.',
      'menu.lead': 'From espresso to filter, with an Ethiopian single origin and the Colombia blend. Plus something sweet on the side.',
      'menu.note': 'Indicative prices, in lei · full menu at the bar',
      'menu.c1': 'Espresso bar', 'menu.c2': 'Filter &amp; origins', 'menu.c3': 'Cold', 'menu.c4': 'Something warm &amp; sweet',
      'menu.sig': 'guest favourite', 'menu.col': 'Colombia blend', 'menu.frappe': 'Caramel frappé', 'menu.batch': 'Batch brew', 'menu.eth': 'Ethiopia, single origin',
      'menu.choc': 'Hot chocolate', 'menu.tea': 'Tea', 'menu.lemon': 'Lemonade', 'menu.cake': 'Cake of the day', 'menu.brunch': 'Breakfast / brunch',
      'space.eyebrow': 'The space', 'space.title': 'A little corner of heaven, out back.',
      'space.quote': '“Top coffee and a quiet garden in the Grigorescu area”',
      'space.hint': 'Keep scrolling →',
      'space.f1': 'The garden', 'space.f2': 'The tree out back', 'space.f3': 'Evenings, under the lights', 'space.f4': 'The orange corner', 'space.f5': 'On the boulevard', 'space.f6': 'Under the copper lamps',
      'gallery.eyebrow': 'Gallery', 'gallery.title': 'An ordinary day at Kohi.',
      'gallery.credit': 'Photos by our guests, via Google Maps.',
      'reviews.eyebrow': 'Google reviews', 'reviews.sub': 'from {reviews}+ reviews', 'reviews.cta': 'Read on Google',
      'amen.title': 'Good to know',
      'amen.garden': 'Garden out back', 'amen.dogs': 'Dogs welcome', 'amen.laptop': 'Laptop friendly',
      'amen.access': 'Accessible entrance', 'amen.card': 'Card &amp; NFC', 'amen.take': 'Takeaway', 'amen.brunch': 'Breakfast &amp; brunch',
      'visit.eyebrow': 'Visit', 'visit.title': 'Come say hi.',
      'visit.near': 'Across from Sălăjan market · near Nicolae Grigorescu metro',
      'visit.hours': 'Opening hours', 'visit.dir': 'Get directions',
      'd.0': 'Sunday', 'd.1': 'Monday', 'd.2': 'Tuesday', 'd.3': 'Wednesday', 'd.4': 'Thursday', 'd.5': 'Friday', 'd.6': 'Saturday',
      'foot.top': 'Top ↑',
      'status.open': 'Open now · until {t}',
      'status.closed': 'Closed · opens at {t}',
      'status.closedTomorrow': 'Closed · tomorrow from {t}',
      'today': 'today',
      'marquee.a': ['Specialty coffee', 'Flat white', 'Coffee &amp; more', 'Garden out back', 'Ethiopia single origin', 'Dogs welcome', 'Across from Sălăjan'],
      'marquee.b': ['Bd. Nicolae Grigorescu 34D', 'Mon–Fri 07:30–18:00', 'Sat–Sun 08:00–18:00', 'コーヒー', '{rating} ★ on Google']
    }
  };

  var lang = 'ro';
  try { var saved = localStorage.getItem('kohi-lang'); if (saved && dict[saved]) lang = saved; } catch (e) {}

  var listeners = [];
  /* live Google numbers, substituted into {rating} / {reviews} (see main.js) */
  var vars = { rating: 4.7, reviews: 380 };
  function fill(s) {
    if (typeof s !== 'string') return s;
    return s.replace('{rating}', vars.rating.toFixed(1).replace('.', lang === 'ro' ? ',' : '.'))
            .replace('{reviews}', vars.reviews);
  }
  function t(key) {
    var v = (dict[lang] && dict[lang][key] !== undefined) ? dict[lang][key] : dict.ro[key];
    return Array.isArray(v) ? v.map(fill) : fill(v);
  }

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
      el.alt = t(el.getAttribute('data-i18n-alt'));
    });
    document.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
  }

  function set(next) {
    if (!dict[next] || next === lang) return;
    lang = next;
    try { localStorage.setItem('kohi-lang', lang); } catch (e) {}
    listeners.forEach(function (fn) { fn(lang, 'before'); });
    apply();
    listeners.forEach(function (fn) { fn(lang, 'after'); });
  }

  window.KohiI18n = {
    t: t, set: set, apply: apply, vars: vars,
    get lang() { return lang; },
    on: function (fn) { listeners.push(fn); }
  };

  apply();
})();
