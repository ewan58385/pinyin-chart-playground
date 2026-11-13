/**
 * Pitch diagnosis: why did the user's take often get no pitch contour?
 *
 *   npx tsx scripts/diagnose-pitch.ts            → reports/pitch-diagnosis.md
 *
 * Part 1 sends generated voiced glides (70–120, 100–200 and 180–350 Hz, plus
 * quiet, noisy, clicked and very low variants) through the same path as a
 * browser recording: encoded as MediaRecorder would (WebM/Opus, MP4/AAC),
 * decoded at the sample rates AudioContexts use (48 kHz, 44.1 kHz), trimmed
 * with speechBounds, then analysed with the tracker the app shipped before
 * Round 2 (kept verbatim below as `oldPitchContour`) and with src/lib/pitch.ts.
 *
 * Part 2 runs the native clips (real speech) through both trackers, clean and
 * under microphone-like conditions (quieter with room noise; quiet with a tap
 * click before the speech), and counts how often each tracker returns nothing.
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/sources';
import { decodePcm, encodePcm } from './lib/pcm';
import { analysePitch } from '../src/lib/pitch';
import { speechBounds } from '../src/lib/analysis';

// ───────────────────────── the tracker as shipped before Round 2 ─────────────────────────

function oldPitchContour(samples: Float32Array, sampleRate: number, from = 0, to = samples.length / sampleRate): { x: number; st: number }[] {
  const step = Math.max(1, Math.round(sampleRate / 16000));
  const sr = sampleRate / step;
  const a = Math.floor(from * sampleRate);
  const b = Math.min(samples.length, Math.ceil(to * sampleRate));
  const n = Math.floor((b - a) / step);
  if (n < 1024) return [];
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += samples[a + i * step + j] ?? 0;
    x[i] = sum / step;
  }
  const win = Math.round(sr * 0.04);
  const hop = Math.round(sr * 0.01);
  const minLag = Math.floor(sr / 500);
  const maxLag = Math.ceil(sr / 70);
  let peakRms = 0;
  const frames: { t: number; f0: number | null; rms: number }[] = [];
  const d = new Float32Array(maxLag + 1);
  for (let s = 0; s + win + maxLag < n; s += hop) {
    let energy = 0;
    for (let i = 0; i < win; i++) energy += x[s + i] * x[s + i];
    const rms = Math.sqrt(energy / win);
    if (rms > peakRms) peakRms = rms;
    let running = 0;
    d[0] = 1;
    let best = -1;
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < win; i++) {
        const diff = x[s + i] - x[s + i + lag];
        sum += diff * diff;
      }
      running += sum;
      d[lag] = running > 0 ? (sum * lag) / running : 1;
    }
    for (let lag = minLag; lag < maxLag; lag++) {
      if (d[lag] < 0.15) {
        while (lag + 1 < maxLag && d[lag + 1] < d[lag]) lag++;
        best = lag;
        break;
      }
    }
    let f0: number | null = null;
    if (best > 0) {
      const y0 = d[best - 1];
      const y1 = d[best];
      const y2 = d[best + 1];
      const denom = y0 - 2 * y1 + y2;
      const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
      f0 = sr / (best + shift);
    }
    frames.push({ t: (s + win / 2) / sr, f0, rms });
  }
  const voiced = frames.filter((f) => f.f0 !== null && f.rms > peakRms * 0.12) as { t: number; f0: number; rms: number }[];
  if (voiced.length < 5) return [];
  const sorted = voiced.map((f) => f.f0).sort((p, q) => p - q);
  const median = sorted[sorted.length >> 1];
  const kept = voiced.filter((f) => f.f0 > median / 1.9 && f.f0 < median * 1.9);
  if (kept.length < 5) return [];
  const st = kept.map((f) => 12 * Math.log2(f.f0 / median));
  const t0 = kept[0].t;
  const span = kept[kept.length - 1].t - t0 || 1;
  return kept.map((f, i) => ({ x: (f.t - t0) / span, st: st[i] }));
}

// ───────────────────────── helpers ─────────────────────────

const buffer = (samples: Float32Array, sampleRate: number) =>
  ({ numberOfChannels: 1, sampleRate, length: samples.length, duration: samples.length / sampleRate, getChannelData: () => samples }) as unknown as AudioBuffer;

function glide(f0: number, f1: number, o: { sr?: number; level?: number; noise?: number; click?: boolean } = {}) {
  const sr = o.sr ?? 48000;
  const pad = Math.round(sr * 0.35);
  const n = Math.round(sr * 0.6);
  const out = new Float32Array(n + pad * 2);
  const harm = [1, 0.6, 0.35, 0.2, 0.1];
  const level = o.level ?? 0.1;
  let phase = 0;
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * 2;
  for (let i = 0; i < n; i++) {
    const f = f0 + ((f1 - f0) * i) / n;
    phase += (2 * Math.PI * f) / sr;
    let v = 0;
    for (let h = 0; h < harm.length; h++) v += harm[h] * Math.sin((h + 1) * phase);
    const edge = Math.min(1, i / (sr * 0.03), (n - i) / (sr * 0.05));
    out[pad + i] = (level * v * edge) / 2.25;
  }
  if (o.noise) for (let i = 0; i < out.length; i++) out[i] += o.noise * rnd();
  if (o.click) for (let i = 0; i < 60; i++) out[Math.round(pad * 0.4) + i] = i % 2 ? 0.95 : -0.95;
  return { samples: out, sr };
}
const direction = (pts: { st: number }[]) => {
  if (pts.length < 5) return 'none';
  const a = pts.slice(0, 5).reduce((s, p) => s + p.st, 0) / 5;
  const b = pts.slice(-5).reduce((s, p) => s + p.st, 0) / 5;
  return b - a > 2 ? 'rising' : a - b > 2 ? 'falling' : 'level';
};

async function main() {
  const tmp = join(ROOT, '.cache', 'diagnosis');
  mkdirSync(tmp, { recursive: true });
  const lines: string[] = ['# Pitch contour diagnosis', '', `Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/diagnose-pitch.ts\`. "Old" is the tracker the app shipped before Round 2; "new" is \`src/lib/pitch.ts\`.`, ''];

  // Part 1: test-tone glides.
  lines.push('## 1. Test-tone glides through the recording path', '', 'Each glide is encoded as a browser would record it, decoded at the sample rates AudioContexts use, trimmed with speechBounds, then tracked.', '');
  lines.push('| Signal | Codec | Decode rate | Trim | Old: points, direction | New: points, direction, median Hz |', '|---|---|---|---|---|---|');
  const cases: { name: string; f0: number; f1: number; opts?: Parameters<typeof glide>[2] }[] = [
    { name: 'low 70→120 Hz', f0: 70, f1: 120 },
    { name: 'low 120→70 Hz', f0: 120, f1: 70 },
    { name: 'mid 100→200 Hz', f0: 100, f1: 200 },
    { name: 'mid 200→100 Hz', f0: 200, f1: 100 },
    { name: 'high 180→350 Hz', f0: 180, f1: 350 },
    { name: 'high 350→180 Hz', f0: 350, f1: 180 },
    { name: 'mid, quiet (−32 dBFS)', f0: 100, f1: 200, opts: { level: 0.025 } },
    { name: 'mid, quiet + room noise', f0: 100, f1: 200, opts: { level: 0.025, noise: 0.004 } },
    { name: 'mid, tap click before', f0: 100, f1: 200, opts: { click: true } },
    { name: 'mid, quiet + tap click', f0: 100, f1: 200, opts: { level: 0.025, click: true } },
    { name: 'low, quiet + tap click', f0: 70, f1: 120, opts: { level: 0.025, click: true } },
    { name: 'very low 60→90 Hz', f0: 60, f1: 90 },
  ];
  const codecs = [
    { name: 'WAV', ext: 'wav', args: ['-c:a', 'pcm_s16le'], rates: [48000] },
    { name: 'WebM/Opus (Chrome, Firefox)', ext: 'webm', args: ['-c:a', 'libopus', '-b:a', '64k'], rates: [48000, 44100] },
    { name: 'MP4/AAC (Safari)', ext: 'm4a', args: ['-c:a', 'aac', '-b:a', '64k'], rates: [48000, 44100] },
  ];
  const tally = { oldEmpty: 0, newEmpty: 0, oldWrong: 0, newWrong: 0, total: 0 };
  for (const c of cases) {
    const g = glide(c.f0, c.f1, c.opts);
    const expected = c.f1 > c.f0 ? 'rising' : 'falling';
    for (const codec of codecs) {
      const file = join(tmp, `${c.name.replace(/[^a-z0-9]+/gi, '_')}.${codec.ext}`);
      await encodePcm(g.samples, g.sr, file, codec.args);
      for (const rate of codec.rates) {
        const { samples, sampleRate } = await decodePcm(file, rate);
        const b = speechBounds(buffer(samples, sampleRate));
        const o = oldPitchContour(samples, sampleRate, b.start, b.end);
        const nw = analysePitch(samples.subarray(Math.floor(b.start * sampleRate), Math.ceil(b.end * sampleRate)), sampleRate);
        tally.total++;
        if (!o.length) tally.oldEmpty++;
        else if (direction(o) !== expected) tally.oldWrong++;
        if (!nw.points.length) tally.newEmpty++;
        else if (direction(nw.points) !== expected) tally.newWrong++;
        lines.push(`| ${c.name} | ${codec.name} | ${rate} | ${b.start.toFixed(2)}–${b.end.toFixed(2)} s | ${o.length}, ${direction(o)} | ${nw.points.length}, ${direction(nw.points)}, ${nw.medianHz}${nw.reason ? ` (${nw.reason})` : ''} |`);
      }
    }
  }
  lines.push('', `Old tracker: ${tally.oldEmpty} of ${tally.total} runs returned no contour, ${tally.oldWrong} the wrong direction. New: ${tally.newEmpty} empty, ${tally.newWrong} wrong.`, '');

  // Part 2: real speech.
  lines.push('## 2. The native clips as a regression set (real speech)', '', 'Every clip in public/audio, decoded at 48 kHz like a recording, clean and under microphone-like conditions.', '');
  lines.push('| Clips | Old: no contour | Old: under 10 points | New: no contour | Mean points old / new | Mic-like noise: old / new empty | Quiet + tap click: old / new empty |', '|---|---|---|---|---|---|---|');
  {
    const dir = join(ROOT, 'public', 'audio');
    const files = readdirSync(dir).filter((f) => f.endsWith('.mp3'));
    const st = { n: 0, oldEmpty: 0, oldShort: 0, newEmpty: 0, oldPts: 0, newPts: 0, noisyOld: 0, noisyNew: 0, clickOld: 0, clickNew: 0 };
    let seed = 3;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * 2;
    for (const f of files) {
      const { samples, sampleRate } = await decodePcm(join(dir, f), 48000);
      st.n++;
      const b = speechBounds(buffer(samples, sampleRate));
      const o = oldPitchContour(samples, sampleRate, b.start, b.end);
      const nw = analysePitch(samples.subarray(Math.floor(b.start * sampleRate), Math.ceil(b.end * sampleRate)), sampleRate);
      if (!o.length) st.oldEmpty++;
      else if (o.length < 10) st.oldShort++;
      if (!nw.points.length) st.newEmpty++;
      st.oldPts += o.length;
      st.newPts += nw.points.length;
      const noisy = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) noisy[i] = samples[i] * 0.125 + 0.005 * rnd();
      const nb = speechBounds(buffer(noisy, sampleRate));
      if (!oldPitchContour(noisy, sampleRate, nb.start, nb.end).length) st.noisyOld++;
      if (!analysePitch(noisy.subarray(Math.floor(nb.start * sampleRate), Math.ceil(nb.end * sampleRate)), sampleRate).points.length) st.noisyNew++;
      const qc = new Float32Array(samples.length + sampleRate);
      for (let i = 0; i < samples.length; i++) qc[i + sampleRate] = samples[i] * 0.05;
      for (let i = 0; i < 60; i++) qc[Math.round(sampleRate * 0.85) + i] = i % 2 ? 0.9 : -0.9;
      const qb = speechBounds(buffer(qc, sampleRate));
      if (!oldPitchContour(qc, sampleRate, qb.start, qb.end).length) st.clickOld++;
      if (!analysePitch(qc.subarray(Math.floor(qb.start * sampleRate), Math.ceil(qb.end * sampleRate)), sampleRate).points.length) st.clickNew++;
    }
    lines.push(`| ${st.n} | ${st.oldEmpty} | ${st.oldShort} | ${st.newEmpty} | ${(st.oldPts / st.n).toFixed(1)} / ${(st.newPts / st.n).toFixed(1)} | ${st.noisyOld} / ${st.noisyNew} | ${st.clickOld} / ${st.clickNew} |`);
    console.log(lines[lines.length - 1]);
  }
  lines.push('');
  mkdirSync(join(ROOT, 'reports'), { recursive: true });
  writeFileSync(join(ROOT, 'reports', 'pitch-diagnosis.md'), lines.join('\n'));
  console.log('Wrote reports/pitch-diagnosis.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
