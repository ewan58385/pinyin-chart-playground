import { describe, expect, it } from 'vitest';
import { FINALS, FINAL_GROUPS, FINAL_BY_ID } from '../src/data/finals';
import { INITIALS, INITIAL_BY_ID } from '../src/data/initials';
import { SYLLABLES, SYLLABLE_BY_ID, CELLS, GRID, AUDIO_CLIPS, TONE_CELL } from '../src/data';
import { confusablesFor } from '../src/data/confusables';
import { parseSyllable, toAscii, YW_SPELLINGS } from '../src/lib/pinyin';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const standard = SYLLABLES.filter((s) => s.status === 'standard');
const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe('finals', () => {
  it('has exactly 36 finals, and the six groups sum to 36', () => {
    expect(FINALS).toHaveLength(36);
    expect(FINAL_GROUPS.reduce((n, g) => n + g.finals.length, 0)).toBe(36);
    expect(new Set(ids(FINALS)).size).toBe(36);
  });

  it('has the six groups in order with the specified sizes and members', () => {
    expect(FINAL_GROUPS.map((g) => [g.id, g.finals.length])).toEqual([
      ['A', 5],
      ['E', 5],
      ['O', 3],
      ['I', 10],
      ['U', 9],
      ['Ü', 4],
    ]);
    expect(ids(FINALS).join(' ')).toBe(
      'a ai ao an ang e ei en eng er o ong ou i ia iao ie iu ian iang in ing iong u ua uo ui uai uan un uang ueng ü üe üan ün',
    );
  });

  it('stores the underlying form of iu, ui and un', () => {
    expect(FINAL_BY_ID.iu.canonical).toBe('iou');
    expect(FINAL_BY_ID.ui.canonical).toBe('uei');
    expect(FINAL_BY_ID.un.canonical).toBe('uen');
    expect(FINALS.filter((f) => f.canonical !== f.surface)).toHaveLength(3);
  });

  it('has exactly six simple finals', () => {
    expect(ids(FINALS.filter((f) => f.type === 'simple'))).toEqual(['a', 'e', 'o', 'i', 'u', 'ü']);
  });
});

describe('initials', () => {
  it('has 22 rows: the null initial first, then the 21 initials in chart order', () => {
    expect(ids(INITIALS)).toEqual(['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'z', 'c', 's', 'zh', 'ch', 'sh', 'r', 'j', 'q', 'x', 'g', 'k', 'h']);
  });

  it('has no row for y or w', () => {
    expect(INITIAL_BY_ID.y).toBeUndefined();
    expect(INITIAL_BY_ID.w).toBeUndefined();
  });

  it('tags every real initial with a difficulty group', () => {
    for (const i of INITIALS) expect(i.id === '' ? i.difficulty : !!i.difficulty).toBe(i.id === '' ? null : true);
    expect(ids(INITIALS.filter((i) => i.difficulty === 'tougher')).sort()).toEqual(['b', 'd', 'g', 'h', 'k', 'p', 't']);
  });
});

describe('syllables', () => {
  it('has about 400 standard syllables', () => {
    expect(standard.length).toBeGreaterThan(395);
    expect(standard.length).toBeLessThan(420);
  });

  it('places every syllable where its spelling says, with no two in one square', () => {
    for (const s of SYLLABLES) {
      const pos = parseSyllable(s.id);
      expect(pos, s.id).not.toBeNull();
      expect([pos!.initial, pos!.final], s.id).toEqual([s.initial, s.final]);
    }
    expect(Object.keys(GRID)).toHaveLength(SYLLABLES.length);
  });

  it('puts all 23 y- and w- syllables on the null row with a pseudo-initial', () => {
    expect(Object.keys(YW_SPELLINGS)).toHaveLength(23);
    for (const [spelling, { final, pseudo }] of Object.entries(YW_SPELLINGS)) {
      const s = SYLLABLE_BY_ID[spelling];
      expect(s, spelling).toBeDefined();
      expect([s.initial, s.final, s.pseudoInitial]).toEqual(['', final, pseudo]);
      expect(s.tags).toContain('spelling-variant');
    }
  });

  it('puts ju, jue, juan, jun (and q, x) in the Ü group, not the U group', () => {
    for (const i of ['j', 'q', 'x']) {
      for (const [spelling, final] of [['u', 'ü'], ['ue', 'üe'], ['uan', 'üan'], ['un', 'ün']]) {
        expect(SYLLABLE_BY_ID[i + spelling]?.final, i + spelling).toBe(final);
      }
      expect(SYLLABLES.some((s) => s.initial === i && FINAL_BY_ID[s.final].group === 'U')).toBe(false);
    }
  });

  it('tags the spelling quirks instead of adding finals', () => {
    for (const id of ['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si']) expect(SYLLABLE_BY_ID[id].tags, id).toContain('fake-i');
    expect(SYLLABLES.filter((s) => s.tags.includes('fake-i'))).toHaveLength(7);
    for (const id of ['bo', 'po', 'mo', 'fo']) expect(SYLLABLE_BY_ID[id].tags, id).toContain('o-as-uo');
    for (const id of ['ju', 'qu', 'xu', 'yu', 'yuan']) expect(SYLLABLE_BY_ID[id].tags, id).toContain('ü-as-u');
    expect(SYLLABLE_BY_ID.nü.tags).not.toContain('ü-as-u');
    expect(SYLLABLE_BY_ID.er.tags).toContain('erhua');
  });

  it('leaves honest gaps: combinations Mandarin does not have are absent', () => {
    for (const id of ['bong', 'fi', 'ki', 'gi', 'hi', 'bua', 'fai', 'zhia', 'jo', 'shong', 'diang', 'rei', 'muo']) {
      expect(SYLLABLE_BY_ID[id], id).toBeUndefined();
    }
  });

  it('has the rare syllables the sources attest, each with only the tones that occur', () => {
    const tones = (id: string) => SYLLABLE_BY_ID[id].tones.filter((t) => t.status !== 'single-source').map((t) => t.tone);
    expect(tones('dia')).toEqual([3]);
    expect(tones('lo')).toEqual([5]);
    expect(tones('den')).toEqual([4]);
    expect(tones('rua')).toEqual([2]);
    expect(tones('nun')).toEqual([2]);
    expect(tones('eng')).toEqual([1]);
    expect(SYLLABLE_BY_ID['ê']).toBeUndefined(); // attested, but there is no column for it
  });

  it('gives each tone cell a display and numeric form', () => {
    expect(TONE_CELL.ba1.cell.display).toBe('bā');
    expect(TONE_CELL['lü4'].cell.display).toBe('lǜ');
    expect(TONE_CELL.ma5.cell.display).toBe('ma');
    expect(TONE_CELL.xue2.cell.display).toBe('xué');
    for (const s of SYLLABLES) for (const t of s.tones) expect(t.numeric).toBe(`${s.id}${t.tone}`);
  });

  it('marks verified only where two sources agree', () => {
    for (const s of SYLLABLES) {
      for (const t of s.tones) {
        expect(t.verified, t.numeric).toBe(t.sources.length >= 2);
        if (t.status === 'standard') expect(t.sources.length, t.numeric).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('example characters', () => {
  it('gives the textbook examples for common cells', () => {
    expect(CELLS.ma1.character).toBe('妈');
    expect(CELLS.ma3.character).toBe('马');
    expect(CELLS.shi4.character).toBe('是');
    expect(CELLS.de5.character).toBe('的');
  });

  it('stores the required fields, with at most three example words', () => {
    for (const [id, c] of Object.entries(CELLS)) {
      expect(TONE_CELL[id], id).toBeDefined();
      expect(Array.from(c.character), id).toHaveLength(1);
      expect(c.pinyin, id).toBe(TONE_CELL[id].cell.display);
      expect(typeof c.verified).toBe('boolean');
      expect(c.words.length).toBeLessThanOrEqual(3);
      if (c.fallback) expect(c.fallbackWord?.word, id).toContain(c.character);
      else expect(c.meaning, id).not.toBe('');
    }
  });
});

describe('audio', () => {
  const index = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'generated', 'audio-index.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(ROOT, 'audio-manifest.json'), 'utf8'));

  it('lists clips only for real chart cells, each one on disk with the size the index gives', () => {
    expect(Object.keys(AUDIO_CLIPS).length).toBeGreaterThan(0);
    for (const [id, [bytes]] of Object.entries(AUDIO_CLIPS)) {
      expect(TONE_CELL[id], id).toBeDefined();
      const file = join(ROOT, 'public', 'audio', `${toAscii(id)}.mp3`);
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size, id).toBe(bytes);
    }
  });

  it('has no stray files in public/audio', () => {
    const named = new Set(Object.keys(AUDIO_CLIPS).map((id) => `${toAscii(id)}.mp3`));
    for (const f of readdirSync(join(ROOT, 'public', 'audio'))) expect(named.has(f), f).toBe(true);
  });

  it('agrees with the manifest, which names a source, licence and original file for every clip', () => {
    expect(Object.keys(manifest.clips).sort()).toEqual(Object.keys(AUDIO_CLIPS).sort());
    for (const [id, c] of Object.entries(manifest.clips) as [string, Record<string, string>][]) {
      expect(c.original, id).toMatch(/\.mp3$/);
      expect(c.licence, id).toBeTruthy();
      expect(c.author, id).toBeTruthy();
      expect(c.speaker, id).toBeTruthy();
    }
    expect(index.totalBytes).toBe(Object.values(AUDIO_CLIPS).reduce((n, [b]) => n + b, 0));
  });

  it('uses one speaker for every clip', () => {
    const speakers = new Set(Object.values(manifest.clips as Record<string, { speaker: string }>).map((c) => c.speaker));
    expect(speakers.size).toBe(1);
  });

  it('never gives two tones of one syllable the same file', () => {
    const seen = new Map<string, string>();
    for (const id of Object.keys(AUDIO_CLIPS)) {
      const hash = createHash('md5').update(readFileSync(join(ROOT, 'public', 'audio', `${toAscii(id)}.mp3`))).digest('hex');
      const key = `${TONE_CELL[id].syllable.id}|${hash}`;
      expect(seen.get(key), id).toBeUndefined();
      seen.set(key, id);
    }
  });
});

describe('confusables', () => {
  const linked = (id: string) => confusablesFor(SYLLABLE_BY_ID[id]).map((c) => c.syllable.id);
  it('links zh, j and z', () => {
    expect(linked('zhi')).toEqual(expect.arrayContaining(['zi', 'ji']));
    expect(linked('ji')).toEqual(expect.arrayContaining(['zhi', 'zi']));
    expect(linked('zha')).toEqual(expect.arrayContaining(['za', 'jia']));
  });
  it('links sh, x and s, and ch, q and c', () => {
    expect(linked('shu')).toEqual(expect.arrayContaining(['su', 'xu']));
    expect(linked('qu')).toEqual(expect.arrayContaining(['chu', 'cu']));
  });
  it('links in with ing, en with eng, and u with ü', () => {
    expect(linked('lin')).toContain('ling');
    expect(linked('ben')).toContain('beng');
    expect(linked('lu')).toContain('lü');
    expect(linked('wu')).toContain('yu');
  });
  it('never links to a syllable that does not exist', () => {
    for (const s of SYLLABLES) for (const c of confusablesFor(s)) expect(SYLLABLE_BY_ID[c.syllable.id]).toBeDefined();
  });
});
