/**
 * Search: "zhi", "zhī", "zhi1" or a character all resolve to a tone cell.
 * The character index (about 5,400 characters) is loaded on first use.
 */
import { SYLLABLES, SYLLABLE_BY_ID, TONE_CELL, type Syllable } from '../data';
import { splitTone, type Tone } from './pinyin';
import { overrides, syllableVisible, cellVisible, settings, resolveExample } from './store';

export interface SearchHit {
  syllable: Syllable;
  tone: Tone | null;
  /** What matched, for display: the character, or nothing for a pinyin match. */
  via?: string;
}

let charIndex: Record<string, string> | null = null;
let charIndexPromise: Promise<Record<string, string>> | null = null;
export function loadCharIndex(): Promise<Record<string, string>> {
  charIndexPromise ??= import('../data/generated/char-index.json').then((m) => (charIndex = m.default as Record<string, string>));
  return charIndexPromise;
}

const HAN = /\p{Script=Han}/u;

export function search(query: string, limit = 8): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const showUnverified = settings.value.showUnverified;
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  const add = (syllable: Syllable, tone: Tone | null, via?: string) => {
    if (!syllableVisible(syllable, showUnverified)) return;
    if (tone && !syllable.tones.some((t) => t.tone === tone && cellVisible(t, showUnverified))) tone = null;
    const key = `${syllable.id}|${tone ?? ''}|${via ?? ''}`;
    if (seen.has(key) || hits.length >= limit) return;
    seen.add(key);
    hits.push({ syllable, tone, via });
  };

  const hanChars = Array.from(q).filter((ch) => HAN.test(ch));
  if (hanChars.length) {
    for (const ch of hanChars) {
      // The user's own characters first, then the bundled examples, then the wider index.
      for (const cell of Object.keys(overrides.value)) {
        if (overrides.value[cell].character === ch && TONE_CELL[cell]) add(TONE_CELL[cell].syllable, TONE_CELL[cell].cell.tone, ch);
      }
      for (const s of SYLLABLES) {
        for (const t of s.tones) if (resolveExample(t.numeric).character === ch) add(s, t.tone, ch);
      }
      for (const key of charIndex?.[ch]?.split(' ') ?? []) {
        const hit = TONE_CELL[key];
        if (hit) add(hit.syllable, hit.cell.tone, ch);
      }
    }
    return hits;
  }

  const { base, tone } = splitTone(q.replace(/\s+/g, ''));
  if (!base) return hits;
  const exact = SYLLABLE_BY_ID[base];
  if (exact) add(exact, tone);
  for (const s of SYLLABLES) if (s.id.startsWith(base) && s.id !== base) add(s, tone);
  // Typed without the umlaut: "nu" should also offer nü, "lue" lüe.
  for (const s of SYLLABLES) {
    if (s.id.includes('ü') && s.id.replace(/ü/g, 'u').startsWith(base) && s.id !== base) add(s, tone);
  }
  return hits;
}
