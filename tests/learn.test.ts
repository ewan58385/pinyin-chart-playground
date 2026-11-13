import { describe, expect, it } from 'vitest';
import { MOSTLY_SOLID, STAGES, STAGE_BY_ID, nextStage, progressOf, shakiest, stageCells, stageOfSyllable, stageSyllables, type Status } from '../src/data/learn';
import { CATEGORIES, CATEGORY_BY_ID, categorySyllables } from '../src/data/categories';
import { SYLLABLES, SYLLABLE_BY_ID } from '../src/data';
import { INITIAL_BY_ID } from '../src/data/initials';
import { FINAL_BY_ID } from '../src/data/finals';

const standard = SYLLABLES.filter((s) => s.status === 'standard');

describe('learning path stages', () => {
  it('has unique ids, a title, what it covers and why for every stage', () => {
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(STAGES.length);
    for (const s of STAGES) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.covers.length).toBeGreaterThan(20);
      expect(s.why.length).toBeGreaterThan(40);
      expect(stageCells(s).length, s.id).toBeGreaterThan(5);
    }
  });

  it('puts every standard syllable in exactly one main stage', () => {
    const main = STAGES.filter((s) => !s.review && s.tones === 'full');
    for (const s of standard) {
      const hits = main.filter((st) => st.match(s));
      expect(hits.map((h) => h.id), s.id).toHaveLength(1);
      expect(stageOfSyllable(s)?.id).toBe(hits[0].id);
    }
  });

  it('covers every visible tone cell once across the main and neutral stages', () => {
    const seen = new Map<string, number>();
    for (const st of STAGES.filter((s) => !s.review)) for (const c of stageCells(st)) seen.set(c.cell.numeric, (seen.get(c.cell.numeric) ?? 0) + 1);
    const visible = standard.flatMap((s) => s.tones.filter((t) => t.status !== 'single-source'));
    expect(seen.size).toBe(visible.length);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
    expect(stageCells(STAGE_BY_ID.neutral).every((c) => c.cell.tone === 5)).toBe(true);
    expect(stageCells(STAGE_BY_ID.compound).every((c) => c.cell.tone !== 5)).toBe(true);
  });

  it('orders the stages from the easy labels to the problem labels', () => {
    const order = STAGES.map((s) => s.id);
    expect(order.indexOf('simple-easy')).toBe(0);
    expect(order.indexOf('simple-tougher')).toBeLessThan(order.indexOf('palatal'));
    expect(order.indexOf('nasal')).toBeLessThan(order.indexOf('palatal'));
    expect(order[order.length - 1]).toBe('neutral');
    // Membership follows the data: ma is easy + simple, bang is tougher + nasal, zhi and si wait for their own stages.
    expect(stageOfSyllable(SYLLABLE_BY_ID.ma)?.id).toBe('simple-easy');
    expect(stageOfSyllable(SYLLABLE_BY_ID.ba)?.id).toBe('simple-tougher');
    expect(stageOfSyllable(SYLLABLE_BY_ID.bang)?.id).toBe('nasal');
    expect(stageOfSyllable(SYLLABLE_BY_ID.mai)?.id).toBe('compound');
    expect(stageOfSyllable(SYLLABLE_BY_ID.ju)?.id).toBe('palatal');
    expect(stageOfSyllable(SYLLABLE_BY_ID.zhi)?.id).toBe('retroflex');
    expect(stageOfSyllable(SYLLABLE_BY_ID.si)?.id).toBe('dental');
    expect(stageOfSyllable(SYLLABLE_BY_ID.sa)?.id).toBe('simple-easy');
    expect(stageSyllables(STAGE_BY_ID.spelling).some((s) => s.id === 'liu')).toBe(true);
  });
});

describe('progress', () => {
  const cells = [{ cell: { numeric: 'a1' } }, { cell: { numeric: 'a2' } }, { cell: { numeric: 'a3' } }, { cell: { numeric: 'a4' } }, { cell: { numeric: 'a5' } }];
  it('counts new, shaky and solid and decides "mostly solid" at 80%', () => {
    expect(progressOf(cells, {})).toMatchObject({ cells: 5, solid: 0, shaky: 0, fresh: 5, done: 0, mostlySolid: false });
    const some: Record<string, Status> = { a1: 'solid', a2: 'solid', a3: 'solid', a4: 'shaky' };
    expect(progressOf(cells, some)).toMatchObject({ solid: 3, shaky: 1, fresh: 1, mostlySolid: false });
    expect(progressOf(cells, { ...some, a4: 'solid' }).mostlySolid).toBe(true);
    expect(MOSTLY_SOLID).toBe(0.8);
    expect(progressOf([], {}).mostlySolid).toBe(false);
  });

  it('recommends the first stage that is not yet mostly solid', () => {
    expect(nextStage({})?.id).toBe('simple-easy');
    const done: Record<string, Status> = {};
    for (const c of stageCells(STAGE_BY_ID['simple-easy'])) done[c.cell.numeric] = 'solid';
    expect(nextStage(done)?.id).toBe('simple-tougher');
    for (const st of STAGES) for (const c of stageCells(st)) done[c.cell.numeric] = 'solid';
    expect(nextStage(done)).toBeNull();
  });

  it('lists shaky cells in chart order, up to a limit', () => {
    const statuses: Record<string, Status> = { ma1: 'shaky', ba2: 'shaky', zhi1: 'shaky', de5: 'solid' };
    expect(shakiest(statuses).map((c) => c.cell.numeric)).toEqual(['ba2', 'ma1', 'zhi1']);
    expect(shakiest(statuses, 2)).toHaveLength(2);
  });
});

describe('categories', () => {
  it('derive membership from the data, with ASCII ids', () => {
    for (const c of CATEGORIES) {
      expect(c.id).toMatch(/^[a-z-]+$/);
      expect(categorySyllables(c).length, c.id).toBeGreaterThan(0);
    }
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
    for (const s of categorySyllables(CATEGORY_BY_ID.nasal)) expect(FINAL_BY_ID[s.final].type).toBe('nasal');
    for (const s of categorySyllables(CATEGORY_BY_ID.simple)) expect(FINAL_BY_ID[s.final].type).toBe('simple');
    for (const s of categorySyllables(CATEGORY_BY_ID.problem)) expect(INITIAL_BY_ID[s.initial].difficulty).toBe('problem');
    for (const s of categorySyllables(CATEGORY_BY_ID['umlaut-u'])) expect('jqx'.includes(s.initial) || s.pseudoInitial === 'y').toBe(true);
    const front = categorySyllables(CATEGORY_BY_ID['front-nasal']).length;
    const back = categorySyllables(CATEGORY_BY_ID['back-nasal']).length;
    expect(front + back).toBe(categorySyllables(CATEGORY_BY_ID.nasal).length);
  });

  it('carries the notes on the judgement calls in the data', () => {
    expect(CATEGORY_BY_ID.easy.note).toMatch(/s both as/);
    expect(CATEGORY_BY_ID.compound.note).toMatch(/er is a rhotic final/);
    expect(categorySyllables(CATEGORY_BY_ID.easy).some((s) => s.initial === 's')).toBe(true);
    expect(categorySyllables(CATEGORY_BY_ID.compound).some((s) => s.id === 'er')).toBe(true);
    expect(CATEGORY_BY_ID.nasal.note).toBeUndefined();
  });
});
