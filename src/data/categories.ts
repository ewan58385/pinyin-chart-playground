/**
 * Sounds grouped by category, for the Browse pages. Membership is derived
 * from what the data already says: the type of each final, the difficulty
 * group of each initial, and the tags on each syllable. Nothing is typed in
 * by hand here; where the underlying label is a judgement call, the note
 * from the data is carried along and shown on the page.
 */
import { SYLLABLES, type Syllable } from './index';
import { FINAL_BY_ID } from './finals';
import { INITIALS, INITIAL_BY_ID, type Difficulty } from './initials';
import { DIFFICULTY_LABEL, TAG_BY_ID } from './tags';

export type CategoryKind = 'final' | 'spelling' | 'initial';

export interface Category {
  /** Route segment: #/browse/nasal. ASCII only. */
  id: string;
  kind: CategoryKind;
  label: string;
  /** One line, from the tag or difficulty label in the data. */
  description: string;
  /** Shown when the membership rests on a flagged judgement call in the data. */
  note?: string;
  /** How the page groups its cards. */
  groupBy: 'final' | 'initial';
  match: (s: Syllable) => boolean;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const byTag = (id: string, tag: string, kind: CategoryKind, groupBy: Category['groupBy'], extra: Partial<Category> = {}): Category => ({
  id,
  kind,
  label: cap(TAG_BY_ID[tag].label),
  description: TAG_BY_ID[tag].explain,
  groupBy,
  match: (s) => s.tags.includes(tag),
  ...extra,
});

const initialsOf = (d: Difficulty) => INITIALS.filter((i) => i.difficulty === d).map((i) => i.display);
const unverifiedNote = (d: Difficulty) =>
  INITIALS.filter((i) => i.difficulty === d && !i.difficultyVerified && i.note)
    .map((i) => i.note)
    .join(' ');

const byDifficulty = (d: Difficulty): Category => ({
  id: d,
  kind: 'initial',
  label: `${cap(d)} initials`,
  description: `Initials the data labels “${DIFFICULTY_LABEL[d]}”: ${initialsOf(d).join(', ')}.`,
  ...(unverifiedNote(d) ? { note: unverifiedNote(d) } : {}),
  groupBy: 'initial',
  match: (s) => INITIAL_BY_ID[s.initial].difficulty === d,
});

const erNote = !FINAL_BY_ID.er.typeVerified ? FINAL_BY_ID.er.note : undefined;

export const CATEGORIES: Category[] = [
  byTag('simple', 'simple', 'final', 'final'),
  byTag('compound', 'compound', 'final', 'final', erNote ? { note: erNote } : {}),
  byTag('nasal', 'nasal', 'final', 'final'),
  byTag('front-nasal', 'front-nasal', 'final', 'final'),
  byTag('back-nasal', 'back-nasal', 'final', 'final'),
  byTag('fake-i', 'fake-i', 'spelling', 'initial'),
  byTag('umlaut-u', 'ü-as-u', 'spelling', 'initial'),
  byTag('o-as-uo', 'o-as-uo', 'spelling', 'initial'),
  byTag('hidden-vowel', 'hidden-vowel', 'spelling', 'final'),
  byTag('y-w', 'spelling-variant', 'spelling', 'final'),
  byDifficulty('easy'),
  byDifficulty('tougher'),
  byDifficulty('problem'),
  byTag('null-initial', 'null-initial', 'initial', 'final'),
  byTag('unaspirated', 'unaspirated', 'initial', 'initial'),
  byTag('aspirated', 'aspirated', 'initial', 'initial'),
  byTag('retroflex', 'retroflex', 'initial', 'initial'),
  byTag('palatal', 'palatal', 'initial', 'initial'),
  byTag('dental-sibilant', 'dental-sibilant', 'initial', 'initial'),
];

export const CATEGORY_BY_ID: Record<string, Category> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export const CATEGORY_SECTIONS: { kind: CategoryKind; title: string; blurb: string }[] = [
  { kind: 'final', title: 'Finals by type', blurb: 'The type each final has in the finals table, and the two kinds of nasal ending.' },
  { kind: 'spelling', title: 'Spelling that differs from the sound', blurb: 'Syllables carrying one of the spelling tags.' },
  { kind: 'initial', title: 'Initials by difficulty and articulation', blurb: 'The difficulty group of each initial, and the articulation tags on the rows.' },
];

/** The syllables of a category, in chart order. Hidden single-source syllables are included only when asked for. */
export function categorySyllables(c: Category, showUnverified = false): Syllable[] {
  return SYLLABLES.filter((s) => (showUnverified || s.status === 'standard') && c.match(s));
}
