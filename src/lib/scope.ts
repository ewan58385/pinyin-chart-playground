/**
 * The tone cells a practice session or a status summary covers, for a scope:
 * a learning stage, a final group, an initial group, a category, one
 * syllable, or everything marked shaky. Pure, so it can be tested.
 */
import { SYLLABLES, SYLLABLE_BY_ID, syllableAt, type Syllable, type ToneCell } from '../data';
import { blockFor } from '../data/blocks';
import { CATEGORY_BY_ID, categorySyllables } from '../data/categories';
import { FINALS } from '../data/finals';
import { INITIALS } from '../data/initials';
import { STAGE_BY_ID, stageCells } from '../data/learn';
import type { Scope } from './routes';

export interface ScopeCell {
  syllable: Syllable;
  cell: ToneCell;
}

const visibleCells = (s: Syllable, showUnverified: boolean): ScopeCell[] =>
  showUnverified || s.status === 'standard' ? s.tones.filter((t) => showUnverified || t.status !== 'single-source').map((cell) => ({ syllable: s, cell })) : [];

/** The syllables of a final group or an initial group, in the order its page lists them. */
export function blockSyllables(kind: 'finals' | 'initials', id: string): Syllable[] {
  const block = blockFor(kind, id);
  if (!block) return [];
  const pairs = kind === 'finals' ? block.members.flatMap((f) => INITIALS.map((i) => syllableAt(i.id, f))) : block.members.flatMap((i) => FINALS.map((f) => syllableAt(i, f.id)));
  return pairs.filter((s): s is Syllable => !!s);
}

export function scopeCells(scope: Scope, statuses: Record<string, string | undefined> = {}, showUnverified = false): ScopeCell[] {
  switch (scope.kind) {
    case 'stage':
      return STAGE_BY_ID[scope.id] ? stageCells(STAGE_BY_ID[scope.id], showUnverified) : [];
    case 'finals':
    case 'initials':
      return blockSyllables(scope.kind, scope.id).flatMap((s) => visibleCells(s, showUnverified));
    case 'category':
      return CATEGORY_BY_ID[scope.id] ? categorySyllables(CATEGORY_BY_ID[scope.id], showUnverified).flatMap((s) => visibleCells(s, showUnverified)) : [];
    case 'syllable':
      return SYLLABLE_BY_ID[scope.id] ? visibleCells(SYLLABLE_BY_ID[scope.id], true) : [];
    case 'shaky':
      return SYLLABLES.flatMap((s) => visibleCells(s, true)).filter((c) => statuses[c.cell.numeric] === 'shaky');
  }
}

/** Where a session starts: the first cell not yet solid, else the first cell. */
export function startIndex(cells: ScopeCell[], statuses: Record<string, string | undefined>): number {
  const i = cells.findIndex((c) => statuses[c.cell.numeric] !== 'solid');
  return i < 0 ? 0 : i;
}
