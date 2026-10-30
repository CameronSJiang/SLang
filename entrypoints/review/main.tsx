import { render } from 'preact';

function Review() {
  return (
    <main>
      <h1>Review</h1>
      <p>No cards yet. Saved words will show up here (M4).</p>
    </main>
  );
}

render(<Review />, document.getElementById('app') as HTMLElement);
