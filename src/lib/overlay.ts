/**
 * Laying two pitch contours over each other: the native clip and the
 * user's take. Pure functions, tested without a browser.
 *
 * Default display is semitones relative to each speaker's own median, so a
 * low voice and a high voice overlay; "absolute Hz" shows the real pitch on
 * a logarithmic axis (equal musical intervals take equal space).
 */
import type { PitchPoint, PitchResult } from './pitch';

export type PitchMode = 'relative' | 'hz';

/** Hz as semitones above 55 Hz (A1), so both modes are drawn on a semitone grid. */
export const hzToSt = (hz: number) => 12 * Math.log2(hz / 55);
export const stToHz = (st: number) => 55 * Math.pow(2, st / 12);

/** The value a point is drawn at in the given mode. */
export const plotValue = (p: PitchPoint, mode: PitchMode) => (mode === 'hz' ? hzToSt(p.hz) : p.st);

export interface Axis {
  /** Bottom and top of the drawn range, in the mode's semitone units. */
  min: number;
  max: number;
  /** Where to draw gridlines, with labels. */
  ticks: { value: number; label: string }[];
}

/**
 * Fit the vertical axis to every trace with padding. The range is never
 * narrower than `minSpan` semitones, so a level tone reads as level rather
 * than as a magnified wobble, and never wider than the data needs.
 */
export function fitAxis(traces: PitchPoint[][], mode: PitchMode, opts: { pad?: number; minSpan?: number } = {}): Axis {
  const pad = opts.pad ?? 1.5;
  const minSpan = opts.minSpan ?? 8;
  const values = traces.flat().map((p) => plotValue(p, mode));
  if (!values.length) {
    const centre = mode === 'hz' ? hzToSt(150) : 0;
    return { min: centre - minSpan / 2, max: centre + minSpan / 2, ticks: ticksFor(centre - minSpan / 2, centre + minSpan / 2, mode) };
  }
  let min = Math.min(...values) - pad;
  let max = Math.max(...values) + pad;
  if (max - min < minSpan) {
    const centre = (min + max) / 2;
    min = centre - minSpan / 2;
    max = centre + minSpan / 2;
  }
  return { min, max, ticks: ticksFor(min, max, mode) };
}

const HZ_TICKS = [50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 500, 600];
const HZ_TICKS_SPARSE = [50, 60, 80, 100, 150, 200, 300, 400, 600];

function ticksFor(min: number, max: number, mode: PitchMode): Axis['ticks'] {
  if (mode === 'relative') {
    // Every 2 semitones up to a 16-semitone range, then every 4.
    const step = max - min > 16 ? 4 : 2;
    const out: Axis['ticks'] = [];
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push({ value: v, label: v === 0 ? '0' : `${v > 0 ? '+' : ''}${v}` });
    return out;
  }
  const inRange = (list: number[]) => list.filter((hz) => hzToSt(hz) >= min && hzToSt(hz) <= max).map((hz) => ({ value: hzToSt(hz), label: `${hz}` }));
  const dense = inRange(HZ_TICKS);
  // Round values only when the range is wide.
  return dense.length > 7 ? inRange(HZ_TICKS_SPARSE) : dense;
}

/** 0 at the top of the chart, 1 at the bottom. */
export const yOf = (value: number, axis: Axis) => (axis.max - value) / (axis.max - axis.min);

/** "112 Hz" style label for a trace's median. */
export const medianLabel = (r: Pick<PitchResult, 'medianHz'> | undefined) => (r && r.medianHz > 0 ? `${Math.round(r.medianHz)} Hz` : '');

/**
 * Why a take has no contour, and what to try. Never returns an empty string
 * for an analysed take, so the chart is never blank without a reason.
 */
export function explainNoContour(r: PitchResult | null | undefined, decodable = true): string {
  if (!decodable) return 'This recording could not be decoded in this browser, so its pitch cannot be shown. It may have been recorded in a browser that uses a different audio format.';
  if (!r) return 'The recording has not been analysed yet.';
  if (r.clippedFraction > 0.01) return 'The recording is clipped (too loud for the microphone), which hides the pitch. Hold the device a little further away and try again.';
  switch (r.reason) {
    case 'too-quiet':
      return 'Too quiet: the microphone barely picked up any sound. Speak closer to it, or check that the right microphone is selected.';
    case 'too-short':
      return 'Too short to measure. Hold the syllable a little longer.';
    case 'unvoiced':
      return 'Mostly unvoiced: no steady pitch was found. Whispering, breathiness or background noise can cause this. Try a fuller voice in a quieter place.';
    default:
      return r.points.length ? '' : 'No pitch could be measured in this take.';
  }
}
