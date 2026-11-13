/**
 * Links between syllables that learners mix up, from the spec:
 *   zh ↔ j ↔ z,  ch ↔ q ↔ c,  sh ↔ x ↔ s,  in ↔ ing,  en ↔ eng,  u ↔ ü
 *
 * A link is only offered when the other syllable actually exists.
 * To add a pair, extend INITIAL_SETS or FINAL_PAIRS below.
 */
import { SYLLABLE_BY_ID, syllableAt, type Syllable } from './index';

/** Initials confused with each other, as (retroflex, palatal, dental). */
const INITIAL_SETS: [string, string, string][] = [
  ['zh', 'j', 'z'],
  ['ch', 'q', 'c'],
  ['sh', 'x', 's'],
];

/**
 * j, q and x only take i- and ü- finals, so the counterpart of zha is jia, not
 * "ja". This maps a final used after zh/ch/sh/z/c/s to the nearest one used
 * after j/q/x. It is a spelling correspondence for finding the neighbouring
 * square, not a claim that the two vowels sound the same.
 */
const TO_PALATAL: Record<string, string> = {
  i: 'i',
  a: 'ia',
  ao: 'iao',
  an: 'ian',
  ang: 'iang',
  ou: 'iu',
  ong: 'iong',
  en: 'in',
  eng: 'ing',
  u: 'ü',
  uan: 'üan',
  un: 'ün',
};
const FROM_PALATAL: Record<string, string> = Object.fromEntries(Object.entries(TO_PALATAL).map(([k, v]) => [v, k]));

/** Finals confused with each other; applied with the same initial. */
const FINAL_PAIRS: [string, string, string][] = [
  ['in', 'ing', 'in ↔ ing'],
  ['en', 'eng', 'en ↔ eng'],
  ['u', 'ü', 'u ↔ ü'],
  ['uan', 'üan', 'u ↔ ü'],
  ['un', 'ün', 'u ↔ ü'],
];

export interface Confusable {
  syllable: Syllable;
  /** Why it is listed, e.g. "zh ↔ j ↔ z". */
  reason: string;
}

export function confusablesFor(s: Syllable): Confusable[] {
  const out: Confusable[] = [];
  const add = (other: Syllable | undefined, reason: string) => {
    if (other && other.status === 'standard' && other.id !== s.id && !out.some((o) => o.syllable.id === other.id)) {
      out.push({ syllable: other, reason });
    }
  };

  for (const set of INITIAL_SETS) {
    const idx = set.indexOf(s.initial);
    if (idx < 0) continue;
    const reason = set.join(' ↔ ');
    const [retroflex, palatal, dental] = set;
    if (idx === 1) {
      // From j/q/x out to the retroflex and dental rows.
      const plain = FROM_PALATAL[s.final];
      if (plain) {
        add(syllableAt(retroflex, plain), reason);
        add(syllableAt(dental, plain), reason);
      }
    } else {
      add(syllableAt(idx === 0 ? dental : retroflex, s.final), reason);
      const pal = TO_PALATAL[s.final];
      if (pal) add(syllableAt(palatal, pal), reason);
    }
  }

  for (const [a, b, reason] of FINAL_PAIRS) {
    if (s.final === a) add(syllableAt(s.initial, b), reason);
    if (s.final === b) add(syllableAt(s.initial, a), reason);
  }

  return out;
}

export const syllableExists = (id: string) => id in SYLLABLE_BY_ID;
