/**
 * The 36 finals, in six groups. This table is the column order of the chart.
 * Hand-authored from the project spec; do not reorder.
 */

export type FinalGroup = 'A' | 'E' | 'O' | 'I' | 'U' | 'Ü';
export type FinalType = 'simple' | 'compound' | 'nasal';

export interface Final {
  /** Same as `surface`; used as the column key. */
  id: string;
  /** Header spelling as written in pinyin (iu, ui, un). */
  surface: string;
  /** Underlying form (iou, uei, uen). Same as surface for the rest. */
  canonical: string;
  group: FinalGroup;
  type: FinalType;
  /** False where the simple/compound/nasal label is a judgement call. */
  typeVerified: boolean;
  /** How the final is spelled as a whole syllable on the ∅ row, if it can be. */
  note?: string;
}

const f = (
  surface: string,
  group: FinalGroup,
  type: FinalType,
  extra: Partial<Final> = {},
): Final => ({
  id: surface,
  surface,
  canonical: surface,
  group,
  type,
  typeVerified: true,
  ...extra,
});

export const FINAL_GROUPS: { id: FinalGroup; finals: Final[] }[] = [
  {
    id: 'A',
    finals: [
      f('a', 'A', 'simple'),
      f('ai', 'A', 'compound'),
      f('ao', 'A', 'compound'),
      f('an', 'A', 'nasal'),
      f('ang', 'A', 'nasal'),
    ],
  },
  {
    id: 'E',
    finals: [
      f('e', 'E', 'simple'),
      f('ei', 'E', 'compound'),
      f('en', 'E', 'nasal'),
      f('eng', 'E', 'nasal'),
      f('er', 'E', 'compound', {
        typeVerified: false,
        note:
          'er is a rhotic final that textbooks usually class on its own. It is filed under "compound" here only because the chart allows three types.',
      }),
    ],
  },
  {
    id: 'O',
    finals: [f('o', 'O', 'simple'), f('ong', 'O', 'nasal'), f('ou', 'O', 'compound')],
  },
  {
    id: 'I',
    finals: [
      f('i', 'I', 'simple'),
      f('ia', 'I', 'compound'),
      f('iao', 'I', 'compound'),
      f('ie', 'I', 'compound'),
      f('iu', 'I', 'compound', { canonical: 'iou' }),
      f('ian', 'I', 'nasal'),
      f('iang', 'I', 'nasal'),
      f('in', 'I', 'nasal'),
      f('ing', 'I', 'nasal'),
      f('iong', 'I', 'nasal'),
    ],
  },
  {
    id: 'U',
    finals: [
      f('u', 'U', 'simple'),
      f('ua', 'U', 'compound'),
      f('uo', 'U', 'compound'),
      f('ui', 'U', 'compound', { canonical: 'uei' }),
      f('uai', 'U', 'compound'),
      f('uan', 'U', 'nasal'),
      f('un', 'U', 'nasal', { canonical: 'uen' }),
      f('uang', 'U', 'nasal'),
      f('ueng', 'U', 'nasal'),
    ],
  },
  {
    id: 'Ü',
    finals: [
      f('ü', 'Ü', 'simple'),
      f('üe', 'Ü', 'compound'),
      f('üan', 'Ü', 'nasal'),
      f('ün', 'Ü', 'nasal'),
    ],
  },
];

export const FINALS: Final[] = FINAL_GROUPS.flatMap((g) => g.finals);
export const FINAL_BY_ID: Record<string, Final> = Object.fromEntries(FINALS.map((x) => [x.id, x]));
export const FINAL_INDEX: Record<string, number> = Object.fromEntries(FINALS.map((x, i) => [x.id, i]));
