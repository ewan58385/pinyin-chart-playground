/**
 * Builds the bundled chart data from the cached sources:
 *
 *   src/data/generated/syllables.json   every on-grid syllable, with its tone cells
 *   src/data/generated/cells.json       example character + words per tone cell
 *   src/data/generated/char-index.json  character → readings, for search
 *   src/data/generated/font-chars.json  the characters the CJK font subset must cover
 *   src/data/generated/data-meta.json   counts, thresholds, off-grid syllables
 *   reports/data-report.md              everything unverified, rare or excluded
 *
 * How common a character or word is comes from HSK levels and Unihan's
 * kHanyuPinlu counts (see "thresholds" below); no word-frequency corpus is used.
 *
 * Nothing here is typed in by hand. A syllable or tone exists because a
 * dictionary source attests it, and `verified` means two independent sources agree.
 *
 * Run: npm run data:build   (after npm run data:sources)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  SOURCES,
  loadCedict,
  loadUnihan,
  loadHsk,
  sourceVersions,
  isHan,
  readingKey,
  type CedictEntry,
  type Reading,
} from './lib/sources';
import { parseSyllable, toneMark, toAscii, numericToDisplay, type Tone } from '../src/lib/pinyin';
import { FINALS, FINAL_BY_ID, FINAL_INDEX } from '../src/data/finals';
import { INITIALS, INITIAL_BY_ID, INITIAL_INDEX } from '../src/data/initials';
import { REJECT, PREFER_SENSE, PREFER_TRAD } from './curation';

// ───────────────────────── thresholds ─────────────────────────
// No word-frequency corpus is used. How common a character or word is comes from
// two sources that allow commercial use: the HSK level of the words it appears in
// (complete-hsk-vocabulary, MIT; level field only), and the per-reading counts of
// Xiàndài Hànyǔ Pínlǜ Cídiǎn as given in Unihan's kHanyuPinlu (Unicode License v3).
// "Common character" means one of the 8,105 characters of the Tōngyòng Guīfàn
// Hànzì Biǎo (Unihan kTGHZ2013).

/** A secondary reading counts only if it has this share of the character's kHanyuPinlu counts. */
const T_SECONDARY_READING = 0.1;
/** A word is "common" (can carry a fallback example, or support a neutral-tone cell) up to this HSK level. */
const COMMON_WORD_LEVEL = 6;
/** A fallback example (a character shown with a word that carries it) may use HSK words up to this level (7 = the 7–9 band). */
const FALLBACK_WORD_LEVEL = 7;
/** Example words come from HSK words up to this level (7 = the 7–9 band of HSK 3.0). */
const EXAMPLE_WORD_LEVEL = 7;
/** Last resort: a character with its own dictionary entry for the reading and at least this total kHanyuPinlu count (≈ the 2,500 most counted). */
const OWN_ENTRY_MIN_PINLU = 48;

// ───────────────────────── load ─────────────────────────

const cedict = loadCedict();
const unihan = loadUnihan();
const hsk = loadHsk();
/** Single characters the HSK lists teach as words at levels 1–6. The 7–9 band is mostly literary bound characters. */
const hskSingle = new Set(
  [...hsk.values()]
    .filter((w) => Array.from(w.simplified).length === 1 && w.level.some((l) => !/-7$/.test(l)))
    .map((w) => w.simplified),
);
/** Lowest HSK level a word appears at (1–7), or 8 if it is on no list. Earlier levels make better examples. */
const hskLevel = (w: string): number => {
  const levels = hsk.get(w)?.level.map((l) => Number(l.split('-')[1])) ?? [];
  return levels.length ? Math.min(...levels) : 8;
};
/** HSK level of the character as a word on its own (1–6), or 9. */
const hskSingleLevel = (c: string): number => (hskSingle.has(c) ? hskLevel(c) : 9);
/**
 * Levels are compared in the bands the HSK itself uses: 1–3 elementary, 4–6
 * intermediate, 7–9 advanced (the list's level 7), then words on no list. Within
 * a band the kHanyuPinlu count decides, so 又 (level 2) still comes before 右 (level 1).
 */
const band = (level: number): number => (level <= 3 ? 1 : level <= 6 ? 2 : level <= 7 ? 3 : 4);
/** One of the 8,105 standard characters (Unihan kTGHZ2013). */
const isStandard = (c: string) => unihan.get(c)?.standard ?? false;
/** kHanyuPinlu count of character c with reading key, and its total over all readings. */
const pinluCount = (c: string, key: string) => unihan.get(c)?.pinlu.find((p) => readingKey(p.reading) === key)?.count ?? 0;
const pinluTotal = (c: string) => (unihan.get(c)?.pinlu ?? []).reduce((n, p) => n + p.count, 0);

interface Word {
  simp: string;
  trad: string;
  readings: Reading[];
  /** e.g. "dong1 xi5", lower-cased, ü written out. */
  numeric: string;
  proper: boolean;
  defs: string[];
}

const words: Word[] = [];
for (const e of cedict as CedictEntry[]) {
  if (!e.aligned || e.aligned.some((r) => !r)) continue;
  if (Array.from(e.trad).length !== e.aligned.length) continue;
  const readings = e.aligned as Reading[];
  words.push({
    simp: e.simp,
    trad: e.trad,
    readings,
    numeric: readings.map(readingKey).join(' '),
    proper: e.proper,
    defs: e.defs,
  });
}
const bySimp = new Map<string, Word[]>();
for (const w of words) {
  const list = bySimp.get(w.simp);
  if (list) list.push(w);
  else bySimp.set(w.simp, [w]);
}

// ───────────────────────── 1. attestation ─────────────────────────

type DictSource = 'cedict' | 'xhc' | 'tghz' | 'pinlu';
interface Attestation {
  sources: Set<DictSource>;
  /** A few characters or words that carry the reading, for the report. */
  evidence: Set<string>;
  /** CC-CEDICT has a single-character entry with this reading. */
  cedictChar: boolean;
}
const attested = new Map<string, Attestation>(); // key: ma1
const baseOf = new Map<string, Reading>();
function attest(r: Reading, source: DictSource, evidence: string, isChar = false) {
  const key = readingKey(r);
  let a = attested.get(key);
  if (!a) {
    attested.set(key, (a = { sources: new Set(), evidence: new Set(), cedictChar: false }));
    baseOf.set(key, r);
  }
  a.sources.add(source);
  if (a.evidence.size < 6) a.evidence.add(evidence);
  if (isChar && source === 'cedict') a.cedictChar = true;
}
for (const w of words) {
  const single = w.readings.length === 1;
  for (const r of w.readings) attest(r, 'cedict', w.simp, single);
}
for (const [ch, u] of unihan) {
  for (const r of u.xhc) attest(r, 'xhc', ch);
  for (const r of u.tghz) attest(r, 'tghz', ch);
  for (const p of u.pinlu) attest(p.reading, 'pinlu', ch);
}

// ───────────────────────── 2. how common each character reading is ─────────────────────────
// For every character + reading: the CC-CEDICT words it occurs in, and the lowest
// HSK level of those words. A single-character HSK word lends its level only to the
// readings that carry a real share of the character's kHanyuPinlu counts (的 de, not dí).

interface WordUse {
  word: Word;
  /** The written word has more than one pronunciation in CC-CEDICT. */
  ambiguous: boolean;
  /** Lowest HSK level of the written word (8 = not on the lists). */
  level: number;
}
const usesByCharReading = new Map<string, WordUse[]>();
/** "行|xing2" → lowest HSK level of a word in which 行 is read xíng. */
const charReadingLevel = new Map<string, number>();
/** "後|hou4" → [HSK words, all words] written with that traditional form for that reading, to choose between merged forms. */
const tradFamily = new Map<string, [number, number]>();

/** The reading with the largest kHanyuPinlu count, or the customary one (kMandarin). An HSK one-character word means this reading. */
function dominantReading(c: string, keys: string[]): string {
  const counts = keys.map((k) => pinluCount(c, k));
  const max = Math.max(0, ...counts);
  if (max > 0) return keys[counts.indexOf(max)];
  const primary = unihan.get(c)?.mandarin[0];
  return primary && keys.includes(readingKey(primary)) ? readingKey(primary) : keys[0];
}

/** Readings of a single character that have a real share of its use (kHanyuPinlu), or its customary reading. */
function mainReadings(c: string, keys: string[]): Set<string> {
  const u = unihan.get(c);
  const counts = keys.map((k) => pinluCount(c, k));
  const sum = counts.reduce((a, b) => a + b, 0);
  if (sum > 0) return new Set(keys.filter((_, i) => counts[i] / sum >= T_SECONDARY_READING));
  const primary = u?.mandarin[0] ? readingKey(u.mandarin[0]) : '';
  return keys.includes(primary) ? new Set([primary]) : new Set(keys);
}

for (const [simp, entries] of bySimp) {
  const level = hskLevel(simp);
  const variants = new Map<string, Word[]>();
  for (const e of entries) {
    const list = variants.get(e.numeric);
    if (list) list.push(e);
    else variants.set(e.numeric, [e]);
  }
  const keys = [...variants.keys()];
  const chars = Array.from(simp);
  // A one-character HSK word is listed for one meaning: it lends its level to its main reading only (见 jiàn, not xiàn).
  const lends = chars.length === 1 ? new Set([dominantReading(simp, keys)]) : new Set(keys);
  for (const [k, group] of variants) {
    const first = group[0];
    chars.forEach((c, i) => {
      const rk = `${c}|${readingKey(first.readings[i])}`;
      if (level <= 7 && lends.has(k)) charReadingLevel.set(rk, Math.min(charReadingLevel.get(rk) ?? 9, level));
      const list = usesByCharReading.get(rk) ?? [];
      for (const e of group) list.push({ word: e, ambiguous: keys.length > 1, level });
      usesByCharReading.set(rk, list);
    });
    if (chars.length > 1) {
      for (const e of group) {
        Array.from(e.trad).forEach((tc, i) => {
          const tk = `${tc}|${readingKey(e.readings[i])}`;
          const v = tradFamily.get(tk) ?? [0, 0];
          tradFamily.set(tk, [v[0] + (level <= 7 ? 1 : 0), v[1] + 1]);
        });
      }
    }
  }
}

/** Order for "more common first": HSK level of the reading, then its kHanyuPinlu count. */
const levelOf = (c: string, key: string) => charReadingLevel.get(`${c}|${key}`) ?? 9;

// ───────────────────────── 3. glosses ─────────────────────────

const CROSS_REF =
  /^(surname |variant of |old variant of |archaic variant of |erhua variant of |Japanese variant of |ancient variant of |popular variant of |see |see also |used in |used as phonetic|abbr\. for |abbr\. of |also written |also pr\. |Taiwan pr\. |Beijing pr\. |Taiwan variant |CL:|Kangxi radical|radical in Chinese|phonetic |\(dialect\) see |same as |unofficial variant |\(Japanese kokuji\)|\(phonetic|\(used for transliteration|\(used in transliterat|used for its phonetic value|used in transliterat)/i;
/** Words not offered as examples: marked vulgar in the dictionary, or glossed as an insult or obscenity. */
const VULGAR = /\((vulgar|taboo|taboo curse|offensive|derog\.)[^)]*\)/i;
const CRUDE = /\b(bastard|scumbag|scoundrel|bitch|asshole|arsehole|whore|slut|fuck\w*|shit\w*|bullshit|prick|motherfucker|damn\w*|crap|dick|tits|boobs|penis|vagina|rape\w*|to have sex|masturbat\w*)\b/i;
const REGISTER = /^\((archaic|old|literary|dialect|slang|vulgar|Tw|coll\.|Internet slang|Cantonese|Buddhism|loanword|onom\.|Taiwan|PRC|classical|bound form|bound form, literary|formal|polite|honorific|euphemism|fig\.|lit\.|pronoun|verb|noun|adjective|adverb)[^)]*\)\s*/i;
const LOW_PRIORITY = /^\((archaic|old|literary|dialect|slang|vulgar|Internet slang|Cantonese|classical|Tw)[^)]*\)/i;
const INTERJECTION = /interjection|exclamation|\(onom\.\)|onomatopoeia|^sound of|^\(?(oh|ah|hey|hi|eh|uh|wow|huh|hmm|aha|ha|oops|ouch)\b/i;

const MARGINAL = /^\((slang|vulgar|taboo|derog\.|offensive|Internet slang|dialect|Beijing dialect|Cantonese|Tw)[^)]*\)/i;
let debugPieces: string[] = [];

/** Split a sense on semicolons that are not inside parentheses. */
function splitTopLevel(sense: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of sense) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

interface Gloss {
  text: string;
  /** Every usable sense is marked "(bound form)", or there is no usable sense at all. */
  bound: boolean;
  /** Every usable sense is an interjection or sound word. */
  interjection: boolean;
}

function cleanSense(sense: string): string {
  let s = sense.replace(REGISTER, '').replace(REGISTER, '');
  // 繁體|简体[pin1 yin1] → 简体
  s = s.replace(/[\p{Script=Han}·]+\|([\p{Script=Han}·]+)/gu, '$1').replace(/\[[^\]]*\]/g, '');
  const outside = s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (outside.replace(/[^A-Za-z\p{Script=Han}]/gu, '').length >= 2) s = outside;
  else {
    // The whole sense is a parenthetical description, as for particles.
    const inner = s.match(/\(([^)]*)\)/);
    s = inner ? inner[1].trim() : '';
  }
  return s
    .replace(/\s+([,;.])/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/^[,;.\s]+|[,;\s]+$/g, '')
    .trim();
}

function makeGloss(defs: string[], maxLen: number, prefer: string[] = []): Gloss {
  const usable = defs.map((d) => d.trim()).filter((d) => d && !CROSS_REF.test(d));
  const isBound = (d: string) => /^\(bound form/i.test(d);
  const bound = usable.length === 0 || usable.every(isBound);
  const interjection = usable.length > 0 && usable.every((d) => INTERJECTION.test(d));
  // Dictionary order, except that archaic, literary and dialect senses go last.
  const ordered = [...usable.filter((d) => !LOW_PRIORITY.test(d)), ...usable.filter((d) => LOW_PRIORITY.test(d))];
  const pieces: string[] = [];
  const marginal: string[] = [];
  for (const d of ordered) {
    for (const raw of splitTopLevel(d)) {
      const piece = cleanSense(raw);
      if (!piece || CROSS_REF.test(raw.trim()) || CROSS_REF.test(piece) || /\bpr\.$/.test(piece)) continue;
      if (pieces.includes(piece) || marginal.includes(piece)) continue;
      // Slang, vulgar and dialect senses are only used when there is nothing else.
      (MARGINAL.test(raw.trim()) ? marginal : pieces).push(piece);
    }
  }
  if (!pieces.length) pieces.push(...marginal);
  if (process.env.DEBUG_PIECES) debugPieces = [...pieces];
  // Curated sense order: each preferred piece must exist verbatim in the entry.
  for (const want of pieces.length ? [...prefer].reverse() : []) {
    const i = pieces.indexOf(want);
    if (i < 0) throw new Error(`Curation: sense "${want}" not found among: ${pieces.join(' | ')}`);
    pieces.unshift(...pieces.splice(i, 1));
  }
  let text = '';
  for (const p of pieces) {
    if (!text) text = p;
    else if (text.length + 2 + p.length <= maxLen) text += '; ' + p;
    else break;
  }
  if (text.length > maxLen + 14) {
    const cut = text.slice(0, maxLen + 10);
    text = cut.slice(0, Math.max(cut.lastIndexOf(' '), maxLen - 10)).replace(/[,;:\s]+$/, '') + '…';
  }
  return { text, bound, interjection };
}

// ───────────────────────── 4. choose tone cells ─────────────────────────

type CellStatus = 'standard' | 'neutral-in-word' | 'single-source';

interface ToneCell {
  tone: Tone;
  display: string;
  numeric: string;
  /** Two independent dictionary sources attest this syllable + tone. */
  verified: boolean;
  status: CellStatus;
  sources: DictSource[];
}

interface ExampleWord {
  word: string;
  pinyin: string;
  meaning: string;
}
interface CellExample {
  character: string;
  pinyin: string;
  meaning: string;
  /** 1 = the most common example character (HSK level of its readings, then kHanyuPinlu count). */
  commonRank: number;
  fallback?: 'word';
  fallbackWord?: ExampleWord;
  verified: boolean;
  unverifiedReason?: string;
  words: ExampleWord[];
}

const wordGloss = (w: Word) => makeGloss(w.defs, 44, PREFER_SENSE[`${w.simp}|${w.numeric}`]);

const usable = (u: WordUse, maxLevel: number) =>
  !u.word.proper && u.level <= maxLevel && !u.word.defs.some((d) => VULGAR.test(d)) && !CRUDE.test(wordGloss(u.word).text);

/** HSK words first by level, then words with one pronunciation, then shorter, then in a fixed order. */
const byLevel = (a: WordUse, b: WordUse) =>
  a.level - b.level || Number(a.ambiguous) - Number(b.ambiguous) || a.word.readings.length - b.word.readings.length || a.word.simp.localeCompare(b.word.simp);

function bestWordFor(c: string, key: string, maxLevel: number, lengths: number[]): WordUse | null {
  const uses = (usesByCharReading.get(`${c}|${key}`) ?? []).filter((u) => lengths.includes(u.word.readings.length) && usable(u, maxLevel));
  uses.sort(byLevel);
  for (const u of uses) if (wordGloss(u.word).text) return u;
  return null;
}

function exampleWords(c: string, key: string): ExampleWord[] {
  const uses = (usesByCharReading.get(`${c}|${key}`) ?? []).filter(
    (u) => u.word.readings.length >= 2 && u.word.readings.length <= 4 && usable(u, EXAMPLE_WORD_LEVEL),
  );
  const full = !key.endsWith('5');
  // In the full tones, words with a single pronunciation first; in the neutral tone that would hide most examples.
  uses.sort((a, b) => (full ? Number(a.ambiguous) - Number(b.ambiguous) : 0) || byLevel(a, b));
  const out: ExampleWord[] = [];
  for (const u of uses) {
    if (out.some((o) => o.word === u.word.simp)) continue;
    const meaning = wordGloss(u.word).text;
    if (!meaning) continue;
    out.push({ word: u.word.simp, pinyin: numericToDisplay(u.word.numeric), meaning });
    if (out.length === 3) break;
  }
  return out;
}

/** The single-character CC-CEDICT entry to gloss (c, reading) from. */
function charEntry(c: string, key: string): Word | null {
  const all = (bySimp.get(c) ?? []).filter((w) => w.numeric === key);
  // Entries written with a capital (佛 Fó "Buddha") are only used when there is no ordinary one.
  const ordinary = all.filter((w) => !w.proper);
  const entries = ordinary.length ? ordinary : all.filter((w) => makeGloss(w.defs, 200).text);
  if (!entries.length) return null;
  const wantTrad = PREFER_TRAD[`${c}|${key}`];
  if (wantTrad) {
    const hit = entries.find((w) => w.trad === wantTrad);
    if (!hit) throw new Error(`Curation: no entry ${wantTrad} for ${c}|${key}`);
    return hit;
  }
  const fam = (w: Word) => tradFamily.get(`${w.trad}|${key}`) ?? [0, 0];
  entries.sort(
    (a, b) => fam(b)[0] - fam(a)[0] || fam(b)[1] - fam(a)[1] || makeGloss(b.defs, 200).text.length - makeGloss(a.defs, 200).text.length,
  );
  return entries[0];
}

function unihanHasReading(c: string, key: string): boolean {
  const u = unihan.get(c);
  if (!u) return false;
  return [...u.xhc, ...u.tghz, ...u.mandarin, ...u.pinlu.map((p) => p.reading)].some((r) => readingKey(r) === key);
}

const charsByReading = new Map<string, Set<string>>();
for (const rk of usesByCharReading.keys()) {
  const [c, key] = rk.split('|');
  if (!isHan(c)) continue;
  const set = charsByReading.get(key);
  if (set) set.add(c);
  else charsByReading.set(key, new Set([c]));
}

/** Rank of every standard character, most common first: lowest HSK level of any reading, then total kHanyuPinlu count. */
const commonRank = new Map<string, number>();
{
  const best = new Map<string, number>();
  for (const [rk, lv] of charReadingLevel) {
    const c = rk.split('|')[0];
    best.set(c, Math.min(best.get(c) ?? 9, lv));
  }
  const chars = [...unihan.keys()].filter((c) => isStandard(c) && isHan(c));
  chars.sort((a, b) => band(best.get(a) ?? 9) - band(best.get(b) ?? 9) || pinluTotal(b) - pinluTotal(a) || a.localeCompare(b));
  chars.forEach((c, i) => commonRank.set(c, i + 1));
}

/** The reading is one the character really has in its own right (not a minor share of its kHanyuPinlu counts). */
function mainReadingOf(c: string, key: string): boolean {
  const keys = [...new Set((bySimp.get(c) ?? []).map((w) => w.numeric))];
  if (!keys.includes(key)) keys.push(key);
  return mainReadings(c, keys).has(key);
}

function chooseExample(base: string, tone: Tone): CellExample | null {
  const key = `${base}${tone}`;
  interface Cand {
    c: string;
    level: number;
    pinlu: number;
    /** An HSK single-character word (levels 1–6) with this as one of its main readings. */
    standalone: boolean;
    interjection: boolean;
    ownEntry: boolean;
    gloss: string;
  }
  const cands: Cand[] = [];
  for (const c of charsByReading.get(key) ?? []) {
    if (!isStandard(c)) continue;
    if (REJECT[key]?.includes(c)) continue;
    const rk = `${c}|${key}`;
    const entry = charEntry(c, key);
    const g = entry ? makeGloss(entry.defs, 34, PREFER_SENSE[rk]) : { text: '', bound: true, interjection: false };
    const standalone = !!entry && !!g.text && !g.bound && hskSingle.has(c) && mainReadingOf(c, key);
    cands.push({ c, level: levelOf(c, key), pinlu: pinluCount(c, key), standalone, interjection: g.interjection, ownEntry: !!entry && !!g.text, gloss: g.text });
  }
  const common = (a: Cand, b: Cand) => band(a.level) - band(b.level) || b.pinlu - a.pinlu || (commonRank.get(a.c) ?? 1e9) - (commonRank.get(b.c) ?? 1e9);
  // Words on their own are compared by their level as one-character words (做 before 作, whose level comes from 工作).
  const asWord = (a: Cand, b: Cand) => band(hskSingleLevel(a.c)) - band(hskSingleLevel(b.c)) || b.pinlu - a.pinlu || common(a, b);
  cands.sort(common);

  const finish = (cand: Cand, fallbackWord: ExampleWord | null): CellExample => {
    const verified = unihanHasReading(cand.c, key);
    return {
      character: cand.c,
      pinyin: toneMark(base, tone),
      // A fallback cell is glossed by its word: the character is not a word by itself.
      meaning: fallbackWord?.meaning || cand.gloss,
      commonRank: commonRank.get(cand.c)!,
      ...(fallbackWord ? { fallback: 'word' as const, fallbackWord } : {}),
      verified,
      ...(verified
        ? {}
        : {
            unverifiedReason:
              tone === 5
                ? 'Neutral-tone reading inside a word; attested in CC-CEDICT only.'
                : 'Reading for this character attested in CC-CEDICT only.',
          }),
      words: exampleWords(cand.c, key),
    };
  };

  // 1. A character that is a word by itself. Content words before interjections
  //    (except in the neutral tone, where particles are the point).
  const content = (x: Cand) => (tone !== 5 && x.interjection ? 0 : 1);
  const standalone = cands.filter((x) => x.standalone).sort((a, b) => content(b) - content(a) || asWord(a, b))[0];
  if (standalone) return finish(standalone, null);

  // 2. The most common character, shown with a common word that carries it.
  for (const cand of cands) {
    const use = bestWordFor(cand.c, key, FALLBACK_WORD_LEVEL, [2]) ?? bestWordFor(cand.c, key, FALLBACK_WORD_LEVEL, [3, 4]);
    if (!use) continue;
    return finish(cand, {
      word: use.word.simp,
      pinyin: numericToDisplay(use.word.numeric),
      meaning: wordGloss(use.word).text,
    });
  }

  // 3. A very common character whose own dictionary entry has this reading,
  //    confirmed by Unihan (啊 á). Otherwise the cell stays blank.
  const own = cands.filter((x) => x.ownEntry && pinluTotal(x.c) >= OWN_ENTRY_MIN_PINLU && unihanHasReading(x.c, key)).sort(common)[0];
  return own ? finish(own, null) : null;
}

/** Does a common word carry this neutral-tone reading? */
function neutralHasCommonSupport(key: string): boolean {
  for (const c of charsByReading.get(key) ?? []) {
    if (!isStandard(c) || REJECT[key]?.includes(c)) continue;
    if (bestWordFor(c, key, COMMON_WORD_LEVEL, [2, 3, 4])) return true;
  }
  return false;
}

if (process.env.DEBUG_PIECES) {
  for (const rk of process.env.DEBUG_PIECES.split(',')) {
    const [w, key] = rk.split('|');
    for (const e of (bySimp.get(w) ?? []).filter((x) => !x.proper && x.numeric === key)) {
      makeGloss(e.defs, 40);
      console.log(`${w}|${key} [${e.trad}] family=${(tradFamily.get(`${e.trad}|${key}`) ?? [0, 0]).join('/')}:`, debugPieces.join(' | '));
    }
  }
  process.exit(0);
}

// ───────────────────────── 5. assemble syllables ─────────────────────────

interface Syllable {
  id: string;
  ascii: string;
  initial: string;
  final: string;
  pseudoInitial: 'y' | 'w' | null;
  tags: string[];
  verified: boolean;
  status: 'standard' | 'single-source';
  sources: DictSource[];
  tones: ToneCell[];
}

const FAKE_I = new Set(['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si']);
const O_AS_UO = new Set(['bo', 'po', 'mo', 'fo']);

const byBase = new Map<string, Map<Tone, Attestation>>();
for (const [key, a] of attested) {
  const r = baseOf.get(key)!;
  if (!byBase.has(r.base)) byBase.set(r.base, new Map());
  byBase.get(r.base)!.set(r.tone, a);
}

const syllables: Syllable[] = [];
const cells: Record<string, CellExample> = {};
const offGrid: { id: string; tones: Tone[]; sources: DictSource[]; evidence: string[] }[] = [];
const droppedNeutral: string[] = [];

for (const [base, toneMap] of byBase) {
  const allSources = new Set<DictSource>();
  for (const a of toneMap.values()) for (const s of a.sources) allSources.add(s);
  const pos = parseSyllable(base);
  if (!pos) {
    offGrid.push({
      id: base,
      tones: [...toneMap.keys()].sort(),
      sources: [...allSources].sort(),
      evidence: [...new Set([...toneMap.values()].flatMap((a) => [...a.evidence]))].slice(0, 5),
    });
    continue;
  }

  const tones: ToneCell[] = [];
  for (const tone of [1, 2, 3, 4, 5] as Tone[]) {
    const a = toneMap.get(tone);
    if (!a) continue;
    const key = `${base}${tone}`;
    const dictCount = a.sources.size;
    let status: CellStatus;
    if (dictCount >= 2) status = 'standard';
    else if (tone === 5 && a.sources.has('cedict') && neutralHasCommonSupport(key)) status = 'neutral-in-word';
    else status = 'single-source';
    if (tone === 5 && status === 'single-source' && !a.cedictChar && !a.sources.has('xhc') && !a.sources.has('tghz')) {
      // Neutral readings that only turn up inside uncommon words: not kept.
      droppedNeutral.push(key);
      continue;
    }
    tones.push({
      tone,
      display: toneMark(base, tone),
      numeric: key,
      verified: status === 'standard',
      status,
      sources: [...a.sources].sort(),
    });
  }
  if (!tones.length) continue;

  const initial = INITIAL_BY_ID[pos.initial];
  const final = FINAL_BY_ID[pos.final];
  const tags = new Set<string>(initial.tags);
  tags.add(final.type);
  if (final.type === 'nasal') tags.add(final.surface.endsWith('ng') ? 'back-nasal' : 'front-nasal');
  if (pos.pseudoInitial) tags.add('spelling-variant');
  if (FAKE_I.has(base)) tags.add('fake-i');
  if (O_AS_UO.has(base)) tags.add('o-as-uo');
  if (final.group === 'Ü' && ('jqx'.includes(pos.initial) && pos.initial !== '' || pos.pseudoInitial === 'y')) tags.add('ü-as-u');
  if (final.canonical !== final.surface && pos.initial !== '') tags.add('hidden-vowel');
  if (base === 'er') tags.add('erhua');

  // A syllable is standard when at least one of its tones is.
  const standard = tones.some((t) => t.status !== 'single-source');
  syllables.push({
    id: base,
    ascii: toAscii(base),
    initial: pos.initial,
    final: pos.final,
    pseudoInitial: pos.pseudoInitial,
    tags: [...tags],
    verified: allSources.size >= 2,
    status: standard ? 'standard' : 'single-source',
    sources: [...allSources].sort(),
    tones,
  });
}

syllables.sort(
  (a, b) => INITIAL_INDEX[a.initial] - INITIAL_INDEX[b.initial] || FINAL_INDEX[a.final] - FINAL_INDEX[b.final],
);

// Two syllables must never land in the same grid square.
const seen = new Map<string, string>();
for (const s of syllables) {
  const k = `${s.initial}|${s.final}`;
  if (seen.has(k)) throw new Error(`Grid collision: ${s.id} and ${seen.get(k)} both map to ${k}`);
  seen.set(k, s.id);
}

for (const s of syllables) {
  let any = false;
  for (const t of s.tones) {
    const ex = chooseExample(s.id, t.tone);
    if (ex) {
      cells[t.numeric] = ex;
      any = true;
    }
  }
  if (!any) s.tags.push('rare');
}

// ───────────────────────── 6. search index + font characters ─────────────────────────

const onChart = new Set(syllables.flatMap((s) => s.tones.map((t) => t.numeric)));
const charIndex: Record<string, string> = {};
{
  // Every standard character, with the readings it has in its own right (its own
  // CC-CEDICT entry) or in an HSK word, most common reading first.
  const perChar = new Map<string, { key: string; level: number; pinlu: number }[]>();
  for (const rk of usesByCharReading.keys()) {
    const [c, key] = rk.split('|');
    if (!isHan(c) || !onChart.has(key) || !isStandard(c)) continue;
    const own = (bySimp.get(c) ?? []).some((w) => w.numeric === key);
    if (!own && !charReadingLevel.has(rk)) continue;
    const list = perChar.get(c) ?? [];
    list.push({ key, level: levelOf(c, key), pinlu: pinluCount(c, key) });
    perChar.set(c, list);
  }
  for (const [c, list] of [...perChar].sort((a, b) => commonRank.get(a[0])! - commonRank.get(b[0])!)) {
    charIndex[c] = list
      .sort((a, b) => band(a.level) - band(b.level) || b.pinlu - a.pinlu || a.key.localeCompare(b.key))
      .slice(0, 5)
      .map((x) => x.key)
      .join(' ');
  }
}

const chartChars = new Set<string>();
const detailChars = new Set<string>();
for (const ex of Object.values(cells)) {
  chartChars.add(ex.character);
  for (const w of [...ex.words, ...(ex.fallbackWord ? [ex.fallbackWord] : [])]) for (const ch of w.word) detailChars.add(ch);
}
for (const ex of Object.values(cells)) {
  const texts = [ex.meaning, ...ex.words.map((w) => w.meaning), ex.fallbackWord?.meaning ?? ''];
  for (const t of texts) for (const ch of t) if (isHan(ch)) detailChars.add(ch);
}
for (const ch of chartChars) detailChars.delete(ch);

// ───────────────────────── 7. write ─────────────────────────

const outDir = join(ROOT, 'src', 'data', 'generated');
mkdirSync(outDir, { recursive: true });
mkdirSync(join(ROOT, 'reports'), { recursive: true });
const write = (name: string, data: unknown, pretty = true) =>
  writeFileSync(join(outDir, name), JSON.stringify(data, null, pretty ? 1 : 0) + '\n');
/** One record per line: small on disk, and a data change shows up as a one-line diff. */
const writeLines = (name: string, data: unknown[] | Record<string, unknown>) => {
  const body = Array.isArray(data)
    ? data.map((d) => JSON.stringify(d)).join(',\n')
    : Object.entries(data)
        .map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`)
        .join(',\n');
  writeFileSync(join(outDir, name), (Array.isArray(data) ? '[\n' : '{\n') + body + (Array.isArray(data) ? '\n]\n' : '\n}\n'));
};

const shown = (s: Syllable) => s.status === 'standard';
const toneCells = syllables.flatMap((s) => s.tones.map((t) => ({ s, t })));
const meta = {
  generatedAt: new Date().toISOString().slice(0, 10),
  sources: SOURCES,
  sourceVersions: sourceVersions(),
  thresholds: {
    T_SECONDARY_READING,
    COMMON_WORD_LEVEL,
    FALLBACK_WORD_LEVEL,
    EXAMPLE_WORD_LEVEL,
    OWN_ENTRY_MIN_PINLU,
    commonCharacters: 'Unihan kTGHZ2013 (the 8,105 characters of the Tōngyòng Guīfàn Hànzì Biǎo, 2013)',
    ranking:
      'HSK level band of the reading (1–3, 4–6, 7–9, none; complete-hsk-vocabulary, level field only), then the kHanyuPinlu count of the reading (Unihan). Characters that are words on their own are compared by their level as one-character words. An HSK one-character word lends its level to its main reading only.',
  },
  counts: {
    initials: INITIALS.length,
    finals: FINALS.length,
    syllables: syllables.length,
    syllablesStandard: syllables.filter(shown).length,
    syllablesSingleSource: syllables.filter((s) => !shown(s)).length,
    toneCells: toneCells.length,
    toneCellsStandard: toneCells.filter((x) => x.t.status === 'standard').length,
    toneCellsNeutralInWord: toneCells.filter((x) => x.t.status === 'neutral-in-word').length,
    toneCellsSingleSource: toneCells.filter((x) => x.t.status === 'single-source').length,
    cellsWithCharacter: Object.keys(cells).length,
    cellsWithFallbackWord: Object.values(cells).filter((c) => c.fallback).length,
    charactersUnverified: Object.values(cells).filter((c) => !c.verified).length,
    searchableCharacters: Object.keys(charIndex).length,
  },
  offGrid: offGrid.filter((o) => o.sources.length > 0).sort((a, b) => a.id.localeCompare(b.id)),
};

writeLines('syllables.json', syllables);
writeLines('cells.json', cells);
write('char-index.json', charIndex, false);
write('font-chars.json', { chart: [...chartChars].sort().join(''), detail: [...detailChars].sort().join('') });
write('data-meta.json', meta);

// ───────────────────────── 8. report ─────────────────────────

const line = (t: ToneCell) => {
  const a = attested.get(t.numeric)!;
  return `| ${t.display} | \`${t.numeric}\` | ${t.sources.join(', ')} | ${[...a.evidence].slice(0, 4).join(' ')} |`;
};
const DISPUTED = ['dia', 'lo', 'den', 'rua', 'nun', 'eng', 'ê', 'yo', 'o', 'ei', 'cei', 'kei', 'tei', 'fiao', 'zhei', 'shei', 'chua', 'nou', 'biang', 'bia', 'sei'];
const md: string[] = [];
md.push('# Data report', '', `Generated ${meta.generatedAt} by \`scripts/build-data.ts\`. Do not edit by hand.`, '');
md.push('## Counts', '', '```json', JSON.stringify(meta.counts, null, 2), '```', '');
md.push(
  '## How `verified` is decided',
  '',
  'Four independent dictionary sources are compared: CC-CEDICT, and three fields of the Unicode Han Database,',
  '`kXHC1983` (Xiàndài Hànyǔ Cídiǎn), `kTGHZ2013` (Tōngyòng Guīfàn Hànzì Zìdiǎn) and `kHanyuPinlu` (Xiàndài Hànyǔ Pínlǜ Cídiǎn).',
  '',
  '- A syllable or tone cell is `verified` when at least two of the four attest it. These are `status: "standard"`.',
  '- `status: "neutral-in-word"`: a neutral-tone reading that CC-CEDICT gives inside a common word (an HSK word up to level ' +
    COMMON_WORD_LEVEL +
    '). No second machine-readable source exists for these, so they are shown but `verified: false`.',
  '- `status: "single-source"`: only one source attests it. Kept in the data, hidden on the chart unless "show unverified" is on.',
  '- An example character is `verified` when Unihan confirms that the character has that reading.',
  '',
);
md.push('## Rare and disputed cells', '', '| Syllable | On chart | Sources | Tones attested | Evidence |', '|---|---|---|---|---|');
for (const id of DISPUTED) {
  const s = syllables.find((x) => x.id === id);
  const og = offGrid.find((x) => x.id === id);
  if (s) {
    md.push(
      `| ${id} | ${s.status === 'standard' ? 'yes' : 'hidden (single source)'} | ${s.sources.join(', ')} | ${s.tones
        .map((t) => `${t.display}${t.status === 'standard' ? '' : ' (' + t.status + ')'}`)
        .join(', ')} | ${[...new Set(s.tones.flatMap((t) => [...attested.get(t.numeric)!.evidence]))].slice(0, 5).join(' ')} |`,
    );
  } else if (og) {
    md.push(`| ${id} | no, off-grid (no column for it among the 36 finals) | ${og.sources.join(', ')} | ${og.tones.join(', ')} | ${og.evidence.join(' ')} |`);
  } else {
    md.push(`| ${id} | no | not attested in any source | | |`);
  }
}
md.push('');
md.push('## Off-grid syllables', '', 'Attested, but not expressible as one of 22 rows × 36 columns. Not on the chart.', '');
for (const o of meta.offGrid) md.push(`- \`${o.id}\` tones ${o.tones.join(',')} (${o.sources.join(', ')}): ${o.evidence.join(' ')}`);
md.push('');
md.push('## Single-source syllables (hidden by default)', '');
for (const s of syllables.filter((x) => !shown(x))) md.push(`- \`${s.id}\` (${s.sources.join(', ')}): ${s.tones.map((t) => t.display).join(', ')}`);
md.push('');
md.push('## Single-source tone cells on standard syllables (hidden by default)', '', '| Cell | id | Source | Evidence |', '|---|---|---|---|');
for (const { s, t } of toneCells) if (shown(s) && t.status === 'single-source') md.push(line(t));
md.push('');
md.push('## Neutral-tone cells resting on CC-CEDICT alone (shown, unverified)', '');
md.push(
  toneCells
    .filter((x) => x.t.status === 'neutral-in-word')
    .map((x) => `${x.t.numeric}${cells[x.t.numeric] ? ' ' + (cells[x.t.numeric].fallbackWord?.word ?? cells[x.t.numeric].character) : ''}`)
    .join(', '),
  '',
);
md.push(`Neutral readings found only inside uncommon words were dropped entirely (${droppedNeutral.length}): ${droppedNeutral.sort().join(', ')}`, '');
md.push('## Tone cells with no example character', '', 'Shown cells where nothing common enough exists. Left blank on purpose.', '');
md.push(
  toneCells
    .filter((x) => x.t.status !== 'single-source' && !cells[x.t.numeric])
    .map((x) => x.t.numeric)
    .join(', '),
  '',
);
md.push('## Example characters marked unverified', '', '| Cell | Character | Reason |', '|---|---|---|');
for (const [id, c] of Object.entries(cells)) if (!c.verified) md.push(`| \`${id}\` | ${c.character}${c.fallbackWord ? ' (' + c.fallbackWord.word + ')' : ''} | ${c.unverifiedReason} |`);
md.push('');
md.push('## Cells using a fallback word', '', 'The character does not stand alone as a word with this reading, so a common word carries it.', '');
md.push(
  Object.entries(cells)
    .filter(([, c]) => c.fallback)
    .map(([id, c]) => `${id} ${c.character}→${c.fallbackWord!.word}`)
    .join(', '),
  '',
);
md.push('## Syllables tagged `rare`', '', 'No tone has an example character among the 8,105 standard characters (kTGHZ2013).', '');
md.push(syllables.filter((s) => s.tags.includes('rare')).map((s) => s.id).join(', '), '');
// Which rejections in curation.ts still change a pick: without the rejection, would the rejected character be chosen?
const curationCheck: { key: string; c: string; needed: boolean }[] = [];
for (const [key, list] of Object.entries(REJECT)) {
  const base = key.slice(0, -1);
  const tone = Number(key.slice(-1)) as Tone;
  for (const c of list) {
    REJECT[key] = list.filter((x) => x !== c);
    curationCheck.push({ key, c, needed: chooseExample(base, tone)?.character === c });
    REJECT[key] = list;
  }
}
md.push('## Curation check', '', 'Each rejection in `scripts/curation.ts`, and whether the automatic choice would otherwise pick that character.', '');
md.push(curationCheck.map((x) => `\`${x.key}\` ${x.c}: ${x.needed ? 'still needed' : 'not picked without it'}`).join(', '), '');
writeFileSync(join(ROOT, 'reports', 'data-report.md'), md.join('\n'));
console.log('curation not needed:', curationCheck.filter((x) => !x.needed).map((x) => `${x.key} ${x.c}`).join(', ') || 'none');

console.log(meta.counts);
console.log('off-grid:', meta.offGrid.map((o) => o.id).join(' '));
console.log('single-source syllables:', syllables.filter((s) => !shown(s)).map((s) => s.id).join(' '));
console.log(`font characters: chart ${chartChars.size}, detail-only ${detailChars.size}`);
