# Progress

## M0 — Scaffold ✅

**Done**

- WXT 0.21 (MV3) + TS strict + Preact 11 + Dexie 4 + ts-fsrs + Vitest + ESLint/Prettier, pnpm.
- Entrypoints: `youtube.content` (ISOLATED), `youtube-main.content` (MAIN, document_start),
  `background`, `options` (opens in tab), `review` (unlisted), `popup`. Scripts are hello-world stubs.
- `src/core/types.ts` (SPEC types), `src/core/settings.ts` (defaults + `normalizeSettings` + `redactSettings`).
- `src/storage/settings.ts` (chrome.storage.local load/save/watch), `src/storage/db.ts` (Dexie, 6 tables).
- Options page: target/native language, provider order (↑/↓, enable/disable), API key (password + Show),
  gloss density, level. Saves on change.
- Permissions: `storage`, `activeTab`, `scripting`, host `*://*.youtube.com/*`.
- 8 tests (settings normalization, redaction, storage round-trip via WXT fakeBrowser).
  `pnpm check` = lint (eslint + prettier --check + tsc) + test. Headless Chromium smoke test: options persist.

**Decisions**

- Moved from `CapstoneEngineeringProject/weave/` to its own repo (SLang) with history.
- Extra dev deps (approved): `@preact/preset-vite`, `typescript-eslint`, `eslint-config-prettier`, `globals`.
- CI script named `check` (`pnpm ci` is a reserved pnpm command).
- TypeScript pinned to 6.0 (typescript-eslint doesn't support TS 7 yet).
- `null` provider is always forced last; settings in `chrome.storage.local` (not Dexie `settings`,
  which is reserved for app state). ESLint bans `chrome`/`browser`/`window`/`document` in `src/core`.
- Lexicon primary key is `[lang+lemma]`; transcripts key = `${site}:${videoId}:${lang}:${schemaVersion}`.
  **Known issues**

- `pnpm dev` unverified here (no display). Languages: en/es/fr/ja/ko (`LANGUAGES` in core/settings).
  **Next:** M1 — YouTube caption pipeline + overlay.
