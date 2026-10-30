import { findMainVideo, startHtml5Adapter } from '@/src/adapters/html5';
import { IDLE_STATE } from '@/src/adapters/types';
import { extensionAlive, loadSettings, saveSettings, watchSettings } from '@/src/storage/settings';
import { mountOverlay } from '@/src/ui/overlay/mount';

// Injected by the popup's "Show captions on this page" (activeTab + scripting).
export default defineUnlistedScript(async () => {
  const w = window as Window & { __slangHtml5?: boolean };
  const video = findMainVideo();
  if (w.__slangHtml5 || !video?.parentElement || !extensionAlive()) return;
  w.__slangHtml5 = true;

  let settings = await loadSettings();
  let state = IDLE_STATE;
  const ui = mountOverlay(video.parentElement);

  // Pin the host over the video. Both share the nearest positioned ancestor,
  // so the video's offsets are valid for the host.
  const place = () => {
    const s = ui.host.style;
    s.left = `${video.offsetLeft}px`;
    s.top = `${video.offsetTop}px`;
    s.width = `${video.offsetWidth}px`;
    s.height = `${video.offsetHeight}px`;
  };
  const resize = new ResizeObserver(place);
  resize.observe(video);
  document.addEventListener('fullscreenchange', place);
  place();

  const draw = () =>
    ui.render({
      state,
      video,
      settings,
      onMove: (captionPosition) => {
        // An orphaned script (extension reloaded under an open tab) can't save.
        if (extensionAlive()) saveSettings({ captionPosition }).catch(() => {});
      },
    });

  const adapter = startHtml5Adapter(video, settings.targetLang, (s) => {
    state = s;
    draw();
  });
  watchSettings((s) => {
    settings = s;
    adapter.setTarget(s.targetLang);
    draw();
  });
});
