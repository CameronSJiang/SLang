/** Caption looks. Each theme is a set of CSS variables the overlay (and the settings preview) use. */
import type { CaptionTheme } from '../../core/settings';

export interface ThemeStyle {
  name: string;
  /** One-line personality, shown in the picker. */
  vibe: string;
  vars: Record<string, string>;
}

const base = {
  '--box-radius': '10px',
  '--box-border': 'none',
  '--box-blur': 'none',
  '--box-shadow': 'none',
  '--box-weight': '500',
  '--text-shadow': 'none',
  '--rt': '#e8e8e8',
  '--gl-shadow': '0 1px 2px rgba(0, 0, 0, 0.5)',
  '--ul-new': '#4fc3f7',
  '--ul-learning': '#ffb74d',
  '--l1-bg': 'rgba(8, 8, 8, 0.78)',
  '--l1-fg': '#fff',
};

export const THEMES: Record<CaptionTheme, ThemeStyle> = {
  slang: {
    name: 'SLang',
    vibe: 'Our signature sunset. Loud, proud, readable.',
    vars: {
      ...base,
      '--box-bg': 'linear-gradient(135deg, rgba(124, 77, 255, 0.92), rgba(255, 110, 64, 0.92))',
      '--box-fg': '#fff',
      '--box-radius': '14px',
      '--box-shadow': '0 6px 24px rgba(0, 0, 0, 0.35)',
      '--box-weight': '600',
      '--text-shadow': '0 1px 2px rgba(0, 0, 0, 0.35)',
      '--rt': '#fff3c4',
      '--ul-new': '#fff3c4',
      '--ul-learning': '#2b1b6b',
      '--l1-bg': 'rgba(43, 27, 107, 0.92)',
    },
  },
  glass: {
    name: 'Glass',
    vibe: 'Frosted and minimal. Lets the video breathe.',
    vars: {
      ...base,
      '--box-bg': 'rgba(24, 24, 32, 0.4)',
      '--box-fg': '#fff',
      '--box-radius': '16px',
      '--box-border': '1px solid rgba(255, 255, 255, 0.28)',
      '--box-blur': 'blur(14px) saturate(1.5)',
      '--text-shadow': '0 1px 3px rgba(0, 0, 0, 0.6)',
      '--l1-bg': 'rgba(24, 24, 32, 0.6)',
    },
  },
  classic: {
    name: 'Classic',
    vibe: 'The subtitles you grew up with.',
    vars: {
      ...base,
      '--box-bg': 'rgba(8, 8, 8, 0.62)',
      '--box-fg': '#fff',
      '--box-radius': '6px',
      '--text-shadow': '0 0 2px rgba(0, 0, 0, 0.8)',
    },
  },
  paper: {
    name: 'Paper',
    vibe: 'Warm and bookish, like notes in a margin.',
    vars: {
      ...base,
      '--box-bg': '#fffaf0',
      '--box-fg': '#2b2118',
      '--box-radius': '12px',
      '--box-shadow': '0 6px 20px rgba(0, 0, 0, 0.3)',
      '--rt': '#6a3df0',
      '--gl-shadow': 'none',
      '--ul-new': '#6a3df0',
      '--ul-learning': '#e8590c',
      '--l1-bg': '#fffaf0',
      '--l1-fg': '#2b2118',
    },
  },
  outline: {
    name: 'Outline',
    vibe: 'No box at all. Just crisp, outlined text.',
    vars: {
      ...base,
      '--box-bg': 'transparent',
      '--box-fg': '#fff',
      '--box-weight': '700',
      '--text-shadow':
        '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 6px rgba(0,0,0,0.8)',
      '--rt': '#fff',
      '--gl-shadow': '0 0 2px #000, 0 0 3px #000, 0 1px 2px #000',
    },
  },
  bold: {
    name: 'High contrast',
    vibe: 'Maximum legibility. Yellow on black.',
    vars: {
      ...base,
      '--box-bg': '#000',
      '--box-fg': '#ffeb3b',
      '--box-radius': '6px',
      '--box-border': '2px solid #fff',
      '--box-weight': '700',
      '--rt': '#fff',
      '--gl-shadow': 'none',
      '--ul-new': '#40c4ff',
      '--ul-learning': '#ff9100',
      '--l1-bg': '#000',
    },
  },
};

/** Inline style string for an element that should take a theme's variables. */
export const themeStyle = (t: CaptionTheme): Record<string, string> => THEMES[t].vars;
