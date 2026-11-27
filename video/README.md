# SLang launch film (Remotion)

A 17.5-second, 1920×1080, 60 fps launch video: your English clip → a 3D globe where the
phrase flies New York → Madrid and translates letter by letter → your dubbed clip → end card.

## 1. Add your two clips
Put them in `video/public/` with exactly these names:

| File | What | Length used |
|---|---|---|
| `english_clip.mp4` | the original English video (OBS recording) | first 5 s |
| `dubbed_clip.mp4` | the same moment with SLang's Spanish dub and captions | first 5.8 s |

Until they're there, the film shows labelled placeholders so you can preview the motion.
Use MP4 (OBS: Settings → Output → Recording Format → mp4). To start a clip later, set
`trimStart` (seconds) in `src/config.ts`.

## 2. Match the captions to what's said
Open `src/config.ts` → `CAPTIONS`. Replace the sample words and times (seconds from the start of
each clip) with what's actually said. If the dubbed clip already shows SLang's own captions and
two caption lines feel like too much, set `dubbed.show: false`.

Also in `config.ts`: all timings (`TIMELINE`), the flying phrase (`PHRASE`), the two cities
(`ROUTE`), and every piece of on-screen text (`COPY`).

## 3. Preview and export
In Terminal, from the SLang folder:

```
cd video
pnpm install
pnpm studio
```

The studio opens in your browser: press space to play, drag the timeline to scrub.

Export the final MP4 (H.264, high quality, with audio):

```
pnpm render
```

The file appears at `video/out/slang-launch.mp4`. (Same as `npx remotion studio` /
`npx remotion render SLangLaunch out/slang-launch.mp4` if your npm works.)

## What's inside
- `src/Launch.tsx`: the four acts and the audio mix, as one continuous timeline.
- `src/components/Globe3D.tsx`: the WebGL globe (`@remotion/three`): NASA night-lights Earth,
  thin atmosphere, the arc drawing itself as the phrase flies.
- `src/components/GlobeOverlay.tsx`: the phrase label, city labels and pulse rings, projected
  from the same camera so they stay on the arc.
- `src/components/ClipCard.tsx`: the framed clips with badge, live waveform (from the clip's
  real audio) and word-by-word captions.
- `src/lib/morph.ts`: the letter-by-letter translation (same as the website).
- `scripts/make-sfx.mjs`: synthesizes `public/sfx/whoosh.wav` and `chime.wav` (`pnpm sfx`).
- Fonts (Geist, JetBrains Mono) are bundled in `public/fonts` under the SIL Open Font License.

Remotion is free for individuals and companies of up to three people; check
remotion.dev/license if SLang grows past that.
