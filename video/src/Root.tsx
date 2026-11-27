import { Composition, staticFile } from 'remotion';
import { DURATION_S, FILES, FPS, HEIGHT, WIDTH, f } from './config';
import { Commercial, type CommercialProps } from './Commercial';

/** True if public/<file> exists, so the film previews before every file is added. */
async function exists(file: string): Promise<boolean> {
  try {
    return (await fetch(staticFile(file), { method: 'HEAD' })).ok;
  } catch {
    return false;
  }
}

const none: CommercialProps['present'] = {
  englishSource: false,
  spanishDubbed: false,
  spanishSource: false,
  englishCaptioned: false,
  music: false,
};

export function Root() {
  return (
    <Composition
      id="SLangCommercial"
      component={Commercial}
      durationInFrames={f(DURATION_S)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ present: none } satisfies CommercialProps}
      calculateMetadata={async () => {
        const keys = Object.keys(FILES) as (keyof typeof FILES)[];
        const found = await Promise.all(keys.map((k) => exists(FILES[k].file)));
        return { props: { present: Object.fromEntries(keys.map((k, i) => [k, found[i]])) as CommercialProps['present'] } };
      }}
    />
  );
}
