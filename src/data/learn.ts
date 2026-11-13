/**
 * The learning path: an ordered set of stages from the sounds the data
 * labels simplest to the ones it labels hardest. Every stage is defined by
 * labels already in the data (the type of a final, the difficulty group of
 * an initial, the tags on a syllable); no stage rests on a claim that is not
 * there. Progress comes from the user's own new / shaky / solid statuses, so
 * the path stores nothing of its own.
 */
import { SYLLABLES, type Syllable, type ToneCell } from './index';
import { INITIAL_BY_ID } from './initials';

export interface Stage {
  id: string;
  title: string;
  /** What is in it. */
  covers: string;
  /** Why it comes where it does. */
  why: string;
  /** A review stage gathers cells that already belong to an earlier stage. */
  review?: boolean;
  /** Which tones of a matching syllable belong to the stage. */
  tones: 'full' | 'neutral';
  match: (s: Syllable) => boolean;
}

const difficulty = (s: Syllable) => INITIAL_BY_ID[s.initial].difficulty;
const has = (s: Syllable, tag: string) => s.tags.includes(tag);
/** No initial, or one the data labels easy or tougher. */
const plainInitial = (s: Syllable) => difficulty(s) !== 'problem' && !has(s, 'fake-i');

export const STAGES: Stage[] = [
  {
    id: 'simple-easy',
    title: 'Simple finals, easy initials',
    covers: 'The single-vowel finals on their own and after the initials in the “easy” group.',
    why: 'Both halves carry the lightest labels in the data: finals typed “simple”, and initials labelled “easy: close to English” or no initial at all. The syllables where the letter i is not the i of yi (the “fake i” tag) are held back for the stage on z, c and s.',
    tones: 'full',
    match: (s) => has(s, 'simple') && !has(s, 'fake-i') && (difficulty(s) === null || difficulty(s) === 'easy'),
  },
  {
    id: 'simple-tougher',
    title: 'Simple finals, tougher initials',
    covers: 'The same single-vowel finals after the initials in the “tougher” group.',
    why: 'Only the initial is new. The data labels these initials “tougher: aspiration, voicing, h”; most come in unaspirated and aspirated pairs, which the minimal-pair trainer drills.',
    tones: 'full',
    match: (s) => has(s, 'simple') && difficulty(s) === 'tougher',
  },
  {
    id: 'compound',
    title: 'Compound finals',
    covers: 'Finals typed “compound”, with no initial or an easy or tougher one.',
    why: 'The finals table types these “compound”: more than one vowel sound. They follow the single vowels and keep to initials already met. Some hide a vowel in their spelling (the “hidden vowel” tag).',
    tones: 'full',
    match: (s) => has(s, 'compound') && plainInitial(s),
  },
  {
    id: 'nasal',
    title: 'Nasal finals',
    covers: 'Finals ending in -n or -ng, with no initial or an easy or tougher one.',
    why: 'The finals table types these “nasal”, tagged front (-n) or back (-ng). They come after the vowel finals so that only the ending is new; in / ing and en / eng are among the confusable pairs the data lists.',
    tones: 'full',
    match: (s) => has(s, 'nasal') && plainInitial(s),
  },
  {
    id: 'palatal',
    title: 'j, q, x',
    covers: 'Every syllable with a palatal initial.',
    why: 'The first of the three initial groups the data labels “problem: tongue position”. These initials only take i- and ü- finals, and ü is written u after them (the “ü written u” tag).',
    tones: 'full',
    match: (s) => has(s, 'palatal'),
  },
  {
    id: 'retroflex',
    title: 'zh, ch, sh, r',
    covers: 'Every syllable with a retroflex initial.',
    why: 'The second “problem” group. The data links each of zh, ch, sh to a palatal and a dental partner as confusable, so it helps to have j, q, x in place first. zhi, chi, shi and ri carry the “fake i” tag.',
    tones: 'full',
    match: (s) => has(s, 'retroflex'),
  },
  {
    id: 'dental',
    title: 'z, c, and the fake i of s',
    covers: 'Every syllable with z or c, and si.',
    why: 'The third “problem” group, the dental partners of zh, ch, sh. The data labels s “easy” (flagged as a judgement call), so its other syllables appeared in earlier stages; only si, which carries the “fake i” tag, waits until here.',
    tones: 'full',
    match: (s) => (has(s, 'dental-sibilant') && difficulty(s) === 'problem') || (has(s, 'fake-i') && has(s, 'dental-sibilant')),
  },
  {
    id: 'spelling',
    title: 'Review: spelling that hides the sound',
    covers: 'Syllables tagged hidden vowel, ü written u, o said as uo, y / w spelling or fake i.',
    why: 'A review stage: every syllable here already belongs to a stage above. They are gathered because the data tags their spelling as differing from what is said.',
    review: true,
    tones: 'full',
    match: (s) => ['hidden-vowel', 'ü-as-u', 'o-as-uo', 'spelling-variant', 'fake-i'].some((t) => has(s, t)),
  },
  {
    id: 'neutral',
    title: 'Neutral tones',
    covers: 'The neutral-tone cell of every syllable that has one.',
    why: 'Last because the sound pack has no neutral-tone recordings: these cells can only be studied through their example words and your own recordings.',
    tones: 'neutral',
    match: () => true,
  },
];

export const STAGE_BY_ID: Record<string, Stage> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export interface StageCell {
  syllable: Syllable;
  cell: ToneCell;
}

/** The tone cells of a stage, in chart order. */
export function stageCells(stage: Stage, showUnverified = false): StageCell[] {
  const out: StageCell[] = [];
  for (const s of SYLLABLES) {
    if (!showUnverified && s.status !== 'standard') continue;
    if (!stage.match(s)) continue;
    for (const cell of s.tones) {
      if (!showUnverified && cell.status === 'single-source') continue;
      if ((stage.tones === 'neutral') !== (cell.tone === 5)) continue;
      out.push({ syllable: s, cell });
    }
  }
  return out;
}

/** The syllables of a stage (those with at least one cell in it). */
export function stageSyllables(stage: Stage, showUnverified = false): Syllable[] {
  return [...new Set(stageCells(stage, showUnverified).map((c) => c.syllable))];
}

/** The first non-review stage a full-tone syllable belongs to. */
export function stageOfSyllable(s: Syllable): Stage | undefined {
  return STAGES.find((st) => !st.review && st.tones === 'full' && st.match(s));
}

export type Status = 'new' | 'shaky' | 'solid';
export interface Progress {
  cells: number;
  solid: number;
  shaky: number;
  fresh: number;
  /** Share of cells marked solid, 0–1. */
  done: number;
  mostlySolid: boolean;
}

/** A stage counts as learned when this share of its cells is solid. */
export const MOSTLY_SOLID = 0.8;

export function progressOf(cells: { cell: { numeric: string } }[], statuses: Record<string, Status | undefined>): Progress {
  let solid = 0;
  let shaky = 0;
  for (const c of cells) {
    const st = statuses[c.cell.numeric];
    if (st === 'solid') solid++;
    else if (st === 'shaky') shaky++;
  }
  const n = cells.length;
  const done = n ? solid / n : 0;
  return { cells: n, solid, shaky, fresh: n - solid - shaky, done, mostlySolid: n > 0 && done >= MOSTLY_SOLID };
}

/** The recommended next stage: the first one, review stages aside, that is not yet mostly solid. Null when all are. */
export function nextStage(statuses: Record<string, Status | undefined>, showUnverified = false): Stage | null {
  return STAGES.find((st) => !st.review && !progressOf(stageCells(st, showUnverified), statuses).mostlySolid) ?? null;
}

/**
 * The shaky cells most worth revisiting: every cell marked shaky, the ones
 * with the most recent practice errors first (errors fade with the weight
 * function passed in), then in chart order.
 */
export function shakiest(statuses: Record<string, Status | undefined>, errorWeight: (cell: string) => number, limit = 8): StageCell[] {
  const out: (StageCell & { w: number; i: number })[] = [];
  let i = 0;
  for (const s of SYLLABLES) for (const cell of s.tones) if (statuses[cell.numeric] === 'shaky') out.push({ syllable: s, cell, w: errorWeight(cell.numeric), i: i++ });
  return out.sort((a, b) => b.w - a.w || a.i - b.i).slice(0, limit).map(({ syllable, cell }) => ({ syllable, cell }));
}
