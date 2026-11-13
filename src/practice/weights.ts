/**
 * Weak-spot weighting for the practice tools: cells marked shaky and cells
 * answered wrongly recently come up more often. Errors fade with a half-life
 * of two weeks, so an old slip does not haunt the quiz for ever.
 */
import type { PracticeRecord } from '../lib/db';
import type { LearnStatus } from '../lib/db';

export const ERROR_HALF_LIFE_MS = 14 * 24 * 3600 * 1000;

/** How much the record's errors still count, 0–wrong, decayed by the time since the last one. */
export function decayedErrors(r: PracticeRecord | undefined, now = Date.now()): number {
  if (!r || !r.wrong) return 0;
  const age = Math.max(0, now - r.lastWrongAt);
  return r.wrong * Math.pow(0.5, age / ERROR_HALF_LIFE_MS);
}

/**
 * Sampling weight of a cell: 1 for an unseen cell, more when shaky or wrongly
 * answered lately, a little less when answered right several times.
 */
export function weightOf(status: LearnStatus | undefined, r: PracticeRecord | undefined, now = Date.now()): number {
  let w = 1;
  if (status === 'shaky') w += 2;
  if (status === 'solid') w -= 0.3;
  w += Math.min(4, 1.5 * decayedErrors(r, now));
  if (r && r.right >= 3 && decayedErrors(r, now) < 0.25) w -= 0.3;
  return Math.max(0.2, w);
}

/** Pick one item at random, in proportion to its weight. */
export function weightedPick<T>(items: T[], weight: (t: T) => number, random = Math.random): T {
  const ws = items.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
