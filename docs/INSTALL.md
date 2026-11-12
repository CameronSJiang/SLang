# Try SLang (tester install)

SLang isn't on the Chrome Web Store yet, so it's installed by hand. It takes about a minute.

1. Download `slang-<version>-chrome.zip` and **unzip** it (double-click on a Mac).
2. In Chrome, go to `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the unzipped folder.
4. A **Welcome to SLang** tab opens — follow its five steps (about five minutes).

Requirements: a recent desktop Chrome. For the free, on-device AI, Chrome needs a few GB of free
disk space and a reasonably recent Mac or PC; without it, captions still work (no translations), or you
can use your own Anthropic API key in SLang settings.

Privacy: SLang has no server and no account. Captions and your learning data stay in your browser. The
only network calls are to the AI provider you choose (none, if you use Chrome's built-in AI). If you turn
on the Natural dub voice, SLang downloads the Kokoro voice model (~90 MB) once from Hugging Face; the
voice then runs on your computer and nothing you watch is sent anywhere.

To update: replace the folder with the new one and click the reload ↻ icon on SLang's card in
`chrome://extensions`. To remove: click **Remove** on that card.
