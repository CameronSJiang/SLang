# SLang — Chrome extension for learning languages from video

Learn a language from the videos you already watch: L2 captions + adaptive glosses + a learner model + spaced repetition.
Full spec: `SPEC.md`. Progress log: `PROGRESS.md`.

## How to work (token budget matters)
- Read ONLY the SPEC.md section for the current milestone (use Grep for `## M<n>`); don't load the whole spec each time.
- At the end of each milestone: update PROGRESS.md (≤30 lines: done / decisions / known issues / next), commit, then STOP and tell me what to test manually.
- Never read `node_modules/`, `.output/`, `dist/`, lockfiles, or large fixtures. Use Grep + ranged Read, not whole-file reads of big files.
- Don't re-read a file you just edited. Don't paste code back to me in chat — summarize in ≤5 lines.
- Run targeted tests (`pnpm vitest run <path>`), not the full suite, until milestone end.
- Test fixtures stay small (≤20 cues).
- Ask before adding any dependency not in the approved list below.
- If something in SPEC.md is wrong or impossible, say so in one line and propose the fix; don't silently diverge.

## Stack (approved deps)
WXT (MV3) · TypeScript strict · Preact · Dexie (IndexedDB) · ts-fsrs · Vitest · ESLint + Prettier. Package manager: pnpm.

## Architecture rules
- `src/core/` = pure TS, ZERO `chrome.*` / DOM calls (tokenize, learner model, gloss policy, FSRS, scoring). Must be portable to a future Safari Web Extension / mobile app. Unit-test everything here.
- `src/adapters/` = caption sources (one file per site), all emit `Cue[]` (see SPEC §Types).
- `src/llm/` = `LLMProvider` interface; implementations: Chrome built-in AI, Anthropic (BYO key), Null.
- `entrypoints/` = WXT entrypoints (content scripts, background, options, review page, popup).
- Overlay UI lives in a Shadow DOM inside the site's player container (must survive fullscreen).
- Privacy: transcripts and learner data stay local. No analytics. No server. The only network calls are to the user-chosen LLM provider.

## Commands
`pnpm dev` (opens Chrome with extension) · `pnpm build` · `pnpm test` · `pnpm lint`
