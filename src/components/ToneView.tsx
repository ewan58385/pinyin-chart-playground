import { useEffect, useRef, useState } from 'preact/hooks';
import { hasNativeAudio, type ExampleWord, type Syllable, type ToneCell } from '../data';
import { TONE_NAMES } from '../lib/pinyin';
import {
  addRecording,
  clearOverride,
  overrides,
  preferredTake,
  recordingsByCell,
  removeRecording,
  resolveExample,
  saveOverride,
  saveToneNote,
  setSetting,
  setStatus,
  settings,
  showTone,
  statuses,
  toneNotes,
  updateRecording,
} from '../lib/store';
import type { LearnStatus, RecordingMeta } from '../lib/db';
import { getRecordingBlob } from '../lib/db';
import { getNativeBlob, nativeItem, nowPlaying, play, playError, stopPlayback, unlockAudio, type PlayItem } from '../lib/audio';
import { decode, peaksOf, pitchAnalysis, speechBounds, type PitchResult } from '../lib/analysis';
import { explainNoContour, fitAxis, medianLabel, plotValue, yOf, type PitchMode } from '../lib/overlay';
import { MAX_RECORDING_MS, recState, recordingUnavailableReason, resamplePeaks, startRecording, type ActiveRecording } from '../lib/recorder';
import { online } from '../lib/viewport';
import { Play, Stop, Mic, Star, Trash, Pencil, Swap, Loop, PitchIcon, Reset, ExternalLink } from './icons';
import { forvoLink } from '../lib/forvo';
import { NoteField } from './NoteField';

// ───────────────────────── analysis caches ─────────────────────────

interface Analysed {
  peaks: number[];
  pitch: PitchResult;
}
/** A take's analysis; `pitch` is null when the browser could not decode the recording. */
interface TakeAnalysis {
  pitch: PitchResult | null;
}
const nativeCache = new Map<string, Promise<Analysed | null>>();
function analyseNative(cell: string): Promise<Analysed | null> {
  let p = nativeCache.get(cell);
  if (!p) {
    p = (async () => {
      const blob = await getNativeBlob(cell);
      const buf = blob && (await decode(blob));
      if (!buf) {
        nativeCache.delete(cell); // offline or not decodable now; try again next time
        return null;
      }
      return { peaks: peaksOf(buf), pitch: pitchAnalysis(buf) };
    })();
    nativeCache.set(cell, p);
  }
  return p;
}
const takePitchCache = new Map<string, Promise<TakeAnalysis>>();
function analyseTake(take: RecordingMeta): Promise<TakeAnalysis> {
  let p = takePitchCache.get(take.id);
  if (!p) {
    p = (async () => {
      const blob = await getRecordingBlob(take);
      const buf = blob && (await decode(blob));
      // The same tracker as the native clip, on the trimmed span of the take.
      return { pitch: buf ? pitchAnalysis(buf, take.trimStart, take.trimEnd) : null };
    })();
    takePitchCache.set(take.id, p);
  }
  return p;
}

function useAsync<T>(fn: () => Promise<T> | null, key: string): T | undefined {
  const [state, setState] = useState<{ key: string; value: T } | null>(null);
  useEffect(() => {
    let live = true;
    const p = fn();
    if (p) void p.then((value) => live && setState({ key, value }));
    return () => {
      live = false;
    };
  }, [key]);
  return state?.key === key ? state.value : undefined;
}

const takeItem = (t: RecordingMeta): PlayItem => ({
  key: `take:${t.id}`,
  load: () => getRecordingBlob(t),
  start: t.trimStart > 0.03 ? t.trimStart : undefined,
  end: t.trimEnd > 0 && t.trimEnd < t.durationMs / 1000 - 0.03 ? t.trimEnd : undefined,
});

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

// ───────────────────────── small pieces ─────────────────────────

function Wave({ peaks }: { peaks: number[] }) {
  const n = peaks.length;
  const d = peaks
    .map((p, i) => {
      const h = Math.max(1.5, p * 34);
      return `M${i * 4 + 1} ${(36 - h) / 2}v${h}`;
    })
    .join('');
  return (
    <svg class="wave" viewBox={`0 0 ${n * 4} 36`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} stroke="currentColor" stroke-width="2.2" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    </svg>
  );
}

const MODE_LABEL: Record<PitchMode, string> = { relative: 'Relative', hz: 'Absolute Hz' };

/**
 * Both pitch traces on one chart. By default each is drawn in semitones
 * around its own median, so a low speaker lies over a high one and the shapes
 * can be compared; "Absolute Hz" shows the real pitches on a log axis. The
 * axis fits whatever is drawn, with padding, and never goes blank without
 * saying why.
 */
function PitchOverlay({
  reference,
  mine,
  hasTake,
}: {
  reference: PitchResult | null | undefined;
  mine: TakeAnalysis | undefined;
  hasTake: boolean;
}) {
  const mode = settings.value.pitchMode;
  const ref = reference?.points ?? [];
  const my = mine?.pitch?.points ?? [];
  const traces = [ref, my].filter((t) => t.length > 4);
  if (!traces.length && !hasTake) return null;
  const axis = fitAxis(traces, mode);
  const W = 100;
  const H = 60;
  const y = (v: number) => yOf(v, axis) * H;
  const line = (pts: typeof ref) => pts.map((p, i) => `${i ? 'L' : 'M'}${(p.x * W).toFixed(1)} ${y(plotValue(p, mode)).toFixed(1)}`).join('');
  const reason = hasTake && my.length <= 4 ? explainNoContour(mine?.pitch, mine ? mine.pitch !== null : true) : '';
  return (
    <div class="pitch">
      <div class="pitch-head">
        <span class="hint small">
          {mode === 'relative' ? 'Each voice is centred on its own middle pitch, so you can compare the shapes.' : 'Actual pitch in hertz: how high or low each voice is.'}
        </span>
        <div class="seg small" role="radiogroup" aria-label="Pitch scale">
          {(['relative', 'hz'] as PitchMode[]).map((m) => (
            <button type="button" role="radio" aria-checked={mode === m} onClick={() => setSetting('pitchMode', m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
      <div class="pitch-plot">
        <div class="pitch-axis" aria-hidden="true">
          {axis.ticks.map((t) => (
            <span style={{ top: `${(yOf(t.value, axis) * 100).toFixed(1)}%` }}>{t.label}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Pitch of the native recording and of yours, drawn over each other">
          {axis.ticks.map((t) => (
            <line class="grid" x1="0" x2={W} y1={y(t.value)} y2={y(t.value)} />
          ))}
          {ref.length > 4 && <path class="p-native" d={line(ref)} />}
          {my.length > 4 && <path class="p-mine" d={line(my)} />}
        </svg>
      </div>
      <div class="legend">
        {ref.length > 4 && (
          <span>
            <i />
            native {medianLabel(reference ?? undefined) && <b>{medianLabel(reference ?? undefined)}</b>}
          </span>
        )}
        {my.length > 4 && (
          <span>
            <i class="m" />
            mine {medianLabel(mine?.pitch ?? undefined) && <b>{medianLabel(mine?.pitch ?? undefined)}</b>}
          </span>
        )}
        {hasTake && !mine && <span>Analysing your recording…</span>}
      </div>
      {reason && (
        <p class="nocontour" role="status">
          No pitch line for your recording. {reason}
        </p>
      )}
    </div>
  );
}

function TakeRow({ take, current, onSelect }: { take: RecordingMeta; current: boolean; onSelect: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const playing = nowPlaying.value === `take:${take.id}`;
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3500);
    return () => clearTimeout(t);
  }, [confirming]);
  return (
    <li class={`take${current ? ' current' : ''}`}>
      <button
        type="button"
        class="icon-btn"
        aria-label={playing ? `Stop ${take.name}` : `Play ${take.name}`}
        onClick={() => {
          onSelect();
          if (playing) stopPlayback();
          else void play([takeItem(take)], { rate: settings.value.rate });
        }}
      >
        {playing ? <Stop size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
      </button>
      <input
        class="name"
        value={take.name}
        aria-label="Recording name"
        maxLength={60}
        onFocus={onSelect}
        onChange={(e) => {
          const name = (e.target as HTMLInputElement).value.trim();
          if (name && name !== take.name) updateRecording(take.id, { name });
          else (e.target as HTMLInputElement).value = take.name;
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <span class="dur">{seconds(Math.max(0, (take.trimEnd - take.trimStart) * 1000) || take.durationMs)}</span>
      <button
        type="button"
        class={`icon-btn${take.best ? ' best' : ''}`}
        aria-label={take.best ? `${take.name} is your best recording. Unmark it` : `Mark ${take.name} as your best recording`}
        aria-pressed={take.best}
        title="Best recording"
        onClick={() => updateRecording(take.id, { best: !take.best })}
      >
        <Star size={17} aria-hidden="true" />
      </button>
      {confirming ? (
        <button
          type="button"
          class="btn confirm"
          onClick={() => {
            if (playing) stopPlayback();
            removeRecording(take.id);
          }}
        >
          Delete
        </button>
      ) : (
        <button type="button" class="icon-btn" aria-label={`Delete ${take.name}`} title="Delete" onClick={() => setConfirming(true)}>
          <Trash size={16} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

// ───────────────────────── example editor ─────────────────────────

function ExampleEditor({ cell, onDone }: { cell: string; onDone: () => void }) {
  const ex = resolveExample(cell, overrides.value);
  const [character, setCharacter] = useState(ex.character);
  const [meaning, setMeaning] = useState(ex.meaning);
  const [words, setWords] = useState<ExampleWord[]>(() => [...ex.words, ...Array(3).fill({ word: '', pinyin: '', meaning: '' })].slice(0, 3));
  const anyEdit = ex.edited.character || ex.edited.meaning || ex.edited.words;

  const save = async () => {
    const b = ex.bundled;
    const cleanWords = words.map((w) => ({ word: w.word.trim(), pinyin: w.pinyin.trim(), meaning: w.meaning.trim() })).filter((w) => w.word);
    const patch = {
      character: character.trim() !== (b?.character ?? '') ? character.trim() : undefined,
      meaning: meaning.trim() !== (b?.meaning ?? '') ? meaning.trim() : undefined,
      words: JSON.stringify(cleanWords) !== JSON.stringify(b?.words ?? []) ? cleanWords : undefined,
    };
    if (patch.character === undefined && patch.meaning === undefined && patch.words === undefined) clearOverride(cell);
    else {
      // Replace the whole override so a field set back to the original is dropped.
      clearOverride(cell);
      await saveOverride(cell, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
    }
    onDone();
  };

  const setWord = (i: number, field: keyof ExampleWord, value: string) =>
    setWords((ws) => ws.map((w, j) => (j === i ? { ...w, [field]: value } : w)));

  return (
    <form
      class="edit-grid"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label class="row">
        <span class="label">Character</span>
        <input class="field han-input" value={character} maxLength={4} onInput={(e) => setCharacter((e.target as HTMLInputElement).value)} />
      </label>
      <label class="row">
        <span class="label">Meaning</span>
        <input class="field" value={meaning} maxLength={120} onInput={(e) => setMeaning((e.target as HTMLInputElement).value)} />
      </label>
      <span class="label">Example words: word, pinyin, meaning</span>
      {words.map((w, i) => (
        <div class="row3" key={i}>
          <input class="field han-input" aria-label={`Word ${i + 1}`} value={w.word} onInput={(e) => setWord(i, 'word', (e.target as HTMLInputElement).value)} />
          <input class="field" aria-label={`Word ${i + 1} pinyin`} value={w.pinyin} autocapitalize="off" onInput={(e) => setWord(i, 'pinyin', (e.target as HTMLInputElement).value)} />
          <input class="field" aria-label={`Word ${i + 1} meaning`} value={w.meaning} onInput={(e) => setWord(i, 'meaning', (e.target as HTMLInputElement).value)} />
        </div>
      ))}
      <div class="actions">
        <button type="submit" class="btn primary">
          Save
        </button>
        <button type="button" class="btn" onClick={onDone}>
          Cancel
        </button>
        {anyEdit && (
          <button
            type="button"
            class="btn quiet"
            onClick={() => {
              clearOverride(cell);
              onDone();
            }}
          >
            <Reset size={15} aria-hidden="true" />
            Restore original
          </button>
        )}
      </div>
      <p class="hint small">Your edits are saved on this device and included in your backups.</p>
    </form>
  );
}

// ───────────────────────── the tone view ─────────────────────────

const STATUS_OPTIONS: { value: LearnStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'shaky', label: 'Shaky' },
  { value: 'solid', label: 'Solid' },
];

/** The tone panel: example, status, native and own recordings, and the note. */
export function ToneView({ syl, cell }: { syl: Syllable; cell: ToneCell }) {
  const id = cell.numeric;
  const ex = resolveExample(id, overrides.value);
  const s = settings.value;
  const hasAudio = hasNativeAudio(id);
  // An outbound link only: the example character (the user's own if edited), else a search for the pinyin.
  const forvo = forvoLink(ex.character, cell.display);
  const takes = recordingsByCell.value[id] ?? [];
  const status = statuses.value[id] ?? 'new';

  const [editing, setEditing] = useState(false);
  const [takeId, setTakeId] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const active = useRef<ActiveRecording | null>(null);
  const take = takes.find((t) => t.id === takeId) ?? preferredTake(id);

  const native = useAsync(() => (hasAudio ? analyseNative(id) : null), `${id}|${online.value}`);
  const mineAnalysis = useAsync(() => (take && s.showPitch ? analyseTake(take) : null), `${take?.id ?? ''}|${s.showPitch}`);

  // Leaving the tone stops anything in progress.
  useEffect(
    () => () => {
      active.current?.cancel();
      stopPlayback();
    },
    [],
  );

  const playing = nowPlaying.value;
  const nativePlaying = playing === `native:${id}`;
  const minePlaying = !!take && playing === `take:${take.id}`;
  const recording = recState.value.active;
  const unavailable = recordingUnavailableReason();

  const compare = () => {
    if (playing) return stopPlayback();
    const items = [hasAudio ? nativeItem(id) : null, take ? takeItem(take) : null].filter((x): x is PlayItem => !!x);
    void play(s.mineFirst ? items.reverse() : items, { rate: s.rate, loop: s.loop });
  };

  const toggleRecord = async () => {
    if (active.current) {
      active.current.stop();
      return;
    }
    unlockAudio();
    stopPlayback();
    setRecError(null);
    try {
      const rec = await startRecording();
      active.current = rec;
      const result = await rec.result;
      active.current = null;
      if (!result) return;
      if (result.durationMs < 300) {
        setRecError('That recording was too short to keep.');
        return;
      }
      const data = await result.blob.arrayBuffer();
      const decoded = await decode(result.blob);
      let durationMs = result.durationMs;
      let trimStart = 0;
      let trimEnd = durationMs / 1000;
      let peaks = resamplePeaks(result.livePeaks);
      if (decoded) {
        durationMs = decoded.duration * 1000;
        ({ start: trimStart, end: trimEnd } = speechBounds(decoded));
        peaks = peaksOf(decoded, 72, trimStart, trimEnd);
      }
      const numbers = takes.map((t) => Number(/^(?:Take|Recording) (\d+)$/.exec(t.name)?.[1] ?? 0));
      const now = Date.now();
      const meta: RecordingMeta = {
        id: uid(),
        cell: id,
        name: `Recording ${Math.max(0, ...numbers) + 1}`,
        createdAt: now,
        updatedAt: now,
        mimeType: result.mimeType,
        durationMs: Math.round(durationMs),
        bytes: data.byteLength,
        best: false,
        peaks,
        trimStart: Math.round(trimStart * 1000) / 1000,
        trimEnd: Math.round(trimEnd * 1000) / 1000,
      };
      if (await addRecording(meta, data)) setTakeId(meta.id);
    } catch (err) {
      active.current = null;
      setRecError((err as Error).message);
    }
  };

  const elapsed = recState.value.elapsedMs;

  return (
    <div role="tabpanel" aria-label={`${cell.display}, ${TONE_NAMES[cell.tone]}`}>
      <section class="d-section">
        <div class="d-sec-head">
          <h3>Example</h3>
          {!editing && (
            <button type="button" class="btn quiet" onClick={() => setEditing(true)}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <ExampleEditor cell={id} onDone={() => setEditing(false)} />
        ) : (
          <>
            <div class="example">
              <div class={`big${ex.character ? '' : ' blank'}`} lang="zh-Hans">
                {ex.character || '—'}
              </div>
              <div class="reading">
                <span class="py" data-tone={cell.tone}>
                  {showTone(cell)}
                </span>
                <span class="tone-name">{TONE_NAMES[cell.tone]}</span>
              </div>
              <button
                type="button"
                class="play-native"
                disabled={!hasAudio}
                aria-label={hasAudio ? (nativePlaying ? 'Stop' : `Play the native recording of ${cell.display}`) : 'No recording'}
                onClick={() => (nativePlaying ? stopPlayback() : void play([nativeItem(id)], { rate: s.rate }))}
              >
                {nativePlaying ? <Stop size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
              </button>
              <div class="meaning">
                {ex.meaning || (ex.character ? '' : <span class="hint">No common character has this exact syllable and tone.</span>)}
                {ex.bundled?.fallbackWord && !ex.edited.character && (
                  <span class="in-word">
                    Not a word alone. As in <span class="han">{ex.bundled.fallbackWord.word}</span>{' '}
                    <span class="py">{ex.bundled.fallbackWord.pinyin}</span>
                  </span>
                )}
              </div>
              <div class="flags">
                {(ex.edited.character || ex.edited.meaning || ex.edited.words) && <span class="tag">edited by you</span>}
                {cell.status === 'single-source' && (
                  <span class="tag" title="Rarely used in everyday Mandarin">
                    Rare
                  </span>
                )}
              </div>
            </div>
            {playError.value && (
              <p class="error-text" role="alert" style="margin-top:8px">
                {playError.value}
              </p>
            )}
            <p class="forvo">
              <a
                class="ext-link"
                href={forvo.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Hear ${forvo.term} on Forvo. Opens forvo.com, an external site, in a new tab`}
              >
                Hear it on Forvo
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              <span class="hint small">
                {forvo.kind === 'word' ? (
                  <>
                    Human recordings of <span class="han" lang="zh-Hans">{forvo.term}</span> on forvo.com. Needs a connection.
                  </>
                ) : (
                  <>
                    Searches forvo.com for <span class="py">{forvo.term}</span>. Needs a connection.
                  </>
                )}
              </span>
            </p>
            {ex.words.length > 0 && (
              <ul class="words" lang="zh-Hans">
                {ex.words.map((w) => (
                  <li key={w.word}>
                    <span class="han">{w.word}</span>
                    <span class="w-main">
                      <span class="w-py" lang="zh-Latn">
                        {w.pinyin}
                      </span>
                    </span>
                    <span class="w-gloss" lang="en">
                      {w.meaning}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section class="d-section">
        <div class="d-sec-head">
          <h3 id={`st-${id}`}>How well I know it</h3>
          <div class="seg" role="radiogroup" aria-labelledby={`st-${id}`}>
            {STATUS_OPTIONS.map((o) => (
              <button type="button" role="radio" aria-checked={status === o.value} onClick={() => setStatus(id, o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section class="d-section">
        <div class="d-sec-head">
          <h3>Compare</h3>
          <button
            type="button"
            class={`icon-btn${s.showPitch ? ' on' : ''}`}
            aria-label="Show pitch contours"
            aria-pressed={s.showPitch}
            title="Pitch contours"
            onClick={() => setSetting('showPitch', !s.showPitch)}
          >
            <PitchIcon size={17} aria-hidden="true" />
          </button>
        </div>
        <div class="lanes">
          <div class={`lane${nativePlaying ? ' playing' : ''}`}>
            <button
              type="button"
              class="icon-btn"
              disabled={!hasAudio}
              aria-label={nativePlaying ? 'Stop the native recording' : 'Play the native recording'}
              onClick={() => (nativePlaying ? stopPlayback() : void play([nativeItem(id)], { rate: s.rate }))}
            >
              {nativePlaying ? <Stop size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
            <span class="who">Native</span>
            {!hasAudio ? (
              <span class="none">No recording</span>
            ) : native ? (
              <Wave peaks={native.peaks} />
            ) : (
              <span class="none">{native === null && !online.value ? 'Not downloaded yet' : ''}</span>
            )}
          </div>
          <div class={`lane${minePlaying ? ' playing' : ''}`}>
            <button
              type="button"
              class="icon-btn"
              disabled={!take}
              aria-label={minePlaying ? 'Stop my recording' : take ? `Play ${take.name}` : 'No recording yet'}
              onClick={() => take && (minePlaying ? stopPlayback() : void play([takeItem(take)], { rate: s.rate }))}
            >
              {minePlaying ? <Stop size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            </button>
            <span class="who">Mine</span>
            {take ? <Wave peaks={take.peaks.length ? take.peaks : [0]} /> : <span class="none">Record yourself to compare</span>}
          </div>
          {s.showPitch && <PitchOverlay reference={native?.pitch} mine={take ? mineAnalysis : undefined} hasTake={!!take} />}
        </div>

        <div class="compare-controls">
          <button type="button" class="btn primary" disabled={!hasAudio && !take} onClick={compare}>
            {playing ? <Stop size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            {playing ? 'Stop' : s.mineFirst ? 'Mine, then native' : 'Native, then mine'}
          </button>
          <button
            type="button"
            class="icon-btn"
            aria-label={s.mineFirst ? 'Play native first' : 'Play mine first'}
            title="Swap the order"
            onClick={() => setSetting('mineFirst', !s.mineFirst)}
          >
            <Swap size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            class={`icon-btn${s.loop ? ' on' : ''}`}
            aria-label="Loop"
            aria-pressed={s.loop}
            title="Loop"
            onClick={() => setSetting('loop', !s.loop)}
          >
            <Loop size={17} aria-hidden="true" />
          </button>
          <span class="spacer" />
          <div class="seg" role="radiogroup" aria-label="Playback speed">
            {([0.75, 1] as const).map((r) => (
              <button type="button" role="radio" aria-checked={s.rate === r} onClick={() => setSetting('rate', r)}>
                {r === 1 ? '1×' : '0.75×'}
              </button>
            ))}
          </div>
        </div>

        <div class="rec-row">
          <button
            type="button"
            class={`btn rec-btn${recording ? ' live' : ''}`}
            disabled={!!unavailable}
            aria-pressed={recording}
            onClick={() => void toggleRecord()}
          >
            {recording ? <Stop size={15} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
            {recording ? 'Stop' : 'Record'}
          </button>
          {recording ? (
            <>
              <div class="meter" aria-hidden="true">
                <i style={{ transform: `scaleX(${Math.min(1, recState.value.level * 1.6).toFixed(3)})` }} />
              </div>
              <span class="rec-time" role="timer" aria-live="off">
                {seconds(elapsed)} / {MAX_RECORDING_MS / 1000} s
              </span>
            </>
          ) : (
            <span class="hint small">Up to {MAX_RECORDING_MS / 1000} seconds. Silence at either end is skipped on playback.</span>
          )}
        </div>
        {(unavailable || recError) && (
          <p class="error-text" role="alert" style="margin-top:8px">
            {unavailable ?? recError}
          </p>
        )}

        {takes.length > 0 && (
          <ul class="takes" aria-label="My recordings">
            {takes.map((t) => (
              <TakeRow key={t.id} take={t} current={t.id === take?.id} onSelect={() => setTakeId(t.id)} />
            ))}
          </ul>
        )}
      </section>

      <section class="d-section">
        <h3>Note on this tone</h3>
        <NoteField
          key={id}
          label={`${cell.display} (${syl.id}, ${TONE_NAMES[cell.tone]})`}
          hideLabel
          rows={2}
          placeholder={`Anything particular to ${cell.display}`}
          initial={toneNotes.value[id]?.note ?? ''}
          onSave={(text) => saveToneNote(id, text)}
        />
      </section>
    </div>
  );
}

