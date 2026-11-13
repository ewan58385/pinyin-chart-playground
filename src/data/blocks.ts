/**
 * The logical blocks of the chart, each with a page of its own:
 * the six final groups and the seven initial groups (by place of
 * articulation, as the chart's row blocks already group them).
 */
import { FINAL_GROUPS, type Final } from './finals';
import { INITIALS, type Initial } from './initials';

export type BlockKind = 'finals' | 'initials';

export interface Block {
  kind: BlockKind;
  /** Route segment: #/finals/e, #/initials/retroflex. */
  id: string;
  /** Short name for navigation. */
  label: string;
  /** Page heading. */
  title: string;
  /** One neutral line. */
  description: string;
  /** Final ids or initial ids in chart order. */
  members: string[];
  /** Blocks learners mix this one up with, with the reason. */
  confusable: { id: string; why: string }[];
}

const FINAL_CONFUSABLE: Record<string, { id: string; why: string }[]> = {
  a: [{ id: 'e', why: 'an / en and ang / eng are near neighbours' }],
  e: [
    { id: 'a', why: 'en / an and eng / ang are near neighbours' },
    { id: 'o', why: 'e and o are both mid vowels' },
  ],
  o: [
    { id: 'e', why: 'o and e are both mid vowels' },
    { id: 'u', why: 'ou and uo share letters in the other order' },
  ],
  i: [
    { id: 'ü', why: 'i and ü differ only in lip rounding' },
    { id: 'u', why: 'in / un and ing / ueng are easy to confuse by ear' },
  ],
  u: [
    { id: 'ü', why: 'u and ü: lu / lü, nu / nü are different words' },
    { id: 'o', why: 'uo and ou share letters in the other order' },
  ],
  ü: [
    { id: 'u', why: 'ü and u: lü / lu, nü / nu are different words' },
    { id: 'i', why: 'ü and i differ only in lip rounding' },
  ],
};

export const FINAL_BLOCKS: Block[] = FINAL_GROUPS.map((g) => {
  const id = g.id.toLowerCase();
  return {
    kind: 'finals',
    id,
    label: g.id,
    title: `${g.id} group`,
    description: `Finals ${g.finals.map((f) => f.surface).join(', ')}.`,
    members: g.finals.map((f) => f.id),
    confusable: FINAL_CONFUSABLE[id] ?? [],
  };
});

const INITIAL_BLOCK_INFO: Record<string, { label: string; title: string; description: string; confusable: { id: string; why: string }[] }> = {
  null: { label: '∅', title: 'No initial', description: 'Syllables that are a final on its own, written with y or w where pinyin requires it.', confusable: [] },
  labial: { label: 'b p m f', title: 'Labial initials', description: 'Made with the lips: b and p (unaspirated and aspirated), m, f.', confusable: [] },
  alveolar: { label: 'd t n l', title: 'Alveolar initials', description: 'Made with the tongue tip at the ridge behind the teeth: d and t (unaspirated and aspirated), n, l.', confusable: [] },
  sibilant: {
    label: 'z c s',
    title: 'Dental sibilants',
    description: 'z and c (unaspirated and aspirated) and s, with the tongue tip at the teeth.',
    confusable: [
      { id: 'retroflex', why: 'z / zh, c / ch, s / sh differ only in where the tongue tip is' },
      { id: 'palatal', why: 'z / j, c / q, s / x are heard as close by many learners' },
    ],
  },
  retroflex: {
    label: 'zh ch sh r',
    title: 'Retroflex initials',
    description: 'zh and ch (unaspirated and aspirated), sh and r, with the tongue tip curled back.',
    confusable: [
      { id: 'sibilant', why: 'zh / z, ch / c, sh / s differ only in where the tongue tip is' },
      { id: 'palatal', why: 'zh / j, ch / q, sh / x are heard as close by many learners' },
    ],
  },
  palatal: {
    label: 'j q x',
    title: 'Palatal initials',
    description: 'j and q (unaspirated and aspirated) and x, which only take i- and ü- finals.',
    confusable: [
      { id: 'retroflex', why: 'j / zh, q / ch, x / sh are heard as close by many learners' },
      { id: 'sibilant', why: 'j / z, q / c, x / s are heard as close by many learners' },
    ],
  },
  velar: { label: 'g k h', title: 'Velar initials', description: 'Made at the back of the tongue: g and k (unaspirated and aspirated), h.', confusable: [] },
};

const blockOrder = [...new Set(INITIALS.map((i) => i.block))];
export const INITIAL_BLOCKS: Block[] = blockOrder.map((id) => ({
  kind: 'initials',
  id,
  members: INITIALS.filter((i) => i.block === id).map((i) => i.id),
  ...INITIAL_BLOCK_INFO[id],
}));

export const BLOCKS: Record<BlockKind, Block[]> = { finals: FINAL_BLOCKS, initials: INITIAL_BLOCKS };

/** Look a block up by kind and route id; "v" is accepted for ü. */
export function blockFor(kind: BlockKind, id: string): Block | undefined {
  const key = kind === 'finals' && id === 'v' ? 'ü' : id;
  return BLOCKS[kind].find((b) => b.id === key);
}
export const blockHash = (b: Pick<Block, 'kind' | 'id'>) => `#/${b.kind}/${b.id === 'ü' ? 'v' : b.id}`;
export const blockOfInitial = (initial: Initial): Block => INITIAL_BLOCKS.find((b) => b.members.includes(initial.id))!;
export const blockOfFinal = (final: Final): Block => FINAL_BLOCKS.find((b) => b.members.includes(final.id))!;
