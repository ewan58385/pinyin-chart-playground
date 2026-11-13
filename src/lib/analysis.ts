/**
 * Decoding audio for display: waveform peaks, where the speech starts and
 * ends, and a pitch contour. Nothing here is needed for playback, so every
 * function fails soft (returns null) when the browser cannot decode a format.
 */

import { analysePitch, type PitchPoint, type PitchResult } from './pitch';

let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

export async function decode(blob: Blob): Promise<AudioBuffer | null> {
  const ac = audioContext();
  if (!ac) return null;
  try {
    const bytes = await blob.arrayBuffer();
    // Safari's older signature takes callbacks; the promise form is used where available.
    return await new Promise<AudioBuffer>((resolve, reject) => {
      const p = ac.decodeAudioData(bytes, resolve, reject);
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    });
  } catch {
    return null;
  }
}

function mono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += data[i] / buffer.numberOfChannels;
  }
  return out;
}

/** n peak values in 0–1, scaled so the loudest is 1. */
export function peaksOf(buffer: AudioBuffer, n = 72, from = 0, to = buffer.duration): number[] {
  const data = mono(buffer);
  const a = Math.max(0, Math.floor(from * buffer.sampleRate));
  const b = Math.min(data.length, Math.ceil(to * buffer.sampleRate));
  const size = Math.max(1, Math.floor((b - a) / n));
  const out: number[] = [];
  let max = 0;
  for (let i = 0; i < n; i++) {
    let peak = 0;
    const end = Math.min(b, a + (i + 1) * size);
    for (let j = a + i * size; j < end; j++) {
      const v = Math.abs(data[j]);
      if (v > peak) peak = v;
    }
    out.push(peak);
    if (peak > max) max = peak;
  }
  return max > 0 ? out.map((p) => Math.round((p / max) * 100) / 100) : out;
}

/** Where the speech starts and ends, in seconds, with a little padding. */
export function speechBounds(buffer: AudioBuffer): { start: number; end: number } {
  const data = mono(buffer);
  const frame = Math.max(1, Math.floor(buffer.sampleRate * 0.01));
  const frames = Math.floor(data.length / frame);
  if (frames < 6) return { start: 0, end: buffer.duration };
  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = 0; i < frame; i++) {
      const v = data[f * frame + i];
      sum += v * v;
    }
    env[f] = Math.sqrt(sum / frame);
  }
  const sorted = Array.from(env).sort((x, y) => x - y);
  const noise = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[sorted.length - 1];
  const threshold = Math.max(noise * 2.5, peak * 0.03);
  let first = -1;
  let last = -1;
  for (let f = 0; f < frames - 1; f++) {
    if (env[f] > threshold && env[f + 1] > threshold) {
      if (first < 0) first = f;
      last = f + 1;
    }
  }
  if (first < 0) return { start: 0, end: buffer.duration };
  return {
    start: Math.max(0, first * 0.01 - 0.06),
    end: Math.min(buffer.duration, (last + 1) * 0.01 + 0.12),
  };
}

export type { PitchPoint, PitchResult } from './pitch';

/**
 * Pitch contour of part of a decoded clip, through the shared pitch module
 * (src/lib/pitch.ts). Returned relative to the clip's own median, so a low
 * voice and a high voice can be laid over each other.
 */
export function pitchContour(buffer: AudioBuffer, from = 0, to = buffer.duration): PitchPoint[] {
  return pitchAnalysis(buffer, from, to).points;
}

/** The full pitch analysis (contour, median Hz, why it failed) of part of a decoded clip. */
export function pitchAnalysis(buffer: AudioBuffer, from = 0, to = buffer.duration): PitchResult {
  const src = mono(buffer);
  const a = Math.max(0, Math.floor(from * buffer.sampleRate));
  const b = Math.min(src.length, Math.ceil(to * buffer.sampleRate));
  return analysePitch(b > a ? src.subarray(a, b) : new Float32Array(0), buffer.sampleRate);
}
