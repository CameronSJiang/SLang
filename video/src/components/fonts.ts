import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Bundled in public/fonts (SIL Open Font License), so renders never depend on the network.
// Remotion waits for these before rendering any frame.
export const SANS = 'Geist';
export const MONO = 'JetBrains Mono';

for (const weight of ['400', '500', '600']) {
  void loadFont({ family: SANS, url: staticFile(`fonts/geist-latin-${weight}-normal.woff2`), weight });
}
for (const weight of ['400', '500']) {
  void loadFont({ family: MONO, url: staticFile(`fonts/jetbrains-mono-latin-${weight}-normal.woff2`), weight });
}
