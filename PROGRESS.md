# Progress

## M0–M3 ✅

Scaffold; YouTube caption capture + overlay; LLM annotation (Null / Anthropic `claude-haiku-5-5` / Chrome AI)
with Translator-first line pass and IndexedDB cache; learner model (frequency prior + signals), gloss policy,
word popover (Save/Known/Ignore, TTS), placement test. Freq lists: wordfreq, CC BY-SA 4.0.

## M2.5 — Dub mode ✅

Presets → audio + caption layers; source → L2 translation jobs (cached); dub engine: audio prepared 7 lines
ahead (rolling), slot = until next caption, 1.0–1.6×, ≤1.2 s overrun before pausing, duck to 15%, resync on seek/ads.

## 0.1.x — Polish ✅

Welcome guide, icon, `pnpm zip` + `docs/INSTALL.md`, design kit (`ui/settings/page.css`, `kit.tsx`), 6 caption
themes, gloss labels (not `<ruby>`). Master on/off (`enabled`): power buttons, Alt+Shift+S, OFF badge.

## Natural voice (Kokoro) ✅

On-device Kokoro-82M (q8, onnxruntime-web, ORT wasm in `/ort/`, 4 threads) in the offscreen doc; phonemes
from `core/g2p/es.ts`. ~0.6× real time on 4 cloud CPU cores, so lines not ready in time use the system voice
(no pause); opt-in WebGPU (fp32, 325 MB) after an adapter check.

## Draco + waitlist ✅

Draco (SVG/CSS, `ui/buddy/`) pops up on 🔊 and says the word; review-page quiz (`core/quiz.ts`): right →
`quiz-right`, wrong → saved + FSRS Again. `site/`: waitlist page (`FORM_URL`) + `create-form.gs` (Apps Script).

**Next:** M4 rest — due badge (`chrome.alarms`), Again/Hard/Good/Easy card reviews.
