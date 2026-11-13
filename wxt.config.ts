import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

const require = createRequire(import.meta.url);
/** onnxruntime-web's dist folder (resolved via transformers.js, which depends on it). */
function ortDistDir(): string {
  const transformers = require.resolve('@huggingface/transformers');
  const ort = require.resolve('onnxruntime-web', { paths: [path.dirname(transformers)] });
  const root = ort.slice(
    0,
    ort.lastIndexOf(`${path.sep}onnxruntime-web${path.sep}`) + '/onnxruntime-web'.length,
  );
  return path.join(root, 'dist');
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'SLang',
    description: 'Learn a language from the videos you already watch.',
    permissions: ['storage', 'activeTab', 'scripting', 'offscreen'],
    host_permissions: ['*://*.youtube.com/*'],
    // On-device voices (Kokoro) run WebAssembly in extension pages.
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    // Cross-origin isolation lets the voice model use several CPU threads.
    cross_origin_embedder_policy: { value: 'require-corp' },
    cross_origin_opener_policy: { value: 'same-origin' },
    commands: {
      'toggle-slang': {
        suggested_key: { default: 'Alt+Shift+S' },
        description: 'Turn SLang on or off',
      },
    },
  },
  vite: () => ({
    plugins: [
      preact(),
      {
        // transformers.js references the ONNX runtime wasm, so Vite emits a copy; we load it from
        // /ort/ (wasmPaths) instead, so drop the 21 MB duplicate.
        name: 'slang-drop-duplicate-ort-wasm',
        generateBundle(_options, bundle) {
          for (const name of Object.keys(bundle)) {
            if (/^assets\/ort-wasm-.*\.wasm$/.test(name)) Reflect.deleteProperty(bundle, name);
          }
        },
      },
    ],
  }),
  hooks: {
    // Ship the ONNX runtime with the extension instead of loading it from a CDN (MV3: no remote code).
    'build:publicAssets': (_wxt, files) => {
      for (const f of ['ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.jsep.mjs']) {
        files.push({ absoluteSrc: path.join(ortDistDir(), f), relativeDest: `ort/${f}` });
      }
    },
  },
});
