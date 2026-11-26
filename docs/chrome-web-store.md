# Chrome Web Store listing

Everything the developer dashboard asks for, in order. Images are in `docs/store/`.

## 1. Before you start

- Developer account: https://chrome.google.com/webstore/devconsole, one-time US$5 fee, verify the
  contact email (it's shown on the listing; consider a dedicated address for SLang).
- Build the upload: `pnpm zip` → `.output/slang-0.1.0-chrome.zip`.
- Privacy policy URL: https://golden-khapse-cd903e.netlify.app/privacy.html (deploy the site first).

## 2. Store listing tab

**Name:** SLang

**Summary** (≤132 characters):

> Learn a language from YouTube: subtitles in your target language, hints on unknown words, Spanish dubbing and quizzes.

**Category:** Education · **Language:** English

**Description:**

> SLang turns the YouTube videos you already watch into language practice.
>
> SUBTITLES IN THE LANGUAGE YOU'RE LEARNING
> SLang shows the video's subtitles in your target language and writes a short translation above
> only the words you probably don't know yet, at most two per line. Hover a line to see it in your
> own language. Click any word for its meaning, part of speech and pronunciation.
>
> IT LEARNS WHAT YOU KNOW
> SLang ranks words by how common they are and starts from your level (or a three-minute
> vocabulary check). Looking a word up, marking it known, or seeing it without looking it up all
> update its estimate, so the hints get fewer as you learn.
>
> DUB ENGLISH VIDEOS INTO SPANISH
> Turn an English video into Spanish listening practice: SLang translates the subtitles and reads
> them aloud in time with the video, with the original sound lowered. The natural Spanish voice runs
> on your computer.
>
> REVIEW WITH DRACO
> Save words with one click. Draco, SLang's dragon, quizzes you on them later, with the sentence
> and video moment where you met each word. Missed words come back sooner.
>
> PRIVATE BY DESIGN
> No account, no analytics, no ads. Your word list and progress stay in your browser. Translation
> uses Chrome's built-in AI on your computer, or your own Anthropic API key if you add one.
>
> Languages: Spanish, French, German, Japanese, Korean and English (subtitles and word meanings).
> Natural dubbing voice and vocabulary check: Spanish.
>
> Works on YouTube in desktop Chrome. Videos need subtitles.

**Images:**

| Field                         | File                                    | Notes                                                                                                        |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Icon 128×128                  | `public/icon/128.png`                   | Already in the zip too                                                                                       |
| Screenshot 1 (most important) | _you take it_                           | SLang on a real YouTube video, 1280×800: hints visible, a word card open. Use a video you may show publicly. |
| Screenshot 2                  | `docs/store/screenshot-quiz.png`        | Draco's quiz                                                                                                 |
| Screenshot 3                  | `docs/store/screenshot-settings.png`    | Caption themes and hints                                                                                     |
| Screenshot 4                  | `docs/store/screenshot-welcome.png`     | Setup guide                                                                                                  |
| Screenshot 5                  | `docs/store/screenshot-popup.png`       | Modes and power button                                                                                       |
| Small promo tile 440×280      | `docs/store/promo-small-440x280.png`    | Required                                                                                                     |
| Marquee 1400×560              | `docs/store/promo-marquee-1400x560.png` | Optional                                                                                                     |

**Website:** https://golden-khapse-cd903e.netlify.app/

## 3. Privacy practices tab

**Single purpose:**

> SLang helps people learn a language from online videos by showing subtitles in the language they
> are learning, translating the words they don't know, and dubbing videos into that language.

**Permission justifications:**

| Permission                 | Justification                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host `*://*.youtube.com/*` | Reads the subtitles of the YouTube video being watched and draws SLang's captions, word hints and dubbing over the player.                                         |
| `storage`                  | Saves the user's settings (languages, level, caption style) on their computer.                                                                                     |
| `activeTab`                | When the user clicks "Show captions on this page" in the popup, gives SLang access to that one tab so it can add captions to a video on a site other than YouTube. |
| `scripting`                | Injects the caption overlay into the current tab after that click.                                                                                                 |
| `offscreen`                | Runs Chrome's built-in translation model and the on-device voice model in a background document, which service workers can't do.                                   |

**Remote code:** No. All code, including the WebAssembly speech runtime, ships in the package.
(The voice model's weights are downloaded from huggingface.co as data on the user's request.)

**Data usage** (tick these):

- **Website content:** yes. Subtitles of videos the user watches are processed on the device; they
  are sent to Anthropic only if the user adds their own API key, to be translated.
- **Authentication information:** yes. The user's own Anthropic API key, if they enter one, is
  stored locally and sent only to Anthropic.
- Everything else: no.

Certify all three: not sold to third parties; not used or transferred for purposes unrelated to the
single purpose; not used for creditworthiness or lending.

**Privacy policy URL:** https://golden-khapse-cd903e.netlify.app/privacy.html

## 4. Distribution

- Visibility: **Unlisted** for a beta (only people with the link can install), then Public.
- Regions: all. Price: free (paid features would come later through the extension, not the store).

## 5. Submit

Upload the zip, fill the tabs above, **Submit for review**. Reviews usually take a few days. Ask for
review notes to say: "Open any YouTube video with Spanish subtitles; captions appear automatically.
The popup's Mode buttons switch between captions and dubbing."
