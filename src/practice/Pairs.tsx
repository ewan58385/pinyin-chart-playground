import { useEffect, useMemo, useState } from 'preact/hooks';
import { nativeItem, play, stopPlayback, nowPlaying, unlockAudio } from '../lib/audio';
import { practiceHistory, recordPractice, settings, showTone, statuses } from '../lib/store';
import { buildPairs, PAIR_KINDS, type MinimalPair } from './pairs';
import { weightOf, weightedPick } from './weights';
import { Play, Stop } from '../components/icons';

interface Round {
  pair: MinimalPair;
  /** The order the two clips play in. */
  first: 'a' | 'b';
}

const COUNT = 10;

export function Pairs() {
  const all = useMemo(buildPairs, []);
  const [kinds, setKinds] = useState<Set<MinimalPair['kind']>>(new Set(PAIR_KINDS.map((k) => k.id)));
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [chosen, setChosen] = useState<'a' | 'b' | null>(null);
  const [results, setResults] = useState<{ pair: MinimalPair; correct: boolean }[]>([]);

  useEffect(() => () => stopPlayback(), []);

  const pool = all.filter((p) => kinds.has(p.kind));
  const makeRound = (): Round => {
    const st = statuses.value;
    const ph = practiceHistory.value;
    const pair = weightedPick(pool, (p) => weightOf(st[p.a.cell.numeric], ph[p.a.cell.numeric]) + weightOf(st[p.b.cell.numeric], ph[p.b.cell.numeric]));
    const first = Math.random() < 0.5 ? 'a' : 'b';
    return { pair, first };
  };
  const playRound = (r: Round) => {
    const order = r.first === 'a' ? [r.pair.a, r.pair.b] : [r.pair.b, r.pair.a];
    void play(
      order.map((p) => nativeItem(p.cell.numeric)),
      { rate: settings.value.rate, gapMs: 500 },
    );
  };
  const begin = () => {
    unlockAudio();
    setResults([]);
    const r = makeRound();
    setRound(r);
    setChosen(null);
    setRunning(true);
    playRound(r);
  };
  const answer = (which: 'a' | 'b') => {
    if (!round || chosen) return;
    const correct = which === round.first;
    setChosen(which);
    recordPractice(round.pair.a.cell.numeric, correct);
    recordPractice(round.pair.b.cell.numeric, correct);
    setResults((r) => [...r, { pair: round.pair, correct }]);
  };
  const next = () => {
    if (results.length >= COUNT) {
      setRunning(false);
      setRound(null);
      stopPlayback();
      return;
    }
    const r = makeRound();
    setRound(r);
    setChosen(null);
    playRound(r);
  };

  if (!running && !results.length) {
    return (
      <section class="practice-setup">
        <div class="set-row">
          <span class="set-label">Contrasts</span>
          <div class="checks">
            {PAIR_KINDS.map((k) => (
              <label class="check">
                <input
                  type="checkbox"
                  checked={kinds.has(k.id)}
                  onChange={(e) => {
                    const next = new Set(kinds);
                    if ((e.target as HTMLInputElement).checked) next.add(k.id);
                    else next.delete(k.id);
                    setKinds(next);
                  }}
                />
                {k.label} <small class="hint">({all.filter((p) => p.kind === k.id).length} pairs)</small>
              </label>
            ))}
          </div>
        </div>
        <p class="hint">{COUNT} rounds. Two syllables play one after the other; you say which came first.</p>
        <button type="button" class="btn primary" disabled={!pool.length} onClick={begin}>
          <Play size={15} aria-hidden="true" />
          Start
        </button>
      </section>
    );
  }

  if (!running) {
    const wrong = results.filter((r) => !r.correct);
    const byContrast: Record<string, { right: number; total: number }> = {};
    for (const r of results) {
      const c = (byContrast[r.pair.contrast] ??= { right: 0, total: 0 });
      c.total++;
      if (r.correct) c.right++;
    }
    return (
      <section class="practice-summary">
        <h2>
          {results.length - wrong.length} of {results.length}
        </h2>
        <ul class="plain">
          {Object.entries(byContrast).map(([c, n]) => (
            <li>
              <span class="py">{c}</span>: {n.right} of {n.total}
            </li>
          ))}
        </ul>
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

  const r = round!;
  const playing = !!nowPlaying.value && nowPlaying.value.startsWith('native:');
  return (
    <section class="practice-run" aria-live="polite">
      <p class="hint small">
        Round {results.length + (chosen ? 0 : 1)} of {COUNT}: <span class="py">{r.pair.contrast}</span>
      </p>
      <div class="practice-play">
        <button type="button" class="play-native" aria-label={playing ? 'Stop' : 'Play the pair again'} onClick={() => (playing ? stopPlayback() : playRound(r))}>
          {playing ? <Stop size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
      </div>
      <p>Which played first?</p>
      <div class="options two">
        {(['a', 'b'] as const).map((side) => {
          const p = r.pair[side];
          const state = chosen ? (side === r.first ? 'right' : side === chosen ? 'wrong' : 'other') : '';
          return (
            <button type="button" class={`option ${state}`} disabled={!!chosen} onClick={() => answer(side)}>
              <span class="py" data-tone={p.cell.tone}>
                {showTone(p.cell)}
              </span>
            </button>
          );
        })}
      </div>
      {chosen && (
        <div class="actions">
          <p class={`verdict ${chosen === r.first ? 'ok' : 'miss'}`}>{chosen === r.first ? 'Right.' : `${showTone(r.pair[r.first].cell)} came first.`}</p>
          <button type="button" class="btn primary" onClick={next}>
            {results.length >= COUNT ? 'Finish' : 'Next'}
          </button>
        </div>
      )}
    </section>
  );
}
