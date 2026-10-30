# Progress

## M0–M1 — Scaffold, caption pipeline + overlay ✅

TS 6.0 (typescript-eslint); CI = `pnpm check`. json3 capture + track forcing, DOM fallback, SPA nav/ads,
Shadow DOM overlay (rVFC, drag, size/contrast), no-captions notice, HTML5 adapter. Verified on live YouTube.

## M2 — Annotation (LLM) + caching ✅

**Done**

- `core/tokenize.ts` (Intl.Segmenter), `core/annotation.ts` (prompt, schema, `surface|lemma|POS|gloss` alignment,
  validation, null annotate, hash), `core/batching.ts` (chunks + 2-cue context, playhead-first order).
- `llm/`: `LLMProvider`, Null, Anthropic (SDK, `claude-haiku-5-5`, effort low, json_schema output), Chrome AI
  (Prompt API + Translator, in an offscreen doc), `annotator.ts` (retry once → Null, cache, resume).
- Background job per transcript, streamed to the tab over a port; Dexie cache; hover caption → L1 line;
  status pill; options: Chrome AI status / Download / Test, Test Anthropic key.
- 43 unit tests; headless e2e: second load 0 API calls, hover L1, offscreen messaging, Chrome AI setup (faked).

**Decisions**

- New dep `@anthropic-ai/sdk` and `offscreen` permission (approved). Chrome AI chunk = 6 cues (Nano is slow).
- Cache key lang segment is `${lang}>${nativeLang}`; Null-annotated cues are redone once a real provider exists.

**Known issues**

- Real Gemini Nano speed/quality untested (headless has no model). Live (DOM-fallback) cues aren't annotated.

**Next:** M2.5 — Dub mode.
