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
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze<Settings>({
  targetLang: 'es',
  nativeLang: 'en',
  providers: ['chrome-ai', 'anthropic', 'null'],
  anthropicApiKey: '',
  glossDensity: 'auto',
  level: 'A2',
});

function isOneOf<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v);
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
  };
}

/** Settings safe to log or display: the API key is masked. */
export function redactSettings(s: Settings): Settings {
  return { ...s, anthropicApiKey: s.anthropicApiKey ? '[set]' : '' };
}
