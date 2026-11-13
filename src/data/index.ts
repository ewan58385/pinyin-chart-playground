/**
 * Bundled, read-only chart data. Everything here ships with the app and is
 * replaced on update. Nothing the user creates is stored in these structures.
 */
import syllablesJson from './generated/syllables.json';
import cellsJson from './generated/cells.json';
import metaJson from './generated/data-meta.json';
import audioJson from './generated/audio-index.json';
import type { Tone } from '../lib/pinyin';
import { FINALS, FINAL_BY_ID, type FinalGroup, type FinalType } from './finals';
import { INITIALS, INITIAL_BY_ID, type Difficulty } from './initials';

export type CellStatus = 'standard' | 'neutral-in-word' | 'single-source';

export interface ToneCell {
  tone: Tone;
  /** Printed form with tone mark, e.g. mā. */
  display: string;
  /** Numeric form and stable id, e.g. ma1. */
  numeric: string;
  verified: boolean;
  status: CellStatus;
  sources: string[];
}

export interface Syllable {
  id: string;
  /** ü written as v, for filenames. */
  ascii: string;
  /** Row id; '' is the null initial. */
  initial: string;
  /** Column id (surface final). */
  final: string;
  pseudoInitial: 'y' | 'w' | null;
  tags: string[];
  verified: boolean;
  status: 'standard' | 'single-source';
  sources: string[];
  tones: ToneCell[];
}

export interface ExampleWord {
  word: string;
  pinyin: string;
  meaning: string;
}

export interface CellExample {
  character: string;
  pinyin: string;
  meaning: string;
  frequencyRank: number | null;
  /** Present when the character is not a word by itself; fallbackWord carries it. */
  fallback?: 'word';
  fallbackWord?: ExampleWord;
  verified: boolean;
  unverifiedReason?: string;
  words: ExampleWord[];
}

export const SYLLABLES = syllablesJson as unknown as Syllable[];
export const CELLS = cellsJson as unknown as Record<string, CellExample>;
export const DATA_META = metaJson;

export const SYLLABLE_BY_ID: Record<string, Syllable> = Object.fromEntries(SYLLABLES.map((s) => [s.id, s]));

/** "initial|final" → syllable. An absent key is a real gap in Mandarin. */
export const GRID: Record<string, Syllable> = Object.fromEntries(SYLLABLES.map((s) => [`${s.initial}|${s.final}`, s]));
export const syllableAt = (initial: string, final: string): Syllable | undefined => GRID[`${initial}|${final}`];

/** Tone cell id (ma1) → its syllable and tone cell. */
export const TONE_CELL: Record<string, { syllable: Syllable; cell: ToneCell }> = {};
for (const s of SYLLABLES) for (const t of s.tones) TONE_CELL[t.numeric] = { syllable: s, cell: t };

export interface SyllableInfo {
  group: FinalGroup;
  finalType: FinalType;
  difficulty: Difficulty | null;
}
export const syllableInfo = (s: Syllable): SyllableInfo => ({
  group: FINAL_BY_ID[s.final].group,
  finalType: FINAL_BY_ID[s.final].type,
  difficulty: INITIAL_BY_ID[s.initial].difficulty,
});

// ───────────────────────── native audio index ─────────────────────────

export interface AudioSource {
  name: string;
  url: string;
  licence: string;
  licenceUrl: string;
  author: string;
  note?: string;
}
const audio = audioJson as unknown as {
  generatedAt: string;
  sources: Record<string, AudioSource>;
  totalBytes: number;
  notes: string[];
  unverified: Record<string, string>;
  clips: Record<string, [number, number, string]>;
};
export const AUDIO_SOURCES = audio.sources;
export const AUDIO_TOTAL_BYTES = audio.totalBytes;
export const AUDIO_NOTES = audio.notes;
export const AUDIO_UNVERIFIED = audio.unverified;
export const AUDIO_CLIPS = audio.clips;
export const hasNativeAudio = (cellId: string): boolean => cellId in AUDIO_CLIPS;

export { FINALS, INITIALS };
