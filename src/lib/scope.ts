/**
 * The tone cells a status summary or progress bar covers, for a scope: a
 * learning stage, a final group, an initial group or a category. Pure, so it
 * can be tested.
 */
import { syllableAt, type Syllable, type ToneCell } from '../data';
import { blockFor } from '../data/blocks';
import { CATEGORY_BY_ID, categorySyllables } from '../data/categories';
import { FINALS } from '../data/finals';
import { INITIALS } from '../data/initials';
import { STAGE_BY_ID, stageCells } from '../data/learn';

export type ScopeKind = 'stage' | 'finals' | 'initials' | 'category';
export interface Scope {
  kind: ScopeKind;
  id: string;
}

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

export function scopeCells(scope: Scope, showUnverified = false): ScopeCell[] {
  switch (scope.kind) {
    case 'stage':
      return STAGE_BY_ID[scope.id] ? stageCells(STAGE_BY_ID[scope.id], showUnverified) : [];
    case 'finals':
    case 'initials':
      return blockSyllables(scope.kind, scope.id).flatMap((s) => visibleCells(s, showUnverified));
    case 'category':
      return CATEGORY_BY_ID[scope.id] ? categorySyllables(CATEGORY_BY_ID[scope.id], showUnverified).flatMap((s) => visibleCells(s, showUnverified)) : [];
  }
}
