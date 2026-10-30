import { startYouTubeAdapter, youtubePlayer } from '@/src/adapters/youtube';
import { IDLE_STATE, type CaptionState } from '@/src/adapters/types';
import type { Settings } from '@/src/core/settings';
import type { AnnotatedCue, Cue } from '@/src/core/types';
import type { AnnotationProgress } from '@/src/llm/annotator';
import { requestAnnotation, type AnnotationClient } from '@/src/llm/client';
import { extensionAlive, loadSettings, saveSettings, watchSettings } from '@/src/storage/settings';
import { mountOverlay, type OverlayHandle } from '@/src/ui/overlay/mount';
import { setNativeCaptionsHidden } from '@/src/ui/overlay/nativeCaptions';

const PLAYHEAD_EVERY_MS = 3000;

// Settings that change which provider annotates, or what it produces.
const aiSettingsKey = (s: Settings) =>
  JSON.stringify([s.providers, s.nativeLang, s.anthropicApiKey.length > 0]);

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

    ctx.onInvalidated(() => {
      clearInterval(playhead);
      stopAnnotation();
      adapter.stop();
      unwatch();
      ui?.unmount();
      setNativeCaptionsHidden(false);
    });
  },
});
