/** Small UI kit for SLang's extension pages (styles in page.css). */
import type { ComponentChildren } from 'preact';
import { CAPTION_THEMES, LEVELS, type CaptionTheme, type Level } from '@/src/core/settings';
import { THEMES } from '@/src/ui/overlay/themes';

export function Card(props: {
  emoji: string;
  title: ComponentChildren;
  subtitle?: ComponentChildren;
  children?: ComponentChildren;
}) {
  return (
    <section class="card">
      <div class="card-head">
        <span class="emoji" aria-hidden="true">
          {props.emoji}
        </span>
        <div>
          <h2>{props.title}</h2>
          {props.subtitle && <p class="muted">{props.subtitle}</p>}
        </div>
      </div>
      {props.children}
    </section>
  );
}

export function Toggle(props: {
  checked: boolean;
  onChange(v: boolean): void;
  children: ComponentChildren;
}) {
  return (
    <label class="toggle">
      <input
        type="checkbox"
        role="switch"
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      <span>{props.children}</span>
    </label>
  );
}

export function Segmented<T extends string>(props: {
  value: T;
  options: readonly { value: T; label: string; title?: string }[];
  onChange(v: T): void;
  label: string;
}) {
  return (
    <div class="seg" role="group" aria-label={props.label}>
      {props.options.map((o) => (
        <button
          key={o.value}
          aria-pressed={props.value === o.value}
          title={o.title}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Friendly descriptions for CEFR levels. */
export const LEVEL_INFO: Record<Level, { title: string; desc: string }> = {
  A1: { title: 'Just starting', desc: 'Hola, gracias, and… that’s about it.' },
  A2: { title: 'Know a little', desc: 'I can order food and ask where the bathroom is.' },
  B1: { title: 'Getting by', desc: 'I follow slow, clear conversations.' },
  B2: { title: 'Comfortable', desc: 'I follow most videos, with a few gaps.' },
  C1: { title: 'Advanced', desc: 'Only the fancy words and fast slang trip me up.' },
};

export function LevelPicker(props: { value: Level; onChange(l: Level): void }) {
  return (
    <div class="choices" role="radiogroup" aria-label="Your level">
      {LEVELS.map((l) => (
        <button
          key={l}
          class="choice"
          role="radio"
          aria-checked={props.value === l}
          aria-pressed={props.value === l}
          onClick={() => props.onChange(l)}
        >
          <span class="tag">{l}</span>
          <span>
            <b>{LEVEL_INFO[l].title}</b>
            <span class="desc">{LEVEL_INFO[l].desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function ThemePicker(props: { value: CaptionTheme; onChange(t: CaptionTheme): void }) {
  return (
    <div class="choices themes" role="radiogroup" aria-label="Caption theme">
      {CAPTION_THEMES.map((t) => (
        <button
          key={t}
          class="choice theme-card"
          role="radio"
          aria-checked={props.value === t}
          aria-pressed={props.value === t}
          onClick={() => props.onChange(t)}
        >
          <div class="theme-stage" style={THEMES[t].vars}>
            <span class="theme-sample">
              ¡Qué <u>bonito</u> día!
            </span>
          </div>
          <span>
            <b>{THEMES[t].name}</b>
            <span class="desc">{THEMES[t].vibe}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
