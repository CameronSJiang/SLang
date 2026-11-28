# Progress

## M0–M3 ✅

Scaffold; YouTube caption capture + overlay; LLM annotation (Null / Anthropic `claude-haiku-5-5` / Chrome AI)
with Translator-first line pass and IndexedDB cache; learner model (frequency prior + signals), gloss policy,
word popover (Save/Known/Ignore, TTS), placement test. Freq lists: wordfreq, CC BY-SA 4.0.

## M2.5 — Dub mode ✅

Presets → audio + caption layers; source → L2 translation jobs (cached); dub engine: audio prepared 7 lines
ahead (rolling), slot = until next caption, 1.0–1.6×, ≤1.2 s overrun before pausing, duck to 15%, resync on seek/ads.

## 0.1.x — Polish ✅

Welcome guide, icon, `pnpm zip`, design system matching the site (`page.css`, bundled fonts, Lucide icons
in `ui/icons.tsx`, no emoji), 6 caption themes, gloss labels. Master on/off: power buttons, Alt+Shift+S.

## Natural voice (Kokoro) ✅

On-device Kokoro-82M (q8, onnxruntime-web, ORT wasm in `/ort/`, 4 threads) in the offscreen doc; phonemes
from `core/g2p/es.ts`. ~0.6× real time on 4 cloud CPU cores, so lines not ready in time use the system voice
(no pause); opt-in WebGPU (fp32, 325 MB) after an adapter check.

## Draco + waitlist ✅

Draco (`public/draco.png` + CSS motion, `ui/buddy/`) pops up on the speaker button; review-page quiz (`core/quiz.ts`): right →
`quiz-right`, wrong → saved + FSRS Again. `site/`: waitlist page (`FORM_URL`) + `create-form.gs` (Apps Script).

**Next:** M4 rest — due badge (`chrome.alarms`), Again/Hard/Good/Easy card reviews.
