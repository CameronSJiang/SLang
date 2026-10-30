# Progress

## M0–M3 ✅

Scaffold; YouTube caption capture + overlay; LLM annotation (Null / Anthropic `claude-haiku-5-5` / Chrome AI)
with Translator-first line pass and IndexedDB cache; learner model (frequency prior + signals), gloss policy,
ruby glosses, word popover (Save/Known/Ignore, TTS), placement test. Freq lists: wordfreq, CC BY-SA 4.0.

## M2.5 — Dub mode ✅

**Done**

- `core/playback.ts`: presets (Auto / Captions / Dub / Dub + captions / Bilingual) → audio + caption layers;
  spoken language from the auto-generated track; `pickSource` (native language, then human-made).
- `llm/translationJob.ts`: source → L2, playhead-first, cached `site:video:src>l2:dub:1`; tries providers in
  order (Chrome Translator, then Anthropic). Dubbed lines then go through annotation (`<video>~dub`).
- `ui/dub/engine.ts`: speechSynthesis per cue, rate to fit (≤1.6×), holds the video on overrun, ducks to 15%,
  resyncs on seek/pause/rate/ads. Popup mode switcher; options: default mode, voice picker + test.
- 85 unit tests (engine with fake video/synth); headless e2e 13/13 for dub + earlier suites.

**Decisions**

- Only speed lines up (1.0–1.6×), never slow down (spec said 0.8–1.6). English-audio videos with Spanish
  subtitles are dubbed from that track, no translation. Online ("Google") voices only if chosen (privacy).

**Known issues**

- Headless Chrome has no voices, so real speech/ducking is only unit-tested. One voice for all speakers.

**Next:** M4 — review page with clip context.
