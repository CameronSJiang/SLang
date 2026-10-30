import type { TrackInfo } from '../core/lang';
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
  /** Captured non-target tracks, keyed `${lang}:${kind}` — the text dub mode translates. */
  sources: ReadonlyMap<string, Cue[]>;
  /** Caption tracks the video offers (null until known). An `asr` track tells the spoken language. */
  tracks: readonly TrackInfo[] | null;
}

export const IDLE_STATE: CaptionState = {
  videoId: null,
  lang: null,
  cues: [],
  live: false,
  status: 'idle',
  ad: false,
  sources: new Map(),
  tracks: null,
};
