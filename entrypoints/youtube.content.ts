// ISOLATED world: owns the overlay and talks to the background (M1).
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  main() {
    console.info('[slang] youtube content (isolated) loaded');
  },
});
