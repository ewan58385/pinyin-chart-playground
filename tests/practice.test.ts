import { describe, expect, it } from 'vitest';
import { decayedErrors, weightOf, weightedPick, shuffle, ERROR_HALF_LIFE_MS } from '../src/practice/weights';
import { buildPairs, PAIR_KINDS } from '../src/practice/pairs';
import { hasNativeAudio } from '../src/data';

describe('weak-spot weighting', () => {
  const now = 1_000_000_000_000;
  it('weights shaky cells and recent errors more, and lets errors fade', () => {
    const fresh = { cell: 'ma1', right: 0, wrong: 2, lastWrongAt: now, updatedAt: now };
    const old = { ...fresh, lastWrongAt: now - 4 * ERROR_HALF_LIFE_MS };
    expect(weightOf(undefined, undefined, now)).toBe(1);
    expect(weightOf('shaky', undefined, now)).toBeGreaterThan(weightOf(undefined, undefined, now));
    expect(weightOf(undefined, fresh, now)).toBeGreaterThan(weightOf(undefined, old, now));
    expect(decayedErrors(fresh, now)).toBe(2);
    expect(decayedErrors(old, now)).toBeCloseTo(2 / 16, 5);
    expect(weightOf('solid', { cell: 'ma1', right: 5, wrong: 0, lastWrongAt: 0, updatedAt: now }, now)).toBeLessThan(1);
  });
  it('picks in proportion to weight and shuffles without losing items', () => {
    const items: ('a' | 'b')[] = ['a', 'b'];
    const counts: Record<'a' | 'b', number> = { a: 0, b: 0 };
    let seed = 1;
    const random = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 2000; i++) counts[weightedPick(items, (x) => (x === 'a' ? 3 : 1), random)]++;
    expect(counts.a / counts.b).toBeGreaterThan(2);
    expect(counts.a / counts.b).toBeLessThan(4);
    expect(shuffle([1, 2, 3, 4, 5], random).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('minimal pairs from the data', () => {
  const pairs = buildPairs();
  it('has pairs of every kind, with audio on both sides and a shared tone where the contrast is not the tone', () => {
    for (const k of PAIR_KINDS) expect(pairs.filter((p) => p.kind === k.id).length, k.id).toBeGreaterThan(20);
    for (const p of pairs) {
      expect(hasNativeAudio(p.a.cell.numeric)).toBe(true);
      expect(hasNativeAudio(p.b.cell.numeric)).toBe(true);
      if (p.kind !== 'tone') expect(p.a.cell.tone).toBe(p.b.cell.tone);
      else expect(p.a.syllable.id).toBe(p.b.syllable.id);
    }
  });
  it('contains the classic contrasts', () => {
    const has = (a: string, b: string) => pairs.some((p) => [p.a.cell.numeric, p.b.cell.numeric].sort().join() === [a, b].sort().join());
    expect(has('zhi1', 'ji1')).toBe(true);
    expect(has('zhi1', 'zi1')).toBe(true);
    expect(has('ba1', 'pa1')).toBe(true);
    expect(has('xin1', 'xing1')).toBe(true);
    expect(has('lu4', 'lü4')).toBe(true);
    expect(has('ma1', 'ma3')).toBe(true);
    expect(new Set(pairs.map((p) => [p.a.cell.numeric, p.b.cell.numeric].sort().join('|'))).size).toBe(pairs.length);
  });
});
