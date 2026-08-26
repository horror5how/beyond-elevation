// Hero: a silicon wafer's die grid. Squares get claimed one at a time, mostly
// next to the last one — territory being taken, not a raster scan.
(function () {
  var g = document.getElementById('dies');
  if (!g) return;

  var NS = 'http://www.w3.org/2000/svg';
  var CX = 300, CY = 300, R = 238, STEP = 26, GAP = 2;
  var byKey = {}, cells = [];

  for (var row = -12; row <= 12; row++) {
    for (var col = -12; col <= 12; col++) {
      var x = CX + col * STEP - STEP / 2;
      var y = CY + row * STEP - STEP / 2;
      var cx = x + STEP / 2, cy = y + STEP / 2;
      // keep only dies whose whole footprint sits on the wafer
      if (Math.hypot(cx - CX, cy - CY) + STEP * 0.72 > R) continue;

      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x);
      r.setAttribute('y', y);
      r.setAttribute('width', STEP - GAP);
      r.setAttribute('height', STEP - GAP);
      r.setAttribute('rx', 1.5);
      g.appendChild(r);

      var cell = { el: r, col: col, row: row };
      byKey[col + ':' + row] = cell;
      cells.push(cell);
    }
  }

  if (!cells.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  var recent = [];
  var current = cells[Math.floor(cells.length / 2)];

  function pickNext() {
    // prefer an unclaimed neighbour; jump somewhere new when boxed in
    var open = [];
    for (var i = 0; i < NEIGHBOURS.length; i++) {
      var n = byKey[(current.col + NEIGHBOURS[i][0]) + ':' + (current.row + NEIGHBOURS[i][1])];
      if (n && recent.indexOf(n) === -1) open.push(n);
    }
    if (!open.length || Math.random() < 0.18) {
      return cells[Math.floor(Math.random() * cells.length)];
    }
    return open[Math.floor(Math.random() * open.length)];
  }

  function claim() {
    current = pickNext();
    current.el.classList.remove('fade');
    current.el.classList.add('lit');
    recent.push(current);
    if (recent.length > 9) {
      var old = recent.shift();
      old.el.classList.remove('lit');
      old.el.classList.add('fade');
    }
  }

  claim();
  setInterval(claim, 560);
})();

/* Seat-stories belt: slow auto drift, drag to browse, pause on hover. */
(function () {
  var belt = document.querySelector('[data-belt]');
  if (!belt) return;
  var track = belt.querySelector('.belttrack');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var x = 0, vx = reduced ? 0 : 0.4, paused = false, dragging = false, startX = 0, startPos = 0, moved = 0;

  function maxShift() { return Math.max(0, track.scrollWidth - belt.clientWidth + 40); }
  function tick() {
    if (!paused && !dragging && vx) {
      x += vx;
      var m = maxShift();
      if (x > m) { x = m; vx = -Math.abs(vx); }
      if (x < 0) { x = 0; vx = Math.abs(vx); }
      track.style.transform = 'translateX(' + (-x) + 'px)';
    }
    requestAnimationFrame(tick);
  }
  belt.addEventListener('mouseenter', function () { paused = true; });
  belt.addEventListener('mouseleave', function () { paused = false; });
  belt.addEventListener('pointerdown', function (e) {
    dragging = true; moved = 0; startX = e.clientX; startPos = x; belt.classList.add('dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var d = startX - e.clientX; moved = Math.max(moved, Math.abs(d));
    x = Math.min(Math.max(0, startPos + d), maxShift());
    track.style.transform = 'translateX(' + (-x) + 'px)';
  });
  window.addEventListener('pointerup', function () { dragging = false; belt.classList.remove('dragging'); });
  /* touch scroll steals the pointer; without this the belt freezes forever */
  window.addEventListener('pointercancel', function () { dragging = false; belt.classList.remove('dragging'); });
  track.addEventListener('click', function (e) { if (moved > 8) e.preventDefault(); });
  function jump(dir) {
    var card = track.querySelector('.storycard');
    var step = card ? card.getBoundingClientRect().width + 24 : 420;
    x = Math.min(Math.max(0, x + dir * step), maxShift());
    track.style.transform = 'translateX(' + (-x) + 'px)';
    paused = true;
    setTimeout(function () { paused = false; }, 2500);
  }
  var prev = document.querySelector('[data-beltprev]');
  var next = document.querySelector('[data-beltnext]');
  if (prev) prev.addEventListener('click', function () { jump(-1); });
  if (next) next.addEventListener('click', function () { jump(1); });
  requestAnimationFrame(tick);
})();

/* Hero grid parallax: columns drift in opposite directions on scroll. */
(function () {
  var c1 = document.querySelector('.hero2-grid .c1');
  var c2 = document.querySelector('.hero2-grid .c2');
  var grid = document.querySelector('.hero2-grid');
  if (!c1 || !c2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ticking = false;
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function apply() {
    var s = window.scrollY;
    var gh = grid.clientHeight;
    var min1 = -(c1.scrollHeight - gh), min2 = -(c2.scrollHeight - gh);
    c1.style.transform = 'translateY(' + clamp(-60 - s * 0.35, min1, 0) + 'px)';
    c2.style.transform = 'translateY(' + clamp(-320 + s * 0.28, min2, 0) + 'px)';
    ticking = false;
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(apply); }
  }, { passive: true });
  apply();
})();

// ---------- analytics (PostHog), ?notrack=1 respected ----------
(function () {
  var NOTRACK = /(\?|&)notrack=1/.test(location.search) || localStorage.getItem('be_notrack') === '1';
  if (/(\?|&)notrack=1/.test(location.search)) localStorage.setItem('be_notrack', '1');
  var ph = null;
  if (!NOTRACK) {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('phc_CDKFjeVGfuEEid74UGx5CNwNFaqaijF8b6e9A6QhLruM', {
      api_host: 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: 'always',
      loaded: function (p) {
        try {
          if (location.search.indexOf('utm_source=sender-domain') > -1) {
            p.register_for_session({ utm_source: 'sender-domain' });
            history.replaceState(null, '', location.pathname + location.hash);
          }
        } catch (e) {}
      }
    });
    ph = window.posthog;

    // LinkedIn Insight Tag (retargeting), same partner id as the old site
    window._linkedin_partner_id = '4306105';
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(window._linkedin_partner_id);
    (function (l) {
      if (!l) { window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); }; window.lintrk.q = []; }
      var s = document.getElementsByTagName('script')[0];
      var b = document.createElement('script');
      b.type = 'text/javascript'; b.async = true;
      b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      s.parentNode.insertBefore(b, s);
    })(window.lintrk);

    // Vercel Web Analytics + Speed Insights
    ['/_vercel/insights/script.js', '/_vercel/speed-insights/script.js'].forEach(function (src) {
      var v = document.createElement('script'); v.defer = true; v.src = src;
      document.head.appendChild(v);
    });
    var variant = document.documentElement.getAttribute('data-variant');
    if (variant) ph.register({ headline_variant: variant });
    if (document.body.hasAttribute('data-404')) ph.capture('404', { path: location.pathname });
  }
  function track(name, props) { if (ph) ph.capture(name, props || {}); }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href === '/call' || href.indexOf('/call/') > -1) {
      var sec = a.closest('section');
      track('book_call_click', {
        page: location.pathname,
        position: a.closest('.navcta') ? 'nav' : a.closest('.mobilemenu') ? 'mobile_menu' : a.closest('.hero2') ? 'hero' : a.closest('.foot') ? 'footer' : a.closest('.ticker') ? 'ticker' : 'mid',
        section: sec ? (sec.id || sec.className.split(' ')[0]) : (a.closest('footer') ? 'footer' : a.closest('header') ? 'header' : 'none')
      });
    } else if (href.indexOf('tel:') === 0) {
      track('phone_click', { page: location.pathname, number: href });
    } else if (href.indexOf('mailto:') === 0) {
      track('email_click', { page: location.pathname });
    }
  });

  var marks = [25, 50, 75, 100], fired = {};
  window.addEventListener('scroll', function () {
    var h = document.body.scrollHeight - innerHeight;
    if (h <= 0) return;
    var p = Math.round(scrollY / h * 100);
    marks.forEach(function (m) { if (p >= m && !fired[m]) { fired[m] = 1; track('scroll_depth', { depth: m, page: location.pathname }); } });
  }, { passive: true });

  document.querySelectorAll('details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      var s = d.querySelector('summary');
      if (d.open && s) track('faq_open', { q: s.textContent.trim(), page: location.pathname });
    });
  });

  // mobile menu
  var btn = document.querySelector('.menubtn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) track('mobile_menu_open', { page: location.pathname });
    });
    document.querySelectorAll('.mobilemenu a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false'); });
    });
  }
})();

// Live portraits: swap hero grid images for tiny looping videos once the page
// is idle. If a video file is missing or fails, the image simply stays.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  function swap() {
    document.querySelectorAll('img[data-video]').forEach(function (img) {
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.poster = img.currentSrc || img.src;
      v.width = img.getAttribute('width'); v.height = img.getAttribute('height');
      v.className = img.className; v.setAttribute('aria-hidden', 'true');
      v.addEventListener('canplaythrough', function () {
        if (v.parentNode) return;
        img.replaceWith(v);
        v.play().catch(function () {});
      }, { once: true });
      v.src = img.getAttribute('data-video');
    });
  }
  if (document.readyState === 'complete') setTimeout(swap, 300);
  else addEventListener('load', function () { setTimeout(swap, 300); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    document.querySelectorAll('video[data-live], .hero2-grid video').forEach(function (v) {
      if (v.paused) v.play().catch(function () {});
    });
  });
})();

// Stacking seat cards: as the next card slides over, the one beneath
// settles back — slight scale-down and dim, Publicis Sapient style.
(function () {
  var cards = [].slice.call(document.querySelectorAll('.seatstack .seat'));
  if (cards.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ticking = false;
  function update() {
    ticking = false;
    for (var i = 0; i < cards.length - 1; i++) {
      var cur = cards[i].getBoundingClientRect();
      var next = cards[i + 1].getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (cur.bottom - next.top) / Math.max(cur.height, 1)));
      cards[i].style.transform = 'scale(' + (1 - p * 0.06).toFixed(4) + ')';
      cards[i].style.filter = 'brightness(' + (1 - p * 0.16).toFixed(3) + ')';
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  update();
})();

// Align the Beyond Elevation card rows with the comparison table rows,
// so each claim sits on the same line as the option it beats.
(function () {
  var grid = document.querySelector('.cmp-grid');
  if (!grid) return;
  var table = grid.querySelector('table');
  var sky = grid.querySelector('.becard-sky');
  var head = grid.querySelector('.becard-h');
  var rows = [].slice.call(grid.querySelectorAll('.becard-row'));
  var trs = [].slice.call(table.querySelectorAll('tbody tr'));
  var theadRow = table.querySelector('thead tr');
  if (!sky || !head || rows.length !== trs.length) return;

  function align() {
    if (window.innerWidth <= 960) {
      sky.style.marginTop = '';
      head.style.height = '';
      rows.forEach(function (r) { r.style.height = ''; r.style.paddingTop = ''; r.style.paddingBottom = ''; });
      return;
    }
    head.style.height = theadRow.getBoundingClientRect().height + 'px';
    rows.forEach(function (r, i) {
      var h = trs[i].getBoundingClientRect().height;
      r.style.paddingTop = '0';
      r.style.paddingBottom = '0';
      r.style.height = Math.max(44, h - 4) + 'px';
    });
    // shift the sky panel so the card header lines up with the table header
    sky.style.marginTop = '0px';
    var delta = theadRow.getBoundingClientRect().top - head.getBoundingClientRect().top;
    sky.style.marginTop = delta + 'px';
  }
  addEventListener('resize', align);
  if (document.readyState === 'complete') align();
  else addEventListener('load', align);
})();

/* universal menu: click toggles (existing handler); dragging down on the header also opens it */
(function dragMenu() {
  var nav = document.querySelector('header.nav');
  if (!nav) return;
  var startY = null;
  nav.addEventListener('pointerdown', function (e) { if (!e.target.closest('a')) startY = e.clientY; });
  window.addEventListener('pointermove', function (e) {
    if (startY === null) return;
    if (e.clientY - startY > 26) {
      document.body.classList.add('menu-open');
      var b = document.querySelector('.menubtn');
      if (b) b.setAttribute('aria-expanded', 'true');
      startY = null;
    }
  });
  window.addEventListener('pointerup', function () { startY = null; });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.body.classList.remove('menu-open'); });
  document.addEventListener('click', function (e) {
    if (document.body.classList.contains('menu-open') && !e.target.closest('header.nav')) document.body.classList.remove('menu-open');
  });
})();

// What gets built: tab switcher (fde page). Panels re-run their CSS
// animations on display:none -> grid, so switching replays the visual.
(function () {
  var root = document.querySelector('.wgb-tabs');
  if (!root) return;
  var tabs = root.querySelectorAll('.wgb-tab');
  var panels = root.querySelectorAll('.wgb-body');
  Array.prototype.forEach.call(tabs, function (t, i) {
    t.addEventListener('click', function () {
      Array.prototype.forEach.call(tabs, function (x, j) {
        x.classList.toggle('on', j === i);
        x.setAttribute('aria-selected', j === i ? 'true' : 'false');
        panels[j].classList.toggle('on', j === i);
      });
    });
  });
})();

// Top nav tabs: rebuild .navlinks into Services mega-dropdown + section links.
// Injected here so all ~440 static pages get the same nav from one file.
(function () {
  var nav = document.querySelector('header.nav .navlinks');
  if (!nav) return;
  nav.classList.add('navtabs');
  nav.innerHTML =
    '<div class="dd">' +
      '<button type="button" aria-haspopup="true" aria-expanded="false">Services <span class="dd-arw">\u25be</span></button>' +
      '<div class="dd-menu"><div class="dd-card dd-mega">' +
        '<div class="dd-links">' +
          '<a href="/cfo"><b>Chief Financial Officer</b><span>Cash, margin, runway and the board</span></a>' +
          '<a href="/ip"><b>Chief IP Officer</b><span>Patents, licensing and IP value</span></a>' +
          '<a href="/fde"><b>AI Operations</b><span>Your processes made AI ready</span></a>' +
          '<a class="dd-test" href="/which-seat">Not sure? Take the 30 second test</a>' +
        '</div>' +
        '<div class="dd-quote">' +
          '<img src="/assets/img/ceo-babacar-lg.webp" alt="Babacar Diallo" loading="lazy">' +
          '<p>\u201cThey turned data we were sitting on into real revenue streams.\u201d</p>' +
          '<b>Babacar Diallo</b><i>CEO, Oolu Solar</i>' +
        '</div>' +
      '</div></div>' +
    '</div>' +
    '<a href="/#how">Pricing</a>' +
    '<a href="/#comparison">Why us</a>' +
    '<a href="/case-studies">Results</a>' +
    '<a href="/insights">Insights</a>' +
    '<a href="/contact">Contact</a>';
})();
