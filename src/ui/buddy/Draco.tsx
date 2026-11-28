/**
 * Draco, SLang's study buddy: a plain image with a little CSS motion.
 *
 * ARTWORK: drop your PNG at `public/draco.png` (square, transparent background, ~512×512)
 * and rebuild. Until it's there, a hairline placeholder labelled "draco.png" shows instead.
 * Works in extension pages and inside the video overlay (the file is web-accessible).
 */
import { useState } from 'preact/hooks';
import { browser } from 'wxt/browser';

export type DracoMood = 'idle' | 'talk' | 'happy' | 'oops';

export const dracoCss = `
.draco { display: inline-grid; place-items: center; line-height: 0; flex: none; }
.draco img { width: 100%; height: 100%; object-fit: contain; user-select: none; -webkit-user-drag: none; }
.draco-missing {
  width: 100%; height: 100%; display: grid; place-items: center; box-sizing: border-box;
  border: 1px dashed rgba(255,255,255,0.24); border-radius: 8px;
  font: 500 11px/1.2 'JetBrains Mono', ui-monospace, Menlo, monospace; color: #a1a1aa;
}
.draco.bob > * { animation: d-bob 3s ease-in-out infinite; }
.draco.talk > * { animation: d-talk 0.36s ease-in-out infinite; }
.draco.happy > * { animation: d-hop 0.45s ease-in-out 2; }
.draco.oops > * { animation: d-shake 0.45s ease-in-out; }
@keyframes d-bob { 50% { transform: translateY(-4px); } }
@keyframes d-talk { 50% { transform: scale(1.04, 0.97); } }
@keyframes d-hop { 50% { transform: translateY(-12px); } }
@keyframes d-shake { 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
@media (prefers-reduced-motion: reduce) { .draco * { animation: none !important; } }
`;

const SRC = browser.runtime.getURL('/draco.png' as '/');

export function Draco(props: {
  mood?: DracoMood;
  size?: number | string;
  bob?: boolean;
  class?: string;
}) {
  const [missing, setMissing] = useState(false);
  const mood = props.mood ?? 'idle';
  const size = typeof props.size === 'number' ? `${props.size}px` : (props.size ?? '120px');
  return (
    <span
      class={`draco ${mood}${props.bob && mood === 'idle' ? ' bob' : ''} ${props.class ?? ''}`}
      style={{ width: size, aspectRatio: '1' }}
      role="img"
      aria-label="Draco"
    >
      {missing ? (
        <span class="draco-missing">draco.png</span>
      ) : (
        <img src={SRC} alt="" draggable={false} onError={() => setMissing(true)} />
      )}
    </span>
  );
}

/** Draco's stylesheet, for pages that don't already include `dracoCss`. */
export function DracoStyle() {
  return <style>{dracoCss}</style>;
}
