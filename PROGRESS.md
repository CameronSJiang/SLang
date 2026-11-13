# Progress

## M0–M3 ✅

Scaffold; YouTube caption capture + overlay; LLM annotation (Null / Anthropic `claude-haiku-5-5` / Chrome AI)
with Translator-first line pass and IndexedDB cache; learner model (frequency prior + signals), gloss policy,
ruby glosses, word popover (Save/Known/Ignore, TTS), placement test. Freq lists: wordfreq, CC BY-SA 4.0.

## M2.5 — Dub mode ✅

Presets → audio + caption layers; source → L2 translation jobs (cached); dub engine (fit 1.0–1.6×, hold on
overrun, duck to 15%, resync on seek/pause/ads). English-audio videos with L2 subs dub from that track.

## 0.1.x — Polish ✅

Welcome guide (opens on install), icon, saved-words page, `pnpm zip` + `docs/INSTALL.md`. Design kit
(`src/ui/settings/page.css`, `kit.tsx`), friendly level picker, 6 caption themes (CSS variables), gloss
labels instead of `<ruby>` (it stretched words). Chrome injects 75% Inter into extension pages: overridden.
Master on/off (`enabled`, migrated from `overlayEnabled`): popup/options power button, Alt+Shift+S, OFF badge.

## Natural voice (Kokoro) ✅

On-device Kokoro-82M (q8, onnxruntime-web via transformers.js) in the offscreen doc; Spanish phonemes from
our rules (`core/g2p/es.ts`; Whisper transcribed the output correctly). DubEngine takes a Speaker
(system / Kokoro); Kokoro clips are prefetched 4 lines ahead and the video holds while one generates.
ORT wasm bundled in `/ort/` (no remote code); extension pages cross-origin isolated → 4 threads.
Known: ~0.6× real time on a 4-core cloud CPU (expect ~real time on a recent Mac). Spanish only.

**Next:** M4 — review page with clip context.
