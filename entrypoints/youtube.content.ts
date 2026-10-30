import { startYouTubeAdapter, youtubePlayer } from '@/src/adapters/youtube';
import { IDLE_STATE, type CaptionState } from '@/src/adapters/types';
import type { Settings } from '@/src/core/settings';
import type { AnnotatedCue, Cue } from '@/src/core/types';
import type { AnnotationProgress } from '@/src/llm/annotator';
import { requestAnnotation, type AnnotationClient } from '@/src/llm/client';
import { ExposureCounter, type LexEvent } from '@/src/core/learner';
import { LexiconClient } from '@/src/storage/lexClient';
import { extensionAlive, loadSettings, saveSettings, watchSettings } from '@/src/storage/settings';
import { mountOverlay, type OverlayHandle } from '@/src/ui/overlay/mount';
import { setNativeCaptionsHidden } from '@/src/ui/overlay/nativeCaptions';

const PLAYHEAD_EVERY_MS = 3000;
const EXPOSURE_FLUSH_MS = 5000;
/** Never credit exposure to these: they're not vocabulary. */
const NO_EXPOSURE_POS = new Set(['PROPN', 'NUM', 'PUNCT', 'SYM']);

// Settings that change which provider annotates, or what it produces.
const aiSettingsKey = (s: Settings) =>
  JSON.stringify([s.providers, s.nativeLang, s.anthropicApiKey.length > 0]);
// Settings that move every word's prior.
const priorKey = (s: Settings) => JSON.stringify([s.level, s.vocabSize]);

// ISOLATED world: owns the overlay. Captions arrive from youtube-main.content via postMessage.
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  async main(ctx) {
    if (!extensionAlive()) return;
    let settings = await loadSettings();
    let state: CaptionState = IDLE_STATE;
    let ui: OverlayHandle | null = null;

    let annotations = new Map<string, AnnotatedCue>();
    let ai: AnnotationProgress | null = null;
    let client: AnnotationClient | null = null;
    let annotating: Cue[] | null = null;
    let lex: LexiconClient | null = null;
    let exposures = new ExposureCounter();
    let pendingExposures: string[] = [];

    const video = () => youtubePlayer()?.querySelector('video') ?? null;

    const draw = () => {
      const player = youtubePlayer();
      const on = settings.overlayEnabled && !!state.videoId;
      setNativeCaptionsHidden(on);
      if (!on || !player) {
        ui?.unmount();
        ui = null;
        return;
      }
      if (ui?.host.parentElement !== player) {
        ui?.unmount();
        ui = mountOverlay(player);
      }
      ui.render({
        state,
        video: player.querySelector('video'),
        settings,
        annotations,
        ai,
        ...(lex ? { wordInfo: (lemma: string) => lex?.get(lemma) } : {}),
        onWord: (action, cue, token) => {
          if (!lex || !state.videoId) return;
          if (action === 'save') {
            void lex
              .save(token.lemma, {
                sentence: cue.text,
                gloss: token.gloss,
                videoId: state.videoId,
                t: cue.start,
              })
              .catch(() => {});
          } else {
            void lex.event([{ lemma: token.lemma, event: action satisfies LexEvent }]);
          }
        },
        onExposure: (cue) => {
          for (const t of cue.tokens) {
            if (!NO_EXPOSURE_POS.has(t.pos) && exposures.take(t.lemma))
              pendingExposures.push(t.lemma);
          }
        },
        onMove: (captionPosition) => {
          // An orphaned script (extension reloaded under an open tab) can't save.
          if (extensionAlive()) saveSettings({ captionPosition }).catch(() => {});
        },
      });
    };

    const stopAnnotation = () => {
      client?.stop();
      client = null;
      annotating = null;
      annotations = new Map();
      ai = null;
      lex = null;
      exposures = new ExposureCounter();
      pendingExposures = [];
    };

    /** Annotate full transcripts (not live on-screen cues, which keep growing). */
    const syncAnnotation = () => {
      const want =
        settings.overlayEnabled &&
        state.status === 'ready' &&
        !state.live &&
        state.lang &&
        state.videoId
          ? state.cues
          : null;
      if (want === annotating) return;
      stopAnnotation();
      if (!want || !state.videoId || !state.lang || !extensionAlive()) return;
      annotating = want;
      const lexicon = new LexiconClient(state.lang, draw);
      lex = lexicon;
      client = requestAnnotation(
        {
          site: 'youtube',
          videoId: state.videoId,
          lang: state.lang,
          cues: want,
          playhead: video()?.currentTime ?? 0,
        },
        {
          chunk: (cues) => {
            annotations = new Map(annotations);
            for (const c of cues) annotations.set(c.id, c);
            lexicon.want(cues.flatMap((c) => c.tokens.map((t) => t.lemma)));
            draw();
          },
          progress: (p) => {
            ai = p;
            draw();
          },
        },
      );
    };

    const adapter = startYouTubeAdapter(
      { targetLang: settings.targetLang, enabled: settings.overlayEnabled },
      (s) => {
        state = s;
        syncAnnotation();
        draw();
      },
    );
    const unwatch = watchSettings((s) => {
      const restart = aiSettingsKey(s) !== aiSettingsKey(settings);
      if (priorKey(s) !== priorKey(settings)) lex?.reset();
      settings = s;
      adapter.setTarget(s.targetLang, s.overlayEnabled);
      if (restart) stopAnnotation();
      syncAnnotation();
      draw();
    });
    const playhead = setInterval(() => {
      if (!extensionAlive()) return;
      const v = video();
      if (client && v) client.setPlayhead(v.currentTime);
    }, PLAYHEAD_EVERY_MS);

    const flushExposures = setInterval(() => {
      if (!lex || !pendingExposures.length || !extensionAlive()) return;
      const events = pendingExposures.map((lemma) => ({ lemma, event: 'exposure' as const }));
      pendingExposures = [];
      void lex.event(events);
    }, EXPOSURE_FLUSH_MS);

    ctx.onInvalidated(() => {
      clearInterval(flushExposures);
      clearInterval(playhead);
      stopAnnotation();
      adapter.stop();
      unwatch();
      ui?.unmount();
      setNativeCaptionsHidden(false);
    });
  },
});
