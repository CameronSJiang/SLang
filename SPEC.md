# SLang — Product & Technical Spec (Phase 0: Chrome extension)

## Goal
Prove the learning loop before fighting mobile OSes: users watch real video — either L2 video with L2 captions, or any other video **dubbed live into L2** — see L2 text with *just enough* glosses → save/learn words → review them with clip context → come back.
Success metrics (log locally, show on Stats page): week-4 retention, minutes watched, words saved, 7-day recall rate, review sessions ÷ watch sessions.

First language pair: EN speaker learning Spanish (es). Keep language codes as config so ko/ja/fr are a data change, not a rewrite.

## Pedagogy rules (non-negotiable — these are the product)
1. **Everything the learner hears and reads defaults to L2.** L2 video → L2 captions (Captions mode). Non-L2 video → dubbed into L2 (Dub mode, M2.5). Never dub or caption into L1 by default; the full L1 line translation is hidden and revealed on demand (hotkey `R` or hover).
2. Gloss only words the learner probably doesn't know, capped per cue (i+1). Target ≈95–98% known-word coverage.
3. **Gloss, don't substitute.** Show the L1 gloss as small ruby text above the L2 word; never rewrite or mix L1 words into an L2 sentence (avoids morphology/agreement errors). Dub mode translates whole lines into natural L2; it never produces mixed-language lines.
4. Every saved word must re-enter a review loop with the sentence + clip it came from.
5. Interaction is optional; watching without clicking still updates the learner model (implicit signals).

## Types (src/core/types.ts)
```ts
Cue { id: string; start: number; end: number; text: string }        // seconds
Token { surface: string; lemma: string; pos: string; gloss: string; start: number; end: number } // char offsets in cue.text
AnnotatedCue extends Cue { tokens: Token[]; l1?: string }
WordState = 'new' | 'seen' | 'learning' | 'known' | 'ignored'
LexEntry { lemma: string; lang: string; state: WordState; pKnown: number; exposures: number; lookups: number; firstSeen: number; lastSeen: number; custom: boolean }
Card { id: string; lemma: string; lang: string; sentence: string; gloss: string; videoId: string; t: number; fsrs: <ts-fsrs Card> }
```
Dexie tables: `transcripts` (key: `${site}:${videoId}:${lang}:${schemaVersion}`), `lexicon`, `cards`, `reviewLog`, `sessions`, `settings`.

---

## M0 — Scaffold
- WXT + TS strict + Preact + Dexie + Vitest + ESLint/Prettier, pnpm.
- Entrypoints: `youtube.content` (ISOLATED), `youtube-main.content` (MAIN world, `run_at: document_start`), `background`, `options`, `review` (unlisted page), `popup`.
- Options page: target language, native language, LLM provider choice, Anthropic API key field (stored in `chrome.storage.local`, never logged), gloss density (Auto / Low / Med / High), self-reported level (A1–C1).
- Permissions: `storage`, host `*://*.youtube.com/*`. Use `activeTab` + `scripting` for the generic adapter (no `<all_urls>`).
- Done when: `pnpm dev` loads the extension, options persist, CI script (`pnpm lint && pnpm test`) passes.

## M1 — Caption pipeline + overlay
**YouTube adapter** (`src/adapters/youtube.ts`):
- Primary: in the MAIN-world script, wrap `window.fetch` and `XMLHttpRequest` to observe the player's own `/api/timedtext` responses (prefer `fmt=json3`), and `postMessage` the payload to the ISOLATED script. Don't fetch timedtext ourselves (YouTube requires tokens that change).
- Parse json3 → `Cue[]`; merge auto-caption fragments into sentence-ish cues (split on punctuation / gaps >0.8s / max 12 words).
- Fallback: `MutationObserver` on the caption container (`.ytp-caption-segment`) → build cues live (no lookahead).
- Handle SPA navigation (`yt-navigate-finish`), ads (pause overlay while `.ad-showing`), caption track language switches.
- Capture whatever track the player loads and record its language (dub mode needs non-L2 tracks too). If no L2 track exists, show a small in-overlay notice: "No <lang> captions for this video." (M2.5 replaces this with Dub mode.)

**Generic adapter** (`src/adapters/html5.ts`): on user click in popup, inject into the active tab; read `video.textTracks` (mode → 'hidden', listen to `cuechange`).

**Overlay** (`src/ui/overlay/`):
- Shadow DOM root appended inside the player container (`#movie_player`) so it stays visible in fullscreen.
- Hide native captions via injected CSS while overlay is on.
- Sync to `video.currentTime` with `requestVideoFrameCallback` (fallback `timeupdate`); binary-search the active cue.
- Draggable vertical position, font-size setting, high-contrast background.
- Done when: a Spanish YouTube video shows our overlay in sync, in and out of fullscreen, across SPA navigation.

## M2 — Annotation (LLM) + caching
- `src/core/tokenize.ts`: `Intl.Segmenter(lang, {granularity:'word'})` for surfaces/offsets.
- `LLMProvider` interface: `annotate(cues: Cue[], ctx): Promise<AnnotatedCue[]>`, `translateLine(text, from, to): Promise<string>`, `translateCues(cues, from, to): Promise<Cue[]>`, `available(): Promise<boolean>`.
- Providers, tried in order the user picks:
  1. **Chrome built-in AI**: Prompt API (extensions) for annotation; Translator API for L1 line translation. Feature-detect and handle model download state.
  2. **Anthropic (BYO key)**: Messages API from the background service worker with header `anthropic-dangerous-direct-browser-access: true`; default model `claude-haiku-5-5`; ask for strict JSON (lemma, pos, context-specific gloss per token).
  3. **Null**: dictionary-free fallback (tokens only, glosses empty) so the overlay still works.
- Batch: annotate the full transcript up-front in chunks of ~30 cues with 2 cues of overlap for context; annotate the chunk around the current playhead first, then the rest in background. Validate JSON with a tiny schema check; retry once on failure, else Null for that chunk.
- Cache annotated transcripts in IndexedDB keyed as above. Never send transcripts anywhere except the chosen LLM provider.
- Done when: second load of the same video makes zero LLM calls; a 20-min video annotates without blocking playback.

## M2.5 — Dub mode (live dubbing into L2)
- **Playback modes** (options default + popup switcher; hotkey later). Audio and caption layers are independent so they combine:
  - audio: `original` | `dub` (L2 voice, original ducked)
  - captions: `off` | `l2` (glossed) | `l2+source` (glossed L2 plus the original line, small, below)
  - presets: **Captions** (original + l2), **Dub** (dub + off), **Dub + captions** (dub + l2), **Bilingual** (dub + l2+source), **Auto** (L2 track exists → Captions, else Dub + captions; default).
- If the video has an L2 track but people speak another language (auto-generated track language ≠ L2), dub straight from the L2 track. Otherwise translate source cues → L2 with `translateCues`, playhead-first, ~30-cue chunks like M2; cache in `transcripts` with key `${site}:${videoId}:${srcLang}>${l2}:dub:${schemaVersion}`. Dubbed lines then go through the same annotate/gloss pipeline, so saving words, the learner model, and reviews work identically in Dub mode.
- TTS: `speechSynthesis` with an L2 voice (voice picker in options). Per cue, set rate so the line fits the cue duration (speed up only, 1.0–1.6×; slowing a line to fill silence sounds unnatural); if it still overruns, pause the video until the utterance ends, then resume.
- Ducking: lower `video.volume` to ~15% of the user's level while speaking, restore after; respect mute.
- Seek, pause, playback-rate change, ads and SPA navigation cancel the current utterance and resync to the playhead.
- Done when: an English YouTube video plays with Spanish voice starting within ~0.5s of each cue, original ducked; switching presets mid-video works without reload; second load makes zero translation calls.
- Later (ask first — new dependency + an extra network call): natural cloud TTS voices, per-speaker voices.

## M3 — Learner model + adaptive glossing
- Ship a frequency list for the target language (e.g. top 20k words from an OpenSubtitles-derived list; check license, store as compressed JSON in `public/`).
- `pKnown(lemma)` = prior from frequency rank vs user level (logistic curve), updated by signals:
  - lookup/click → strong down; marked known → 1.0; ignored → excluded
  - exposure with no click while cue was on screen ≥1.5s → small up (cap per session)
- Gloss policy (`src/core/glossPolicy.ts`, pure): per cue, candidates = tokens with pKnown < threshold (from density setting / Auto); always include `custom` target words; cap = 1 (Low) / 2 (Med) / 3 (High) per cue; prioritize custom → mid-frequency → rare. Skip proper nouns and numbers.
- Visual: glossed words show ruby gloss; underline color by state (new / learning / known hidden).
- Click popover: lemma, POS, context gloss, TTS button (`speechSynthesis`, L2 voice), buttons: Save · Known · Ignore.
- Placement test (options page, ~2 min): yes/no on words sampled across frequency bands + ~20% pseudo-words to penalize guessing (LexTALE-style) → sets initial level curve.
- Done when: unit tests cover pKnown updates and gloss policy; a beginner and an advanced profile visibly get different gloss density on the same video.

## M4 — Spaced repetition with clip context
- `ts-fsrs` scheduling. Save → creates Card with the sentence, gloss, `videoId`, timestamp.
- Review page: front = L2 sentence with target word blanked/highlighted + "▶ replay clip" (opens `youtube.com/watch?v=ID&t=T`); back = gloss, lemma, TTS. Ratings Again/Hard/Good/Easy.
- Toolbar badge = due count (`chrome.action.setBadgeText`), refreshed hourly via `chrome.alarms`.
- Reviews feed back into `pKnown`.
- Done when: cards schedule correctly in tests; badge shows due count.

## M5 — Learning-mode UX (the "nice" features)
- Hotkeys (only when the overlay has focus or the player is focused; never hijack typing in inputs): `A`/`D` prev/next cue, `S` replay current cue, `R` reveal L1 line, `Q` toggle learning mode, `[`/`]` playback speed.
- **Learning mode:** auto-pause at the end of any cue containing a new custom/target word; resume on Space.
- **Comprehensibility score:** before playback, show "~92% known words · good fit" based on transcript vs learner model. Color: green 95%+, yellow 85–95%, red below.
- **End-of-video recap:** when the video ends (or the user leaves after ≥5 min), show a 5-word quick quiz from words met this session; results feed FSRS.
- **Sentence mining:** shift-click a cue to save the whole sentence as a card.

## M6 — Data, stats, and reading mode
- Vocab import: paste or CSV (`word,gloss?`) → marks `custom: true`. Export: Anki-compatible CSV, and full learner-model JSON (export/import, versioned — this is the future bridge to mobile).
- Stats page: words met, known count over time, minutes watched, streak, review accuracy, the success metrics above.
- **Reading mode:** popup button → on the current page, gloss words in the main article text (simple main-content heuristic) using the same policy and popover. Works on news sites, Reddit, etc.

## M7 — (Stretch, behind a flag) Uncaptioned audio
- `chrome.tabCapture` → offscreen document → 10–15s audio chunks → cloud STT (user-provided key) → `Cue[]` → same pipeline. Show a "live (approx.)" label. Don't start this until M0–M6 are solid.

---

## Out of scope for Phase 0
Netflix/DRM sites, accounts/sync/servers, payments, mobile.

## Future (don't build now — but keep `src/core` portable for it)
- **iOS workaround:** port to a **Safari Web Extension** (same WebExtension code) → works on m.youtube.com in iOS Safari, no overlay permission needed. Plus a **Share Extension**: share a YouTube link → opens our in-app player with the overlay. Control Center control = shortcut that launches the app on the last copied link.
- **Android:** Quick Settings tile + `SYSTEM_ALERT_WINDOW` overlay + OCR of on-screen subtitles via `MediaProjection`; share-sheet entry for links.
- Learner-model JSON format = the sync contract across all clients.
