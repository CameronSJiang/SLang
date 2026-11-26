/* SLang site: globe, capability tabs, word-model chart, quiz, scroll reveals. */
(() => {
  'use strict';

  const FORM_URL = 'https://forms.gle/CZVFfJMAEgyFLagM6';
  const ACCENT = '#f2a93b';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Waitlist links open the form.
  for (const a of document.querySelectorAll('[data-join]')) {
    a.href = FORM_URL;
    a.target = '_blank';
    a.rel = 'noopener';
  }

  /* ---------------- Globe ---------------- */

  const CITIES = {
    newYork: ['New York', 40.71, -74.01],
    madrid: ['Madrid', 40.42, -3.7],
    pittsburgh: ['Pittsburgh', 40.44, -79.99],
    mexicoCity: ['Mexico City', 19.43, -99.13],
    london: ['London', 51.51, -0.13],
    paris: ['Paris', 48.86, 2.35],
    toronto: ['Toronto', 43.65, -79.38],
    montreal: ['Montréal', 45.5, -73.57],
    saoPaulo: ['São Paulo', -23.55, -46.63],
    berlin: ['Berlin', 52.52, 13.4],
    mumbai: ['Mumbai', 19.08, 72.88],
    tokyo: ['Tokyo', 35.68, 139.69],
    losAngeles: ['Los Angeles', 34.05, -118.24],
    seoul: ['Seoul', 37.57, 126.98],
    lagos: ['Lagos', 6.52, 3.38],
    sydney: ['Sydney', -33.87, 151.21],
    buenosAires: ['Buenos Aires', -34.6, -58.38],
    vienna: ['Vienna', 48.21, 16.37],
    bogota: ['Bogotá', 4.71, -74.07],
  };

  // Where a learner lives → where their target language is spoken.
  const ROUTES = [
    ['newYork', 'madrid', 'EN → ES'],
    ['london', 'paris', 'EN → FR'],
    ['mumbai', 'tokyo', 'HI → JA'],
    ['saoPaulo', 'berlin', 'PT → DE'],
    ['losAngeles', 'seoul', 'EN → KO'],
    ['pittsburgh', 'mexicoCity', 'EN → ES'],
    ['madrid', 'london', 'ES → EN'],
    ['lagos', 'paris', 'EN → FR'],
    ['sydney', 'tokyo', 'EN → JA'],
    ['berlin', 'buenosAires', 'DE → ES'],
    ['seoul', 'newYork', 'KO → EN'],
    ['toronto', 'montreal', 'EN → FR'],
    ['mexicoCity', 'vienna', 'ES → DE'],
    ['bogota', 'paris', 'ES → FR'],
  ];

  const fmtCoord = (lat, lng) =>
    `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;

  const arcs = ROUTES.map(([a, b, route], i) => {
    const [fromName, startLat, startLng] = CITIES[a];
    const [toName, endLat, endLng] = CITIES[b];
    return { i, route, fromName, toName, startLat, startLng, endLat, endLng };
  });
  const points = Object.values(CITIES).map(([name, lat, lng]) => ({ name, lat, lng }));

  let active = 0;
  const rgba = (a) => `rgba(242, 169, 59, ${a})`;

  function setTelemetry(arc) {
    const fields = [
      ['t-route', arc.route],
      ['t-from', `${arc.fromName} · ${fmtCoord(arc.startLat, arc.startLng)}`],
      ['t-to', `${arc.toName} · ${fmtCoord(arc.endLat, arc.endLng)}`],
    ];
    for (const [id, text] of fields) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (reduceMotion) {
        el.textContent = text;
        continue;
      }
      el.classList.add('swap');
      setTimeout(() => {
        el.textContent = text;
        el.classList.remove('swap');
      }, 220);
    }
  }

  function initGlobe() {
    const el = document.getElementById('globe');
    if (!el || typeof window.Globe !== 'function') return;
    let globe;
    try {
      globe = new window.Globe(el, { animateIn: !reduceMotion })
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('img/earth-night.jpg')
        .bumpImageUrl('img/earth-topology.png')
        .showAtmosphere(true)
        .atmosphereColor('#8a8f9c')
        .atmosphereAltitude(0.16)
        .arcsData(arcs)
        .arcStartLat('startLat')
        .arcStartLng('startLng')
        .arcEndLat('endLat')
        .arcEndLng('endLng')
        .arcAltitudeAutoScale(0.42)
        .arcDashLength(0.45)
        .arcDashGap(1.2)
        .arcDashInitialGap((d) => (d.i * 0.37) % 2)
        .arcDashAnimateTime(reduceMotion ? 0 : 3200)
        .pointsData(points)
        .pointColor(() => rgba(0.95))
        .pointAltitude(0.006)
        .pointRadius(0.32)
        .pointLabel((d) => `<span class="globe-tip">${d.name}</span>`)
        .ringsData(reduceMotion ? [] : points)
        .ringColor(() => (t) => rgba(0.55 * (1 - t)))
        .ringMaxRadius(2.6)
        .ringPropagationSpeed(1.4)
        .ringRepeatPeriod(2200);
    } catch {
      el.parentElement.style.display = 'none'; // no WebGL: the copy stands on its own
      return;
    }

    const paintArcs = () => {
      globe
        .arcColor((d) => (d.i === active ? [rgba(0.15), ACCENT] : [rgba(0.04), rgba(0.42)]))
        .arcStroke((d) => (d.i === active ? 0.7 : 0.3));
    };
    paintArcs();

    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.45;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    globe.pointOfView({ lat: 28, lng: -35, altitude: 2.05 }, 0);

    const fit = () => {
      const r = el.getBoundingClientRect();
      globe.width(r.width).height(r.height);
    };
    fit();
    new ResizeObserver(fit).observe(el);

    // Don't spend GPU time while the globe is off screen.
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) globe.resumeAnimation();
      else globe.pauseAnimation();
    }).observe(el);

    setTelemetry(arcs[active]);
    if (!reduceMotion) {
      setInterval(() => {
        active = (active + 1) % arcs.length;
        paintArcs();
        setTelemetry(arcs[active]);
      }, 3600);
    }
  }

  /* ---------------- Tabs ---------------- */

  function initTabs() {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const select = (tab, focus) => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      }
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (e) => {
        const map = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        let next = null;
        if (e.key in map) next = tabs[(i + map[e.key] + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  }

  /* ---------------- Word-model chart ---------------- */

  // Same model as the extension (src/core/learner.ts): logistic over log-rank.
  const K = 2.5;
  const LEVEL_VOCAB = { A1: 500, A2: 1000, B1: 2000, B2: 4000, C1: 8000 };
  const THRESHOLD = 0.5;
  const WORDS = [
    ['casa', 133],
    ['mercado', 581],
    ['perro', 1108],
    ['playa', 1637],
    ['madrugada', 4709],
    ['almohada', 10946],
  ];
  const pKnown = (rank, vocab) => 1 / (1 + Math.exp(K * (Math.log(rank) - Math.log(vocab))));

  function initChart() {
    const svg = document.getElementById('model-chart');
    const caption = document.getElementById('model-caption');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const W = 460;
    const H = 300;
    const L = 44;
    const R = 16;
    const T = 28;
    const B = 40;
    const maxRank = 20000;
    const x = (rank) => L + (Math.log10(rank) / Math.log10(maxRank)) * (W - L - R);
    const y = (p) => T + (1 - p) * (H - T - B);
    const make = (tag, attrs, parent = svg) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      parent.appendChild(n);
      return n;
    };

    for (const p of [0, 0.5, 1]) {
      make('line', { x1: L, x2: W - R, y1: y(p), y2: y(p), class: 'grid' });
      make('text', {
        x: L - 10,
        y: y(p) + 4,
        'text-anchor': 'end',
        class: 'axis-label',
      }).textContent = p.toFixed(1);
    }
    for (const r of [1, 10, 100, 1000, 10000]) {
      make('line', { x1: x(r), x2: x(r), y1: T, y2: H - B, class: 'grid' });
      make('text', {
        x: x(r),
        y: H - B + 18,
        'text-anchor': 'middle',
        class: 'axis-label',
      }).textContent = r.toLocaleString('en-US');
    }
    make('text', { x: W - R, y: H - 4, 'text-anchor': 'end', class: 'axis-label' }).textContent =
      'frequency rank →';
    make('text', { x: L, y: 12, class: 'axis-label' }).textContent = 'p(known)';
    make('line', { x1: L, x2: W - R, y1: y(THRESHOLD), y2: y(THRESHOLD), class: 'threshold' });
    make('text', {
      x: W - R,
      y: y(THRESHOLD) - 6,
      'text-anchor': 'end',
      class: 'axis-label',
      fill: ACCENT,
    }).textContent = 'hint below this line';

    const curve = make('path', { class: 'curve' });
    const pts = WORDS.map(([word, rank], i) => {
      const g = make('g', { class: 'pt' });
      const c = make('circle', { cx: x(rank), r: 4.5 }, g);
      const t = make('text', { x: x(rank), 'text-anchor': 'middle' }, g);
      t.textContent = word;
      return { word, rank, c, t, below: i % 2 === 1 };
    });

    const draw = (level) => {
      const vocab = LEVEL_VOCAB[level];
      let d = '';
      for (let i = 0; i <= 120; i++) {
        const rank = Math.pow(10, (i / 120) * Math.log10(maxRank));
        d += `${i ? 'L' : 'M'}${x(rank).toFixed(1)},${y(pKnown(rank, vocab)).toFixed(1)}`;
      }
      curve.setAttribute('d', d);
      let hinted = 0;
      for (const p of pts) {
        const prob = pKnown(p.rank, vocab);
        const hint = prob < THRESHOLD;
        if (hint) hinted++;
        p.c.setAttribute('cy', y(prob));
        p.c.setAttribute('fill', hint ? ACCENT : '#fafafa');
        p.t.setAttribute('y', p.below ? y(prob) + 20 : y(prob) - 10);
        p.t.setAttribute('fill', hint ? ACCENT : '#a1a1aa');
      }
      if (caption) {
        caption.textContent = `${level} · ~${vocab.toLocaleString('en-US')}-word vocabulary · ${hinted} of ${pts.length} example words get a hint`;
      }
    };

    const buttons = [...document.querySelectorAll('.seg [data-level]')];
    for (const b of buttons) {
      b.addEventListener('click', () => {
        for (const o of buttons) o.setAttribute('aria-checked', String(o === b));
        draw(b.dataset.level);
      });
    }
    draw('A2');
  }

  /* ---------------- Quiz ---------------- */

  function initQuiz() {
    const choices = [...document.querySelectorAll('.q-choice')];
    const result = document.querySelector('.q-result');
    let answered = false;
    for (const c of choices) {
      c.addEventListener('click', () => {
        if (answered) {
          answered = false;
          for (const o of choices) o.classList.remove('right', 'wrong');
          if (result) result.textContent = 'Pick an answer.';
          return;
        }
        answered = true;
        const right = c.dataset.right === 'true';
        for (const o of choices) if (o.dataset.right === 'true') o.classList.add('right');
        if (!right) c.classList.add('wrong');
        if (result) {
          result.textContent = right
            ? 'Correct · next review pushed further out. Click to reset.'
            : 'Saved for review · it comes back sooner. Click to reset.';
        }
      });
    }
  }

  /* ---------------- Reveal on scroll ---------------- */

  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    els.forEach((e) => io.observe(e));
  }

  initTabs();
  initChart();
  initQuiz();
  initReveal();
  initGlobe();
})();
