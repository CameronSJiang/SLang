# SLang commercial (Remotion)

A 23.5-second, 1920×1080, 60 fps commercial showing both directions:

| Time | What happens |
|---|---|
| 0–4 s | `english_source.mp4` in a hairline frame · `INPUT // ENGLISH` |
| 4–7.5 s | the card collapses into a glowing dot on New York and flies to Madrid; the pill morphs `ENGLISH → ESPAÑOL`; landing flashes `MODE // AI DUBBING` |
| 7.5–11.5 s | the Madrid dot expands into `spanish_dubbed.mp4` · `DUBBED // ESPAÑOL` |
| 11.5–15 s | whip-pan to `spanish_source.mp4` · `INPUT // ESPAÑOL` |
| 15–18.5 s | collapses into Madrid, flies back to New York, `ESPAÑOL → ENGLISH`, `MODE // INSTANT TRANSLATED CAPTIONS` |
| 18.5–22 s | the New York dot expands into `english_captioned.mp4` · `CAPTIONS // ENGLISH` |
| 22–23.5 s | end slate: SLANG · tagline · URL |

`bg_music.mp3` plays throughout: 14% under speech, 55% during flights and the end card, fading
to silence at the end. Soft whooshes and chimes are synthesized (`public/sfx`, `pnpm sfx`).

## 1. Add the five files to `video/public/`

| File | What to record |
|---|---|
| `english_source.mp4` | ~4 s of someone speaking English, medium close-up |
| `spanish_dubbed.mp4` | the same clip with SLang's Spanish dub (Dub mode), ~4.5 s |
| `spanish_source.mp4` | ~4 s of someone speaking Spanish |
| `english_captioned.mp4` | the same Spanish clip with SLang showing English captions, ~4.5 s |
| `bg_music.mp3` | an instrumental track licensed for commercial use |

Missing files show labelled placeholders, so you can preview the motion any time. Use footage
you have the rights to: yourself, friends, or Creative Commons **CC BY** videos (not "NC" or "ND",
which forbid ads and dubbed versions). To skip the start of a clip, set `trimStart` in
`src/config.ts`.

## 2. Preview and export
From the SLang folder:

```
cd video
pnpm install
pnpm studio      # preview in the browser (space = play)
pnpm render      # → video/out/slang-commercial.mp4
```

(`npx remotion studio` and `npx remotion render SLangCommercial out/slang-commercial.mp4` do the
same thing if your npm works.)

## 3. Tweak
`src/config.ts` holds every timing (`T`), the cities, the flight labels, the badges and callouts
(`COPY`), and the music levels (`MUSIC`).

## Files
- `src/Commercial.tsx`: scenes, whip-pan, end slate, music ducking and sound cues.
- `src/components/MorphCard.tsx`: the clip frame that collapses into a dot and grows out of one.
- `src/components/Globe3D.tsx`: WebGL globe (`@remotion/three`, NASA night-lights texture),
  arcs drawn during each flight and dissolved after landing.
- `src/components/FlightOverlay.tsx`: flying dot, morphing language pill, city labels, pulses,
  `MODE //` callouts.
- `src/lib/`: camera path, globe geometry, letter-by-letter morph.
- Fonts (Geist, JetBrains Mono) are bundled in `public/fonts` (SIL Open Font License).

Remotion is free for individuals and companies of up to three people (remotion.dev/license).
