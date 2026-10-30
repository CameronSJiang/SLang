/**
 * Chrome built-in AI: Prompt API (Gemini Nano) for word annotation,
 * Translator API for full-line translation. Must run in an extension
 * document (offscreen document or options page). Downloading a model needs
 * a user click, so setup happens from the options page.
 */
import { annotateWithJson, snippet, translateWithJson, type JsonCompleter } from './prompted';
import { InvalidResponseError, ProviderUnavailableError, type LLMProvider } from './types';

export type AIAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface DownloadMonitor {
  addEventListener(type: 'downloadprogress', cb: (e: { loaded: number }) => void): void;
}
interface LMSession {
  prompt(input: string, opts?: { responseConstraint?: object }): Promise<string>;
  clone(): Promise<LMSession>;
  destroy(): void;
}
interface LMOptions {
  initialPrompts?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  expectedInputs?: { type: 'text'; languages: string[] }[];
  expectedOutputs?: { type: 'text'; languages: string[] }[];
  monitor?: (m: DownloadMonitor) => void;
}
interface TranslatorInstance {
  translate(text: string): Promise<string>;
  destroy(): void;
}
interface TranslatorOptions {
  sourceLanguage: string;
  targetLanguage: string;
  monitor?: (m: DownloadMonitor) => void;
}
interface AIGlobals {
  LanguageModel?: {
    availability(o?: LMOptions): Promise<AIAvailability>;
    create(o?: LMOptions): Promise<LMSession>;
  };
  Translator?: {
    availability(o: TranslatorOptions): Promise<AIAvailability>;
    create(o: TranslatorOptions): Promise<TranslatorInstance>;
  };
}

const ai = globalThis as AIGlobals;
const base = (lang: string) => lang.split('-')[0] ?? lang;

function lmOptions(lang: string, nativeLang: string, system?: string): LMOptions {
  return {
    ...(system ? { initialPrompts: [{ role: 'system' as const, content: system }] } : {}),
    expectedInputs: [{ type: 'text', languages: [base(lang), base(nativeLang)] }],
    expectedOutputs: [{ type: 'text', languages: [base(nativeLang)] }],
  };
}

export interface ChromeAIStatus {
  prompt: AIAvailability | 'missing';
  translator: AIAvailability | 'missing';
}

export async function chromeAIStatus(lang: string, nativeLang: string): Promise<ChromeAIStatus> {
  const prompt = ai.LanguageModel
    ? await ai.LanguageModel.availability(lmOptions(lang, nativeLang)).catch(
        () => 'unavailable' as const,
      )
    : 'missing';
  const translator = ai.Translator
    ? await ai.Translator.availability({
        sourceLanguage: base(lang),
        targetLanguage: base(nativeLang),
      }).catch(() => 'unavailable' as const)
    : 'missing';
  return { prompt, translator };
}

/** Start (or finish) the model downloads. Call from a click handler. */
export async function setupChromeAI(
  lang: string,
  nativeLang: string,
  onProgress: (what: 'prompt' | 'translator', loaded: number) => void,
): Promise<void> {
  const status = await chromeAIStatus(lang, nativeLang);
  const tasks: Promise<unknown>[] = [];
  if (ai.LanguageModel && (status.prompt === 'downloadable' || status.prompt === 'downloading')) {
    tasks.push(
      ai.LanguageModel.create({
        ...lmOptions(lang, nativeLang),
        monitor: (m) =>
          m.addEventListener('downloadprogress', (e) => onProgress('prompt', e.loaded)),
      }).then((s) => s.destroy()),
    );
  }
  if (
    ai.Translator &&
    (status.translator === 'downloadable' || status.translator === 'downloading')
  ) {
    tasks.push(
      ai.Translator.create({
        sourceLanguage: base(lang),
        targetLanguage: base(nativeLang),
        monitor: (m) =>
          m.addEventListener('downloadprogress', (e) => onProgress('translator', e.loaded)),
      }).then((t) => t.destroy()),
    );
  }
  await Promise.all(tasks);
}

export class ChromeAIProvider implements LLMProvider {
  readonly id = 'chrome-ai' as const;
  /** Gemini Nano is small and slow; keep prompts short. */
  readonly chunkSize = 6;
  private sessions = new Map<string, Promise<LMSession>>();
  private translators = new Map<string, Promise<TranslatorInstance | null>>();

  async available(): Promise<boolean> {
    // Language-specific checks happen per call; this only says the API exists and a model is ready.
    return (
      !!ai.LanguageModel &&
      (await ai.LanguageModel.availability().catch(() => 'unavailable')) === 'available'
    );
  }

  private session(system: string, lang: string, nativeLang: string): Promise<LMSession> {
    const key = `${system}\u0000${lang}\u0000${nativeLang}`;
    let s = this.sessions.get(key);
    if (!s) {
      const lm = ai.LanguageModel;
      if (!lm) throw new ProviderUnavailableError('Chrome built-in AI is not available');
      s = lm.availability(lmOptions(lang, nativeLang)).then((a) => {
        if (a !== 'available')
          throw new ProviderUnavailableError(`Chrome AI model is ${a} for this language`);
        return lm.create(lmOptions(lang, nativeLang, system));
      });
      s.catch(() => this.sessions.delete(key));
      this.sessions.set(key, s);
    }
    return s;
  }

  private translator(from: string, to: string): Promise<TranslatorInstance | null> {
    const key = `${base(from)}>${base(to)}`;
    let t = this.translators.get(key);
    if (!t) {
      const tr = ai.Translator;
      const opts = { sourceLanguage: base(from), targetLanguage: base(to) };
      t = tr
        ? tr
            .availability(opts)
            .then((a) => (a === 'available' ? tr.create(opts) : null))
            .catch(() => null)
        : Promise.resolve(null);
      this.translators.set(key, t);
    }
    return t;
  }

  private completer(lang: string, nativeLang: string): JsonCompleter {
    return async (system, user, schema) => {
      const base = await this.session(system, lang, nativeLang);
      const s = await base.clone(); // fresh context per chunk
      try {
        const text = await s.prompt(user, { responseConstraint: schema });
        try {
          return JSON.parse(text);
        } catch {
          throw new InvalidResponseError(`Response was not JSON: ${snippet(text)}`);
        }
      } finally {
        s.destroy();
      }
    };
  }

  translateLines = async (texts: string[], from: string, to: string): Promise<string[]> => {
    const t = await this.translator(from, to);
    if (!t)
      throw new ProviderUnavailableError('Chrome Translator is not ready for this language pair');
    return Promise.all(texts.map((x) => t.translate(x)));
  };

  annotate: LLMProvider['annotate'] = async (cues, ctx) => {
    const translator = ctx.skipLineTranslation
      ? null
      : await this.translator(ctx.lang, ctx.nativeLang);
    const out = await annotateWithJson(
      this.completer(ctx.lang, ctx.nativeLang),
      cues,
      ctx,
      !translator && !ctx.skipLineTranslation,
      'object',
    );
    if (translator) {
      for (const c of out) c.l1 = (await translator.translate(c.text).catch(() => '')) || c.l1;
    }
    return out;
  };

  async translateLine(text: string, from: string, to: string): Promise<string> {
    const t = await this.translator(from, to);
    if (t) return t.translate(text);
    const [cue] = await this.translateCues([{ id: 'l', start: 0, end: 0, text }], from, to);
    return cue?.text ?? '';
  }

  translateCues: LLMProvider['translateCues'] = async (cues, from, to) => {
    const t = await this.translator(from, to);
    if (t) return Promise.all(cues.map(async (c) => ({ ...c, text: await t.translate(c.text) })));
    return translateWithJson(this.completer(from, to), cues, from, to);
  };
}
