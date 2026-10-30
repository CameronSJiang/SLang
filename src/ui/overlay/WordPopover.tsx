import { useEffect } from 'preact/hooks';
import type { WordInfo } from '../../core/glossPolicy';
import type { Token } from '../../core/types';
import { speak } from '../tts';

const POS_NAMES: Record<string, string> = {
  NOUN: 'noun',
  VERB: 'verb',
  AUX: 'verb',
  ADJ: 'adjective',
  ADV: 'adverb',
  PRON: 'pronoun',
  DET: 'determiner',
  ADP: 'preposition',
  CCONJ: 'conjunction',
  SCONJ: 'conjunction',
  INTJ: 'interjection',
  PART: 'particle',
  PROPN: 'name',
  NUM: 'number',
};

export type WordAction = 'lookup' | 'known' | 'ignore' | 'save';

interface PopoverProps {
  token: Token;
  info: WordInfo | undefined;
  lang: string;
  /** Position inside the overlay root, in px. */
  x: number;
  bottom: number;
  onAction(a: Exclude<WordAction, 'lookup'>): void;
  onClose(): void;
}

const stop = (e: Event) => e.stopPropagation();

export function WordPopover({ token, info, lang, x, bottom, onAction, onClose }: PopoverProps) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key, true);
    return () => document.removeEventListener('keydown', key, true);
  }, [onClose]);

  const pos = POS_NAMES[token.pos];
  const saved = info?.custom;
  return (
    <div
      class="pop"
      role="dialog"
      aria-label={`${token.lemma}: ${token.gloss}`}
      style={{ left: `${x}px`, bottom: `${bottom}px` }}
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={stop}
      onDblClick={stop}
    >
      <div class="pop-head">
        <span class="lemma" lang={lang}>
          {token.lemma}
        </span>
        {pos && <span class="pos">{pos}</span>}
        <button class="icon" aria-label="Pronounce" onClick={() => speak(token.surface, lang)}>
          🔊
        </button>
        <button class="icon close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div class="gloss">
        {token.gloss || <span class="muted">No meaning yet — still translating.</span>}
      </div>
      <div class="pop-actions">
        <button disabled={saved} onClick={() => onAction('save')}>
          {saved ? 'Saved' : 'Save'}
        </button>
        <button onClick={() => onAction('known')}>Known</button>
        <button onClick={() => onAction('ignore')}>Ignore</button>
      </div>
    </div>
  );
}
