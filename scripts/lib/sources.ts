/**
 * Loaders for the raw source files under .cache/sources/.
 * Nothing here decides anything; it only turns each source into plain data.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitTone, normaliseUmlaut, type Tone } from '../../src/lib/pinyin';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CACHE = join(ROOT, '.cache', 'sources');

export const SOURCES = {
  cedict: {
    name: 'CC-CEDICT',
    url: 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz',
    homepage: 'https://www.mdbg.net/chinese/dictionary?page=cc-cedict',
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    author: 'MDBG and CC-CEDICT contributors',
  },
  unihan: {
    name: 'Unicode Han Database (Unihan)',
    url: 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip',
    homepage: 'https://www.unicode.org/reports/tr38/',
    licence: 'Unicode License v3',
    licenceUrl: 'https://www.unicode.org/license.txt',
    author: 'Unicode, Inc.',
  },
  hsk: {
    name: 'complete-hsk-vocabulary',
    url: 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json',
    homepage: 'https://github.com/drkameleon/complete-hsk-vocabulary',
    licence: 'MIT',
    licenceUrl: 'https://github.com/drkameleon/complete-hsk-vocabulary/blob/main/LICENSE',
    author: 'Yanis Zafirópulos (drkameleon)',
  },
} as const;

const HAN = /^\p{Script=Han}$/u;
export const isHan = (ch: string) => HAN.test(ch);

export interface Reading {
  base: string;
  tone: Tone;
}
export const readingKey = (r: Reading) => `${r.base}${r.tone}`;

// ───────────────────────── versions ─────────────────────────

/** The release of each cached source, read from the files themselves. */
export function sourceVersions(): Record<string, string> {
  const cedictHead = readFileSync(join(CACHE, 'cedict', 'cedict.txt'), 'utf8').slice(0, 3000);
  const unihanHead = readFileSync(join(CACHE, 'unihan', 'Unihan_Readings.txt'), 'utf8').slice(0, 600);
  const hskPath = join(CACHE, 'hsk', 'complete.json');
  return {
    cedict: `release of ${cedictHead.match(/^#! date=(\S+)/m)?.[1].slice(0, 10) ?? 'unknown date'}`,
    unihan: `Unicode ${unihanHead.match(/^# Unicode Version (\S+)/m)?.[1] ?? '?'}`,
    hsk: existsSync(hskPath) ? `main branch, retrieved ${statSync(hskPath).mtime.toISOString().slice(0, 10)}` : 'not downloaded',
  };
}

// ───────────────────────── CC-CEDICT ─────────────────────────

export interface CedictEntry {
  trad: string;
  simp: string;
  /** Raw syllables as printed, e.g. ['Bei3', 'jing1']. */
  pinyin: string[];
  defs: string[];
  /** True when any syllable is capitalised (a proper noun or surname entry). */
  proper: boolean;
  /** Per-character readings, when characters and syllables line up one to one. */
  aligned: (Reading | null)[] | null;
}

/** 'lu:4' → { base: 'lü', tone: 4 }. Returns null for letters, 'xx5', erhua 'r5', etc. */
export function parseCedictSyllable(raw: string): Reading | null {
  const m = raw.match(/^([A-Za-z:]+)([1-5])$/);
  if (!m) return null;
  const base = normaliseUmlaut(m[1].toLowerCase());
  if (base === 'xx' || base === 'r') return null;
  return { base, tone: Number(m[2]) as Tone };
}

export function loadCedict(): CedictEntry[] {
  const text = readFileSync(join(CACHE, 'cedict', 'cedict.txt'), 'utf8');
  const out: CedictEntry[] = [];
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/);
    if (!m) continue;
    const [, trad, simp, py, defs] = m;
    const pinyin = py.trim().split(/\s+/);
    const chars = Array.from(simp);
    let aligned: (Reading | null)[] | null = null;
    if (chars.length === pinyin.length) {
      aligned = chars.map((ch, i) => (isHan(ch) ? parseCedictSyllable(pinyin[i]) : null));
    }
    out.push({
      trad,
      simp,
      pinyin,
      defs: defs.split('/'),
      proper: pinyin.some((p) => /^[A-Z]/.test(p)),
      aligned,
    });
  }
  return out;
}

// ───────────────────────── Unihan ─────────────────────────

export interface UnihanChar {
  /** kMandarin: most customary reading(s); first is the zh-Hans preference. */
  mandarin: Reading[];
  /** kXHC1983: readings in Xiàndài Hànyǔ Cídiǎn (a standard modern dictionary). */
  xhc: Reading[];
  /** kTGHZ2013: readings in Tōngyòng Guīfàn Hànzì Zìdiǎn (the 8,105 standard characters). */
  tghz: Reading[];
  /** kHanyuPinlu: per-reading counts from Xiàndài Hànyǔ Pínlǜ Cídiǎn. */
  pinlu: { reading: Reading; count: number }[];
  /** Listed in kTGHZ2013, i.e. one of the 8,105 characters of the Tōngyòng Guīfàn Hànzì Biǎo (2013). */
  standard: boolean;
}

function unihanReading(marked: string): Reading | null {
  const { base, tone } = splitTone(marked.replace(/\*/g, ''));
  if (!base || !/^[a-zêü]+$/.test(base)) return null;
  return { base, tone: tone ?? 5 };
}

export function loadUnihan(): Map<string, UnihanChar> {
  const text = readFileSync(join(CACHE, 'unihan', 'Unihan_Readings.txt'), 'utf8');
  const map = new Map<string, UnihanChar>();
  const get = (ch: string) => {
    let v = map.get(ch);
    if (!v) map.set(ch, (v = { mandarin: [], xhc: [], tghz: [], pinlu: [], standard: false }));
    return v;
  };
  const uniq = (rs: Reading[]) => [...new Map(rs.map((r) => [readingKey(r), r])).values()];
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [cp, field, value] = line.split('\t');
    if (!value) continue;
    const ch = String.fromCodePoint(parseInt(cp.slice(2), 16));
    if (field === 'kMandarin') {
      get(ch).mandarin = value.split(/\s+/).map(unihanReading).filter((r): r is Reading => !!r);
    } else if (field === 'kXHC1983' || field === 'kTGHZ2013') {
      const rs = value
        .split(/\s+/)
        .flatMap((item) => item.slice(item.lastIndexOf(':') + 1).split(','))
        .map(unihanReading)
        .filter((r): r is Reading => !!r);
      if (field === 'kXHC1983') get(ch).xhc = uniq(rs);
      else {
        get(ch).tghz = uniq(rs);
        get(ch).standard = true;
      }
    } else if (field === 'kHanyuPinlu') {
      get(ch).pinlu = value
        .split(/\s+/)
        .map((item) => {
          const m = item.match(/^(.+)\((\d+)\)$/);
          const r = m && unihanReading(m[1]);
          return r ? { reading: r, count: Number(m![2]) } : null;
        })
        .filter((x): x is { reading: Reading; count: number } => !!x);
    }
  }
  return map;
}

// ───────────────────────── HSK ─────────────────────────

/**
 * Only the word and its HSK level(s) are read. The list's other fields
 * (frequency, part of speech, radical) come from other sources and are not used.
 */
export interface HskWord {
  simplified: string;
  level: string[];
}

export function loadHsk(): Map<string, HskWord> {
  const path = join(CACHE, 'hsk', 'complete.json');
  const map = new Map<string, HskWord>();
  if (!existsSync(path)) return map;
  for (const w of JSON.parse(readFileSync(path, 'utf8')) as { simplified: string; level: string[] }[]) {
    map.set(w.simplified, { simplified: w.simplified, level: w.level });
  }
  return map;
}
