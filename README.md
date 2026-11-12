# SLang

A Chrome extension that teaches you a language through the videos you already watch.

- **Captions mode:** videos already in the language you're learning get captions in that language, with small translations above only the words you probably don't know.
- **Dub mode:** any other video is dubbed live into the language you're learning, so you hear it instead of your native language.
- **Mix and match:** dub + captions, bilingual captions, or Auto (picks for you).
- Words you save come back for spaced-repetition review with the clip they came from.

Everything stays on your device. The only network calls go to the AI provider you choose.

See `SPEC.md` for the full spec and `PROGRESS.md` for status.

## Try it

Testers: see [docs/INSTALL.md](docs/INSTALL.md) — download the zip, load it in `chrome://extensions`, and
follow the welcome guide.

## Run it

```bash
pnpm install
pnpm dev        # then load .output/chrome-mv3-dev via chrome://extensions → Load unpacked
pnpm check      # lint + tests
pnpm zip        # build .output/slang-<version>-chrome.zip to share
```
