import { startYouTubeAdapter, youtubePlayer } from '@/src/adapters/youtube';
import { IDLE_STATE, type CaptionState } from '@/src/adapters/types';
import { loadSettings, saveSettings, watchSettings } from '@/src/storage/settings';
import { mountOverlay, type OverlayHandle } from '@/src/ui/overlay/mount';
import { setNativeCaptionsHidden } from '@/src/ui/overlay/nativeCaptions';

// ISOLATED world: owns the overlay. Captions arrive from youtube-main.content via postMessage.
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  async main(ctx) {
    let settings = await loadSettings();
    let state: CaptionState = IDLE_STATE;
    let ui: OverlayHandle | null = null;

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
        onMove: (captionPosition) => void saveSettings({ captionPosition }),
      });
    };

    const adapter = startYouTubeAdapter(
      { targetLang: settings.targetLang, enabled: settings.overlayEnabled },
      (s) => {
        state = s;
        draw();
      },
    );
    const unwatch = watchSettings((s) => {
      settings = s;
      adapter.setTarget(s.targetLang, s.overlayEnabled);
      draw();
    });

    ctx.onInvalidated(() => {
      adapter.stop();
      unwatch();
      ui?.unmount();
      setNativeCaptionsHidden(false);
    });
  },
});
