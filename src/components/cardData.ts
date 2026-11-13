/**
 * What a syllable card needs to know about each tone, shared by the chart's
 * reference card (SyllableCard) and the study card (StudyCard). Logic only;
 * each card has its own markup.
 */
import type { Syllable, ToneCell } from '../data';
import { hasNativeAudio } from '../data';
import type { LearnStatus } from '../lib/db';
import { TONES, type Tone } from '../lib/pinyin';
import { overrides, recordingsByCell, resolveExample, statuses, visibleTones } from '../lib/store';

export interface CardTone {
  tone: Tone;
  /** Absent when the syllable has no such tone (or it is hidden as unverified). */
  cell?: ToneCell;
  character: string;
  meaning: string;
  status: LearnStatus;
  recorded: boolean;
  hasAudio: boolean;
  /** False when the card shows the tone but it is not part of the current set. */
  inScope: boolean;
}

export function cardTones(s: Syllable, showUnverified: boolean, only?: number[]): CardTone[] {
  const visible = visibleTones(s, showUnverified);
  const st = statuses.value;
  const rec = recordingsByCell.value;
  const ov = overrides.value;
  return TONES.map((tone) => {
    const cell = visible.find((t) => t.tone === tone);
    if (!cell) return { tone, character: '', meaning: '', status: 'new', recorded: false, hasAudio: false, inScope: false };
    const ex = resolveExample(cell.numeric, ov);
    return {
      tone,
      cell,
      character: ex.character,
      meaning: ex.meaning,
      status: st[cell.numeric] ?? 'new',
      recorded: !!rec[cell.numeric]?.length,
      hasAudio: hasNativeAudio(cell.numeric),
      inScope: !only || only.includes(tone),
    };
  });
}
