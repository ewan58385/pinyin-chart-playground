/**
 * Pitch (f0) contour of a short voiced clip. Shared by the app (reference
 * clips and the user's takes) and the build scripts (QA of generated audio).
 * Pure: takes samples, returns numbers; no DOM, no Node APIs.
 *
 * Method: YIN (de Cheveigné & Kawahara 2002) with cumulative mean
 * normalisation and parabolic interpolation, on audio decimated to about
 * 16 kHz. Search range 60–600 Hz. Voicing is decided per frame from the
 * normalised difference (clarity) and from level relative to the clip's own
 * noise floor, not to its peak, so a click or a loud pop does not silence
 * the rest. Octave errors are corrected against the running contour, then
 * a light median filter removes stray frames. Output is in semitones
 * relative to the clip's median f0, with the absolute Hz kept alongside.
 */

export interface PitchOptions {
  minHz?: number;
  maxHz?: number;
  /** Frame hop in seconds. */
  hop?: number;
  /** Analysis window in seconds. */
  window?: number;
  /** Frames with normalised difference above this are unvoiced. */
  clarityThreshold?: number;
  /** A frame must be this many dB above the clip's noise floor to count. */
  minAboveNoiseDb?: number;
}

export interface PitchPoint {
  /** Position within the voiced span, 0–1. */
  x: number;
  /** Time from the start of the analysed audio, seconds. */
  t: number;
  hz: number;
  /** Semitones above or below the clip's median f0. */
  st: number;
  /** Frame level in dB relative to the loudest frame of the clip (0 = loudest). */
  level: number;
}

export type PitchFailure = 'too-short' | 'too-quiet' | 'unvoiced';

export interface PitchResult {
  points: PitchPoint[];
  /** Median f0 of the voiced frames (0 when there are none). */
  medianHz: number;
  /** Voiced frames as a fraction of the frames above the noise floor. */
  voicedFraction: number;
  /** Voiced frames as a fraction of all frames. */
  voicedOfAll: number;
  /** Peak sample level, dBFS. */
  peakDb: number;
  /** Noise floor (10th percentile frame RMS), dBFS. */
  noiseDb: number;
  /** Fraction of samples at or beyond full scale. */
  clippedFraction: number;
  /** Seconds analysed. */
  seconds: number;
  /** Why there is no contour, when `points` is empty. */
  reason?: PitchFailure;
}

const DEFAULTS: Required<PitchOptions> = {
  minHz: 60,
  maxHz: 600,
  hop: 0.01,
  window: 0.03,
  clarityThreshold: 0.45,
  minAboveNoiseDb: 6,
};

const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Decimate to about 16 kHz with a box filter (f0 is far below the new Nyquist). */
function decimate(src: Float32Array, sampleRate: number): { x: Float32Array; sr: number } {
  const step = Math.max(1, Math.round(sampleRate / 16000));
  if (step === 1) return { x: src, sr: sampleRate };
  const n = Math.floor(src.length / step);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += src[i * step + j];
    x[i] = sum / step;
  }
  return { x, sr: sampleRate / step };
}

interface Frame {
  t: number;
  rms: number;
  /** Candidate lag (interpolated) and its normalised difference, or null. */
  lag: number | null;
  clarity: number;
  /** Normalised difference at every lag, kept for octave checks. */
  d: Float32Array;
}

export function analysePitch(samples: Float32Array, sampleRate: number, options: PitchOptions = {}): PitchResult {
  const o = { ...DEFAULTS, ...options };
  const seconds = samples.length / sampleRate;
  let peak = 0;
  let clipped = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    if (a >= 0.985) clipped++;
  }
  const base: Omit<PitchResult, 'points' | 'medianHz' | 'voicedFraction' | 'voicedOfAll' | 'noiseDb'> = {
    peakDb: db(peak),
    clippedFraction: samples.length ? clipped / samples.length : 0,
    seconds,
  };
  const empty = (reason: PitchFailure, noiseDb = -100): PitchResult => ({ ...base, points: [], medianHz: 0, voicedFraction: 0, voicedOfAll: 0, noiseDb, reason });

  const { x, sr } = decimate(samples, sampleRate);
  const win = Math.round(sr * o.window);
  const hop = Math.max(1, Math.round(sr * o.hop));
  const minLag = Math.max(2, Math.floor(sr / o.maxHz));
  const maxLag = Math.ceil(sr / o.minHz);
  if (x.length < win + maxLag + hop) return empty('too-short');
  if (peak < 0.003) return empty('too-quiet'); // below -50 dBFS: nothing to analyse

  // Pass 1: difference function per frame.
  const frames: Frame[] = [];
  const buf = new Float32Array(win);
  for (let s = 0; s + win + maxLag <= x.length; s += hop) {
    let mean = 0;
    for (let i = 0; i < win; i++) mean += x[s + i];
    mean /= win;
    let energy = 0;
    for (let i = 0; i < win; i++) {
      buf[i] = x[s + i] - mean;
      energy += buf[i] * buf[i];
    }
    const rms = Math.sqrt(energy / win);
    const d = new Float32Array(maxLag + 1);
    d[0] = 1;
    let running = 0;
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < win; i++) {
        const diff = buf[i] - (x[s + i + lag] - mean);
        sum += diff * diff;
      }
      running += sum;
      d[lag] = running > 0 ? (sum * lag) / running : 1;
    }
    // First dip below the threshold, else the deepest dip in range.
    let best = -1;
    for (let lag = minLag; lag < maxLag; lag++) {
      if (d[lag] < o.clarityThreshold) {
        while (lag + 1 < maxLag && d[lag + 1] < d[lag]) lag++;
        best = lag;
        break;
      }
    }
    if (best < 0) {
      let min = Infinity;
      for (let lag = minLag; lag < maxLag; lag++) if (d[lag] < min && d[lag] <= d[lag - 1] && d[lag] <= d[lag + 1]) (min = d[lag]), (best = lag);
    }
    frames.push({ t: (s + win / 2) / sr, rms, lag: best > 0 ? best : null, clarity: best > 0 ? d[best] : 1, d });
  }
  if (frames.length < 3) return empty('too-short');

  // Level gate relative to this clip's own noise floor. When the analysed span
  // holds no quiet part at all (a take trimmed tightly to the voice), the
  // "floor" is the voice itself, so only the absolute floor applies.
  const rmsSorted = frames.map((f) => f.rms).sort((a, b) => a - b);
  const noise = Math.max(rmsSorted[Math.floor(rmsSorted.length * 0.1)], 1e-5);
  const noiseDb = db(noise);
  const peakFrame = rmsSorted[rmsSorted.length - 1];
  const hasQuietPart = peakFrame / noise > Math.pow(10, o.minAboveNoiseDb / 20);
  const gate = hasQuietPart ? noise * Math.pow(10, o.minAboveNoiseDb / 20) : 0;
  const loud = frames.filter((f) => f.rms > gate && f.rms > 0.002);
  // Nothing stands out above the floor: silence, or a loud steady noise (which is not quiet, just unvoiced).
  if (loud.length < 3) return empty(noiseDb > -40 ? 'unvoiced' : 'too-quiet', noiseDb);
  const voicedRaw = loud.filter((f) => f.lag !== null && f.clarity < o.clarityThreshold);
  if (voicedRaw.length < 4) return empty('unvoiced', noiseDb);

  // Octave correction: prefer the lag whose dip is nearly as deep and whose
  // pitch is closest to the running contour (or the clip median at first).
  const interp = (d: Float32Array, lag: number) => {
    if (lag <= 0 || lag + 1 >= d.length) return lag;
    const y0 = d[lag - 1];
    const y1 = d[lag];
    const y2 = d[lag + 1];
    const denom = y0 - 2 * y1 + y2;
    return denom !== 0 ? lag + (0.5 * (y0 - y2)) / denom : lag;
  };
  const localMin = (d: Float32Array, around: number): number | null => {
    // Walk to the nearest local minimum from an integer lag estimate.
    let lag = Math.round(around);
    if (lag < minLag || lag >= maxLag) return null;
    while (lag + 1 < maxLag && d[lag + 1] < d[lag]) lag++;
    while (lag - 1 >= minLag && d[lag - 1] < d[lag]) lag--;
    return lag;
  };
  const rough = median(voicedRaw.map((f) => sr / f.lag!));
  let ref = rough;
  const chosen: { f: Frame; hz: number }[] = [];
  for (const f of voicedRaw) {
    const cands: { lag: number; d: number }[] = [{ lag: f.lag!, d: f.clarity }];
    for (const m of [0.5, 2]) {
      const l = localMin(f.d, f.lag! * m);
      if (l !== null) cands.push({ lag: l, d: f.d[l] });
    }
    let pick = cands[0];
    let score = Infinity;
    for (const c of cands) {
      if (c.d > o.clarityThreshold || c.d > cands[0].d + 0.2) continue;
      const hz = sr / c.lag;
      const s = c.d + 0.25 * Math.abs(Math.log2(hz / ref));
      if (s < score) (score = s), (pick = c);
    }
    const hz = sr / interp(f.d, pick.lag);
    chosen.push({ f, hz });
    ref = 0.7 * ref + 0.3 * hz;
  }

  // Drop frames still more than an octave from the median, then smooth lightly.
  const med = median(chosen.map((c) => c.hz));
  const kept = chosen.filter((c) => c.hz > med / 1.9 && c.hz < med * 1.9);
  if (kept.length < 4) return empty('unvoiced', noiseDb);
  const medianHz = median(kept.map((c) => c.hz));
  const st = kept.map((c) => 12 * Math.log2(c.hz / medianHz));
  // Five-point median, shrinking at the edges so a single stray onset or
  // offset frame cannot dominate the first or last value.
  const smooth = st.map((_, i) => median(st.slice(Math.max(0, i - 2), Math.min(st.length, i + 3))));
  const loudest = Math.max(...kept.map((c) => c.f.rms));
  const t0 = kept[0].f.t;
  const span = kept[kept.length - 1].f.t - t0 || 1;
  const points: PitchPoint[] = kept.map((c, i) => ({
    x: Math.round(((c.f.t - t0) / span) * 1000) / 1000,
    t: Math.round(c.f.t * 1000) / 1000,
    hz: Math.round(medianHz * Math.pow(2, smooth[i] / 12) * 10) / 10,
    st: Math.round(smooth[i] * 100) / 100,
    level: Math.round(db(c.f.rms / loudest) * 10) / 10,
  }));
  return {
    ...base,
    points,
    medianHz: Math.round(medianHz * 10) / 10,
    voicedFraction: kept.length / loud.length,
    voicedOfAll: kept.length / frames.length,
    noiseDb,
  };
}

/**
 * The part of a contour that carries the tone: frames within `dbBelowPeak`
 * of the loudest voiced frame, from the first such frame to the last. This
 * drops the quiet vocal-fry tail and the decay, which otherwise read as a
 * steep fall. Falls back to the whole contour when too little is left.
 * Positions (x) are rescaled to 0–1 over what is kept.
 */
export function corePoints(points: PitchPoint[], dbBelowPeak = 15): PitchPoint[] {
  if (points.length < 4) return points;
  let first = -1;
  let last = -1;
  for (let i = 0; i < points.length; i++) {
    if (points[i].level >= -dbBelowPeak) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0 || last - first + 1 < Math.max(4, points.length * 0.3)) return points;
  const core = points.slice(first, last + 1);
  const t0 = core[0].t;
  const span = core[core.length - 1].t - t0 || 1;
  return core.map((p) => ({ ...p, x: Math.round(((p.t - t0) / span) * 1000) / 1000 }));
}

/** Resample a contour to n evenly spaced semitone values (for comparisons). */
export function resampleContour(points: PitchPoint[], n: number): number[] {
  if (!points.length) return [];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : i / (n - 1);
    let j = 0;
    while (j < points.length - 1 && points[j + 1].x < x) j++;
    const a = points[j];
    const b = points[Math.min(points.length - 1, j + 1)];
    const f = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
    out.push(a.st + (b.st - a.st) * Math.max(0, Math.min(1, f)));
  }
  return out;
}
