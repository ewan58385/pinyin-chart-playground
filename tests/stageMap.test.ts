import { describe, expect, it } from 'vitest';
import { STAGES, STAGE_BY_ID, stageSyllables } from '../src/data/learn';
import { FINALS } from '../src/data/finals';
import { INITIALS } from '../src/data/initials';
import { syllableAt } from '../src/data';
import { stageMap } from '../src/lib/stageMap';

describe('stage chart pictures', () => {
  it('has nine stages', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['simple-easy', 'simple-tougher', 'compound', 'nasal', 'palatal', 'retroflex', 'dental', 'spelling', 'neutral']);
  });

  for (const stage of STAGES) {
    describe(stage.id, () => {
      const map = stageMap(stage);

      it('shows exactly the stage’s syllables, each once', () => {
        const shown = map.cells.map((c) => c.syllable.id);
        expect(new Set(shown).size).toBe(shown.length);
        expect(shown.sort()).toEqual(stageSyllables(stage).map((s) => s.id).sort());
      });

      it('keeps every column of the chart, in order, with the six groups', () => {
        expect(map.columns.map((f) => f.id)).toEqual(FINALS.map((f) => f.id));
        expect(map.groupStarts.map((i) => map.columns[i].group)).toEqual(['A', 'E', 'O', 'I', 'U', 'Ü']);
      });

      it('puts each syllable at its true row and column', () => {
        for (const c of [...map.cells, ...map.others]) {
          const row = map.rows[c.row];
          expect(row.kind).toBe('row');
          if (row.kind !== 'row') continue;
          expect(syllableAt(row.initial.id, map.columns[c.col].id)?.id).toBe(c.syllable.id);
        }
      });

      it('keeps the rows in chart order, folding only whole blocks with none of the stage’s syllables', () => {
        const order = map.rows.flatMap((r) => (r.kind === 'row' ? [r.initial.id] : r.initials.map((i) => i.id)));
        expect(order).toEqual(INITIALS.map((i) => i.id));
        const used = new Set(map.cells.map((c) => c.row));
        for (const [i, r] of map.rows.entries()) {
          if (r.kind === 'band') {
            for (const ini of r.initials) for (const f of FINALS) expect(stageSyllables(stage).some((s) => s === syllableAt(ini.id, f.id))).toBe(false);
          } else {
            // A row is shown when its block holds something from the stage.
            const block = map.rows.filter((x) => x.kind === 'row' && x.initial.block === r.initial.block);
            expect(block.some((x) => used.has(map.rows.indexOf(x))), `${stage.id}: ${r.initial.id} (${i})`).toBe(true);
          }
        }
      });
    });
  }

  it('folds the rows of other initial blocks for a single-group stage', () => {
    const map = stageMap(STAGE_BY_ID.palatal);
    const rows = map.rows.filter((r) => r.kind === 'row').map((r) => (r.kind === 'row' ? r.initial.id : ''));
    expect(rows).toEqual(['j', 'q', 'x']);
    expect(map.rows.filter((r) => r.kind === 'band')).toHaveLength(6);
    expect(map.cells.some((c) => c.syllable.id === 'ju')).toBe(true);
  });

  it('shows every row for a stage that reaches every block', () => {
    expect(stageMap(STAGE_BY_ID.neutral).rows.every((r) => r.kind === 'row')).toBe(true);
  });
});
