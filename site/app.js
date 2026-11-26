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
    madrid: ['Madrid', 40.42, -3.7],
    newYork: ['New York', 40.71, -74.01],
    tokyo: ['Tokyo', 35.68, 139.69],
    london: ['London', 51.51, -0.13],
    paris: ['Paris', 48.86, 2.35],
    seoul: ['Seoul', 37.57, 126.98],
    berlin: ['Berlin', 52.52, 13.4],
    saoPaulo: ['São Paulo', -23.55, -46.63],
    cairo: ['Cairo', 30.04, 31.24],
    toronto: ['Toronto', 43.65, -79.38],
    mexicoCity: ['Mexico City', 19.43, -99.13],
  };

  // Phrases that translate as they fly: [from, to, route, source phrase, target phrase].
  const ROUTES = [
    ['madrid', 'newYork', 'ES → EN', 'que pasa', 'whats up'],
    ['tokyo', 'london', 'JA → EN', 'konnichiwa', 'hello there'],
    ['paris', 'seoul', 'FR → EN', "c'est parti", "let's go"],
    ['berlin', 'saoPaulo', 'DE → PT', 'alles klar', 'tudo bem'],
    ['cairo', 'toronto', 'AR → EN', 'ahlan wa sahlan', 'welcome in'],
    ['london', 'mexicoCity', 'EN → ES', 'cheers mate', 'salud amigo'],
  ];

  const ARC_SCALE = 0.42; // must match .arcAltitudeAutoScale below
  const MAX_IN_FLIGHT = 3;
  const fmtCoord = (lat, lng) =>
    `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  const rgba = (a) => `rgba(242, 169, 59, ${a})`;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const smooth = (e0, e1, x) => {
    const t = clamp01((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  };

  /* Arc geometry: the same cubic Bézier three-globe draws (calcCurve in three-globe), so the
     text rides exactly on the visible line. Unit-radius space; scaled when projected. */
  const D2R = Math.PI / 180;
  const toVec = (lat, lng) => {
    const phi = (90 - lat) * D2R;
    const theta = (90 - lng) * D2R;
    return [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
  };
  const toLatLng = ([x, y, z]) => {
    const r = Math.hypot(x, y, z);
    const phi = Math.acos(y / r);
    const theta = Math.atan2(z, x);
    return [90 - phi / D2R, 90 - theta / D2R, r];
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  /** Great-circle point at fraction t (slerp), like d3-geo's geoInterpolate. */
  const slerp = (a, b, t) => {
    const omega = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    if (omega < 1e-6) return a.slice();
    const s = Math.sin(omega);
    const k0 = Math.sin((1 - t) * omega) / s;
    const k1 = Math.sin(t * omega) / s;
    return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
  };

  function makeCurve(from, to) {
    const a = toVec(from[1], from[2]);
    const b = toVec(to[1], to[2]);
    const omega = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    const alt = (omega / 2) * ARC_SCALE;
    const cpAlt = alt * 1.5; // three-globe: a1 + (a1 - a0) * 0.5 with a0 = 0
    const scale = (v, r) => [v[0] * r, v[1] * r, v[2] * r];
    const p0 = a;
    const p1 = scale(slerp(a, b, 0.25), 1 + cpAlt);
    const p2 = scale(slerp(a, b, 0.75), 1 + cpAlt);
    const p3 = b;
    return (t) => {
      const u = 1 - t;
      const c0 = u * u * u;
      const c1 = 3 * u * u * t;
      const c2 = 3 * u * t * t;
      const c3 = t * t * t;
      return [0, 1, 2].map((i) => c0 * p0[i] + c1 * p1[i] + c2 * p2[i] + c3 * p3[i]);
    };
  }

  /* Text morph: each character steps through the alphabet toward its target, one column after
     another, like a split-flap board, so in-between states stay readable. */
  const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  const plain = (c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function charAt(from, to, p) {
    // p: 0..1 progress of this column's change
    if (p <= 0) return from;
    if (p >= 1) return to;
    const a = ALPHA.indexOf(plain(from));
    const b = ALPHA.indexOf(plain(to));
    if (a < 0 || b < 0) return p < 0.5 ? from : to; // spaces and punctuation swap at midpoint
    let d = b - a;
    if (d > 13) d -= 26;
    if (d < -13) d += 26;
    const steps = Math.abs(d);
    const k = Math.round(p * steps);
    return ALPHA[(a + Math.sign(d) * k + 26) % 26];
  }
  function morph(src, dst, t) {
    if (t <= 0.2) return src;
    if (t >= 0.8) return dst;
    const p = (t - 0.2) / 0.6;
    const n = Math.max(src.length, dst.length);
    const a = src.padEnd(n, ' ');
    const b = dst.padEnd(n, ' ');
    const window = 0.45; // share of the morph each column spends changing
    let out = '';
    for (let i = 0; i < n; i++) {
      const start = (i / Math.max(1, n - 1)) * (1 - window);
      out += charAt(a[i], b[i], (p - start) / window);
    }
    return out.replace(/\s+$/, '');
  }

  function setTelemetry(r) {
    const fields = [
      ['t-route', r.route],
      ['t-from', `${r.from[0]} · ${fmtCoord(r.from[1], r.from[2])}`],
      ['t-to', `${r.to[0]} · ${fmtCoord(r.to[1], r.to[2])}`],
      ['t-phrase', `${r.src} → ${r.dst}`],
    ];
    for (const [id, text] of fields) {
      const el = document.getElementById(id);
      if (!el || el.textContent === text) continue;
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

    const routes = ROUTES.map(([a, b, route, src, dst], i) => {
      const from = CITIES[a];
      const to = CITIES[b];
      return {
        i,
        route,
        src,
        dst,
        from,
        to,
        curve: makeCurve(from, to),
        startLat: from[1],
        startLng: from[2],
        endLat: to[1],
        endLng: to[2],
        // Flight time grows a little with distance; staggered first launches.
        duration:
          6500 +
          Math.acos(Math.max(-1, Math.min(1, dot(toVec(from[1], from[2]), toVec(to[1], to[2]))))) *
            1600,
        next: 600 + i * 1700,
        start: -1,
      };
    });
    const cities = [...new Set(ROUTES.flatMap((r) => [r[0], r[1]]))].map((k) => {
      const [name, lat, lng] = CITIES[k];
      return { name, lat, lng };
    });

    let globe;
    try {
      globe = new window.Globe(el, { animateIn: !reduceMotion })
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('img/earth-night.jpg')
        .bumpImageUrl('img/earth-topology.png')
        .showAtmosphere(true)
        .atmosphereColor('#8a8f9c')
        .atmosphereAltitude(0.16)
        .arcsData(routes)
        .arcAltitudeAutoScale(ARC_SCALE)
        .arcDashLength(1)
        .arcDashGap(0)
        .arcDashAnimateTime(0)
        .pointsData(cities)
        .pointColor(() => rgba(0.95))
        .pointAltitude(0.006)
        .pointRadius(0.32)
        .pointLabel((d) => `<span class="globe-tip">${d.name}</span>`)
        .ringsData(reduceMotion ? [] : cities)
        .ringColor(() => (t) => rgba(0.5 * (1 - t)))
        .ringMaxRadius(2.6)
        .ringPropagationSpeed(1.4)
        .ringRepeatPeriod(2400);
    } catch {
      el.parentElement.style.display = 'none'; // no WebGL: the copy stands on its own
      return;
    }

    const paintArcs = () =>
      globe
        .arcColor((d) => (d.start >= 0 ? [rgba(0.12), rgba(0.75)] : [rgba(0.05), rgba(0.2)]))
        .arcStroke((d) => (d.start >= 0 ? 0.55 : 0.3));
    paintArcs();

    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.45;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    globe.pointOfView({ lat: 28, lng: -35, altitude: 2.05 }, 0);

    // 2D overlay for the travelling phrases: projected each frame, no 3D text geometry.
    const overlay = document.createElement('canvas');
    overlay.className = 'globe-text';
    overlay.setAttribute('aria-hidden', 'true');
    el.parentElement.insertBefore(overlay, el.nextSibling);
    const ctx = overlay.getContext('2d');
    let W = 0;
    let H = 0;

    const fit = () => {
      const r = el.getBoundingClientRect();
      W = r.width;
      H = r.height;
      globe.width(W).height(H);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      overlay.width = Math.round(W * dpr);
      overlay.height = Math.round(H * dpr);
      overlay.style.width = `${W}px`;
      overlay.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    new ResizeObserver(fit).observe(el);

    setTelemetry(routes[0]);
    if (reduceMotion) return;

    const R = globe.getGlobeRadius();
    const FONT = '500 13px "JetBrains Mono", ui-monospace, Menlo, monospace';

    function drawPacket(r, now) {
      const t = clamp01((now - r.start) / r.duration);
      const [x, y, z] = r.curve(t);
      // Horizon test: hide text on the far side of the Earth (smooth fade near the limb).
      const cam = globe.camera().position;
      const camLen = Math.hypot(cam.x, cam.y, cam.z);
      const pLen = Math.hypot(x, y, z);
      const cosAngle = (x * cam.x + y * cam.y + z * cam.z) / (pLen * camLen);
      // A point at height pLen (globe radii) is in view while its angle from the camera
      // direction is under acos(R/camLen) + acos(1/pLen).
      const limit = Math.cos(Math.acos(Math.min(1, R / camLen)) + Math.acos(Math.min(1, 1 / pLen)));
      const occ = smooth(limit - 0.02, limit + 0.12, cosAngle);
      const taper = smooth(0, 0.1, t) * (1 - smooth(0.9, 1, t));
      const alpha = occ * taper;
      if (alpha < 0.02) return;
      const [lat, lng, rr] = toLatLng([x, y, z]);
      const s = globe.getScreenCoords(lat, lng, rr - 1);
      if (!Number.isFinite(s.x) || s.x < -80 || s.x > W + 80 || s.y < -40 || s.y > H + 40) return;

      const text = morph(r.src, r.dst, t);
      ctx.font = FONT;
      const tw = ctx.measureText(text).width;
      const bx = Math.round(s.x - tw / 2 - 8);
      const by = Math.round(s.y - 32);
      ctx.globalAlpha = alpha;
      // Plate: dark, hairline-bordered, small radius.
      ctx.fillStyle = 'rgba(9, 9, 11, 0.72)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx + 0.5, by + 0.5, Math.round(tw + 16), 22, 4);
      else ctx.rect(bx + 0.5, by + 0.5, Math.round(tw + 16), 22);
      ctx.fill();
      ctx.stroke();
      // Leader from the plate to the packet head.
      ctx.strokeStyle = rgba(0.35);
      ctx.beginPath();
      ctx.moveTo(Math.round(s.x) + 0.5, by + 23);
      ctx.lineTo(Math.round(s.x) + 0.5, s.y - 3);
      ctx.stroke();
      // Text with a faint amber glow; locked states read brighter.
      const settled = t <= 0.2 || t >= 0.8;
      ctx.shadowColor = rgba(0.55);
      ctx.shadowBlur = 8;
      ctx.fillStyle = settled ? '#fafafa' : '#e7d3b0';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + 8, by + 12);
      // Packet head.
      ctx.fillStyle = '#f2a93b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    let running = true;
    let raf = 0;
    const t0 = performance.now();
    const frame = (nowAbs) => {
      const now = nowAbs - t0;
      ctx.clearRect(0, 0, W, H);
      let inFlight = routes.filter((r) => r.start >= 0).length;
      let changed = false;
      for (const r of routes) {
        if (r.start >= 0 && now - r.start >= r.duration) {
          r.start = -1;
          r.next = now + 2500 + Math.random() * 5000; // rest before the next flight
          inFlight--;
          changed = true;
        }
        if (r.start < 0 && now >= r.next) {
          if (inFlight < MAX_IN_FLIGHT) {
            r.start = now;
            inFlight++;
            changed = true;
            setTelemetry(r);
          } else {
            r.next = now + 800; // try again shortly; keeps the screen uncluttered
          }
        }
      }
      if (changed) paintArcs();
      for (const r of routes) if (r.start >= 0) drawPacket(r, now);
      if (running) raf = requestAnimationFrame(frame);
    };
    const startLoop = () => {
      if (running && raf) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // Don't spend GPU/CPU while the hero is off screen or the tab is hidden.
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        globe.resumeAnimation();
        startLoop();
      } else {
        globe.pauseAnimation();
        stopLoop();
      }
    }).observe(el);
    document.addEventListener('visibilitychange', () =>
      document.hidden ? stopLoop() : startLoop(),
    );
    const ready = document.fonts?.load ? document.fonts.load(FONT) : Promise.resolve();
    ready.finally(startLoop);
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
