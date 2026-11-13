import { describe, expect, it } from 'vitest';
import { blockSyllables, scopeCells, startIndex } from '../src/lib/scope';
import { parseScope, practiceHash, scopeLabel, scopeText } from '../src/lib/routes';
import { stageCells, STAGE_BY_ID } from '../src/data/learn';

describe('practice scopes', () => {
  it('parses and names every kind of scope', () => {
    expect(parseScope('stage/compound')).toEqual({ kind: 'stage', id: 'compound' });
    expect(parseScope('finals/v')).toEqual({ kind: 'finals', id: 'ü' });
    expect(parseScope('initials/retroflex')).toEqual({ kind: 'initials', id: 'retroflex' });
    expect(parseScope('category/fake-i')).toEqual({ kind: 'category', id: 'fake-i' });
    expect(parseScope('syllable/zhi')).toEqual({ kind: 'syllable', id: 'zhi' });
    expect(parseScope('shaky')).toEqual({ kind: 'shaky', id: '' });
    expect(parseScope('stage/nope')).toBeNull();
    expect(parseScope(null)).toBeNull();
    expect(scopeText({ kind: 'shaky', id: '' })).toBe('shaky');
    expect(scopeLabel({ kind: 'initials', id: 'retroflex' })).toBe('Retroflex initials');
    expect(practiceHash({ kind: 'finals', id: 'ü' })).toBe('#/practice/finals/v');
    expect(practiceHash({ kind: 'stage', id: 'nasal' })).toBe('#/practice/stage/nasal');
  });

  it('lists the cells of each scope from the data', () => {
    expect(scopeCells({ kind: 'stage', id: 'nasal' }).length).toBe(stageCells(STAGE_BY_ID.nasal).length);
    const retro = scopeCells({ kind: 'initials', id: 'retroflex' });
    expect(new Set(retro.map((c) => c.syllable.initial))).toEqual(new Set(['zh', 'ch', 'sh', 'r']));
    const e = scopeCells({ kind: 'finals', id: 'e' });
    expect(new Set(e.map((c) => c.syllable.final))).toEqual(new Set(['e', 'ei', 'en', 'eng', 'er']));
    expect(blockSyllables('finals', 'o').map((s) => s.id).slice(0, 3)).toEqual(['o', 'bo', 'po']);
    expect(scopeCells({ kind: 'syllable', id: 'ma' }).map((c) => c.cell.numeric)).toEqual(['ma1', 'ma2', 'ma3', 'ma4', 'ma5']);
    expect(scopeCells({ kind: 'category', id: 'fake-i' }).every((c) => c.syllable.tags.includes('fake-i'))).toBe(true);
    // No hidden single-source cells unless asked for.
    expect(retro.every((c) => c.cell.status !== 'single-source')).toBe(true);
  });

  it('builds "my shaky syllables" from the statuses and starts at the first cell not yet solid', () => {
    const statuses = { ma1: 'shaky', zhi4: 'shaky', ba1: 'solid' };
    expect(scopeCells({ kind: 'shaky', id: '' }, statuses).map((c) => c.cell.numeric)).toEqual(['ma1', 'zhi4']);
    expect(scopeCells({ kind: 'shaky', id: '' }, {})).toEqual([]);
    const ma = scopeCells({ kind: 'syllable', id: 'ma' });
    expect(startIndex(ma, { ma1: 'solid', ma2: 'solid' })).toBe(2);
    expect(startIndex(ma, { ma1: 'solid', ma2: 'solid', ma3: 'solid', ma4: 'solid', ma5: 'solid' })).toBe(0);
  });
});
