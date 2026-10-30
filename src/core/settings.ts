/** User settings. Pure data + validation; persistence lives in src/storage. */

export const LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  ja: 'Japanese',
  ko: 'Korean',
} as const;
export type LangCode = keyof typeof LANGUAGES;

export const LLM_PROVIDERS = ['chrome-ai', 'anthropic', 'null'] as const;
export type LLMProviderId = (typeof LLM_PROVIDERS)[number];

export const GLOSS_DENSITIES = ['auto', 'low', 'med', 'high'] as const;
export type GlossDensity = (typeof GLOSS_DENSITIES)[number];

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
export type Level = (typeof LEVELS)[number];

export interface Settings {
  targetLang: LangCode;
  nativeLang: LangCode;
  /** Providers in the order to try them. */
  providers: LLMProviderId[];
  anthropicApiKey: string;
  glossDensity: GlossDensity;
  level: Level;
  /** Vocabulary size from the placement test; overrides the level's default when set. */
  vocabSize: number | null;
  /** Show our caption overlay on supported players. */
  overlayEnabled: boolean;
  /** Caption font size in px. */
  captionFontSize: number;
  captionHighContrast: boolean;
  /** Caption box distance from the bottom of the player, in % of its height. */
  captionPosition: number;
}

export const CAPTION_FONT_RANGE = [14, 56] as const;
export const CAPTION_POSITION_RANGE = [0, 85] as const;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze<Settings>({
  targetLang: 'es',
  nativeLang: 'en',
  providers: ['chrome-ai', 'anthropic', 'null'],
  anthropicApiKey: '',
  glossDensity: 'auto',
  level: 'A2',
  vocabSize: null,
  overlayEnabled: true,
  captionFontSize: 26,
  captionHighContrast: false,
  captionPosition: 10,
});

function isOneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
}

function clampNum(v: unknown, [lo, hi]: readonly [number, number], fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
}

const LANG_CODES = Object.keys(LANGUAGES) as LangCode[];

/**
 * Coerce unknown stored data into valid Settings. Invalid or missing
 * fields fall back to defaults, so a bad write never breaks the extension.
 */
export function normalizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;

  let providers = Array.isArray(r.providers)
    ? [...new Set(r.providers.filter((p) => isOneOf(LLM_PROVIDERS, p)))]
    : [...d.providers];
  // Null is always the last resort so the overlay works without any LLM.
  providers = providers.filter((p) => p !== 'null');
  providers.push('null');

  return {
    targetLang: isOneOf(LANG_CODES, r.targetLang) ? r.targetLang : d.targetLang,
    nativeLang: isOneOf(LANG_CODES, r.nativeLang) ? r.nativeLang : d.nativeLang,
    providers,
    anthropicApiKey: typeof r.anthropicApiKey === 'string' ? r.anthropicApiKey.trim() : '',
    glossDensity: isOneOf(GLOSS_DENSITIES, r.glossDensity) ? r.glossDensity : d.glossDensity,
    level: isOneOf(LEVELS, r.level) ? r.level : d.level,
    vocabSize:
      typeof r.vocabSize === 'number' && Number.isFinite(r.vocabSize) && r.vocabSize > 0
        ? Math.round(Math.min(r.vocabSize, 50000))
        : null,
    overlayEnabled: typeof r.overlayEnabled === 'boolean' ? r.overlayEnabled : d.overlayEnabled,
    captionFontSize: Math.round(clampNum(r.captionFontSize, CAPTION_FONT_RANGE, d.captionFontSize)),
    captionHighContrast:
      typeof r.captionHighContrast === 'boolean' ? r.captionHighContrast : d.captionHighContrast,
    captionPosition: clampNum(r.captionPosition, CAPTION_POSITION_RANGE, d.captionPosition),
  };
}

/** Settings safe to log or display: the API key is masked. */
export function redactSettings(s: Settings): Settings {
  return { ...s, anthropicApiKey: s.anthropicApiKey ? '[set]' : '' };
}
