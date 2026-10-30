import { render } from 'preact';
import { Overlay, type OverlayProps } from './Overlay';
import { overlayCss } from './styles';

export interface OverlayHandle {
  host: HTMLElement;
  render(props: OverlayProps): void;
  unmount(): void;
}

/**
 * Mount the overlay in a Shadow DOM appended to `anchor`. Mounting inside
 * the player container keeps it visible in fullscreen.
 */
export function mountOverlay(anchor: HTMLElement, hostStyle = 'inset: 0;'): OverlayHandle {
  const host = document.createElement('slang-overlay');
  host.setAttribute('style', `position: absolute; ${hostStyle} pointer-events: none; z-index: 45;`);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = overlayCss;
  const container = document.createElement('div');
  shadow.append(style, container);
  anchor.append(host);
  return {
    host,
    render: (props) => render(<Overlay {...props} />, container),
    unmount: () => {
      render(null, container);
      host.remove();
    },
  };
}
