const STYLE_ID = 'slang-hide-native-captions';

/**
 * Hide the site's own caption rendering while our overlay is on. Uses
 * opacity (not display) so the caption DOM keeps updating for the
 * on-screen-text fallback.
 */
export function setNativeCaptionsHidden(
  hidden: boolean,
  selector = '.ytp-caption-window-container',
): void {
  const existing = document.getElementById(STYLE_ID);
  if (!hidden) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${selector} { opacity: 0 !important; }`;
  (document.head ?? document.documentElement).append(style);
}
