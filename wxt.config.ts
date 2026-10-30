import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Weave',
    description: 'Learn a language from the videos you already watch.',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['*://*.youtube.com/*'],
  },
  vite: () => ({
    plugins: [preact()],
  }),
});
