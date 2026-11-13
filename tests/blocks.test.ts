import { describe, expect, it } from 'vitest';
import { BLOCKS, FINAL_BLOCKS, INITIAL_BLOCKS, blockFor, blockHash } from '../src/data/blocks';
import { FINALS } from '../src/data/finals';
import { INITIALS } from '../src/data/initials';
import { crumbsFor, hasPanel, hashFor, parseHash } from '../src/lib/routes';

describe('blocks', () => {
  it('six final blocks cover the 36 finals once, seven initial blocks cover the 22 initials once', () => {
    expect(FINAL_BLOCKS.map((b) => b.id)).toEqual(['a', 'e', 'o', 'i', 'u', 'ü']);
    expect(FINAL_BLOCKS.flatMap((b) => b.members)).toEqual(FINALS.map((f) => f.id));
    expect(INITIAL_BLOCKS.map((b) => b.id)).toEqual(['null', 'labial', 'alveolar', 'sibilant', 'retroflex', 'palatal', 'velar']);
    expect(INITIAL_BLOCKS.flatMap((b) => b.members)).toEqual(INITIALS.map((i) => i.id));
    expect(INITIAL_BLOCKS.find((b) => b.id === 'retroflex')?.members).toEqual(['zh', 'ch', 'sh', 'r']);
  });
  it('links only to blocks that exist, never to itself', () => {
    for (const kind of ['finals', 'initials'] as const)
      for (const b of BLOCKS[kind])
        for (const c of b.confusable) {
          expect(blockFor(kind, c.id), `${b.id} → ${c.id}`).toBeDefined();
          expect(c.id).not.toBe(b.id);
        }
  });
  it('writes ü as v in hashes and reads both', () => {
    expect(blockHash(blockFor('finals', 'ü')!)).toBe('#/finals/v');
    expect(blockFor('finals', 'v')?.id).toBe('ü');
  });
});

describe('routes', () => {
  it('parses every kind of page and round-trips it', () => {
    expect(parseHash('#/finals')).toEqual({ page: 'finals', block: null, syllable: null, tone: null });
    expect(parseHash('#/initials')).toEqual({ page: 'initials', block: null, syllable: null, tone: null });
    expect(parseHash('#/finals/e')).toEqual({ page: 'finals', block: 'e', syllable: null, tone: null });
    expect(parseHash('#/initials/retroflex/zhe/1')).toEqual({ page: 'initials', block: 'retroflex', syllable: 'zhe', tone: 1 });
    expect(parseHash('#/finals/v/lü/4')).toEqual({ page: 'finals', block: 'ü', syllable: 'lü', tone: 4 });
    expect(parseHash('#/browse/nasal/ban/1')).toEqual({ page: 'browse', block: 'nasal', syllable: 'ban', tone: 1 });
    expect(parseHash('#/learn/compound/mai/2')).toEqual({ page: 'learn', block: 'compound', syllable: 'mai', tone: 2 });
    expect(parseHash('#/practice/stage/compound/mai/2')).toEqual({ page: 'practice', block: 'stage/compound', syllable: 'mai', tone: 2 });
    expect(parseHash('#/practice/finals/v')).toEqual({ page: 'practice', block: 'finals/ü', syllable: null, tone: null });
    expect(parseHash('#/practice/shaky/ma/1')).toEqual({ page: 'practice', block: 'shaky', syllable: 'ma', tone: 1 });
    for (const h of [
      '#/', '#/s/zhi', '#/s/zhi/1', '#/finals', '#/initials', '#/finals/e', '#/finals/v/l%C3%BC/4', '#/initials/palatal/ji/2',
      '#/browse', '#/browse/nasal', '#/browse/umlaut-u/ju/1', '#/learn', '#/learn/simple-easy', '#/learn/neutral/de/5',
      '#/practice', '#/practice/stage/nasal', '#/practice/finals/v', '#/practice/initials/retroflex/zhi/1', '#/practice/category/fake-i',
      '#/practice/syllable/zhi', '#/practice/shaky', '#/data', '#/settings', '#/about',
    ]) {
      const r = parseHash(h);
      expect(parseHash(hashFor(r)), h).toEqual(r);
    }
  });

  it('falls back sensibly on unknown hashes', () => {
    expect(parseHash('#/finals/zzz')).toEqual({ page: 'finals', block: null, syllable: null, tone: null });
    expect(parseHash('#/initials/retroflex/notasyllable')).toEqual({ page: 'initials', block: 'retroflex', syllable: null, tone: null });
    expect(parseHash('#/browse/nothing').block).toBeNull();
    expect(parseHash('#/learn/nothing').block).toBeNull();
    expect(parseHash('#/practice/stage/nothing').block).toBeNull();
    expect(parseHash('#/nowhere').page).toBe('chart');
    expect(parseHash('#/guide').page).toBe('chart');
    // The older practice link named a tone cell.
    expect(parseHash('#/practice/zhi1')).toEqual({ page: 'practice', block: 'syllable/zhi', syllable: null, tone: null });
    expect(parseHash('#/practice/nope9').block).toBeNull();
  });

  it('opens syllables in the panel only on pages that list syllables', () => {
    expect(hasPanel(parseHash('#/'))).toBe(true);
    expect(hasPanel(parseHash('#/finals'))).toBe(false);
    expect(hasPanel(parseHash('#/finals/e'))).toBe(true);
    expect(hasPanel(parseHash('#/browse/nasal'))).toBe(true);
    expect(hasPanel(parseHash('#/learn'))).toBe(false);
    expect(hasPanel(parseHash('#/learn/nasal'))).toBe(true);
    expect(hasPanel(parseHash('#/practice/stage/nasal'))).toBe(false);
  });
});

describe('breadcrumbs', () => {
  const trail = (h: string) => crumbsFor(parseHash(h)).map((c) => `${c.label}=${c.href}`);
  it('gives every segment a working link, ending at the page itself', () => {
    expect(trail('#/finals/e')).toEqual(['Chart=#/', 'Finals=#/finals', 'E group=#/finals/e']);
    expect(trail('#/finals/e/zhe/1')).toEqual(['Chart=#/', 'Finals=#/finals', 'E group=#/finals/e']);
    expect(trail('#/initials/retroflex')).toEqual(['Chart=#/', 'Initials=#/initials', 'Retroflex initials=#/initials/retroflex']);
    expect(trail('#/finals')).toEqual(['Chart=#/', 'Finals=#/finals']);
    expect(trail('#/browse/nasal')).toEqual(['Chart=#/', 'Browse=#/browse', 'Nasal final=#/browse/nasal']);
    expect(trail('#/learn/compound')).toEqual(['Chart=#/', 'Learn=#/learn', 'Compound finals=#/learn/compound']);
    expect(trail('#/practice/stage/compound/mai/2')).toEqual(['Chart=#/', 'Practice=#/practice', 'Compound finals=#/practice/stage/compound']);
    expect(trail('#/practice/shaky')).toEqual(['Chart=#/', 'Practice=#/practice', 'My shaky syllables=#/practice/shaky']);
    expect(trail('#/')).toEqual(['Chart=#/']);
    // Every href parses back to a real page of the same kind.
    for (const h of ['#/finals/v', '#/browse/umlaut-u', '#/learn/neutral', '#/practice/finals/v'])
      for (const c of crumbsFor(parseHash(h))) expect(hashFor(parseHash(c.href))).toBe(c.href);
  });
});
