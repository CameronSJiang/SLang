/**
 * Draco, SLang's dragon buddy. Pure SVG + CSS, so it works in extension pages
 * and inside the video overlay's Shadow DOM alike.
 */
import { useEffect, useState } from 'preact/hooks';

export type DracoMood = 'idle' | 'talk' | 'happy' | 'oops';

export const dracoCss = `
.draco { display: inline-block; line-height: 0; }
.draco svg { width: 100%; height: auto; overflow: visible; }
.draco .d-eyes { transform-origin: 100px 72px; animation: d-blink 4.6s infinite; }
.draco .d-wing-l { transform-origin: 72px 124px; }
.draco .d-wing-r { transform-origin: 128px 124px; }
.draco.bob .d-all { animation: d-bob 2.8s ease-in-out infinite; }
.draco.talk .d-wing-l { animation: d-flap-l 0.5s ease-in-out infinite; }
.draco.talk .d-wing-r { animation: d-flap-r 0.5s ease-in-out infinite; }
.draco.happy .d-all { animation: d-hop 0.45s ease-in-out 2; }
.draco.happy .d-wing-l { animation: d-flap-l 0.3s ease-in-out 4; }
.draco.happy .d-wing-r { animation: d-flap-r 0.3s ease-in-out 4; }
.draco.oops .d-all { animation: d-shake 0.45s ease-in-out; }
@keyframes d-blink { 0%, 93%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
@keyframes d-bob { 50% { transform: translateY(-5px); } }
@keyframes d-hop { 50% { transform: translateY(-16px); } }
@keyframes d-shake { 25% { transform: rotate(-5deg); } 75% { transform: rotate(5deg); } }
@keyframes d-flap-l { 50% { transform: rotate(14deg); } }
@keyframes d-flap-r { 50% { transform: rotate(-14deg); } }
@media (prefers-reduced-motion: reduce) {
  .draco * { animation: none !important; }
}
`;

/** Mouth open/closed while talking, every this many ms. */
const FLAP_MS = 130;

export function Draco(props: {
  mood?: DracoMood;
  size?: number | string;
  bob?: boolean;
  class?: string;
}) {
  const mood = props.mood ?? 'idle';
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (mood !== 'talk') {
      setOpen(false);
      return;
    }
    setOpen(true);
    const t = setInterval(() => setOpen((o) => !o), FLAP_MS);
    return () => clearInterval(t);
  }, [mood]);

  const size = typeof props.size === 'number' ? `${props.size}px` : (props.size ?? '120px');
  const happy = mood === 'happy';
  return (
    <span
      class={`draco ${mood}${props.bob ? ' bob' : ''} ${props.class ?? ''}`}
      style={{ width: size }}
      role="img"
      aria-label="Draco the dragon"
    >
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="dBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#9874FF" />
            <stop offset="1" stop-color="#6A3FF2" />
          </linearGradient>
          <linearGradient id="dHorn" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stop-color="#FFB36B" />
            <stop offset="1" stop-color="#FF6E40" />
          </linearGradient>
          <linearGradient id="dWing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#FFB98F" />
            <stop offset="1" stop-color="#FF7E57" />
          </linearGradient>
        </defs>
        <g class="d-all">
          {/* tail */}
          <path
            d="M128 165 C158 174 184 164 186 140"
            fill="none"
            stroke="#6A3FF2"
            stroke-width="13"
            stroke-linecap="round"
          />
          <path d="M186 118 L198 140 L186 147 L174 139 Z" fill="url(#dHorn)" />
          {/* wings */}
          <path
            class="d-wing-l"
            d="M72 120 C46 88 22 94 24 122 C32 116 40 120 42 130 C49 122 57 124 60 133 C64 126 69 126 74 130 Z"
            fill="url(#dWing)"
          />
          <path
            class="d-wing-r"
            d="M128 120 C154 88 178 94 176 122 C168 116 160 120 158 130 C151 122 143 124 140 133 C136 126 131 126 126 130 Z"
            fill="url(#dWing)"
          />
          {/* feet */}
          <ellipse cx="80" cy="178" rx="15" ry="9" fill="#5A32D8" />
          <ellipse cx="120" cy="178" rx="15" ry="9" fill="#5A32D8" />
          {/* body + belly */}
          <ellipse cx="100" cy="142" rx="42" ry="38" fill="url(#dBody)" />
          <ellipse cx="100" cy="150" rx="25" ry="25" fill="#FFE6D6" />
          <path
            d="M80 142 Q100 148 120 142 M78 154 Q100 160 122 154 M83 165 Q100 170 117 165"
            fill="none"
            stroke="#F6C4A9"
            stroke-width="2.5"
            stroke-linecap="round"
          />
          {/* arms */}
          <ellipse cx="66" cy="142" rx="8" ry="12" transform="rotate(25 66 142)" fill="#7C55F7" />
          <ellipse
            cx="134"
            cy="142"
            rx="8"
            ry="12"
            transform="rotate(-25 134 142)"
            fill="#7C55F7"
          />
          {/* horns + ear fins */}
          <path d="M66 52 C58 40 58 26 64 16 C72 28 80 38 80 46 Z" fill="url(#dHorn)" />
          <path d="M134 52 C142 40 142 26 136 16 C128 28 120 38 120 46 Z" fill="url(#dHorn)" />
          <path d="M54 76 L36 66 L42 84 Z" fill="url(#dWing)" />
          <path d="M146 76 L164 66 L158 84 Z" fill="url(#dWing)" />
          {/* head */}
          <ellipse cx="100" cy="80" rx="50" ry="44" fill="url(#dBody)" />
          <path d="M92 38 L100 28 L108 38 Z" fill="url(#dHorn)" />
          <ellipse cx="100" cy="100" rx="27" ry="17" fill="#B49BFF" />
          <ellipse cx="91" cy="95" rx="3" ry="2.2" fill="#3B2466" />
          <ellipse cx="109" cy="95" rx="3" ry="2.2" fill="#3B2466" />
          <ellipse cx="63" cy="94" rx="8" ry="5" fill="#FF8FB1" opacity="0.65" />
          <ellipse cx="137" cy="94" rx="8" ry="5" fill="#FF8FB1" opacity="0.65" />
          {/* eyes */}
          {happy ? (
            <path
              d="M69 75 Q78 62 87 75 M113 75 Q122 62 131 75"
              fill="none"
              stroke="#21173A"
              stroke-width="5"
              stroke-linecap="round"
            />
          ) : (
            <g class="d-eyes">
              <ellipse cx="78" cy="72" rx="9.5" ry="12" fill="#21173A" />
              <ellipse cx="122" cy="72" rx="9.5" ry="12" fill="#21173A" />
              <circle cx="81.5" cy="67" r="3.8" fill="#fff" />
              <circle cx="125.5" cy="67" r="3.8" fill="#fff" />
              <circle cx="75.5" cy="77" r="1.7" fill="#fff" />
              <circle cx="119.5" cy="77" r="1.7" fill="#fff" />
            </g>
          )}
          {mood === 'oops' && (
            <path d="M152 44 Q158 54 152 58 Q146 54 152 44 Z" fill="#7FD3FF" stroke="#4DB6F0" />
          )}
          {/* mouth */}
          {open || happy ? (
            <g>
              <path
                d="M89 105 Q100 124 111 105 Z"
                fill="#3B1F52"
                stroke="#3B1F52"
                stroke-width="2"
                stroke-linejoin="round"
              />
              <ellipse cx="100" cy="114" rx="6" ry="3.5" fill="#FF7AA2" />
            </g>
          ) : mood === 'oops' ? (
            <path
              d="M90 111 Q95 106 100 111 Q105 116 110 111"
              fill="none"
              stroke="#3B2466"
              stroke-width="3"
              stroke-linecap="round"
            />
          ) : (
            <path
              d="M91 107 Q100 114 109 107"
              fill="none"
              stroke="#3B2466"
              stroke-width="3"
              stroke-linecap="round"
            />
          )}
        </g>
      </svg>
    </span>
  );
}

/** Draco plus his stylesheet, for pages that don't already include `dracoCss`. */
export function DracoStyle() {
  return <style>{dracoCss}</style>;
}
