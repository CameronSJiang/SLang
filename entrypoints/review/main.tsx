import { Icon } from '@/src/ui/icons';
import { render, type ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildQuiz, type QuizQuestion, type QuizWord } from '@/src/core/quiz';
import type { Settings } from '@/src/core/settings';
import type { Card } from '@/src/core/types';
import { db } from '@/src/storage/db';
import { loadQuizPool, recordQuizAnswer } from '@/src/storage/quizPool';
import { loadSettings } from '@/src/storage/settings';
import { Draco, DracoStyle, type DracoMood } from '@/src/ui/buddy/Draco';
import { sayWord, type SayHandle } from '@/src/ui/buddy/voice';
import '@/src/ui/settings/page.css';
import './review.css';

const QUIZ_LENGTH = 5;

const clipUrl = (videoId: string, t = 0) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${Math.max(0, Math.floor(t) - 1)}s`;

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)] as T;

const RIGHT = [
  '¡Exacto!',
  'Nailed it.',
  '¡Muy bien!',
  'Look at you go.',
  'Too easy, huh?',
  '¡Eso!',
];
const WRONG = ['Ooh, close!', 'Not quite!', 'Sneaky one.', 'Almost!'];

function summary(score: number, total: number): string {
  if (total && score === total) return 'Perfect score! I’m doing a little victory lap.';
  if (score / Math.max(1, total) >= 0.6) return 'Solid! Those words are sticking.';
  return 'We’ll get ’em next time. The ones you missed are in your saved words now.';
}

/** The sentence with the quizzed word highlighted. */
function Context({ w }: { w: QuizWord }) {
  if (!w.sentence) return null;
  const needle = (w.surface ?? w.lemma).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = w.sentence.split(new RegExp(`(${needle})`, 'i'));
  return (
    <p class="quiz-context">“{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}”</p>
  );
}

type Phase = 'intro' | 'asking' | 'answered' | 'done';

function Quiz({ s, onFinished }: { s: Settings; onFinished(): void }) {
  const [pool, setPool] = useState<QuizWord[] | null>(null);
  const [qs, setQs] = useState<QuizQuestion[]>([]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [mood, setMood] = useState<DracoMood>('idle');
  const [line, setLine] = useState('');
  const saying = useRef<SayHandle | null>(null);

  useEffect(() => {
    void loadQuizPool(s).then(setPool);
    return () => saying.current?.stop();
  }, [s.targetLang]);

  const q = qs[i];
  const say = (text: string) => {
    saying.current?.stop();
    saying.current = sayWord(text, {
      lang: s.targetLang,
      natural:
        s.dubEngine === 'natural'
          ? { voice: s.kokoroVoice, speed: s.kokoroSpeed, gpu: !s.kokoroCpuOnly }
          : null,
      onStart: () => setMood('talk'),
      onEnd: () => setMood((m) => (m === 'talk' ? 'idle' : m)),
    });
  };

  const start = () => {
    if (!pool) return;
    const next = buildQuiz(pool, QUIZ_LENGTH, Math.random);
    setQs(next);
    setI(0);
    setScore(0);
    setChosen(null);
    setMood('idle');
    setPhase(next.length ? 'asking' : 'intro');
    if (!next.length) setLine('Hmm, I need a few more words first. Watch a bit more with SLang!');
  };

  const answer = (c: number) => {
    if (!q || phase !== 'asking') return;
    const right = c === q.answer;
    setChosen(c);
    setPhase('answered');
    setMood(right ? 'happy' : 'oops');
    if (right) setScore((n) => n + 1);
    const savedNow = !right && !q.word.cardId && q.word.videoId && q.word.sentence;
    setLine(
      right
        ? pick(RIGHT)
        : `${pick(WRONG)} It means “${q.word.gloss}”.${savedNow ? ' I saved it so it comes back.' : ''}`,
    );
    void recordQuizAnswer(s, q.word, right);
  };

  const next = () => {
    setChosen(null);
    setMood('idle');
    if (i + 1 < qs.length) {
      setI(i + 1);
      setPhase('asking');
    } else {
      setPhase('done');
      setMood(score / Math.max(1, qs.length) >= 0.6 ? 'happy' : 'idle');
      onFinished();
    }
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (phase === 'asking' && /^[1-4]$/.test(e.key)) answer(Number(e.key) - 1);
      else if (phase === 'answered' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        next();
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  });

  const enough = useMemo(() => pool !== null && buildQuiz(pool, 1, Math.random).length > 0, [pool]);
  let bubble: ComponentChildren;
  if (phase === 'intro') {
    bubble =
      pool === null
        ? 'Rummaging through your videos…'
        : enough
          ? line ||
            '¡Hola! I’m Draco. Quick quiz? I’ll check the words you’ve probably already got down.'
          : '¡Hola! I’m Draco. Watch a video or two with SLang first, then I’ll have words to quiz you on!';
  } else if (phase === 'done') {
    bubble = (
      <>
        <b>
          {score} / {qs.length}
        </b>{' '}
        · {summary(score, qs.length)}
      </>
    );
  } else if (q) {
    bubble =
      phase === 'answered' ? (
        line
      ) : (
        <>
          What does{' '}
          <b class="quiz-word" lang={s.targetLang}>
            {q.word.surface ?? q.word.lemma}
          </b>{' '}
          mean?
        </>
      );
  }

  return (
    <section class="card quiz">
      <div class="quiz-stage">
        <Draco mood={mood} size={104} bob={mood === 'idle'} />
        <div class="quiz-stage-body">
          <div class="speech">{bubble}</div>
          {(phase === 'intro' || phase === 'done') && enough && (
            <div class="row">
              <button class="primary" onClick={start}>
                {phase === 'done' ? 'Quiz me again' : `Quiz me (${QUIZ_LENGTH} words)`}
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {(phase === 'asking' || phase === 'answered') && q && (
        <>
          <div class="progress" aria-label={`Question ${i + 1} of ${qs.length}`}>
            <span
              style={{ width: `${((i + (phase === 'answered' ? 1 : 0)) / qs.length) * 100}%` }}
            />
          </div>
          <Context w={q.word} />
          <div class="choices quiz-choices">
            {q.choices.map((c, n) => {
              const state =
                phase === 'answered'
                  ? n === q.answer
                    ? ' right'
                    : n === chosen
                      ? ' wrong'
                      : ''
                  : '';
              return (
                <button
                  key={c}
                  class={`choice${state}`}
                  disabled={phase === 'answered'}
                  onClick={() => answer(n)}
                >
                  <span class="tag">{n + 1}</span>
                  <span>{c}</span>
                </button>
              );
            })}
          </div>
          <div class="row">
            <button class="btn-ghost" onClick={() => say(q.word.surface ?? q.word.lemma)}>
              <Icon name="volume-2" size={15} />
              Hear it
            </button>
            {phase === 'answered' && q.word.videoId && (
              <a
                class="btn btn-ghost"
                href={clipUrl(q.word.videoId, q.word.t)}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="play" size={13} />
                Watch the clip
              </a>
            )}
            <span style={{ flex: 1 }} />
            {phase === 'answered' && (
              <button class="primary" onClick={next}>
                {i + 1 < qs.length ? 'Next' : 'Finish'}
                <Icon name="arrow-right" size={14} />
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Review() {
  const [s, setS] = useState<Settings | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const load = () => void db.cards.toArray().then((cs) => setCards(cs.reverse()));
  useEffect(() => {
    void loadSettings().then(setS);
    load();
  }, []);

  const remove = async (id: string) => {
    await db.cards.delete(id);
    load();
  };

  return (
    <main style={{ maxWidth: '720px' }}>
      <DracoStyle />
      <header class="page-head">
        <img src="/icon/128.png" width="40" height="40" alt="" />
        <div>
          <h1>Quiz & saved words</h1>
          <p class="muted">Draco quizzes you on words from the videos you’ve watched.</p>
        </div>
      </header>

      {s?.buddyEnabled === false ? (
        <p class="card muted">
          Draco is switched off. Turn him back on in <a href="/options.html">settings</a> for
          quizzes.
        </p>
      ) : (
        s && <Quiz s={s} onFinished={load} />
      )}

      <div class="section-head">
        <h2>Saved words</h2>
        {cards && cards.length > 0 && <span class="mono count">{cards.length}</span>}
      </div>
      <p class="muted section-note">
        Words you save with <b>Save</b> on a video (and ones you miss in a quiz) show up here, with
        the sentence and a link back to the moment you heard them.
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
                <span class="word" lang={c.lang}>
                  {c.lemma}
                </span>
                <span class="gloss"> · {c.gloss || 'no meaning yet'}</span>
              </div>
              <div class="sentence" lang={c.lang}>
                “{c.sentence}”
              </div>
              <div class="actions">
                <a
                  class="btn btn-ghost"
                  href={clipUrl(c.videoId, c.t)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="play" size={13} />
                  Watch clip
                </a>
                <button
                  class="btn-ghost"
                  onClick={() => void remove(c.id)}
                  aria-label={`Remove ${c.lemma}`}
                >
                  <Icon name="trash-2" size={14} />
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

render(<Review />, document.getElementById('app') as HTMLElement);
