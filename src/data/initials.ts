/**
 * The 21 initials plus the null initial (∅), in chart row order.
 * Row order follows the reference chart (hard initials grouped together),
 * not textbook b-p-m-f order throughout.
 */

export type Difficulty = 'easy' | 'tougher' | 'problem';

export interface Initial {
  /** '' for the null initial. */
  id: string;
  display: string;
  /** Visual block the row belongs to; a rule is drawn between blocks. */
  block: string;
  difficulty: Difficulty | null;
  /** False where the difficulty group is my reading of an ambiguous spec. */
  difficultyVerified: boolean;
  /** Articulation tags, inherited by every syllable on the row. */
  tags: string[];
  note?: string;
}

export const NULL_INITIAL = '';

export const INITIALS: Initial[] = [
  { id: '', display: '∅', block: 'null', difficulty: null, difficultyVerified: true, tags: ['null-initial'] },

  { id: 'b', display: 'b', block: 'labial', difficulty: 'tougher', difficultyVerified: true, tags: ['unaspirated'] },
  { id: 'p', display: 'p', block: 'labial', difficulty: 'tougher', difficultyVerified: true, tags: ['aspirated'] },
  { id: 'm', display: 'm', block: 'labial', difficulty: 'easy', difficultyVerified: true, tags: [] },
  { id: 'f', display: 'f', block: 'labial', difficulty: 'easy', difficultyVerified: true, tags: [] },

  { id: 'd', display: 'd', block: 'alveolar', difficulty: 'tougher', difficultyVerified: true, tags: ['unaspirated'] },
  { id: 't', display: 't', block: 'alveolar', difficulty: 'tougher', difficultyVerified: true, tags: ['aspirated'] },
  { id: 'n', display: 'n', block: 'alveolar', difficulty: 'easy', difficultyVerified: true, tags: [] },
  { id: 'l', display: 'l', block: 'alveolar', difficulty: 'easy', difficultyVerified: true, tags: [] },

  { id: 'z', display: 'z', block: 'sibilant', difficulty: 'problem', difficultyVerified: true, tags: ['unaspirated', 'dental-sibilant'] },
  { id: 'c', display: 'c', block: 'sibilant', difficulty: 'problem', difficultyVerified: true, tags: ['aspirated', 'dental-sibilant'] },
  {
    id: 's',
    display: 's',
    block: 'sibilant',
    difficulty: 'easy',
    difficultyVerified: false,
    tags: ['dental-sibilant'],
    note:
      's is close to English, but keep it apart from sh and x: the three are easy to mix up.',
  },

  { id: 'zh', display: 'zh', block: 'retroflex', difficulty: 'problem', difficultyVerified: true, tags: ['unaspirated', 'retroflex'] },
  { id: 'ch', display: 'ch', block: 'retroflex', difficulty: 'problem', difficultyVerified: true, tags: ['aspirated', 'retroflex'] },
  { id: 'sh', display: 'sh', block: 'retroflex', difficulty: 'problem', difficultyVerified: true, tags: ['retroflex'] },
  { id: 'r', display: 'r', block: 'retroflex', difficulty: 'problem', difficultyVerified: true, tags: ['retroflex'] },

  { id: 'j', display: 'j', block: 'palatal', difficulty: 'problem', difficultyVerified: true, tags: ['unaspirated', 'palatal'] },
  { id: 'q', display: 'q', block: 'palatal', difficulty: 'problem', difficultyVerified: true, tags: ['aspirated', 'palatal'] },
  { id: 'x', display: 'x', block: 'palatal', difficulty: 'problem', difficultyVerified: true, tags: ['palatal'] },

  { id: 'g', display: 'g', block: 'velar', difficulty: 'tougher', difficultyVerified: true, tags: ['unaspirated'] },
  { id: 'k', display: 'k', block: 'velar', difficulty: 'tougher', difficultyVerified: true, tags: ['aspirated'] },
  { id: 'h', display: 'h', block: 'velar', difficulty: 'tougher', difficultyVerified: true, tags: [] },
];

export const INITIAL_BY_ID: Record<string, Initial> = Object.fromEntries(INITIALS.map((x) => [x.id, x]));
export const INITIAL_INDEX: Record<string, number> = Object.fromEntries(INITIALS.map((x, i) => [x.id, i]));

/** y and w are spelling devices, not initials. They never get a row. */
export const PSEUDO_INITIALS = ['y', 'w'] as const;
export type PseudoInitial = (typeof PSEUDO_INITIALS)[number];
