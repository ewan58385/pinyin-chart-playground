import { describe, expect, it } from 'vitest';
import { numericToDisplay, parseSyllable, spellSyllable, splitTone, toAscii, toneLetter, toneMark } from '../src/lib/pinyin';

describe('toneMark', () => {
  it('puts the mark on a, then e, then the o of ou, else the last vowel', () => {
    expect(toneMark('ma', 1)).toBe('mā');
    expect(toneMark('hao', 3)).toBe('hǎo');
    expect(toneMark('xue', 2)).toBe('xué');
    expect(toneMark('gou', 3)).toBe('gǒu');
    expect(toneMark('liu', 2)).toBe('liú');
    expect(toneMark('gui', 4)).toBe('guì');
    expect(toneMark('xiong', 2)).toBe('xióng');
    expect(toneMark('lü', 4)).toBe('lǜ');
    expect(toneMark('nüe', 4)).toBe('nüè');
    expect(toneMark('er', 2)).toBe('ér');
  });
  it('leaves the neutral tone unmarked', () => {
    expect(toneMark('ma', 5)).toBe('ma');
  });
});

describe('splitTone', () => {
  it('reads tone marks, tone numbers and bare syllables', () => {
    expect(splitTone('zhī')).toEqual({ base: 'zhi', tone: 1 });
    expect(splitTone('zhi1')).toEqual({ base: 'zhi', tone: 1 });
    expect(splitTone('zhi')).toEqual({ base: 'zhi', tone: null });
    expect(splitTone('ZHI4')).toEqual({ base: 'zhi', tone: 4 });
    expect(splitTone('ma5')).toEqual({ base: 'ma', tone: 5 });
    expect(splitTone('ma0')).toEqual({ base: 'ma', tone: 5 });
  });
  it('accepts every way of typing ü', () => {
    for (const typed of ['lü4', 'lv4', 'lu:4', 'lǜ']) expect(splitTone(typed), typed).toEqual({ base: 'lü', tone: 4 });
  });
});

describe('parseSyllable', () => {
  it('maps y and w spellings to the null row', () => {
    expect(parseSyllable('you')).toEqual({ initial: '', final: 'iu', pseudoInitial: 'y' });
    expect(parseSyllable('wen')).toEqual({ initial: '', final: 'un', pseudoInitial: 'w' });
    expect(parseSyllable('yuan')).toEqual({ initial: '', final: 'üan', pseudoInitial: 'y' });
    expect(parseSyllable('weng')).toEqual({ initial: '', final: 'ueng', pseudoInitial: 'w' });
  });
  it('reads u after j, q, x as ü', () => {
    expect(parseSyllable('jun')).toEqual({ initial: 'j', final: 'ün', pseudoInitial: null });
    expect(parseSyllable('zhun')).toEqual({ initial: 'zh', final: 'un', pseudoInitial: null });
  });
  it('rejects spellings that have no square', () => {
    for (const bad of ['ê', 'yo', 'm', 'ng', 'hm', 'r', 'ja', 'wong', 'xyz', '']) expect(parseSyllable(bad), bad).toBeNull();
  });
  it('round-trips with spellSyllable', () => {
    for (const s of ['zhi', 'ju', 'nü', 'you', 'wo', 'er', 'a', 'xiong', 'lüe', 'yue']) {
      const p = parseSyllable(s)!;
      expect(spellSyllable(p.initial, p.final), s).toBe(s);
    }
  });
});

describe('numericToDisplay', () => {
  it('joins syllables and adds an apostrophe before a, e, o', () => {
    expect(numericToDisplay('ma1 ma5')).toBe('māma');
    expect(numericToDisplay('nü3 er2')).toBe("nǚ'ér");
    expect(numericToDisplay('ke3 ai4')).toBe("kě'ài");
    expect(numericToDisplay('lu:4 se4')).toBe('lǜsè');
  });
});

describe('toneLetter', () => {
  it('gives the marked letter for tones 1-4 and the plain one for the neutral tone', () => {
    expect(([1, 2, 3, 4, 5] as const).map((t) => toneLetter('zhuang', t)).join(' ')).toBe('ā á ǎ à a');
    expect(toneLetter('lü', 4)).toBe('ǜ');
    expect(toneLetter('liu', 2)).toBe('ú');
    expect(toneLetter('gui', 4)).toBe('ì');
    expect(toneLetter('ou', 3)).toBe('ǒ');
  });
});

describe('helpers', () => {
  it('writes ü as v for filenames', () => {
    expect(toAscii('lü4')).toBe('lv4');
    expect(toAscii('nüe4')).toBe('nve4');
  });
});
