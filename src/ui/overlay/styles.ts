/** Shadow-DOM styles for the caption overlay (no page CSS leaks in or out). */
export const overlayCss = `
:host { all: initial; }
.root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-family: "YouTube Noto", Roboto, Arial, system-ui, sans-serif;
  container-type: size;
}
.box {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90%;
  width: max-content;
  padding: 0.15em 0.5em;
  border-radius: 6px;
  background: rgba(8, 8, 8, 0.6);
  color: #fff;
  line-height: 1.35;
  text-align: center;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
  pointer-events: auto;
  cursor: grab;
  user-select: text;
  touch-action: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.box.dragging { cursor: grabbing; user-select: none; }
.hc .box {
  background: #000;
  color: #ffeb3b;
  text-shadow: none;
  font-weight: 600;
  outline: 2px solid #fff;
}
.l1 {
  display: none;
  /* Floats above the caption so revealing it never shifts the words under the pointer. */
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  width: max-content;
  max-width: 100%;
  padding: 0.15em 0.6em;
  border-radius: 6px;
  background: rgba(8, 8, 8, 0.75);
  font-size: 0.65em;
  font-weight: 400;
  line-height: 1.35;
}
.hc .l1 { background: #000; outline: 1px solid #fff; }
/* Rule 1: the full L1 line stays hidden until asked for (and out of the way of a word popover). */
.box:hover .l1 { display: block; }
.popping .box .l1 { display: none; }
.ai {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: 50%;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(8, 8, 8, 0.75);
  color: #fff;
  font-size: 13px;
  pointer-events: auto;
}
.ai button { all: unset; cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; }
/* Words: clickable; glossed ones get ruby text and a state-colored underline. */
.w { cursor: pointer; border-radius: 3px; }
.w:hover, .w.on { background: rgba(255, 255, 255, 0.18); }
.g { text-decoration: underline 2px; text-underline-offset: 0.18em; }
.g.st-new, .g.st-seen { text-decoration-color: #4fc3f7; }
.g.st-learning { text-decoration-color: #ffb74d; }
ruby { ruby-position: over; }
rt {
  font-size: 0.42em;
  font-weight: 500;
  color: #e0e0e0;
  letter-spacing: 0;
  padding-bottom: 0.1em;
}
.hc rt { color: #fff; }
.box { line-height: 1.6; }
.pop {
  position: absolute;
  transform: translateX(-50%);
  min-width: 180px;
  max-width: min(320px, 80%);
  padding: 10px 12px;
  border-radius: 8px;
  background: #1f1f1f;
  color: #fff;
  font-size: 15px;
  line-height: 1.35;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  z-index: 2;
}
.pop-head { display: flex; align-items: baseline; gap: 8px; }
.lemma { font-size: 18px; font-weight: 700; }
.pos { opacity: 0.7; font-size: 13px; font-style: italic; }
.pop .icon { all: unset; cursor: pointer; font-size: 15px; padding: 0 2px; }
.pop .close { margin-left: auto; font-size: 18px; }
.gloss { margin: 6px 0 10px; font-size: 16px; }
.muted { opacity: 0.6; font-size: 13px; }
.pop-actions { display: flex; gap: 6px; }
.pop-actions button {
  all: unset;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  background: #333;
  font-size: 13px;
}
.pop-actions button:hover { background: #444; }
.pop-actions button:disabled { opacity: 0.5; cursor: default; }
.notice {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(8, 8, 8, 0.75);
  color: #fff;
  font-size: 14px;
  pointer-events: auto;
}
.notice button {
  all: unset;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
}
`;
