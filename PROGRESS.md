# Progress

## M0–M2 ✅

Scaffold; YouTube json3 capture + track forcing (clears YouTube auto-translate), DOM fallback, Shadow DOM
overlay; LLM annotation (Null / Anthropic `claude-haiku-5-5` / Chrome AI in offscreen doc), Translator-first
line pass, IndexedDB cache (0 calls on reload), hover → L1 line. Deps: `@anthropic-ai/sdk`; perm `offscreen`.

## M3 — Learner model + adaptive glossing ✅

**Done**

- `public/freq/<lang>.json.gz` (top 20k, wordfreq 3.1.1, CC BY-SA 4.0 — see `ATTRIBUTION.md`,
  `scripts/gen-freq.py`). `core/learner.ts` (logistic prior over log-rank vs level/test vocab; lookup ×0.35,
  known = 1, ignore, save → custom; exposure +8% of gap, cap 3/lemma/session), `core/glossPolicy.ts`
  (threshold + cap by density, custom first, then mid-frequency; skips PROPN/NUM), `core/placement.ts`.
- Background owns the lexicon/cards (Dexie); content uses `LexiconClient` over runtime messages.
- Overlay: ruby glosses, underline by state, click word → popover (lemma, POS, gloss, TTS, Save · Known ·
  Ignore; pauses video), exposures after ≥1.5s on screen. Save creates a ts-fsrs Card (sentence, videoId, t).
- Options: 45-item yes/no level test (20% pseudo-words) → level + `vocabSize`. Chrome AI skips top-300 words.
- 65 unit tests; headless e2e 13/13 for M3 (A1 vs C1 density, popover, save, exposure, test) + M1/M2 suites.

**Decisions**

- Hover L1 line floats above the caption (it shifted words under the pointer). Popover pauses playback.

**Known issues**

- Gloss quality depends on provider (Gemini Nano lemmas are weak). Placement test only for Spanish.

**Next:** M2.5 — Dub mode, then M4 — review page.
