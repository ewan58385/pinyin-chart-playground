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
    covers: 'Single-vowel finals, on their own and after initials that sound close to English.',
    why: 'The easiest place to start: one vowel sound, and consonants English already has. The i in si is a different sound from the i in yi, so si waits for stage 7.',
    tones: 'full',
    match: (s) => has(s, 'simple') && !has(s, 'fake-i') && (difficulty(s) === null || difficulty(s) === 'easy'),
  },
  {
    id: 'simple-tougher',
    title: 'Simple finals, tougher initials',
    covers: 'The same single-vowel finals, after b, p, d, t, g, k and h.',
    why: 'Only the initial is new. Most of these come in pairs that differ by a puff of air: b and p, d and t, g and k.',
    tones: 'full',
    match: (s) => has(s, 'simple') && difficulty(s) === 'tougher',
  },
  {
    id: 'compound',
    title: 'Compound finals',
    covers: 'Finals with more than one vowel sound, after the initials you have already met.',
    why: 'They build on the single vowels, with no new initials. Some hide a vowel in their spelling: iu is short for iou, ui for uei and un for uen.',
    tones: 'full',
    match: (s) => has(s, 'compound') && plainInitial(s),
  },
  {
    id: 'nasal',
    title: 'Nasal finals',
    covers: 'Finals ending in -n or -ng, after the initials you have already met.',
    why: 'The vowels are familiar by now, so only the ending is new. Listen for the difference between in and ing, and between en and eng.',
    tones: 'full',
    match: (s) => has(s, 'nasal') && plainInitial(s),
  },
  {
    id: 'palatal',
    title: 'j, q, x',
    covers: 'Every syllable with j, q or x.',
    why: 'The first of three groups where the tongue position is new for English speakers. j, q and x only come before i and ü, and after them ü is written u.',
    tones: 'full',
    match: (s) => has(s, 'palatal'),
  },
  {
    id: 'retroflex',
    title: 'zh, ch, sh, r',
    covers: 'Every syllable with zh, ch, sh or r.',
    why: 'The second tricky group. zh, ch and sh are easily mixed up with j, q, x and with z, c, s, so it helps to know j, q and x first. In zhi, chi, shi and ri the i is not the i of yi.',
    tones: 'full',
    match: (s) => has(s, 'retroflex'),
  },
  {
    id: 'dental',
    title: 'z, c, and the i of si',
    covers: 'Every syllable with z or c, and the syllable si.',
    why: 'The third tricky group: the partners of zh, ch and sh. The other syllables with s came earlier; si waits until now because its i is the same unusual sound as in zi and ci.',
    tones: 'full',
    match: (s) => (has(s, 'dental-sibilant') && difficulty(s) === 'problem') || (has(s, 'fake-i') && has(s, 'dental-sibilant')),
  },
  {
    id: 'spelling',
    title: 'Review: spelling that hides the sound',
    covers: 'Syllables with a hidden vowel, ü written u, o said as uo, y and w spellings, and the i of zi and zhi.',
    why: 'A review of syllables from earlier stages. They are gathered here because their spelling does not tell the whole story.',
    review: true,
    tones: 'full',
    match: (s) => ['hidden-vowel', 'ü-as-u', 'o-as-uo', 'spelling-variant', 'fake-i'].some((t) => has(s, t)),
  },
  {
    id: 'neutral',
    title: 'Neutral tones',
    covers: 'The neutral tone of every syllable that has one.',
    why: 'Last, once the four full tones are familiar. A neutral tone is short and light, and its pitch depends on the tone before it, so listen for it inside the example words.',
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

/** Cells marked shaky, in chart order, up to a limit: the ones worth revisiting. */
export function shakiest(statuses: Record<string, Status | undefined>, limit = 8): StageCell[] {
  const out: StageCell[] = [];
  for (const s of SYLLABLES) for (const cell of s.tones) if (statuses[cell.numeric] === 'shaky' && out.length < limit) out.push({ syllable: s, cell });
  return out;
}
