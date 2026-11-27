import { Composition, staticFile } from 'remotion';
import { CLIPS, DURATION_S, FPS, HEIGHT, WIDTH, f } from './config';
import { Launch, type LaunchProps } from './Launch';

/** True if public/<file> exists (so the film works before the clips are added). */
async function exists(file: string): Promise<boolean> {
  try {
    const res = await fetch(staticFile(file), { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export function Root() {
  return (
    <Composition
      id="SLangLaunch"
      component={Launch}
      durationInFrames={f(DURATION_S)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ hasEnglish: false, hasDubbed: false } satisfies LaunchProps}
      calculateMetadata={async () => ({
        props: {
          hasEnglish: await exists(CLIPS.english.file),
          hasDubbed: await exists(CLIPS.dubbed.file),
        },
      })}
    />
  );
}
