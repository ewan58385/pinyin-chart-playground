/**
 * Builds the native audio from a local folder of syllable recordings and
 * writes the manifests. Nothing is downloaded.
 *
 *   input   .cache/sources/audio-cmn/syllabs/cmn-{syllable}{tone}.mp3   (not committed)
 *   output  public/audio/{syllable}{tone}.mp3        e.g. ma1.mp3, lv4.mp3 (ü is written v)
 *           audio-manifest.json                      source, licence, author and original file for every clip
 *           src/data/generated/audio-index.json      the slim index the app bundles
 *           reports/audio-coverage.md                coverage, exclusions and unused source files
 *
 * Each clip is high-passed, trimmed to the speech using its own measured noise
 * floor, levelled so the loud part of every syllable sits at the same RMS,
 * faded at both ends, and encoded as mono 24 kHz MP3 at 48 kbit/s.
 *
 * Every clip then has to pass the spot checks below (length, single
 * utterance, onset kept, no clipping, not a copy of another tone); a clip
 * that fails is left out and listed in the report.
 *
 * Usage:  npm run data:audio                 (or: -- --source <folder>)
 * Requires ffmpeg and ffprobe on the PATH.
 */
import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, relative } from 'node:path';
import { ROOT, CACHE } from './lib/sources';
import { decodePcm } from './lib/pcm';
import { analysePitch } from '../src/lib/pitch';

// ───────────────────────── settings ─────────────────────────

const TARGET_ACTIVE_RMS_DB = -20; // level of the loud part of each syllable
const PEAK_CEILING_DB = -1.5;
const SAMPLE_RATE = 24000;
const BITRATE = '48k';
const LEAD_PAD = 0.03; // seconds kept before the detected onset
const TAIL_PAD = 0.07;
const FADE_IN = 0.01;
const FADE_OUT = 0.045;
const ANALYSIS_RATE = 16000;
const FRAME = 160; // 10 ms at the analysis rate

/** Spot-check limits. */
const MIN_SPEECH_S = 0.12;
const MAX_SPEECH_S = 1.3;
/** A second burst of sound this long, after a gap, means the file holds more than one utterance. */
const SECOND_UTTERANCE_S = 0.2;
const GAP_S = 0.15;

const args = process.argv.slice(2);
const argValue = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SOURCE_DIR = argValue('source') ?? join(CACHE, 'audio-cmn', 'syllabs');

const UNKNOWN = 'UNKNOWN';
const REPOSITORY = 'https://github.com/hugolpz/audio-cmn';
/** What was done to every clip, for the ShareAlike "indicate changes" requirement. */
const CHANGES = 'Trimmed to the syllable, high-pass filtered (70 Hz), levelled to a common loudness, faded in and out, and converted to mono 24 kHz MP3 at 48 kbit/s.';

// ───────────────────────── source metadata ─────────────────────────

/** Tags written into each file by the recording software (SWAC). */
interface Tags {
  speaker?: string;
  licence?: string;
  authors?: string;
  copyright?: string;
  collection?: string;
  text?: string;
  recorded?: string;
}

function probeTags(path: string): Tags {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format_tags', '-of', 'json', path], { encoding: 'utf8' });
  const raw = (JSON.parse(out).format?.tags ?? {}) as Record<string, string>;
  const t: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) t[k.toUpperCase()] = v;
  return {
    speaker: t.SWAC_SPEAK_NAME,
    licence: t.SWAC_COLL_LICENSE,
    authors: t.SWAC_COLL_AUTHORS,
    copyright: t.SWAC_COLL_COPYRIGHT,
    collection: t.SWAC_COLL_NAME,
    text: t.SWAC_TEXT,
    recorded: t.SWAC_TECH_DATE,
  };
}

const LICENCE_URLS: Record<string, string> = {
  'CC-BY-SA-3.0': 'https://creativecommons.org/licenses/by-sa/3.0/',
};

// ───────────────────────── map source files to tone cells ─────────────────────────

/**
 * Source naming: cmn-{pinyin}{tone}.mp3, tone 1–5 (5 = neutral), ü written v
 * (cmn-lv4.mp3, cmn-nve3.mp3). Names starting with "_" are marked by the
 * source as outside the standard syllable set. After j, q, x and y the
 * letter ü is spelled u in pinyin, so cmn-jv4.mp3 is the cell ju4.
 */
function sourceKey(file: string): string | null {
  const m = file.match(/^cmn-([a-z]+)([1-5])\.mp3$/);
  if (!m) return null;
  const base = m[1].replace(/^([jqxy])v/, '$1u');
  return `${base}${m[2]}`;
}

// ───────────────────────── analysis + encoding ─────────────────────────

function run(cmd: string, argv: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(cmd, argv, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => (err ? reject(err) : resolve(stdout as Buffer)));
  });
}

const HIGHPASS = 'highpass=f=70';
const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));

interface Analysis {
  start: number;
  end: number;
  gainDb: number;
  speech: number;
  /** Seconds of sound after the main utterance, when it is long enough to be a second one. */
  second: number;
  /** Envelope at the trim start relative to the noise floor, dB. */
  onsetAboveNoiseDb: number;
}

async function envelope(path: string): Promise<{ env: Float64Array; peakSample: number; n: number }> {
  const pcm = await run('ffmpeg', ['-v', 'error', '-i', path, '-af', HIGHPASS, '-ac', '1', '-ar', String(ANALYSIS_RATE), '-f', 's16le', '-']);
  const n = Math.floor(pcm.length / 2);
  const frames = Math.floor(n / FRAME);
  const env = new Float64Array(frames);
  let peakSample = 0;
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = 0; i < FRAME; i++) {
      const v = pcm.readInt16LE((f * FRAME + i) * 2) / 32768;
      sum += v * v;
      if (Math.abs(v) > peakSample) peakSample = Math.abs(v);
    }
    env[f] = Math.sqrt(sum / FRAME);
  }
  return { env, peakSample, n };
}

async function analyse(path: string): Promise<Analysis | null> {
  const { env, peakSample, n } = await envelope(path);
  const frames = env.length;
  if (frames < 8) return null;
  // Skip the first 30 ms: MP3 decoder delay shows up as digital silence.
  const sorted = Array.from(env.subarray(3)).sort((a, b) => a - b);
  const noise = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[sorted.length - 1];
  // Speech = clearly above the noise floor, but never demand more than 40 dB below the peak.
  const threshold = Math.max(noise * 2, peak * 0.01);
  const above = (f: number) => env[f] > threshold;
  // Runs of speech, joined across gaps shorter than GAP_S.
  const runs: [number, number][] = [];
  const gapFrames = Math.round((GAP_S * ANALYSIS_RATE) / FRAME);
  for (let f = 3; f < frames - 1; f++) {
    if (!(above(f) && above(f + 1))) continue;
    const last = runs[runs.length - 1];
    if (last && f - last[1] <= gapFrames) last[1] = f + 1;
    else runs.push([f, f + 1]);
  }
  if (!runs.length) return null;
  // The utterance is the loudest run; anything after it is a tail (breath, click) or a second utterance.
  const energy = (r: [number, number]) => {
    let s = 0;
    for (let f = r[0]; f <= r[1]; f++) s += env[f] * env[f];
    return s;
  };
  const main = runs.reduce((a, b) => (energy(b) > energy(a) ? b : a));
  const frameSec = FRAME / ANALYSIS_RATE;
  const others = runs.filter((r) => r !== main).map((r) => (r[1] - r[0] + 1) * frameSec);
  const second = Math.max(0, ...others);
  let [first, last] = main;
  // Weak onsets (f, h, s, x) can start below the speech threshold: walk back while the
  // level is still clearly above the noise floor, so the fricative is not cut.
  const soft = Math.max(noise * 1.5, peak * 0.003);
  while (first > 3 && env[first - 1] > soft) first--;
  while (last < frames - 2 && env[last + 1] > soft) last++;
  const start = Math.max(0, first * frameSec - LEAD_PAD);
  const end = Math.min(n / ANALYSIS_RATE, (last + 1) * frameSec + TAIL_PAD);
  // Frames 0–2 are decoder delay, so the earliest frame that says anything is 3.
  const startFrame = Math.min(frames - 1, Math.max(3, Math.floor(start / frameSec)));
  // Level by the loud part of the syllable (frames within 12 dB of the peak frame).
  let sum = 0;
  let count = 0;
  for (let f = first; f <= last; f++) {
    if (env[f] >= peak * 0.25) {
      sum += env[f] * env[f];
      count++;
    }
  }
  const activeDb = db(Math.sqrt(sum / Math.max(count, 1)));
  const gainDb = Math.min(TARGET_ACTIVE_RMS_DB - activeDb, PEAK_CEILING_DB - db(peakSample));
  return {
    start,
    end,
    gainDb,
    speech: (main[1] - main[0] + 1) * frameSec,
    second: second >= SECOND_UTTERANCE_S ? second : 0,
    onsetAboveNoiseDb: db(env[startFrame]) - db(noise),
  };
}

/** Why a source file is not one cleanly recorded syllable, or null if it is. */
function problemWith(a: Analysis | null): string | null {
  if (!a) return 'no speech found';
  if (a.second) return `more than one utterance (a second burst of ${a.second.toFixed(2)} s after a pause)`;
  if (a.speech < MIN_SPEECH_S) return `speech only ${a.speech.toFixed(2)} s long`;
  if (a.speech > MAX_SPEECH_S) return `speech ${a.speech.toFixed(2)} s long, more than one syllable's worth (limit ${MAX_SPEECH_S} s)`;
  if (a.onsetAboveNoiseDb > 12) return `starts ${a.onsetAboveNoiseDb.toFixed(0)} dB above the noise floor: the onset may be cut off in the source`;
  return null;
}

/** Median f0 of a file, with the app's own pitch tracker. */
async function medianHz(path: string): Promise<number> {
  const { samples, sampleRate } = await decodePcm(path, 16000);
  return analysePitch(samples, sampleRate).medianHz;
}

async function encode(src: string, dest: string, a: Analysis): Promise<void> {
  const dur = a.end - a.start;
  const filter = [
    HIGHPASS,
    `atrim=start=${a.start.toFixed(3)}:end=${a.end.toFixed(3)}`,
    'asetpts=PTS-STARTPTS',
    `volume=${a.gainDb.toFixed(2)}dB`,
    `afade=t=in:st=0:d=${FADE_IN}`,
    `afade=t=out:st=${Math.max(0, dur - FADE_OUT).toFixed(3)}:d=${FADE_OUT}`,
  ].join(',');
  // -ac 1 -ar 24000 also converts the few 22.05 kHz source files.
  await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', filter, '-ac', '1', '-ar', String(SAMPLE_RATE), '-c:a', 'libmp3lame', '-b:a', BITRATE, '-map_metadata', '-1', '-id3v2_version', '0', dest]);
}

/** Checks on the encoded clip: peak level and clipped samples. */
async function checkOutput(path: string): Promise<{ peakDb: number; clipped: number; seconds: number }> {
  const pcm = await run('ffmpeg', ['-v', 'error', '-i', path, '-ac', '1', '-f', 's16le', '-']);
  const n = Math.floor(pcm.length / 2);
  let peak = 0;
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.abs(pcm.readInt16LE(i * 2)) / 32768;
    if (v > peak) peak = v;
    if (v >= 0.999) clipped++;
  }
  return { peakDb: db(peak), clipped, seconds: n / SAMPLE_RATE };
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

const md5 = (path: string) => createHash('md5').update(readFileSync(path)).digest('hex');
const decodedMd5 = async (path: string) => createHash('md5').update(await run('ffmpeg', ['-v', 'error', '-i', path, '-ac', '1', '-f', 's16le', '-'])).digest('hex');

// ───────────────────────── main ─────────────────────────

interface Syllable {
  id: string;
  ascii: string;
  tones: { tone: number; numeric: string; status: string }[];
}

interface Clip {
  file: string;
  source: string;
  original: string;
  speaker: string;
  author: string;
  licence: string;
  copyright: string;
  url: string;
  changes: string;
  recorded?: string;
  bytes: number;
  ms: number;
  gainDb: number;
  /** Set when the source file carries no tags of its own. */
  note?: string;
}

async function main() {
  for (const tool of ['ffmpeg', 'ffprobe']) {
    try {
      execFileSync(tool, ['-version'], { stdio: 'ignore' });
    } catch {
      console.error(`${tool} was not found on the PATH. Install ffmpeg (apt install ffmpeg / brew install ffmpeg) and rerun.`);
      process.exit(1);
    }
  }
  if (!existsSync(SOURCE_DIR)) {
    console.error(`No source folder at ${SOURCE_DIR}.\nPut the syllable recordings there (see README, "Native audio") or pass --source <folder>.`);
    process.exit(1);
  }
  const syllables: Syllable[] = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'generated', 'syllables.json'), 'utf8'));
  const cells = syllables.flatMap((s) => s.tones.map((t) => ({ id: t.numeric, ascii: `${s.ascii}${t.tone}`, tone: t.tone, status: t.status, syllable: s.id })));
  const byAscii = new Map(cells.map((c) => [c.ascii, c]));

  // ── what the folder holds ──
  const files = readdirSync(SOURCE_DIR).sort();
  const audioFiles = files.filter((f) => f.toLowerCase().endsWith('.mp3'));
  const otherFiles = files.filter((f) => !f.toLowerCase().endsWith('.mp3'));
  const tags = new Map(audioFiles.map((f) => [f, probeTags(join(SOURCE_DIR, f))]));
  const speakers = new Map<string, number>();
  for (const t of tags.values()) if (t.speaker) speakers.set(t.speaker, (speakers.get(t.speaker) ?? 0) + 1);
  const untagged = audioFiles.filter((f) => !tags.get(f)!.speaker);

  // One speaker only: the one whose files cover the most chart cells.
  const coverage = new Map<string, number>();
  for (const f of audioFiles) {
    const k = sourceKey(f);
    const sp = tags.get(f)!.speaker;
    if (k && sp && byAscii.has(k)) coverage.set(sp, (coverage.get(sp) ?? 0) + 1);
  }
  const speaker = [...coverage.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!speaker) throw new Error('No source file names a speaker in its tags.');
  const tagged = audioFiles.map((f) => tags.get(f)!).filter((t) => t.speaker === speaker);
  const pick = (k: keyof Tags) => {
    const counts = new Map<string, number>();
    for (const t of tagged) if (t[k]) counts.set(t[k]!, (counts.get(t[k]!) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? UNKNOWN;
  };
  const licence = pick('licence');
  // Checked against the repository on 2026-11-13: its README is byte-identical to the
  // one in the source folder. Only the syllables set (syllabs v.2, speaker Chen Wang)
  // is used; the repository's separate HSK words set (speaker Yue Tan) is not.
  const source = {
    name: 'audio-cmn, syllables set (syllabs v.2)',
    collection: pick('collection'),
    speaker,
    url: REPOSITORY,
    /** As each recording's own metadata states it (SWAC_COLL_LICENSE). */
    licence,
    licenceUrl: LICENCE_URLS[licence] ?? '',
    /** As the repository README states it. */
    licenceInReadme: 'CC-by-sa',
    licenceNote:
      'The repository README states the licence as "CC-by-sa" with no version, and the repository has no LICENSE file. Each recording\'s own metadata (SWAC_COLL_LICENSE) states "' +
      licence +
      '".',
    author: `${speaker} (speaker); Hugo Lopez, PLIDAM, INALCO (project management, repository, audio compression, file renaming); Nicolas Vion (recording software)`,
    authorsInMetadata: pick('authors'),
    copyright: pick('copyright'),
    changes: CHANGES,
  };

  // ── map files to cells ──
  const candidates = new Map<string, string>(); // cell id → file
  const unused: { file: string; why: string }[] = [];
  const otherSpeaker: string[] = [];
  for (const f of audioFiles) {
    const k = sourceKey(f);
    const sp = tags.get(f)!.speaker;
    if (sp && sp !== speaker) {
      otherSpeaker.push(f);
      continue;
    }
    if (!k) {
      unused.push({ file: f, why: f.startsWith('cmn-_') ? 'marked by the source as outside the standard syllables' : 'name not understood' });
      continue;
    }
    const cell = byAscii.get(k);
    if (!cell) {
      unused.push({ file: f, why: 'no such tone cell on the chart' });
      continue;
    }
    if (candidates.has(cell.id)) {
      unused.push({ file: f, why: `a second file for ${cell.id}` });
      continue;
    }
    candidates.set(cell.id, f);
  }

  // ── the neutral-tone files are judged as a set ──
  // They are a small separate batch (19 files, all early in the alphabet). If most of
  // them fail the single-syllable checks, none of them is trusted, including any that
  // happen to pass: they are not the same kind of recording as the rest of the set.
  const neutralFiles = audioFiles.filter((f) => /5\.mp3$/.test(f) && tags.get(f)!.speaker === speaker);
  let neutralRejected: string | null = null;
  if (neutralFiles.length) {
    let failing = 0;
    const neutralHz: number[] = [];
    const firstHz: number[] = [];
    for (const f of neutralFiles) {
      if (problemWith(await analyse(join(SOURCE_DIR, f)))) failing++;
      neutralHz.push(await medianHz(join(SOURCE_DIR, f)));
      const first = join(SOURCE_DIR, f.replace(/5\.mp3$/, '1.mp3'));
      if (existsSync(first)) firstHz.push(await medianHz(first));
    }
    const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
    if (failing * 2 > neutralFiles.length) {
      neutralRejected =
        `the neutral-tone files are not used as a set: ${failing} of the ${neutralFiles.length} hold more than one syllable or run far longer than any syllable in the rest of the set, ` +
        `and their median pitch is about ${Math.round(med(neutralHz))} Hz against about ${Math.round(med(firstHz))} Hz for the first tones of the same syllables by the named speaker`;
    }
  }

  // ── process ──
  const outDir = join(ROOT, 'public', 'audio');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const clips: Record<string, Clip> = {};
  const excluded: { id: string; file: string; why: string }[] = [];
  const checks: Record<string, { speech: number; peakDb: number; onsetDb: number }> = {};
  const todo = cells.filter((c) => candidates.has(c.id));
  let done = 0;
  await pool(todo, Math.max(2, cpus().length), async (cell) => {
    const original = candidates.get(cell.id)!;
    const src = join(SOURCE_DIR, original);
    const file = `${cell.ascii}.mp3`;
    const dest = join(outDir, file);
    const fail = (why: string) => {
      excluded.push({ id: cell.id, file: original, why });
      rmSync(dest, { force: true });
    };
    try {
      const a = await analyse(src);
      const problem = problemWith(a);
      if (problem) return fail(problem);
      if (cell.tone === 5 && neutralRejected) return fail(neutralRejected);
      await encode(src, dest, a!);
      const out = await checkOutput(dest);
      if (out.clipped > 2) return fail(`${out.clipped} clipped samples after levelling`);
      const t = tags.get(original)!;
      checks[cell.id] = { speech: a!.speech, peakDb: out.peakDb, onsetDb: a!.onsetAboveNoiseDb };
      clips[cell.id] = {
        file,
        source: 'audio-cmn',
        original,
        speaker: t.speaker ?? speaker,
        author: source.author,
        licence: t.licence ?? licence,
        copyright: t.copyright ?? source.copyright,
        url: source.url,
        changes: CHANGES,
        ...(t.recorded ? { recorded: t.recorded } : {}),
        bytes: statSync(dest).size,
        ms: Math.round(out.seconds * 1000),
        gainDb: Math.round(a!.gainDb * 10) / 10,
        ...(t.speaker ? {} : { note: 'The source file carries no tags of its own (and is sampled at 22.05 kHz, not 48 kHz); speaker, authors and licence are those the README gives for the whole set.' }),
      };
    } catch (err) {
      fail(`could not be processed: ${(err as Error).message.split('\n')[0]}`);
    }
    if (++done % 200 === 0) console.log(`  ${done}/${todo.length}`);
  });

  // ── no clip may be a copy of another tone of the same syllable ──
  const bySyllable = new Map<string, string[]>();
  for (const c of cells) if (clips[c.id]) bySyllable.set(c.syllable, [...(bySyllable.get(c.syllable) ?? []), c.id]);
  const copies: string[] = [];
  for (const ids of bySyllable.values()) {
    const seen = new Map<string, string>();
    for (const id of ids) {
      const h = md5(join(outDir, clips[id].file)) + '|' + (await decodedMd5(join(SOURCE_DIR, clips[id].original)));
      for (const part of h.split('|')) {
        const other = seen.get(part);
        if (other) {
          copies.push(`${id} = ${other}`);
          excluded.push({ id, file: clips[id].original, why: `identical to ${other}` });
          rmSync(join(outDir, clips[id].file), { force: true });
          delete clips[id];
          break;
        }
        seen.set(part, id);
      }
    }
  }

  // ── write ──
  const ordered = Object.fromEntries(cells.filter((c) => clips[c.id]).map((c) => [c.id, clips[c.id]]));
  const totalBytes = Object.values(ordered).reduce((a, c) => a + c.bytes, 0);
  const missing = cells.filter((c) => !clips[c.id]);
  const missingShown = missing.filter((c) => c.status !== 'single-source');
  const generatedAt = new Date().toISOString().slice(0, 10);
  const format = { codec: 'mp3', channels: 1, sampleRate: SAMPLE_RATE, bitrate: BITRATE, targetActiveRmsDb: TARGET_ACTIVE_RMS_DB };
  const sources = { 'audio-cmn': source };
  const byTone = (list: { id: string }[]) => Object.fromEntries([1, 2, 3, 4, 5].map((t) => [t, list.filter((c) => c.id.endsWith(String(t))).length]));
  const sortedExcluded = excluded.sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(
    join(ROOT, 'audio-manifest.json'),
    '{\n' +
      `"generatedAt": ${JSON.stringify(generatedAt)},\n` +
      `"format": ${JSON.stringify(format)},\n` +
      `"sources": ${JSON.stringify(sources, null, 1)},\n` +
      `"totalBytes": ${totalBytes},\n` +
      `"clipCount": ${Object.keys(ordered).length},\n` +
      `"excluded": ${JSON.stringify(sortedExcluded)},\n` +
      `"missing": ${JSON.stringify(missing.map((c) => c.id))},\n` +
      '"clips": {\n' +
      Object.entries(ordered)
        .map(([id, c]) => `${JSON.stringify(id)}: ${JSON.stringify(c)}`)
        .join(',\n') +
      '\n}\n}\n',
  );
  writeFileSync(
    join(ROOT, 'src', 'data', 'generated', 'audio-index.json'),
    JSON.stringify({
      generatedAt,
      sources,
      totalBytes,
      // cell id → [bytes, milliseconds, source key]
      clips: Object.fromEntries(Object.entries(ordered).map(([id, c]) => [id, [c.bytes, c.ms, 'audio-cmn']])),
    }) + '\n',
  );

  const mb = (totalBytes / 1024 / 1024).toFixed(1);
  const fmt = (o: Record<string, number>) => Object.entries(o).map(([t, n]) => `tone ${t}: ${n}`).join(', ');
  const ms = Object.values(ordered).map((c) => c.ms).sort((a, b) => a - b);
  const peaks = Object.values(checks).map((c) => c.peakDb).sort((a, b) => a - b);
  const md = [
    '# Audio coverage',
    '',
    `Generated ${generatedAt} by \`scripts/build-audio.ts\`. Do not edit by hand.`,
    '',
    '## Source',
    '',
    `- ${source.name} (collection tag \`${source.collection}\`), from the local folder \`${relative(ROOT, SOURCE_DIR)}\` (not committed).`,
    `- Speaker: ${speaker}. Authors: ${source.author}. ${source.copyright}.`,
    `- Licence: ${licence} as stated in each file's metadata${source.licenceUrl ? ` (${source.licenceUrl})` : ''}. ${source.licenceNote} Repository: ${source.url}.`,
    `- Changes made to every clip: ${CHANGES}`,
    `- Folder contents: ${audioFiles.length} MP3 files${otherFiles.length ? ` and ${otherFiles.join(', ')}` : ''}.`,
    `- Speakers named in the file tags: ${[...speakers.entries()].map(([s, n]) => `${s} (${n} files)`).join(', ')}; ${untagged.length} files carry no tags (${untagged.join(', ') || 'none'}). Used: ${speaker}, the speaker with the most chart cells covered.${otherSpeaker.length ? ` Files by other speakers, not used: ${otherSpeaker.join(', ')}.` : ''}`,
    '',
    '## Coverage',
    '',
    `- Clips written: **${Object.keys(ordered).length}** of ${cells.length} tone cells (${mb} MB, ${format.bitrate} mono MP3 at ${SAMPLE_RATE} Hz). By tone: ${fmt(byTone(Object.keys(ordered).map((id) => ({ id }))))}.`,
    `- Visible tone cells with no audio: **${missingShown.length}** (${fmt(byTone(missingShown))}).`,
    `- Hidden single-source cells with no audio: ${missing.length - missingShown.length}.`,
    `- Clip lengths ${ms[0]}–${ms[ms.length - 1]} ms (median ${ms[Math.floor(ms.length / 2)]} ms); peaks ${peaks[0].toFixed(1)} to ${peaks[peaks.length - 1].toFixed(1)} dBFS, loud part levelled to ${TARGET_ACTIVE_RMS_DB} dB RMS.`,
    '',
    '## Spot checks',
    '',
    `Every clip is checked for: speech between ${MIN_SPEECH_S} and ${MAX_SPEECH_S} s; a single utterance (no second burst of ${SECOND_UTTERANCE_S} s or more after a pause); a start at the noise floor, so no onset is cut (weak onsets such as f, h, s and x are followed down to 1.5× the noise floor before trimming); no clipped samples after levelling; and, within each syllable, no clip identical to another tone's (compared both as encoded files and as decoded source audio).`,
    '',
    `- Identical clips across tones: ${copies.length ? copies.join(', ') : 'none'}.`,
    `- Neutral-tone files (${neutralFiles.length}), judged as one set because they are a separate small batch: ${neutralRejected ? `rejected; ${neutralRejected}. So no tone cell has a neutral-tone recording.` : 'kept.'}`,
    `- Excluded: ${sortedExcluded.length}.`,
    '',
    ...sortedExcluded.map((e) => `  - \`${e.id}\` from \`${e.file}\`: ${e.why}`),
    '',
    '## Visible tone cells with no audio',
    '',
    ...[1, 2, 3, 4, 5].map((t) => {
      const list = missingShown.filter((c) => c.id.endsWith(String(t))).map((c) => c.id);
      return `- **Tone ${t}** (${list.length}): ${list.join(', ') || 'none'}`;
    }),
    '',
    '## Untagged source files',
    '',
    ...(Object.entries(ordered).filter(([, c]) => c.note).map(([id, c]) => `- \`${id}\` from \`${c.original}\`: ${c.note}`)),
    ...(Object.values(ordered).some((c) => c.note) ? [] : ['None used.']),
    '',
    '## Source files not used',
    '',
    `${unused.length} files match no tone cell on the chart: tones that do not occur, syllables the chart does not have, and files the source marks with a leading underscore.`,
    '',
    unused.map((u) => `\`${u.file}\``).join(', '),
    '',
  ];
  mkdirSync(join(ROOT, 'reports'), { recursive: true });
  writeFileSync(join(ROOT, 'reports', 'audio-coverage.md'), md.join('\n'));

  console.log(`\n${Object.keys(ordered).length} clips, ${mb} MB. Excluded ${sortedExcluded.length}. Missing for ${missingShown.length} visible cells (${fmt(byTone(missingShown))}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
