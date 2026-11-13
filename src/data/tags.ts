/**
 * Labels and one-line explanations for the tags on syllables.
 * The explanations are standard descriptions of Mandarin phonetics and pinyin
 * spelling rules, kept short. Your own impressions belong in the notes.
 */

export interface TagInfo {
  id: string;
  label: string;
  explain: string;
  /** Which filter section the tag sits in. */
  kind: 'spelling' | 'initial' | 'final' | 'other';
}

export const TAGS: TagInfo[] = [
  {
    id: 'fake-i',
    label: 'fake i',
    kind: 'spelling',
    explain: 'After zh, ch, sh, r, z, c and s the letter i is not the i of ji or yi. The consonant is simply held and voiced.',
  },
  {
    id: 'ü-as-u',
    label: 'ü written u',
    kind: 'spelling',
    explain: 'After j, q, x and y the umlaut is dropped in writing, but the vowel is still ü.',
  },
  {
    id: 'o-as-uo',
    label: 'o said as uo',
    kind: 'spelling',
    explain: 'After b, p, m and f the final written o is pronounced like uo (buo, puo, muo, fuo).',
  },
  {
    id: 'hidden-vowel',
    label: 'hidden vowel',
    kind: 'spelling',
    explain: 'iu, ui and un are short for iou, uei and uen. The middle vowel is dropped in writing after an initial.',
  },
  {
    id: 'spelling-variant',
    label: 'y / w spelling',
    kind: 'spelling',
    explain: 'y and w are spelling devices, not initials. This is an i-, u- or ü- final standing on its own.',
  },
  {
    id: 'erhua',
    label: 'er / erhua',
    kind: 'spelling',
    explain: 'er is a syllable in its own right, and also appears as the -r suffix (erhua) added to other syllables.',
  },
  { id: 'null-initial', label: 'null initial', kind: 'initial', explain: 'No initial consonant: the syllable is just its final.' },
  { id: 'aspirated', label: 'aspirated', kind: 'initial', explain: 'Released with a strong puff of air (p, t, k, q, ch, c).' },
  {
    id: 'unaspirated',
    label: 'unaspirated',
    kind: 'initial',
    explain: 'Released without a puff of air (b, d, g, j, zh, z). The contrast with the aspirated partner is air, not voicing.',
  },
  { id: 'retroflex', label: 'retroflex', kind: 'initial', explain: 'zh, ch, sh, r: the tongue tip is raised and drawn back.' },
  { id: 'palatal', label: 'palatal', kind: 'initial', explain: 'j, q, x: made with the flat front of the tongue against the hard palate. Only before i- and ü- finals.' },
  { id: 'dental-sibilant', label: 'dental sibilant', kind: 'initial', explain: 'z, c, s: the tongue tip is forward, at the teeth.' },
  { id: 'simple', label: 'simple final', kind: 'final', explain: 'One of the six single-vowel finals: a, e, o, i, u, ü.' },
  { id: 'compound', label: 'compound final', kind: 'final', explain: 'A final made of more than one vowel sound.' },
  { id: 'nasal', label: 'nasal final', kind: 'final', explain: 'A final ending in -n or -ng.' },
  { id: 'front-nasal', label: 'front nasal -n', kind: 'final', explain: 'Ends in -n, with the tongue tip closing behind the upper teeth.' },
  { id: 'back-nasal', label: 'back nasal -ng', kind: 'final', explain: 'Ends in -ng, with the back of the tongue closing against the soft palate.' },
  { id: 'rare', label: 'rare', kind: 'other', explain: 'No tone of this syllable has a common example character.' },
];

export const TAG_BY_ID: Record<string, TagInfo> = Object.fromEntries(TAGS.map((t) => [t.id, t]));

export const DIFFICULTY_LABEL = {
  easy: 'easy: close to English',
  tougher: 'tougher: aspiration, voicing, h',
  problem: 'problem: tongue position',
} as const;
