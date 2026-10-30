import type { Cue } from '../core/types';

/** What a caption adapter reports to the overlay. */
export interface CaptionState {
  videoId: string | null;
  /** Language of `cues` (BCP-47), if known. */
  lang: string | null;
  cues: Cue[];
  /** Cues are being built from on-screen text (no lookahead). */
  live: boolean;
  /**
   * waiting: looking for target-language captions
   * ready: `cues` are target-language
   * no-target: this video has no target-language track
   * no-captions: no caption tracks at all (generic adapter)
   */
  status: 'idle' | 'waiting' | 'ready' | 'no-target' | 'no-captions';
  /** An ad is playing; hide the overlay. */
  ad: boolean;
  /** Captured non-target tracks, keyed `${lang}:${kind}` — kept for dub mode (M2.5). */
  sources: ReadonlyMap<string, Cue[]>;
}

export const IDLE_STATE: CaptionState = {
  videoId: null,
  lang: null,
  cues: [],
  live: false,
  status: 'idle',
  ad: false,
  sources: new Map(),
};
