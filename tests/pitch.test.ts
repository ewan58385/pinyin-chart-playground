import { describe, expect, it } from 'vitest';
import { analysePitch, type PitchResult } from '../src/lib/pitch';
import { pitchContour, peaksOf, speechBounds } from '../src/lib/analysis';

/** A stand-in for the browser's AudioBuffer, built from raw samples. */
function buffer(samples: Float32Array, sampleRate: number): AudioBuffer {
  return {
    numberOfChannels: 1,
    sampleRate,
    length: samples.length,
    duration: samples.length / sampleRate,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

interface GlideOptions {
  seconds?: number;
  sampleRate?: number;
  /** Peak amplitude of the voiced part. */
  level?: number;
  /** White noise amplitude added everywhere. */
  noise?: number;
  /** Add a full-scale click just before the voiced part. */
  click?: boolean;
  /** Relative strengths of harmonics 1, 2, 3... */
  harmonics?: number[];
  padSeconds?: number;
}

/** A voiced sound whose pitch glides from f0 to f1, with harmonics, between two stretches of silence. */
function glideSamples(f0: number, f1: number, o: GlideOptions = {}): { samples: Float32Array; sampleRate: number } {
  const sampleRate = o.sampleRate ?? 24000;
  const pad = Math.round(sampleRate * (o.padSeconds ?? 0.2));
  const n = Math.round(sampleRate * (o.seconds ?? 0.5));
  const harmonics = o.harmonics ?? [1, 0.5, 0.25];
  const level = o.level ?? 0.5;
  const out = new Float32Array(n + pad * 2);
  let phase = 0;
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff - 0.5;
  };
  for (let i = 0; i < n; i++) {
    const f = f0 + ((f1 - f0) * i) / n;
    phase += (2 * Math.PI * f) / sampleRate;
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) v += harmonics[h] * Math.sin((h + 1) * phase);
    // Short fades so the edges are not clicks.
    const edge = Math.min(1, i / (sampleRate * 0.02), (n - i) / (sampleRate * 0.02));
    out[pad + i] = (level * v * edge) / harmonics.reduce((a, b) => a + b, 0);
  }
  if (o.noise) for (let i = 0; i < out.length; i++) out[i] += o.noise * 2 * rnd();
  if (o.click) for (let i = 0; i < 40; i++) out[Math.round(pad * 0.5) + i] = i % 2 ? 1 : -1;
  return { samples: out, sampleRate };
}
const glide = (f0: number, f1: number, o: GlideOptions = {}) => {
  const g = glideSamples(f0, f1, o);
  return buffer(g.samples, g.sampleRate);
};
const run = (f0: number, f1: number, o: GlideOptions = {}): PitchResult => {
  const g = glideSamples(f0, f1, o);
  return analysePitch(g.samples, g.sampleRate);
};

const first = (pts: { st: number }[]) => pts.slice(0, 5).reduce((a, p) => a + p.st, 0) / 5;
const last = (pts: { st: number }[]) => pts.slice(-5).reduce((a, p) => a + p.st, 0) / 5;
const rise = (r: PitchResult) => last(r.points) - first(r.points);

describe('pitch module: test-tone glides', () => {
  it('is flat for a level tone and reports the median in Hz', () => {
    const r = run(220, 220);
    expect(r.points.length).toBeGreaterThan(20);
    for (const p of r.points) expect(Math.abs(p.st)).toBeLessThan(0.5);
    expect(r.medianHz).toBeGreaterThan(215);
    expect(r.medianHz).toBeLessThan(225);
    expect(r.reason).toBeUndefined();
  });

  it('rises for a rising tone and falls for a falling one, by about the right amount', () => {
    const rising = run(180, 270); // a fifth, 7 semitones
    expect(rise(rising)).toBeGreaterThan(5);
    expect(rise(rising)).toBeLessThan(8);
    const falling = run(300, 150); // an octave, 12 semitones
    expect(-rise(falling)).toBeGreaterThan(9);
    expect(-rise(falling)).toBeLessThan(13);
  });

  it('gets the direction right in a low voice (70–120 Hz), a mid voice (100–200 Hz) and a high voice (180–350 Hz)', () => {
    for (const [lo, hi] of [
      [70, 120],
      [100, 200],
      [180, 350],
    ]) {
      const up = run(lo, hi);
      const down = run(hi, lo);
      expect(up.points.length, `${lo}→${hi}`).toBeGreaterThan(15);
      expect(rise(up), `${lo}→${hi}`).toBeGreaterThan(4);
      expect(-rise(down), `${hi}→${lo}`).toBeGreaterThan(4);
      // The absolute values are right too.
      expect(up.points[0].hz).toBeGreaterThan(lo * 0.9);
      expect(up.points[up.points.length - 1].hz).toBeLessThan(hi * 1.1);
    }
  });

  it('puts a low voice and a female reference on the same relative scale', () => {
    // Same shape (a rise of a fourth), different registers.
    const low = run(90, 120);
    const high = run(240, 320);
    expect(Math.abs(low.medianHz / high.medianHz - 0.375)).toBeLessThan(0.05);
    expect(Math.abs(rise(low) - rise(high))).toBeLessThan(1);
    // Their relative contours overlay: resample both to 20 points and compare.
    const at = (r: PitchResult, x: number) => {
      const i = Math.min(r.points.length - 1, Math.round(x * (r.points.length - 1)));
      return r.points[i].st;
    };
    for (let k = 1; k < 19; k++) expect(Math.abs(at(low, k / 19) - at(high, k / 19))).toBeLessThan(1);
  });

  it('works at the sample rates browsers use for recordings', () => {
    for (const sampleRate of [16000, 44100, 48000]) {
      const r = run(110, 165, { sampleRate }); // up a fifth
      expect(r.points.length, `${sampleRate}`).toBeGreaterThan(15);
      expect(rise(r), `${sampleRate}`).toBeGreaterThan(5);
      expect(rise(r), `${sampleRate}`).toBeLessThan(9);
    }
  });

  it('is not fooled by a loud click before a quiet voice (gating relative to the noise floor, not the peak)', () => {
    const r = run(110, 110, { level: 0.08, click: true });
    expect(r.points.length).toBeGreaterThan(20);
    for (const p of r.points) expect(Math.abs(p.st)).toBeLessThan(0.6);
  });

  it('tracks a quiet voice even when the analysed span has no silence in it', () => {
    // A take trimmed tightly to the voice: the clip's own "noise floor" is the voice.
    const r = run(110, 150, { level: 0.03, padSeconds: 0 });
    expect(r.points.length).toBeGreaterThan(20);
    expect(rise(r)).toBeGreaterThan(3.5);
  });

  it('still finds a quiet, slightly noisy voice', () => {
    const r = run(130, 180, { level: 0.03, noise: 0.002 });
    expect(r.points.length).toBeGreaterThan(15);
    expect(rise(r)).toBeGreaterThan(3.5);
  });

  it('does not jump octaves on a voice with a strong second harmonic', () => {
    const r = run(100, 100, { harmonics: [0.5, 1, 0.4, 0.3] });
    expect(r.points.length).toBeGreaterThan(20);
    for (const p of r.points) expect(Math.abs(p.st)).toBeLessThan(0.6);
    expect(Math.abs(r.medianHz - 100)).toBeLessThan(5);
  });

  it('spans the voiced part only, with x from 0 to 1', () => {
    const r = run(200, 200);
    expect(r.points[0].x).toBe(0);
    expect(r.points[r.points.length - 1].x).toBe(1);
    expect(r.voicedFraction).toBeGreaterThan(0.4);
  });

  it('says why when there is no contour', () => {
    expect(analysePitch(new Float32Array(24000), 24000).reason).toBe('too-quiet');
    expect(analysePitch(new Float32Array(100), 24000).reason).toBe('too-short');
    // Noise only: loud enough, but not voiced.
    const noisy = glideSamples(100, 100, { level: 0, noise: 0.3, padSeconds: 0 });
    expect(analysePitch(noisy.samples, noisy.sampleRate).reason).toBe('unvoiced');
    // Clipping is reported on the result even when a contour is found.
    const loud = glideSamples(150, 150, { level: 3 });
    for (let i = 0; i < loud.samples.length; i++) loud.samples[i] = Math.max(-1, Math.min(1, loud.samples[i]));
    expect(analysePitch(loud.samples, loud.sampleRate).clippedFraction).toBeGreaterThan(0.1);
  });
});

describe('pitch contour through the AudioBuffer wrapper', () => {
  it('matches the module and honours a time range', () => {
    const pts = pitchContour(glide(220, 220));
    expect(pts.length).toBeGreaterThan(20);
    for (const p of pts) expect(Math.abs(p.st)).toBeLessThan(0.5);
    // Ask for the second half only: still a contour, half as many points.
    const half = pitchContour(glide(220, 220), 0.45, 0.9);
    expect(half.length).toBeGreaterThan(8);
    expect(half.length).toBeLessThan(pts.length);
    expect(pitchContour(buffer(new Float32Array(24000), 24000))).toEqual([]);
  });
});

describe('waveform helpers', () => {
  it('finds where the sound starts and ends', () => {
    const { start, end } = speechBounds(glide(200, 200, { seconds: 0.5 }));
    expect(start).toBeGreaterThan(0.1);
    expect(start).toBeLessThan(0.21);
    expect(end).toBeGreaterThan(0.69);
    expect(end).toBeLessThan(0.86);
  });

  it('returns the requested number of peaks, scaled to 1', () => {
    const peaks = peaksOf(glide(200, 200), 40);
    expect(peaks).toHaveLength(40);
    expect(Math.max(...peaks)).toBe(1);
    expect(peaks[0]).toBe(0);
  });
});

describe('overlaying two voices', async () => {
  const { fitAxis, plotValue, explainNoContour, hzToSt, stToHz, yOf } = await import('../src/lib/overlay');

  it('puts a low male take and a female reference on one relative axis that fits both with padding', () => {
    const low = run(85, 110); // a low voice rising a fourth
    const high = run(220, 290);
    const axis = fitAxis([high.points, low.points], 'relative');
    const all = [...high.points, ...low.points].map((p) => p.st);
    expect(axis.min).toBeLessThan(Math.min(...all));
    expect(axis.max).toBeGreaterThan(Math.max(...all));
    expect(axis.max - axis.min).toBeGreaterThanOrEqual(8);
    expect(axis.max - axis.min).toBeLessThan(14);
    // Both traces land inside the chart.
    for (const p of [...high.points, ...low.points]) {
      const y = yOf(plotValue(p, 'relative'), axis);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
    expect(axis.ticks.some((t) => t.label === '0')).toBe(true);
  });

  it('in absolute Hz the same two traces sit an octave and more apart, on a log axis with Hz labels', () => {
    const low = run(85, 110);
    const high = run(220, 290);
    const axis = fitAxis([high.points, low.points], 'hz');
    expect(stToHz(axis.min)).toBeLessThan(85);
    expect(stToHz(axis.max)).toBeGreaterThan(290);
    expect(axis.ticks.map((t) => t.label)).toContain('100');
    expect(axis.ticks.map((t) => t.label)).toContain('200');
    expect(hzToSt(110) - hzToSt(55)).toBeCloseTo(12, 5);
    const lowY = yOf(plotValue(low.points[0], 'hz'), axis);
    const highY = yOf(plotValue(high.points[0], 'hz'), axis);
    expect(lowY).toBeGreaterThan(highY); // lower pitch is drawn lower
  });

  it('keeps a level tone from filling the chart', () => {
    const flat = run(200, 200);
    const axis = fitAxis([flat.points], 'relative');
    expect(axis.max - axis.min).toBe(8);
  });

  it('always explains a missing contour', () => {
    expect(explainNoContour(analysePitch(new Float32Array(24000), 24000))).toMatch(/quiet/);
    expect(explainNoContour(analysePitch(new Float32Array(100), 24000))).toMatch(/short/);
    const noisy = glideSamples(100, 100, { level: 0, noise: 0.3, padSeconds: 0 });
    expect(explainNoContour(analysePitch(noisy.samples, noisy.sampleRate))).toMatch(/unvoiced/);
    const loud = glideSamples(150, 150, { level: 3 });
    for (let i = 0; i < loud.samples.length; i++) loud.samples[i] = Math.max(-1, Math.min(1, loud.samples[i]));
    expect(explainNoContour(analysePitch(loud.samples, loud.sampleRate))).toMatch(/clipped/);
    expect(explainNoContour(null, false)).toMatch(/decoded/);
    expect(explainNoContour(run(200, 200))).toBe('');
  });
});
