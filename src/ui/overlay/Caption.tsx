import type { WordInfo } from '../../core/glossPolicy';
import type { AnnotatedCue } from '../../core/types';

interface CaptionProps {
  cue: AnnotatedCue;
  /** Token indexes that get a ruby gloss. */
  glossed: ReadonlySet<number>;
  info(lemma: string): WordInfo | undefined;
  /** Token index of the open popover, to highlight it. */
  active?: number | undefined;
}

/**
 * Caption text with each word as a clickable span. Glossed words show the
 * gloss in small text centered above (rule 3: gloss, don't substitute). Not
 * native <ruby>: it stretches the word to the gloss's width.
 */
export function Caption({ cue, glossed, info, active }: CaptionProps) {
  const parts: preact.ComponentChildren[] = [];
  let at = 0;
  cue.tokens.forEach((t, i) => {
    if (t.start > at) parts.push(cue.text.slice(at, t.start));
    const g = glossed.has(i);
    const state = info(t.lemma)?.state ?? 'new';
    const cls = `w${g ? ` g st-${state}` : ''}${active === i ? ' on' : ''}`;
    parts.push(
      <span class={cls} data-i={i} key={i}>
        {g && (
          <span class="gl" lang="">
            {t.gloss}
          </span>
        )}
        {cue.text.slice(t.start, t.end)}
      </span>,
    );
    at = t.end;
  });
  if (at < cue.text.length) parts.push(cue.text.slice(at));
  return <span class={`text${glossed.size ? ' glossy' : ''}`}>{parts}</span>;
}
