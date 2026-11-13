import { useEffect, useMemo, useState } from 'preact/hooks';
import { SYLLABLES, hasNativeAudio, type Syllable, type ToneCell } from '../data';
import { confusablesFor } from '../data/confusables';
import { nativeItem, play, stopPlayback, nowPlaying, unlockAudio } from '../lib/audio';
import { practiceHistory, recordPractice, setStatus, settings, showTone, statuses, visibleTones, syllableVisible } from '../lib/store';
import { TONE_NAMES, type Tone } from '../lib/pinyin';
import { shuffle, weightOf, weightedPick } from './weights';
import { Play, Stop } from '../components/icons';

type Mode = 'syllable' | 'tone';
interface Question {
  cell: ToneCell;
  syllable: Syllable;
  /** Candidate answers: cells (syllable mode) or tones (tone mode). */
  options: { label: string; key: string; tone: Tone }[];
  answer: string;
}
interface Result {
  q: Question;
  chosen: string;
  correct: boolean;
}

const COUNT = 10;

function makeQuestion(mode: Mode, pool: { cell: ToneCell; syllable: Syllable }[]): Question {
  const st = statuses.value;
  const ph = practiceHistory.value;
  const pick = weightedPick(pool, (p) => weightOf(st[p.cell.numeric], ph[p.cell.numeric]));
  if (mode === 'tone') {
    // Only tones that have a recording can be the answer, so only those are offered.
    const options = pick.syllable.tones.filter((t) => t.status !== 'single-source' && hasNativeAudio(t.numeric)).map((t) => ({ label: showTone(t), key: String(t.tone), tone: t.tone }));
    return { cell: pick.cell, syllable: pick.syllable, options, answer: String(pick.cell.tone) };
  }
  // Syllable mode: the same tone on confusable syllables first, then random ones.
  const tone = pick.cell.tone;
  const sameTone = (s: Syllable) => s.tones.find((t) => t.tone === tone && t.status !== 'single-source');
  const candidates: { label: string; key: string; tone: Tone }[] = [];
  for (const c of confusablesFor(pick.syllable)) {
    const t = sameTone(c.syllable);
    if (t) candidates.push({ label: showTone(t), key: t.numeric, tone: t.tone });
  }
  const others = shuffle(pool.filter((p) => p.cell.tone === tone && p.syllable.id !== pick.syllable.id));
  for (const o of others) {
    if (candidates.length >= 3) break;
    if (!candidates.some((c) => c.key === o.cell.numeric)) candidates.push({ label: showTone(o.cell), key: o.cell.numeric, tone: o.cell.tone });
  }
  const options = shuffle([{ label: showTone(pick.cell), key: pick.cell.numeric, tone: pick.cell.tone }, ...candidates.slice(0, 3)]);
  return { cell: pick.cell, syllable: pick.syllable, options, answer: pick.cell.numeric };
}

export function Quiz({ startSyllable }: { startSyllable: string | null }) {
  const [mode, setMode] = useState<Mode>(startSyllable ? 'tone' : 'syllable');
  const [scope, setScope] = useState<'all' | 'one'>(startSyllable ? 'one' : 'all');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [marked, setMarked] = useState(false);

  const pool = useMemo(() => {
    const show = settings.value.showUnverified;
    const syls = scope === 'one' && startSyllable ? SYLLABLES.filter((s) => s.id === startSyllable) : SYLLABLES.filter((s) => syllableVisible(s, show));
    return syls.flatMap((s) => visibleTones(s, show).filter((t) => hasNativeAudio(t.numeric)).map((cell) => ({ cell, syllable: s })));
  }, [scope, startSyllable]);

  useEffect(() => () => stopPlayback(), []);

  const playCurrent = (q: Question) => void play([nativeItem(q.cell.numeric)], { rate: settings.value.rate });
  const begin = () => {
    unlockAudio();
    setResults([]);
    setMarked(false);
    const q = makeQuestion(mode, pool);
    setCurrent(q);
    setChosen(null);
    setRunning(true);
    playCurrent(q);
  };
  const answer = (key: string) => {
    if (!current || chosen) return;
    const correct = key === current.answer;
    setChosen(key);
    recordPractice(current.cell.numeric, correct);
    setResults((r) => [...r, { q: current, chosen: key, correct }]);
  };
  const next = () => {
    if (results.length >= COUNT) {
      setRunning(false);
      setCurrent(null);
      stopPlayback();
      return;
    }
    const q = makeQuestion(mode, pool);
    setCurrent(q);
    setChosen(null);
    playCurrent(q);
  };

  const playing = nowPlaying.value === `native:${current?.cell.numeric}`;
  const wrong = results.filter((r) => !r.correct);
  const wrongCells = [...new Set(wrong.map((r) => r.q.cell.numeric))];

  if (!pool.length) return <p class="hint">No cells with a native recording to practise.</p>;

  if (!running && !results.length) {
    return (
      <section class="practice-setup">
        <div class="set-row">
          <span class="set-label" id="quiz-mode">
            What to pick
          </span>
          <div class="seg" role="radiogroup" aria-labelledby="quiz-mode">
            <button type="button" role="radio" aria-checked={mode === 'syllable'} onClick={() => setMode('syllable')}>
              The syllable
            </button>
            <button type="button" role="radio" aria-checked={mode === 'tone'} onClick={() => setMode('tone')}>
              The tone
            </button>
          </div>
        </div>
        {startSyllable && (
          <div class="set-row">
            <span class="set-label" id="quiz-scope">
              Which cells
            </span>
            <div class="seg" role="radiogroup" aria-labelledby="quiz-scope">
              <button type="button" role="radio" aria-checked={scope === 'one'} onClick={() => setScope('one')}>
                Only {startSyllable}
              </button>
              <button type="button" role="radio" aria-checked={scope === 'all'} onClick={() => setScope('all')}>
                The whole chart
              </button>
            </div>
          </div>
        )}
        <p class="hint">
          {COUNT} questions. A syllable plays; you {mode === 'tone' ? 'pick its tone' : 'pick which syllable it was, from four that are easily confused'}.
        </p>
        <button type="button" class="btn primary" onClick={begin}>
          <Play size={15} aria-hidden="true" />
          Start
        </button>
      </section>
    );
  }

  if (!running) {
    // Summary.
    const tones = [1, 2, 3, 4, 5] as Tone[];
    const confusion: Record<string, number> = {};
    for (const r of results) {
      const exp = r.q.cell.tone;
      const got = r.q.options.find((o) => o.key === r.chosen)?.tone ?? exp;
      if (mode === 'tone' || exp !== got) confusion[`${exp}>${got}`] = (confusion[`${exp}>${got}`] ?? 0) + 1;
    }
    const confused = Object.entries(confusion).filter(([k, n]) => n > 0 && k.split('>')[0] !== k.split('>')[1]);
    return (
      <section class="practice-summary">
        <h2>
          {results.length - wrong.length} of {results.length}
        </h2>
        {mode === 'tone' ? (
          <div class="confusion">
            <p class="hint small">Rows: the tone played. Columns: the tone you chose.</p>
            <table>
              <thead>
                <tr>
                  <th />
                  {tones.map((t) => (
                    <th>{t === 5 ? 'neutral' : t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tones.map((exp) => (
                  <tr>
                    <th>{exp === 5 ? 'neutral' : TONE_NAMES[exp].replace(' tone', '')}</th>
                    {tones.map((got) => {
                      const n = confusion[`${exp}>${got}`] ?? 0;
                      return <td class={n ? (exp === got ? 'ok' : 'miss') : ''}>{n || ''}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ul class="plain">
            {wrong.length ? wrong.map((r) => (
              <li>
                <span class="py">{showTone(r.q.cell)}</span> heard as <span class="py">{r.q.options.find((o) => o.key === r.chosen)?.label}</span>
              </li>
            )) : <li>Nothing confused.</li>}
            {confused.length > 0 && <li class="hint small">Tones mixed up along the way: {confused.map(([k, n]) => `${k.replace('>', ' heard as ')} (${n})`).join(', ')}.</li>}
          </ul>
        )}
        {wrongCells.length > 0 && !marked && (
          <p class="practice-offer">
            Mark {wrongCells.map((c) => showTone(SYLLABLES.flatMap((s) => s.tones).find((t) => t.numeric === c)!)).join(', ')} as shaky on the chart?{' '}
            <button
              type="button"
              class="btn"
              onClick={() => {
                for (const c of wrongCells) if ((statuses.value[c] ?? 'new') !== 'shaky') setStatus(c, 'shaky');
                setMarked(true);
              }}
            >
              Yes, mark them
            </button>
          </p>
        )}
        {marked && <p class="hint">Marked as shaky.</p>}
        <div class="actions">
          <button type="button" class="btn primary" onClick={begin}>
            Again
          </button>
          <button type="button" class="btn" onClick={() => setResults([])}>
            Change settings
          </button>
        </div>
      </section>
    );
  }

  const q = current!;
  return (
    <section class="practice-run" aria-live="polite">
      <p class="hint small">
        Question {results.length + (chosen ? 0 : 1)} of {COUNT}
        {chosen ? '' : ''}
      </p>
      <div class="practice-play">
        <button type="button" class="play-native" aria-label={playing ? 'Stop' : 'Play again'} onClick={() => (playing ? stopPlayback() : playCurrent(q))}>
          {playing ? <Stop size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
        <span class="hint small">{mode === 'tone' ? <>Syllable <span class="py">{q.syllable.id}</span>: which tone?</> : 'Which syllable?'}</span>
      </div>
      <div class="options">
        {q.options.map((o) => {
          const state = chosen ? (o.key === q.answer ? 'right' : o.key === chosen ? 'wrong' : 'other') : '';
          return (
            <button type="button" class={`option ${state}`} disabled={!!chosen} onClick={() => answer(o.key)}>
              <span class="py" data-tone={o.tone}>
                {o.label}
              </span>
              {mode === 'tone' && <small>{TONE_NAMES[o.tone]}</small>}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div class="actions">
          <p class={`verdict ${chosen === q.answer ? 'ok' : 'miss'}`}>{chosen === q.answer ? 'Right.' : `It was ${q.options.find((o) => o.key === q.answer)?.label}.`}</p>
          <button type="button" class="btn primary" onClick={next}>
            {results.length >= COUNT ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </section>
  );
}
