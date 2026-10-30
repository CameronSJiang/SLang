// MAIN world: will observe the player's own timedtext responses (M1).
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    console.info('[weave] youtube content (main) loaded');
  },
});
