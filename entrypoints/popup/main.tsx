import { render } from 'preact';
import { browser } from 'wxt/browser';

function Popup() {
  return (
    <main style={{ minWidth: '220px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '16px' }}>Weave</h1>
      <button onClick={() => browser.runtime.openOptionsPage()}>Settings</button>{' '}
      <button onClick={() => browser.tabs.create({ url: browser.runtime.getURL('/review.html') })}>
        Review
      </button>
    </main>
  );
}

render(<Popup />, document.getElementById('app') as HTMLElement);
