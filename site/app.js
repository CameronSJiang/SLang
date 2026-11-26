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
    rome: ['Rome', 41.9, 12.5],
    chicago: ['Chicago', 41.88, -87.63],
    amsterdam: ['Amsterdam', 52.37, 4.9],
    singapore: ['Singapore', 1.35, 103.82],
    mumbai: ['Mumbai', 19.08, 72.88],
    sanFrancisco: ['San Francisco', 37.77, -122.42],
    lisbon: ['Lisbon', 38.72, -9.14],
    sydney: ['Sydney', -33.87, 151.21],
    stockholm: ['Stockholm', 59.33, 18.07],
    montreal: ['Montréal', 45.5, -73.57],
    mexicoCity: ['Mexico City', 19.43, -99.13],
    dublin: ['Dublin', 53.35, -6.26],
    istanbul: ['Istanbul', 41.01, 28.98],
    vancouver: ['Vancouver', 49.28, -123.12],
    nairobi: ['Nairobi', -1.29, 36.82],
    austin: ['Austin', 30.27, -97.74],
    warsaw: ['Warsaw', 52.23, 21.01],
    seattle: ['Seattle', 47.61, -122.33],
    buenosAires: ['Buenos Aires', -34.6, -58.38],
    milan: ['Milan', 45.46, 9.19],
    bangkok: ['Bangkok', 13.76, 100.5],
    zurich: ['Zürich', 47.38, 8.54],
    athens: ['Athens', 37.98, 23.73],
    boston: ['Boston', 42.36, -71.06],
    bogota: ['Bogotá', 4.71, -74.07],
    lagos: ['Lagos', 6.52, 3.38],
    taipei: ['Taipei', 25.03, 121.57],
    losAngeles: ['Los Angeles', 34.05, -118.24],
    vienna: ['Vienna', 48.21, 16.37],
    melbourne: ['Melbourne', -37.81, 144.96],
    prague: ['Prague', 50.08, 14.44],
    jakarta: ['Jakarta', -6.21, 106.85],
    santiago: ['Santiago', -33.45, -70.67],
    dubai: ['Dubai', 25.2, 55.27],
    accra: ['Accra', 5.6, -0.19],
    hanoi: ['Hanoi', 21.03, 105.85],
    capeTown: ['Cape Town', -33.92, 18.42],
    manila: ['Manila', 14.6, 120.98],
    lima: ['Lima', -12.05, -77.04],
    helsinki: ['Helsinki', 60.17, 24.94],
  };

  // [from, to, language route, phrase, translation]
  const ROUTES = [
    ['madrid', 'newYork', 'ES → EN', 'que pasa', 'whats up'],
    ['tokyo', 'london', 'JA → EN', 'hajimemashite', 'nice to meet you'],
    ['paris', 'seoul', 'FR → EN', 'on y va', "let's go"],
    ['berlin', 'saoPaulo', 'DE → PT', 'alles klar', 'tudo certo'],
    ['cairo', 'toronto', 'AR → EN', 'marhaban', 'welcome in'],
    ['rome', 'chicago', 'IT → EN', 'come va', "how's it going"],
    ['amsterdam', 'singapore', 'NL → EN', 'goed bezig', 'great work'],
    ['mumbai', 'sanFrancisco', 'HI → EN', 'kya haal hai', 'how are you'],
    ['lisbon', 'sydney', 'PT → EN', 'vamos nessa', 'count me in'],
    ['stockholm', 'montreal', 'SV → EN', 'vi hörs', 'talk soon'],
    ['mexicoCity', 'dublin', 'ES → EN', 'qué onda', "what's the craic"],
    ['istanbul', 'vancouver', 'TR → EN', 'ne haber', "what's new"],
    ['nairobi', 'austin', 'SW → EN', 'habari yako', 'how are things'],
    ['warsaw', 'seattle', 'PL → EN', 'wszystko gra', 'all good'],
    ['buenosAires', 'milan', 'ES → IT', 'todo bien', 'tutto bene'],
    ['bangkok', 'zurich', 'TH → EN', 'sabai dee mai', 'you doing well'],
    ['athens', 'boston', 'EL → EN', 'ti kaneis', 'how are you'],
    ['bogota', 'madrid', 'ES-CO → ES', 'qué más pues', 'qué tal todo'],
    ['lagos', 'london', 'EN-NG → EN', 'how far', "what's good"],
    ['taipei', 'losAngeles', 'ZH → EN', 'zài ma', 'you there'],
    ['vienna', 'melbourne', 'DE-AT → EN', 'servus', "g'day mate"],
    ['prague', 'austin', 'CS → EN', 'jak se máš', "how's life"],
    ['jakarta', 'tokyo', 'ID → JA', 'apa kabar', 'ogenki desu ka'],
    ['santiago', 'paris', 'ES-CL → FR', 'cachai', 'tu vois'],
    ['dubai', 'newYork', 'AR → EN', 'yalla bina', "let's roll"],
    ['seoul', 'toronto', 'KO → EN', 'jal jinaesseoyo', 'how have you been'],
    ['accra', 'paris', 'TW → FR', 'ete sen', 'ça va'],
    ['hanoi', 'berlin', 'VI → DE', 'khỏe không', "wie geht's"],
    ['capeTown', 'amsterdam', 'EN-ZA → NL', 'howzit', 'hoe gaat het'],
    ['manila', 'madrid', 'TL → ES', 'kumusta', 'qué tal'],
    ['lima', 'rome', 'ES → IT', 'chévere', 'fantastico'],
    ['helsinki', 'tokyo', 'FI → JA', 'moi moi', 'mata ne'],
  ];

  // Pacing
  const MIN_ACTIVE = 3;
  const MAX_ACTIVE = 5;
  const TRAIL_FADE_MS = 1500;
  const PULSE_MS = 1100;
  const NO_REPEAT = 10; // a route can't come back within this many launches

  const ARC_SCALE = 0.42; // arc height relative to great-circle distance (three-globe's default shape)
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

    const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    const routes = ROUTES.map(([a, b, route, src, dst], i) => {
      const from = CITIES[a];
      const to = CITIES[b];
      const curve = makeCurve(from, to);
      const span = angleBetween(toVec(from[1], from[2]), toVec(to[1], to[2]));
      return {
        i,
        a,
        b,
        route,
        src,
        dst,
        from,
        to,
        curve,
        mid: curve(0.5),
        duration: 6000 + span * 1500,
      };
    });
    const cityKeys = [...new Set(ROUTES.flatMap((r) => [r[0], r[1]]))];
    const cityPoints = cityKeys.map((k) => ({
      name: CITIES[k][0],
      lat: CITIES[k][1],
      lng: CITIES[k][2],
    }));

    let globe;
    try {
      globe = new window.Globe(el, { animateIn: !reduceMotion })
        .backgroundColor('rgba(0,0,0,0)')
        .globeImageUrl('img/earth-night.jpg')
        .bumpImageUrl('img/earth-topology.png')
        .showAtmosphere(true)
        .atmosphereColor('#8a8f9c')
        .atmosphereAltitude(0.16)
        .pointsData(cityPoints)
        .pointColor(() => rgba(0.55))
        .pointAltitude(0.004)
        .pointRadius(0.22)
        .pointLabel((d) => `<span class="globe-tip">${d.name}</span>`);
    } catch {
      el.parentElement.style.display = 'none'; // no WebGL: the copy stands on its own
      return;
    }

    const controls = globe.controls();
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.45;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    globe.pointOfView({ lat: 28, lng: -35, altitude: 2.05 }, 0);

    // 2D overlay for trails, phrases and pulses: projected each frame, no per-frame 3D geometry.
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
    let cam = { x: 0, y: 0, z: 1 };
    let camLen = 1;

    /** 0..1 visibility of a unit-space point: fades out past the Earth's limb. */
    const visibility = ([x, y, z]) => {
      const pLen = Math.hypot(x, y, z);
      const cosAngle = (x * cam.x + y * cam.y + z * cam.z) / (pLen * camLen);
      const limit = Math.cos(Math.acos(Math.min(1, R / camLen)) + Math.acos(Math.min(1, 1 / pLen)));
      return smooth(limit - 0.02, limit + 0.12, cosAngle);
    };
    const project = (p) => {
      const [lat, lng, rr] = toLatLng(p);
      return globe.getScreenCoords(lat, lng, rr - 1);
    };

    const active = []; // { r, start, end (landing time, or -1), }
    const pulses = []; // { p (unit vec), start }
    const history = [];
    let nextLaunch = 400;

    function pick() {
      const busyCities = new Set(active.flatMap((x) => [x.r.a, x.r.b]));
      const camDir = [cam.x / camLen, cam.y / camLen, cam.z / camLen];
      let total = 0;
      const options = [];
      for (const r of routes) {
        if (history.includes(r.i) || busyCities.has(r.a) || busyCities.has(r.b)) continue;
        // Spread flights around the globe: prefer routes far from the ones already in the air.
        const nearest = active.reduce(
          (m, x) => Math.min(m, angleBetween(norm(r.mid), norm(x.r.mid))),
          Math.PI,
        );
        let w = nearest > 0.9 ? 3 : nearest > 0.5 ? 1.5 : 0.4;
        // ...and ones the viewer can currently see.
        if (dot(norm(r.mid), camDir) > 0.15) w *= 2.5;
        options.push([r, w]);
        total += w;
      }
      let x = Math.random() * total;
      for (const [r, w] of options) if ((x -= w) <= 0) return r;
      return options[0]?.[0];
    }
    const norm = (v) => {
      const l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l];
    };

    function launch(now) {
      const r = pick();
      if (!r) return;
      active.push({ r, start: now, end: -1 });
      history.push(r.i);
      if (history.length > NO_REPEAT) history.shift();
      pulses.push({ p: r.curve(0), start: now });
      setTelemetry(r);
    }

    function drawPulse(pl, now) {
      const k = (now - pl.start) / PULSE_MS;
      if (k >= 1) return false;
      const vis = visibility(pl.p);
      if (vis < 0.02) return true;
      const s = project(pl.p);
      const ease = 1 - (1 - k) * (1 - k);
      ctx.globalAlpha = vis * (1 - k) * 0.9;
      ctx.strokeStyle = '#f2a93b';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3 + ease * 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return true;
    }

    const SEGMENTS = 72;
    /** Draw the arc between fractions t0..t1, brighter toward the head, dimmed by `fade`. */
    function drawTrail(r, t0, t1, fade) {
      if (t1 - t0 < 0.002) return;
      const n = Math.max(2, Math.ceil(SEGMENTS * (t1 - t0)));
      let prev = null;
      let prevP = null;
      ctx.lineCap = 'round';
      for (let i = 0; i <= n; i++) {
        const t = t0 + ((t1 - t0) * i) / n;
        const p = r.curve(t);
        const s = project(p);
        if (prev) {
          const along = (t - t0) / (t1 - t0 || 1); // 0 at the tail, 1 at the head
          const vis = Math.min(visibility(p), visibility(prevP));
          const a = vis * fade * (0.12 + 0.78 * along * along);
          if (a > 0.01) {
            // soft glow pass, then a crisp core
            ctx.strokeStyle = rgba(a * 0.35);
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
            ctx.strokeStyle = rgba(a);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
          }
        }
        prev = s;
        prevP = p;
      }
    }

    function drawPacket(r, t) {
      const p = r.curve(t);
      const alpha = visibility(p) * smooth(0, 0.08, t) * (1 - smooth(0.94, 1, t));
      if (alpha < 0.02) return;
      const s = project(p);
      if (!Number.isFinite(s.x) || s.x < -80 || s.x > W + 80 || s.y < -40 || s.y > H + 40) return;
      const text = morph(r.src, r.dst, t);
      ctx.font = FONT;
      const tw = ctx.measureText(text).width;
      const bx = Math.round(s.x - tw / 2 - 8);
      const by = Math.round(s.y - 32);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(9, 9, 11, 0.72)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx + 0.5, by + 0.5, Math.round(tw + 16), 22, 4);
      else ctx.rect(bx + 0.5, by + 0.5, Math.round(tw + 16), 22);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = rgba(0.35);
      ctx.beginPath();
      ctx.moveTo(Math.round(s.x) + 0.5, by + 23);
      ctx.lineTo(Math.round(s.x) + 0.5, s.y - 3);
      ctx.stroke();
      const settled = t <= 0.2 || t >= 0.8;
      ctx.shadowColor = rgba(0.55);
      ctx.shadowBlur = 8;
      ctx.fillStyle = settled ? '#fafafa' : '#e7d3b0';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + 8, by + 12);
      ctx.fillStyle = '#f2a93b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    let running = false;
    let raf = 0;
    let clock = 0; // animation time, which stops while paused
    let last = 0;
    const frame = (abs) => {
      const dt = last ? Math.min(100, abs - last) : 16;
      last = abs;
      clock += dt;
      const now = clock;
      const c = globe.camera().position;
      cam = { x: c.x, y: c.y, z: c.z };
      camLen = Math.hypot(c.x, c.y, c.z);

      // Landings and clean-up
      for (let i = active.length - 1; i >= 0; i--) {
        const x = active[i];
        if (x.end < 0 && now - x.start >= x.r.duration) {
          x.end = now;
          pulses.push({ p: x.r.curve(1), start: now });
        }
        if (x.end >= 0 && now - x.end >= TRAIL_FADE_MS) active.splice(i, 1);
      }
      // Keep 3–5 transmissions in the air, launched a little apart.
      const flying = active.filter((x) => x.end < 0).length;
      if (now >= nextLaunch) {
        if (flying < MIN_ACTIVE || (flying < MAX_ACTIVE && Math.random() < 0.45)) launch(now);
        nextLaunch = now + (flying < MIN_ACTIVE ? 900 : 1600 + Math.random() * 2400);
      }

      ctx.clearRect(0, 0, W, H);
      for (let i = pulses.length - 1; i >= 0; i--)
        if (!drawPulse(pulses[i], now)) pulses.splice(i, 1);
      for (const x of active) {
        if (x.end < 0) {
          drawTrail(x.r, 0, clamp01((now - x.start) / x.r.duration), 1);
        } else {
          // Dissolve: the tail retracts toward the destination while the whole trail fades.
          const f = clamp01((now - x.end) / TRAIL_FADE_MS);
          drawTrail(x.r, f * f, 1, 1 - f);
        }
      }
      for (const x of active)
        if (x.end < 0) drawPacket(x.r, clamp01((now - x.start) / x.r.duration));
      if (running) raf = requestAnimationFrame(frame);
    };
    const startLoop = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Don't spend GPU/CPU while the hero is off screen or the tab is hidden.
    let inView = true;
    new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      if (inView) {
        globe.resumeAnimation();
        startLoop();
      } else {
        globe.pauseAnimation();
        stopLoop();
      }
    }).observe(el);
    document.addEventListener('visibilitychange', () =>
      document.hidden || !inView ? stopLoop() : startLoop(),
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
