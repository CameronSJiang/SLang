# SLang website

Static site, no build step: `index.html`, `styles.css`, `app.js`, `icon.png`.

- `vendor/globe.gl.min.js`: globe.gl 2.46.2 (MIT, `vendor/globe.gl.LICENSE`), bundled so the page
  doesn't depend on a CDN. Excluded from lint/format.
- `img/earth-night.jpg`, `img/earth-topology.png`: NASA Black Marble night lights and topography
  (public domain), from the three-globe examples.
- The word-model chart in `app.js` uses the same formula and constants as `src/core/learner.ts`;
  keep them in sync if the model changes.
- `create-form.gs`: Apps Script that created the waitlist/survey Google Form (`FORM_URL` in `app.js`).

Preview locally with `python3 -m http.server --directory site` (the globe's textures need http,
not file://). Deploy by dragging this folder onto app.netlify.com/drop.
