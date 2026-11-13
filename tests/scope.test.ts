import { describe, expect, it } from 'vitest';
import { blockSyllables, scopeCells } from '../src/lib/scope';
import { stageCells, STAGE_BY_ID } from '../src/data/learn';

describe('scopes for summaries and progress bars', () => {
  it('lists the cells of each scope from the data', () => {
    expect(scopeCells({ kind: 'stage', id: 'nasal' }).length).toBe(stageCells(STAGE_BY_ID.nasal).length);
    const retro = scopeCells({ kind: 'initials', id: 'retroflex' });
    expect(new Set(retro.map((c) => c.syllable.initial))).toEqual(new Set(['zh', 'ch', 'sh', 'r']));
    const e = scopeCells({ kind: 'finals', id: 'e' });
    expect(new Set(e.map((c) => c.syllable.final))).toEqual(new Set(['e', 'ei', 'en', 'eng', 'er']));
    expect(blockSyllables('finals', 'o').map((s) => s.id).slice(0, 3)).toEqual(['o', 'bo', 'po']);
    expect(scopeCells({ kind: 'category', id: 'fake-i' }).every((c) => c.syllable.tags.includes('fake-i'))).toBe(true);
    // No hidden single-source cells unless asked for.
    expect(retro.every((c) => c.cell.status !== 'single-source')).toBe(true);
    expect(scopeCells({ kind: 'stage', id: 'nope' })).toEqual([]);
  });
});
