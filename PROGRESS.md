# Progress

## M0–M3 ✅

Scaffold; YouTube caption capture + overlay; LLM annotation (Null / Anthropic `claude-haiku-5-5` / Chrome AI)
with Translator-first line pass and IndexedDB cache; learner model (frequency prior + signals), gloss policy,
ruby glosses, word popover (Save/Known/Ignore, TTS), placement test. Freq lists: wordfreq, CC BY-SA 4.0.

## M2.5 — Dub mode ✅

Presets → audio + caption layers (`core/playback.ts`); source → L2 translation jobs, cached
(`llm/translationJob.ts`); speechSynthesis engine: fit rate 1.0–1.6× (speed up only), hold on overrun,
duck to 15%, resync on seek/pause/ads. English-audio videos with L2 subs dub from that track.
Online ("Google") voices only if chosen. Headless e2e 13/13; engine unit-tested with fakes.

**Known issues**: headless Chrome has no voices (speech only unit-tested); one voice for all speakers.

## 0.1.x — Polish ✅

Welcome guide (opens on install), icon, saved-words page, `pnpm zip` + `docs/INSTALL.md`. Design kit
(`src/ui/settings/page.css`, `kit.tsx`), friendly level picker, 6 caption themes (CSS variables), gloss
labels instead of `<ruby>` (it stretched words). Chrome injects 75% Inter into extension pages: overridden.

**Next:** OpenAI voice (needs key) or M4 — review page with clip context.
