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
