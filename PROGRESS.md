# Progress

## M0 — Scaffold ✅

Scaffold, options page, repo moved + renamed. TS pinned to 6.0 (typescript-eslint); CI = `pnpm check`
(`pnpm ci` is reserved); `null` provider forced last; ESLint bans `chrome`/DOM globals in `src/core`.

## M1 — Caption pipeline + overlay ✅

**Done**

- `core/json3.ts` (manual events → cues; ASR words merged on punctuation / gap > 0.8s / 12 words),
  `core/cueIndex.ts` (binary search), `core/lang.ts` (track match/pick), `core/liveCues.ts` (DOM fallback, VTT clean).
- `adapters/youtubeMain.ts` (MAIN): wraps fetch + XHR for `/api/timedtext`, reads tracks from the player,
  turns on the best track via player API, replays cache to the isolated script. `adapters/bridge.ts` validates messages.
- `adapters/youtube.ts` (ISOLATED): json3 primary, `.ytp-caption-segment` fallback, SPA nav, ads, track switches;
  keeps non-target tracks in `state.sources` for M2.5. `adapters/html5.ts` + popup "Show captions on this page".
- `ui/overlay/`: Shadow DOM inside `#movie_player`, rVFC sync (timeupdate fallback), drag to move (saved),
  font size / high contrast / on-off settings, "No Spanish captions" notice, native captions hidden (opacity 0).
- 27 unit tests; headless e2e on a mock YouTube page passes 18/18 (sync, ads, drag, SPA nav, html5).
  **Decisions**
- Spec gap: player only fetches timedtext when CC is on, so we enable the target track (`setOption`) ourselves;
  if we turned CC on, turning the overlay off turns it back off.
- Most recent target-language capture wins (respects a manual track switch). No transcript caching until M2.
  **Known issues**
- Not tested on live YouTube from CI (blocked); player API (`setOption`/`getPlayerResponse`) is undocumented.
- Shorts and m.youtube.com unsupported. Generic adapter can't show over sites that fullscreen the bare `<video>`.
  **Next:** M2 — annotation (LLM) + caching.
