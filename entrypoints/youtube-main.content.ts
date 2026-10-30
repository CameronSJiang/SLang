import { startMainBridge } from '@/src/adapters/youtubeMain';

// MAIN world: observes the player's own timedtext responses (see src/adapters/youtubeMain.ts).
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    startMainBridge();
  },
});
