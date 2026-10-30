import { startYouTubeAdapter, youtubePlayer } from '@/src/adapters/youtube';
import { IDLE_STATE, type CaptionState } from '@/src/adapters/types';
import { findCueIndex } from '@/src/core/cueIndex';
import { ExposureCounter, type LexEvent } from '@/src/core/learner';
import { pickSource, resolvePlayback, type Playback } from '@/src/core/playback';
import { LANGUAGES, type Settings } from '@/src/core/settings';
import type { AnnotatedCue, Cue } from '@/src/core/types';
import type { AnnotationProgress } from '@/src/llm/annotator';
import { requestAnnotation, requestTranslation, type AnnotationClient } from '@/src/llm/client';
import type { TranslationProgress } from '@/src/llm/translationJob';
import { LexiconClient } from '@/src/storage/lexClient';
import { extensionAlive, loadSettings, saveSettings, watchSettings } from '@/src/storage/settings';
import { DubEngine, type DubIssue } from '@/src/ui/dub/engine';
import { mountOverlay, type OverlayHandle } from '@/src/ui/overlay/mount';
import { setNativeCaptionsHidden } from '@/src/ui/overlay/nativeCaptions';

const PLAYHEAD_EVERY_MS = 3000;
const EXPOSURE_FLUSH_MS = 5000;
/** Never credit exposure to these: they're not vocabulary. */
const NO_EXPOSURE_POS = new Set(['PROPN', 'NUM', 'PUNCT', 'SYM']);

// Settings that change which provider annotates, or what it produces.
const aiSettingsKey = (s: Settings) =>
  JSON.stringify([s.providers, s.nativeLang, s.anthropicApiKey.length > 0]);
// Settings that move every word's prior.
const priorKey = (s: Settings) => JSON.stringify([s.level, s.vocabSize]);

/** A dub translation in progress or done, for one video + source track. */
interface DubTrack {
  key: string;
  client: AnnotationClient | null;
  sourceById: Map<string, Cue>;
  translated: Map<string, Cue>;
  /** Translated cues in time order (new array on every change). */
  cues: Cue[];
  progress: TranslationProgress | null;
}

// ISOLATED world: owns the overlay. Captions arrive from youtube-main.content via postMessage.
export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  async main(ctx) {
    if (!extensionAlive()) return;
    let settings = await loadSettings();
    let state: CaptionState = IDLE_STATE;
    let ui: OverlayHandle | null = null;

    let annotations = new Map<string, AnnotatedCue>();
    let ai: AnnotationProgress | null = null;
    let client: AnnotationClient | null = null;
    let annotating: Cue[] | null = null;
    let lex: LexiconClient | null = null;
    let exposures = new ExposureCounter();
    let pendingExposures: string[] = [];

    let dub: DubTrack | null = null;
    let engine: {
      e: DubEngine;
      video: HTMLVideoElement;
      voice: string | null;
      lang: string;
    } | null = null;
    let dubIssue: DubIssue | null = null;
    let lastSpoken = '';

    const video = () => youtubePlayer()?.querySelector('video') ?? null;
    const langName = () => LANGUAGES[settings.targetLang];

    /** What to play and show for the current video and preset. */
    const plan = () => {
      const source = pickSource(state.sources, settings.nativeLang);
      // On-screen (live) cues grow word by word: fine to read, never to speak.
      const fullTarget = state.status === 'ready' && !state.live;
      const pb: Playback = resolvePlayback(settings.playbackPreset, {
        targetLang: settings.targetLang,
        spokenLang: state.tracks?.find((t) => t.kind === 'asr')?.lang ?? null,
        hasTarget: fullTarget,
        hasSource: !!source,
      });
      // Dubbing without a full target-language transcript means translating `source`.
      const translate = pb.audio === 'dub' && !fullTarget && source ? source : null;
      return { pb, translate };
    };

    /** Cues the learner reads/hears in the target language, and their annotation key. */
    const targetCues = (translating: boolean) =>
      translating
        ? {
            cues: dub?.cues ?? [],
            // Annotate the translation once it's complete (annotation needs the whole transcript).
            annotate: dub?.progress?.finished && !dub.progress.error ? dub.cues : null,
            videoKey: `${state.videoId}~dub`,
            lang: settings.targetLang,
          }
        : {
            cues: state.cues,
            annotate: state.status === 'ready' && !state.live ? state.cues : null,
            videoKey: state.videoId ?? '',
            lang: state.lang ?? settings.targetLang,
          };

    const messages = (pb: Playback, translating: boolean): string[] => {
      const out: string[] = [];
      if (pb.fallback === 'already-target')
        out.push(`This video is already in ${langName()} — showing captions.`);
      if (pb.fallback === 'nothing-to-dub') out.push('No captions to dub from on this video.');
      const p = dub?.progress;
      if (translating && p?.error) {
        out.push(
          `Dub unavailable: ${p.error}. Set up Chrome AI or an Anthropic key in SLang settings.`,
        );
      } else if (translating && p && !p.finished) {
        out.push(`Dubbing: translating… ${Math.floor((p.done / Math.max(1, p.total)) * 100)}%`);
      }
      if (pb.audio === 'dub' && dubIssue === 'no-voice') {
        out.push(`No on-device ${langName()} voice found — pick one in SLang settings.`);
      }
      if (pb.audio === 'dub' && dubIssue === 'blocked')
        out.push('Click the video once so SLang can speak.');
      return out;
    };

    const draw = () => {
      const player = youtubePlayer();
      const on = settings.overlayEnabled && !!state.videoId;
      setNativeCaptionsHidden(on);
      if (!on || !player) {
        ui?.unmount();
        ui = null;
        return;
      }
      if (ui?.host.parentElement !== player) {
        ui?.unmount();
        ui = mountOverlay(player);
      }
      const { pb, translate } = plan();
      const t = targetCues(!!translate);
      if (lastSpoken) ui.host.setAttribute('data-dub', lastSpoken);
      ui.render({
        state: translate
          ? { ...state, cues: t.cues, lang: t.lang, status: t.cues.length ? 'ready' : 'waiting' }
          : state,
        video: player.querySelector('video'),
        settings,
        annotations,
        ai,
        captions: pb.captions,
        messages: messages(pb, !!translate),
        sourceFor: (cue) => {
          if (translate) return dub?.sourceById.get(cue.id)?.text;
          const src = pickSource(state.sources, settings.nativeLang)?.cues ?? [];
          return src[findCueIndex(src, cue.start + 0.05)]?.text;
        },
        ...(lex ? { wordInfo: (lemma: string) => lex?.get(lemma) } : {}),
        onWord: (action, cue, token) => {
          if (!lex || !state.videoId) return;
          if (action === 'save') {
            void lex
              .save(token.lemma, {
                sentence: cue.text,
                gloss: token.gloss,
                videoId: state.videoId,
                t: cue.start,
              })
              .catch(() => {});
          } else {
            void lex.event([{ lemma: token.lemma, event: action satisfies LexEvent }]);
          }
        },
        onExposure: (cue) => {
          for (const tok of cue.tokens) {
            if (!NO_EXPOSURE_POS.has(tok.pos) && exposures.take(tok.lemma))
              pendingExposures.push(tok.lemma);
          }
        },
        onMove: (captionPosition) => {
          // An orphaned script (extension reloaded under an open tab) can't save.
          if (extensionAlive()) saveSettings({ captionPosition }).catch(() => {});
        },
      });
    };

    const stopAnnotation = () => {
      client?.stop();
      client = null;
      annotating = null;
      annotations = new Map();
      ai = null;
      lex = null;
      exposures = new ExposureCounter();
      pendingExposures = [];
    };

    /** Annotate the full target-language transcript (not live on-screen cues, which keep growing). */
    const syncAnnotation = () => {
      const { translate } = plan();
      const t = targetCues(!!translate);
      const want = settings.overlayEnabled && state.videoId ? t.annotate : null;
      if (want === annotating) return;
      stopAnnotation();
      if (!want || !state.videoId || !extensionAlive()) return;
      annotating = want;
      const lexicon = new LexiconClient(t.lang, draw);
      lex = lexicon;
      client = requestAnnotation(
        {
          site: 'youtube',
          videoId: t.videoKey,
          lang: t.lang,
          cues: want,
          playhead: video()?.currentTime ?? 0,
        },
        {
          chunk: (cues) => {
            annotations = new Map(annotations);
            for (const c of cues) annotations.set(c.id, c);
            lexicon.want(cues.flatMap((c) => c.tokens.map((tok) => tok.lemma)));
            draw();
          },
          progress: (p) => {
            ai = p;
            draw();
          },
        },
      );
    };

    const stopDub = () => {
      dub?.client?.stop();
      dub = null;
    };

    /** Start/stop translating the source track for dub mode. */
    const syncDub = () => {
      const { translate } = plan();
      const key =
        translate && state.videoId && settings.overlayEnabled
          ? `${state.videoId}|${translate.lang}>${settings.targetLang}|${translate.cues.length}`
          : null;
      if (key === (dub?.key ?? null)) return;
      stopDub();
      if (!key || !translate || !state.videoId || !extensionAlive()) return;
      const track: DubTrack = {
        key,
        client: null,
        sourceById: new Map(translate.cues.map((c) => [c.id, c])),
        translated: new Map(),
        cues: [],
        progress: null,
      };
      dub = track;
      track.client = requestTranslation(
        {
          site: 'youtube',
          videoId: state.videoId,
          from: translate.lang,
          to: settings.targetLang,
          cues: translate.cues,
          playhead: video()?.currentTime ?? 0,
        },
        {
          cues: (cues) => {
            for (const c of cues) if (c.text) track.translated.set(c.id, c);
            track.cues = [...track.translated.values()].sort((a, b) => a.start - b.start);
            update();
          },
          progress: (p) => {
            track.progress = p;
            update();
          },
        },
      );
    };

    /** Run the speech engine when the plan says dub and there's something to say. */
    const syncEngine = () => {
      const { pb, translate } = plan();
      const v = video();
      const cues = targetCues(!!translate).cues;
      const want =
        settings.overlayEnabled &&
        pb.audio === 'dub' &&
        (!!translate || !state.live) &&
        !!v &&
        cues.length > 0;
      if (
        engine &&
        (!want ||
          engine.video !== v ||
          engine.voice !== settings.dubVoice ||
          engine.lang !== settings.targetLang)
      ) {
        engine.e.stop();
        engine = null;
      }
      if (!want || !v) {
        dubIssue = null;
        return;
      }
      if (!engine) {
        engine = {
          video: v,
          voice: settings.dubVoice,
          lang: settings.targetLang,
          e: new DubEngine({
            video: v,
            lang: settings.targetLang,
            voiceURI: settings.dubVoice,
            onSpeak: (cue, rate) => {
              lastSpoken = `${cue.id}@${rate.toFixed(2)}`;
              ui?.host.setAttribute('data-dub', lastSpoken);
            },
            onIssue: (issue) => {
              if (issue === dubIssue) return;
              dubIssue = issue;
              draw();
            },
          }),
        };
      }
      engine.e.setCues(cues);
      engine.e.setSuspended(state.ad);
    };

    function update() {
      syncDub();
      syncAnnotation();
      syncEngine();
      draw();
    }

    const adapter = startYouTubeAdapter(
      { targetLang: settings.targetLang, enabled: settings.overlayEnabled },
      (s) => {
        const newVideo = s.videoId !== state.videoId;
        state = s;
        if (newVideo) {
          stopDub();
          lastSpoken = '';
        }
        update();
      },
    );
    const unwatch = watchSettings((s) => {
      const restart = aiSettingsKey(s) !== aiSettingsKey(settings);
      if (priorKey(s) !== priorKey(settings)) lex?.reset();
      settings = s;
      adapter.setTarget(s.targetLang, s.overlayEnabled);
      if (restart) {
        stopAnnotation();
        stopDub();
      }
      update();
    });
    const playhead = setInterval(() => {
      if (!extensionAlive()) return;
      const v = video();
      if (!v) return;
      client?.setPlayhead(v.currentTime);
      dub?.client?.setPlayhead(v.currentTime);
    }, PLAYHEAD_EVERY_MS);

    const flushExposures = setInterval(() => {
      if (!lex || !pendingExposures.length || !extensionAlive()) return;
      const events = pendingExposures.map((lemma) => ({ lemma, event: 'exposure' as const }));
      pendingExposures = [];
      void lex.event(events);
    }, EXPOSURE_FLUSH_MS);

    ctx.onInvalidated(() => {
      clearInterval(flushExposures);
      clearInterval(playhead);
      engine?.e.stop();
      stopDub();
      stopAnnotation();
      adapter.stop();
      unwatch();
      ui?.unmount();
      setNativeCaptionsHidden(false);
    });
  },
});
