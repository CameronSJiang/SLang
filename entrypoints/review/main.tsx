import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Card } from '@/src/core/types';
import { db } from '@/src/storage/db';
import '@/src/ui/settings/page.css';

const clipUrl = (c: Card) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(c.videoId)}&t=${Math.max(0, Math.floor(c.t) - 1)}s`;

/** Saved words with their sentence and clip. Spaced-repetition reviews arrive in M4. */
function Review() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const load = () => void db.cards.toArray().then((cs) => setCards(cs.reverse()));
  useEffect(load, []);

  const remove = async (id: string) => {
    await db.cards.delete(id);
    load();
  };

  return (
    <main style={{ maxWidth: '720px' }}>
      <h1>Saved words</h1>
      <p class="muted">
        Words you save with <b>Save</b> on a video show up here, with the sentence and a link back
        to the moment you heard them. Flashcard-style reviews are coming next.
      </p>
      {cards === null ? (
        <p>Loading…</p>
      ) : cards.length === 0 ? (
        <p>
          Nothing saved yet. On a video, click any word in the captions and press <b>Save</b>.
        </p>
      ) : (
        <ul class="saved">
          {cards.map((c) => (
            <li key={c.id}>
              <div>
                <b lang={c.lang}>{c.lemma}</b> —{' '}
                {c.gloss || <span class="muted">no meaning yet</span>}
              </div>
              <div class="muted" lang={c.lang}>
                “{c.sentence}”
              </div>
              <div class="row">
                <a href={clipUrl(c)} target="_blank" rel="noreferrer">
                  ▶ Watch the clip
                </a>
                <button onClick={() => void remove(c.id)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

render(<Review />, document.getElementById('app') as HTMLElement);
