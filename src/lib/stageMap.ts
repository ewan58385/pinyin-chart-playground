/**
 * The layout of a stage's chart picture, as pure data so it can be tested.
 *
 * Columns are always the chart's 36 finals in chart order, split into the six
 * groups, so a syllable sits in the same column as on the main chart. Rows are
 * the chart's initials in chart order; an initial block (∅, b p m f, d t n l,
 * …) that holds none of the stage's syllables is folded into one thin band
 * that still names its initials, so the rows that are shown keep their place.
 */
import { syllableAt, type Syllable } from '../data';
import { FINAL_GROUPS, FINALS, type Final } from '../data/finals';
import { INITIALS, type Initial } from '../data/initials';
import { stageSyllables, type Stage } from '../data/learn';

export type MapRow = { kind: 'row'; initial: Initial } | { kind: 'band'; block: string; initials: Initial[] };

export interface StageMap {
  rows: MapRow[];
  /** All 36 finals, in chart order. */
  columns: Final[];
  /** Index into `columns` where each final group starts. */
  groupStarts: number[];
  /** The stage's syllables, with their row (index into `rows`) and column. */
  cells: { syllable: Syllable; row: number; col: number }[];
  /** Other syllables on the rows shown, drawn faintly so the gaps of the chart stay visible. */
  others: { syllable: Syllable; row: number; col: number }[];
}

export function stageMap(stage: Stage, showUnverified = false): StageMap {
  const inStage = new Set(stageSyllables(stage, showUnverified).map((s) => s.id));
  const columns = FINALS;
  const groupStarts = FINAL_GROUPS.map((g) => FINALS.indexOf(g.finals[0]));

  // Initials grouped into their chart blocks, in row order.
  const blocks: { block: string; initials: Initial[] }[] = [];
  for (const i of INITIALS) {
    const last = blocks[blocks.length - 1];
    if (last && last.block === i.block) last.initials.push(i);
    else blocks.push({ block: i.block, initials: [i] });
  }
  const used = (i: Initial) => FINALS.some((f) => inStage.has(syllableAt(i.id, f.id)?.id ?? ''));

  const rows: MapRow[] = [];
  for (const b of blocks) {
    if (b.initials.some(used)) for (const initial of b.initials) rows.push({ kind: 'row', initial });
    else rows.push({ kind: 'band', block: b.block, initials: b.initials });
  }

  const cells: StageMap['cells'] = [];
  const others: StageMap['others'] = [];
  rows.forEach((r, row) => {
    if (r.kind !== 'row') return;
    columns.forEach((f, col) => {
      const s = syllableAt(r.initial.id, f.id);
      if (!s || (!showUnverified && s.status !== 'standard')) return;
      (inStage.has(s.id) ? cells : others).push({ syllable: s, row, col });
    });
  });
  return { rows, columns, groupStarts, cells, others };
}
