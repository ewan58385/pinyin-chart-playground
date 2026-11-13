/**
 * Pinyin spelling logic: placing a syllable on the chart grid, tone marks,
 * and normalising the different ways a syllable can be typed.
 * Pure functions, shared by the app and the data scripts.
 */
import { FINAL_BY_ID } from '../data/finals';
import type { PseudoInitial } from '../data/initials';

export type Tone = 1 | 2 | 3 | 4 | 5;
export const TONES: Tone[] = [1, 2, 3, 4, 5];
export const TONE_NAMES: Record<Tone, string> = {
  1: 'first tone',
  2: 'second tone',
  3: 'third tone',
  4: 'fourth tone',
  5: 'neutral tone',
};

export interface GridPosition {
  /** Row id: '' for the null initial. */
  initial: string;
  /** Column id: the surface final, with ü written out. */
  final: string;
  pseudoInitial: PseudoInitial | null;
}

/** Whole-syllable spellings of the i-, u- and ü- finals with no initial. */
export const YW_SPELLINGS: Record<string, { final: string; pseudo: PseudoInitial }> = {
  yi: { final: 'i', pseudo: 'y' },
  ya: { final: 'ia', pseudo: 'y' },
  yao: { final: 'iao', pseudo: 'y' },
  ye: { final: 'ie', pseudo: 'y' },
  you: { final: 'iu', pseudo: 'y' },
  yan: { final: 'ian', pseudo: 'y' },
  yang: { final: 'iang', pseudo: 'y' },
  yin: { final: 'in', pseudo: 'y' },
  ying: { final: 'ing', pseudo: 'y' },
  yong: { final: 'iong', pseudo: 'y' },
  wu: { final: 'u', pseudo: 'w' },
  wa: { final: 'ua', pseudo: 'w' },
  wo: { final: 'uo', pseudo: 'w' },
  wai: { final: 'uai', pseudo: 'w' },
  wei: { final: 'ui', pseudo: 'w' },
  wan: { final: 'uan', pseudo: 'w' },
  wen: { final: 'un', pseudo: 'w' },
  wang: { final: 'uang', pseudo: 'w' },
  weng: { final: 'ueng', pseudo: 'w' },
  yu: { final: 'ü', pseudo: 'y' },
  yue: { final: 'üe', pseudo: 'y' },
  yuan: { final: 'üan', pseudo: 'y' },
  yun: { final: 'ün', pseudo: 'y' },
};

const TWO_LETTER_INITIALS = ['zh', 'ch', 'sh'];
const ONE_LETTER_INITIALS = 'bpmfdtnlgkhjqxrzcs';
/** Finals that only stand alone (no initial) and are spelled as-is. */
const BARE_FINALS = new Set(['a', 'ai', 'ao', 'an', 'ang', 'e', 'ei', 'en', 'eng', 'er', 'o', 'ou']);
const JQX_U: Record<string, string> = { u: 'ü', ue: 'üe', uan: 'üan', un: 'ün' };

/** Normalise typed variants of ü (v, u:, yu-less forms) to the letter ü. */
export function normaliseUmlaut(s: string): string {
  return s.replace(/u:/g, 'ü').replace(/v/g, 'ü');
}

/**
 * Place a toneless syllable on the grid, or return null if its spelling
 * cannot be expressed as one of the 22 rows × 36 columns.
 * This only maps spelling to a position. It does not decide whether the
 * syllable exists; that comes from the syllable list.
 */
export function parseSyllable(raw: string): GridPosition | null {
  const s = normaliseUmlaut(raw.toLowerCase());
  const yw = YW_SPELLINGS[s];
  if (yw) return { initial: '', final: yw.final, pseudoInitial: yw.pseudo };
  if (s.startsWith('y') || s.startsWith('w')) return null;

  let initial = '';
  for (const two of TWO_LETTER_INITIALS) if (s.startsWith(two)) initial = two;
  if (!initial && s.length > 0 && ONE_LETTER_INITIALS.includes(s[0])) initial = s[0];
  let rest = s.slice(initial.length);

  if (!initial) {
    return BARE_FINALS.has(rest) ? { initial: '', final: rest, pseudoInitial: null } : null;
  }
  if ('jqx'.includes(initial)) {
    if (rest in JQX_U) rest = JQX_U[rest];
    else if (rest.startsWith('ü')) return null; // jü is never written
    else if (!rest.startsWith('i')) return null; // j/q/x only take i- and ü- finals
  }
  if (!FINAL_BY_ID[rest]) return null;
  if (rest === 'ueng' || rest === 'er') return null; // only weng and er exist, both on the ∅ row
  return { initial, final: rest, pseudoInitial: null };
}

/** The reverse of parseSyllable: how a grid position is spelled. */
export function spellSyllable(initial: string, final: string): string {
  if (!initial) {
    const yw = Object.entries(YW_SPELLINGS).find(([, v]) => v.final === final);
    return yw ? yw[0] : final;
  }
  if ('jqx'.includes(initial) && final.startsWith('ü')) return initial + final.replace('ü', 'u');
  return initial + final;
}

const MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/** Which letter carries the tone mark: a, then e, then the o of ou, else the last vowel. */
function markIndex(s: string): number {
  const a = s.indexOf('a');
  if (a >= 0) return a;
  const e = s.indexOf('e');
  if (e >= 0) return e;
  const ou = s.indexOf('ou');
  if (ou >= 0) return ou;
  for (let i = s.length - 1; i >= 0; i--) if ('iouü'.includes(s[i])) return i;
  return -1;
}

/** ma + 1 → mā. Tone 5 (neutral) is written without a mark. */
export function toneMark(syllable: string, tone: Tone): string {
  const s = normaliseUmlaut(syllable);
  if (tone === 5) return s;
  const i = markIndex(s);
  if (i < 0) return s;
  return s.slice(0, i) + MARKS[s[i]][tone - 1] + s.slice(i + 1);
}

/**
 * The one letter that carries the tone mark, marked for the tone: zhuang + 3
 * → ǎ, lü + 4 → ǜ; the plain letter for the neutral tone. A compact label
 * for a tone where the whole syllable is already shown next to it.
 */
export function toneLetter(syllable: string, tone: Tone): string {
  const s = normaliseUmlaut(syllable);
  const i = markIndex(s);
  if (i < 0) return String(tone);
  return tone === 5 ? s[i] : MARKS[s[i]][tone - 1];
}

/** ü → v, for filenames and ASCII ids (lü4 → lv4). */
export function toAscii(s: string): string {
  return s.replace(/ü/g, 'v');
}

/** Stable id of a tone cell: the numeric form, e.g. ma1, lü4, de5. */
export function cellId(syllable: string, tone: Tone): string {
  return `${syllable}${tone}`;
}

const COMBINING_TONE: Record<string, Tone> = { '\u0304': 1, '\u0301': 2, '\u030C': 3, '\u0300': 4 };

/**
 * Split a typed or printed syllable into base + tone.
 * Accepts tone marks (zhī), tone numbers (zhi1, zhi5, zhi0), and bare
 * syllables (zhi → tone null). ü may be typed as ü, v or u:.
 */
export function splitTone(input: string): { base: string; tone: Tone | null } {
  let tone: Tone | null = null;
  let out = '';
  for (const ch of input.trim().toLowerCase().normalize('NFD')) {
    if (ch in COMBINING_TONE) tone = COMBINING_TONE[ch];
    else if (ch === '\u0308') out = out.slice(0, -1) + 'ü';
    else if (ch === '\u0302') out = out.slice(0, -1) + 'ê';
    else out += ch;
  }
  const m = out.match(/^(.*?)([0-5])$/);
  if (m) {
    out = m[1];
    tone = m[2] === '0' ? 5 : (Number(m[2]) as Tone);
  }
  return { base: normaliseUmlaut(out), tone };
}

/**
 * CC-CEDICT style numeric pinyin ("ma1 ma5", "nu:3 er2") → printed pinyin
 * (māma, nǚ'ér). An apostrophe goes before a syllable starting with a, e or o
 * when it follows another syllable.
 */
export function numericToDisplay(numeric: string): string {
  const parts = numeric.trim().split(/\s+/);
  let out = '';
  for (const part of parts) {
    const m = part.match(/^([a-zA-Zü:]+)([1-5])$/);
    if (!m) {
      out += part;
      continue;
    }
    const base = normaliseUmlaut(m[1].toLowerCase());
    const marked = base === 'r' ? 'r' : toneMark(base, Number(m[2]) as Tone);
    const cased = /^[A-Z]/.test(m[1]) ? marked[0].toUpperCase() + marked.slice(1) : marked;
    if (out && /^[aeo]/.test(base)) out += "'";
    out += cased;
  }
  return out;
}
