/**
 * Minimal pairs built from the data: two syllables that differ in one
 * feature learners confuse, both with audio. Pure, so it can be tested.
 */
import { SYLLABLES, hasNativeAudio, syllableAt, type Syllable, type ToneCell } from '../data';
import type { Tone } from '../lib/pinyin';

export interface PairCell {
  cell: ToneCell;
  syllable: Syllable;
}
export interface MinimalPair {
  a: PairCell;
  b: PairCell;
  /** Which contrast this pair trains, e.g. "zh / j". */
  contrast: string;
  kind: 'initial' | 'aspiration' | 'final' | 'tone';
}

/** zh/ch/sh ↔ j/q/x ↔ z/c/s, as the chart's confusables do it. */
const RETRO_PAL_DENTAL: [string, string, string][] = [
  ['zh', 'j', 'z'],
  ['ch', 'q', 'c'],
  ['sh', 'x', 's'],
];
/** A final after zh/z written as its j/q/x counterpart. */
const TO_PALATAL: Record<string, string> = { i: 'i', a: 'ia', ao: 'iao', an: 'ian', ang: 'iang', ou: 'iu', ong: 'iong', en: 'in', eng: 'ing', u: 'ü', uan: 'üan', un: 'ün' };
const ASPIRATION: [string, string][] = [
  ['b', 'p'],
  ['d', 't'],
  ['g', 'k'],
  ['j', 'q'],
  ['zh', 'ch'],
  ['z', 'c'],
];
const FINALS: [string, string, string][] = [
  ['in', 'ing', 'in / ing'],
  ['en', 'eng', 'en / eng'],
  ['u', 'ü', 'u / ü'],
  ['uan', 'üan', 'u / ü'],
  ['un', 'ün', 'u / ü'],
];

const visible = (s: Syllable | undefined): Syllable | undefined => (s && s.status === 'standard' ? s : undefined);
const withAudio = (s: Syllable, tone: Tone): ToneCell | undefined => s.tones.find((t) => t.tone === tone && t.status !== 'single-source' && hasNativeAudio(t.numeric));

/** Every minimal pair the data supports, each listed once. */
export function buildPairs(): MinimalPair[] {
  const out: MinimalPair[] = [];
  const seen = new Set<string>();
  const add = (a: Syllable | undefined, b: Syllable | undefined, contrast: string, kind: MinimalPair['kind']) => {
    if (!a || !b || a.id === b.id) return;
    // Same tone on both sides, so only the contrast differs.
    for (const tone of [1, 2, 3, 4] as Tone[]) {
      const ca = withAudio(a, tone);
      const cb = withAudio(b, tone);
      if (!ca || !cb) continue;
      const key = [ca.numeric, cb.numeric].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ a: { cell: ca, syllable: a }, b: { cell: cb, syllable: b }, contrast, kind });
    }
  };
  for (const s of SYLLABLES) {
    if (s.status !== 'standard') continue;
    for (const [retro, pal, dental] of RETRO_PAL_DENTAL) {
      if (s.initial === retro) {
        add(s, visible(syllableAt(dental, s.final)), `${retro} / ${dental}`, 'initial');
        const p = TO_PALATAL[s.final];
        if (p) add(s, visible(syllableAt(pal, p)), `${retro} / ${pal}`, 'initial');
      }
      if (s.initial === dental) {
        const p = TO_PALATAL[s.final];
        if (p) add(s, visible(syllableAt(pal, p)), `${dental} / ${pal}`, 'initial');
      }
    }
    for (const [plain, asp] of ASPIRATION) if (s.initial === plain) add(s, visible(syllableAt(asp, s.final)), `${plain} / ${asp}`, 'aspiration');
    for (const [fa, fb, label] of FINALS) if (s.final === fa) add(s, visible(syllableAt(s.initial, fb)), label, 'final');
  }
  // The same syllable in two different tones.
  for (const s of SYLLABLES) {
    if (s.status !== 'standard') continue;
    const cells = s.tones.filter((t) => t.tone !== 5 && t.status !== 'single-source' && hasNativeAudio(t.numeric));
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++) {
        const key = [cells[i].numeric, cells[j].numeric].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ a: { cell: cells[i], syllable: s }, b: { cell: cells[j], syllable: s }, contrast: `tone ${cells[i].tone} / ${cells[j].tone}`, kind: 'tone' });
      }
  }
  return out;
}

export const PAIR_KINDS: { id: MinimalPair['kind']; label: string }[] = [
  { id: 'initial', label: 'zh / j / z, ch / q / c, sh / x / s' },
  { id: 'aspiration', label: 'Aspirated or not (b / p, d / t, g / k, j / q, zh / ch, z / c)' },
  { id: 'final', label: 'in / ing, en / eng, u / ü' },
  { id: 'tone', label: 'Same syllable, different tone' },
];
