# Progress

## M0–M3 ✅

Scaffold; YouTube caption capture + overlay; LLM annotation (Null / Anthropic `claude-haiku-5-5` / Chrome AI)
with Translator-first line pass and IndexedDB cache; learner model (frequency prior + signals), gloss policy,
word popover (Save/Known/Ignore, TTS), placement test. Freq lists: wordfreq, CC BY-SA 4.0.

## M2.5 — Dub mode ✅

Presets → audio + caption layers; source → L2 translation jobs (cached); dub engine (fit 1.0–1.6×, hold on
overrun, duck to 15%, resync on seek/pause/ads). English-audio videos with L2 subs dub from that track.

## 0.1.x — Polish ✅

Welcome guide, icon, `pnpm zip` + `docs/INSTALL.md`, design kit (`ui/settings/page.css`, `kit.tsx`), 6 caption
themes, gloss labels (not `<ruby>`). Master on/off (`enabled`): power buttons, Alt+Shift+S, OFF badge.

## Natural voice (Kokoro) ✅

On-device Kokoro-82M (q8, onnxruntime-web) in the offscreen doc; Spanish phonemes from `core/g2p/es.ts`.
DubEngine takes a Speaker (system / Kokoro), prefetches 4 lines, holds the video while one generates.
ORT wasm bundled in `/ort/`; pages cross-origin isolated → 4 threads. ~0.6× real time on 4 cloud cores.

## Draco + waitlist ✅

Draco (SVG/CSS, `ui/buddy/`) pops up on 🔊 and says the word, mouth moving; `buddyEnabled` toggle.
Review-page quiz (`core/quiz.ts`, pool = cached transcripts + cards): right → `quiz-right`, wrong → saved
+ FSRS Again. `site/`: static waitlist page (set `FORM_URL`); `WAITLIST_URL` shows links once hosted.

**Next:** M4 rest — due badge (`chrome.alarms`), Again/Hard/Good/Easy card reviews.
