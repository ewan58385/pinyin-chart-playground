/**
 * Downloads native-speaker clips, normalises them, and writes the manifests.
 *
 *   public/audio/{syllable}{tone}.mp3        e.g. ma1.mp3, lv4.mp3 (ü is written v)
 *   audio-manifest.json                      source, licence, author and URL for every clip
 *   src/data/generated/audio-index.json      the slim index the app bundles
 *   reports/audio-coverage.md                which tone cells have no audio
 *
 * Each clip is: high-passed (the source files carry a DC offset), trimmed to
 * the speech using its own measured noise floor, levelled so the loud part of
 * every syllable sits at the same RMS, faded at both ends, and encoded as
 * mono 24 kHz MP3.
 *
 * Usage:
 *   npm run data:audio
 *   npm run data:audio -- --pack ./my-pack --pack-name "Video audio pack" \
 *        --pack-licence "CC BY 4.0" --pack-author "Someone" --pack-url https://example.com
 *
 * A local pack is a folder of files named like ma1.mp3 / lv4.wav / de.mp3
 * (no number = neutral tone). Its clips take priority over the default source.
 * Requires ffmpeg on the PATH.
 */
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, extname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { ROOT, CACHE } from './lib/sources';
import { normaliseUmlaut } from '../src/lib/pinyin';

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

interface SourceInfo {
  name: string;
  url: string;
  licence: string;
  licenceUrl: string;
  author: string;
  note?: string;
}

const DAVIN: SourceInfo = {
  name: 'mp3-chinese-pinyin-sound',
  url: 'https://github.com/davinfifield/mp3-chinese-pinyin-sound',
  licence: 'The Unlicense (public domain dedication)',
  licenceUrl: 'https://github.com/davinfifield/mp3-chinese-pinyin-sound/blob/master/LICENSE',
  author: 'davinfifield (GitHub); the speaker is not credited in the source',
  note: 'Also published on npm as @hanzikite/pinyin-mp3.',
};
const NOTES = [
  'The davinfifield pack covers tones 1–4 only. Its files named as neutral tone (ma5, ma, de5, de, le5, ne5, zi) are byte-identical copies of the first-tone files and are not used, so neutral-tone cells have no native audio.',
  'The pack records all four tones for every syllable, including tones that do not occur in Mandarin, and a few combinations that are not syllables (diang, shong, rei, muo, nia, lün). Those files are not used.',
];
const DAVIN_TARBALL = 'https://codeload.github.com/davinfifield/mp3-chinese-pinyin-sound/tar.gz/refs/heads/master';
const DAVIN_FILE_URL = (f: string) => `https://github.com/davinfifield/mp3-chinese-pinyin-sound/blob/master/mp3/${f}`;

// ───────────────────────── arguments ─────────────────────────

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const packDir = arg('pack') ?? process.env.AUDIO_PACK_DIR;
const packInfo: SourceInfo | null = packDir
  ? {
      name: arg('pack-name') ?? 'Local audio pack',
      url: arg('pack-url') ?? '',
      licence: arg('pack-licence') ?? 'UNKNOWN — fill this in before publishing',
      licenceUrl: arg('pack-licence-url') ?? '',
      author: arg('pack-author') ?? 'UNKNOWN',
    }
  : null;

// ───────────────────────── fetch the default pack ─────────────────────────

/** Minimal tar reader: yields regular files from an uncompressed tar buffer. */
function* untar(buf: Buffer): Generator<{ name: string; data: Buffer }> {
  let off = 0;
  while (off + 512 <= buf.length) {
    const header = buf.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break;
    const str = (start: number, len: number) => {
      const s = header.subarray(start, start + len);
      const end = s.indexOf(0);
      return s.subarray(0, end < 0 ? len : end).toString('utf8');
    };
    const name = str(345, 155) ? `${str(345, 155)}/${str(0, 100)}` : str(0, 100);
    const size = parseInt(str(124, 12).trim() || '0', 8);
    const type = String.fromCharCode(header[156]);
    const data = buf.subarray(off + 512, off + 512 + size);
    if (type === '0' || type === '\0') yield { name, data };
    off += 512 + Math.ceil(size / 512) * 512;
  }
}

async function ensureDavin(): Promise<string | null> {
  const dir = join(CACHE, 'audio-davinfifield');
  const mp3Dir = join(dir, 'mp3-chinese-pinyin-sound-master', 'mp3');
  if (existsSync(mp3Dir) && readdirSync(mp3Dir).length > 1000) return mp3Dir;
  mkdirSync(mp3Dir, { recursive: true });
  const tarball = join(dir, 'repo.tar.gz');
  if (!existsSync(tarball)) {
    console.log('Downloading', DAVIN_TARBALL);
    try {
      const res = await fetch(DAVIN_TARBALL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(tarball, Buffer.from(await res.arrayBuffer()));
    } catch (err) {
      console.error(`\nCould not download the audio pack (${(err as Error).message}).`);
      console.error('No network? Run this script again when online. The app works without audio.\n');
      return null;
    }
  }
  let n = 0;
  for (const f of untar(gunzipSync(readFileSync(tarball)))) {
    const m = f.name.match(/\/mp3\/([^/]+\.mp3)$/);
    if (!m) continue;
    writeFileSync(join(mp3Dir, m[1]), f.data);
    n++;
  }
  console.log(`Extracted ${n} files`);
  return mp3Dir;
}

// ───────────────────────── map source files to tone cells ─────────────────────────

interface Candidate {
  path: string;
  source: 'pack' | 'davinfifield';
  original: string;
}

/**
 * Source files whose name does not say which tone they are, assigned by hand.
 * Each one is written to the manifest with verified: false and this note.
 */
const DAVIN_UNNUMBERED: Record<string, { key: string; note: string }> = {
  'zhai.mp3': {
    key: 'zhai4',
    note:
      'The source file is named zhai.mp3 with no tone number, and zhai4.mp3 is missing. Its pitch falls from about 400 Hz to 200 Hz, like the other fourth tones in the pack, so it is used as zhài. Not checked by ear.',
  },
};

/**
 * davinfifield naming: ü after n/l is written "uu" (nuu3, luue4).
 *
 * The pack's neutral-tone files (ma5, ma, de5, de, le5, ne5, zi) are NOT used:
 * they are byte-for-byte copies of the first-tone files, so they are a high
 * level tone, not a neutral one. The pack therefore covers tones 1–4 only.
 */
function davinKey(file: string): string | null {
  if (DAVIN_UNNUMBERED[file]) return DAVIN_UNNUMBERED[file].key;
  const m = file.match(/^([a-z]+?)([1-4])\.mp3$/);
  if (!m) return null;
  const base = m[1].replace(/^([nl])uu/, '$1ü');
  return `${base}${m[2]}`;
}

/** Local pack naming: ma1.mp3, lv4.wav, lü4.mp3, lu:4.mp3, de.mp3. */
function packKey(file: string): string | null {
  const ext = extname(file).toLowerCase();
  if (!['.mp3', '.wav', '.ogg', '.oga', '.m4a', '.flac', '.aac', '.opus'].includes(ext)) return null;
  const stem = file.slice(0, -ext.length).toLowerCase().normalize('NFC');
  const m = stem.match(/^([a-zü:]+?)([0-5])?$/);
  if (!m) return null;
  const base = normaliseUmlaut(m[1]).replace(/^([nl])üu/, '$1ü');
  const tone = !m[2] || m[2] === '0' ? '5' : m[2];
  return `${base}${tone}`;
}

// ───────────────────────── analysis + encoding ─────────────────────────

function run(cmd: string, argv: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(cmd, argv, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (err, stdout) =>
      err ? reject(err) : resolve(stdout as Buffer),
    );
  });
}

const HIGHPASS = 'highpass=f=70';
const db = (x: number) => 20 * Math.log10(Math.max(x, 1e-9));

interface Analysis {
  start: number;
  end: number;
  gainDb: number;
  noiseDb: number;
}

async function analyse(path: string): Promise<Analysis | null> {
  const pcm = await run('ffmpeg', [
    '-v', 'error', '-i', path, '-af', HIGHPASS, '-ac', '1', '-ar', String(ANALYSIS_RATE), '-f', 's16le', '-',
  ]);
  const n = Math.floor(pcm.length / 2);
  const frames = Math.floor(n / FRAME);
  if (frames < 8) return null;
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
  // Skip the first 30 ms: MP3 decoder delay shows up as digital silence.
  const usable = Array.from(env.subarray(3));
  const sorted = [...usable].sort((a, b) => a - b);
  const noise = sorted[Math.floor(sorted.length * 0.1)];
  const peak = sorted[sorted.length - 1];
  // Speech = clearly above the noise floor, but never demand more than 40 dB below the peak.
  const threshold = Math.max(noise * 2, peak * 0.01);
  const above = (f: number) => env[f] > threshold;
  let first = -1;
  let last = -1;
  for (let f = 3; f < frames - 1; f++) {
    if (above(f) && above(f + 1)) {
      if (first < 0) first = f;
      last = f + 1;
    }
  }
  if (first < 0) return null;
  const frameSec = FRAME / ANALYSIS_RATE;
  const start = Math.max(0, first * frameSec - LEAD_PAD);
  const end = Math.min(n / ANALYSIS_RATE, (last + 1) * frameSec + TAIL_PAD);
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
  return { start, end, gainDb, noiseDb: db(noise) - db(peak) };
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
  await run('ffmpeg', [
    '-v', 'error', '-y', '-i', src, '-af', filter, '-ac', '1', '-ar', String(SAMPLE_RATE),
    '-c:a', 'libmp3lame', '-b:a', BITRATE, '-map_metadata', '-1', '-id3v2_version', '0', dest,
  ]);
}

async function pool<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    }),
  );
}

// ───────────────────────── main ─────────────────────────

interface Syllable {
  id: string;
  ascii: string;
  status: string;
  tones: { tone: number; numeric: string; status: string }[];
}

async function main() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error('ffmpeg was not found on the PATH. Install it (apt install ffmpeg / brew install ffmpeg) and rerun.');
    process.exit(1);
  }
  const syllables: Syllable[] = JSON.parse(
    readFileSync(join(ROOT, 'src', 'data', 'generated', 'syllables.json'), 'utf8'),
  );
  const cellsWanted = syllables.flatMap((s) => s.tones.map((t) => ({ id: t.numeric, ascii: `${s.ascii}${t.tone}`, status: t.status })));

  const candidates = new Map<string, Candidate>();
  const davinDir = await ensureDavin();
  const davinUnused: string[] = [];
  if (davinDir) {
    const wanted = new Set(cellsWanted.map((c) => c.id));
    const files = readdirSync(davinDir).sort();
    for (const f of files) {
      const key = davinKey(f);
      if (!key || !wanted.has(key)) {
        davinUnused.push(f);
        continue;
      }
      candidates.set(key, { path: join(davinDir, f), source: 'davinfifield', original: f });
    }
  }
  if (packDir) {
    if (!existsSync(packDir)) throw new Error(`--pack folder not found: ${packDir}`);
    let n = 0;
    for (const f of readdirSync(packDir)) {
      const key = packKey(f);
      if (!key) continue;
      candidates.set(key, { path: join(packDir, f), source: 'pack', original: f });
      n++;
    }
    console.log(`Local pack: ${n} usable files in ${packDir}`);
  }

  const outDir = join(ROOT, 'public', 'audio');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const sources: Record<string, SourceInfo> = {};
  if (davinDir) sources.davinfifield = DAVIN;
  if (packInfo) sources.pack = packInfo;

  interface Clip {
    file: string;
    source: string;
    licence: string;
    author: string;
    url: string;
    original: string;
    bytes: number;
    ms: number;
    gainDb: number;
    /** False where the tone of the source file is an inference, not stated by the source. */
    verified: boolean;
    note?: string;
  }
  const clips: Record<string, Clip> = {};
  const failed: string[] = [];
  const todo = cellsWanted.filter((c) => candidates.has(c.id));
  let done = 0;
  await pool(todo, Math.max(2, cpus().length), async (cell) => {
    const cand = candidates.get(cell.id)!;
    const file = `${cell.ascii}.mp3`;
    try {
      const a = await analyse(cand.path);
      if (!a) throw new Error('no speech found');
      await encode(cand.path, join(outDir, file), a);
      const info = sources[cand.source];
      clips[cell.id] = {
        file,
        source: cand.source,
        licence: info.licence,
        author: info.author,
        url: cand.source === 'davinfifield' ? DAVIN_FILE_URL(cand.original) : info.url,
        original: cand.original,
        bytes: statSync(join(outDir, file)).size,
        ms: Math.round((a.end - a.start) * 1000),
        gainDb: Math.round(a.gainDb * 10) / 10,
        verified: !(cand.source === 'davinfifield' && DAVIN_UNNUMBERED[cand.original]),
        ...(cand.source === 'davinfifield' && DAVIN_UNNUMBERED[cand.original]
          ? { note: DAVIN_UNNUMBERED[cand.original].note }
          : {}),
      };
    } catch (err) {
      failed.push(`${cell.id}: ${(err as Error).message.split('\n')[0]}`);
    }
    if (++done % 200 === 0) console.log(`  ${done}/${todo.length}`);
  });

  const ordered = Object.fromEntries(cellsWanted.filter((c) => clips[c.id]).map((c) => [c.id, clips[c.id]]));
  const totalBytes = Object.values(ordered).reduce((a, c) => a + c.bytes, 0);
  const missing = cellsWanted.filter((c) => !clips[c.id]);
  const missingShown = missing.filter((c) => c.status !== 'single-source');
  const generatedAt = new Date().toISOString().slice(0, 10);
  const format = { codec: 'mp3', channels: 1, sampleRate: SAMPLE_RATE, bitrate: BITRATE, targetActiveRmsDb: TARGET_ACTIVE_RMS_DB };

  writeFileSync(
    join(ROOT, 'audio-manifest.json'),
    '{\n' +
      `"generatedAt": ${JSON.stringify(generatedAt)},\n` +
      `"format": ${JSON.stringify(format)},\n` +
      `"sources": ${JSON.stringify(sources, null, 1)},\n` +
      `"totalBytes": ${totalBytes},\n` +
      `"clipCount": ${Object.keys(ordered).length},\n` +
      `"notes": ${JSON.stringify(NOTES, null, 1)},\n` +
      `"unverified": ${JSON.stringify(Object.entries(ordered).filter(([, c]) => !c.verified).map(([id]) => id))},\n` +
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
      notes: NOTES,
      unverified: Object.fromEntries(Object.entries(ordered).filter(([, c]) => !c.verified).map(([id, c]) => [id, c.note ?? ''])),
      // cell id → [bytes, milliseconds, source key]
      clips: Object.fromEntries(Object.entries(ordered).map(([id, c]) => [id, [c.bytes, c.ms, c.source]])),
    }) + '\n',
  );

  const mb = (totalBytes / 1024 / 1024).toFixed(1);
  const byTone = (list: { id: string }[]) =>
    [1, 2, 3, 4, 5].map((t) => `tone ${t}: ${list.filter((c) => c.id.endsWith(String(t))).length}`).join(', ');
  const md = [
    '# Audio coverage',
    '',
    `Generated ${generatedAt} by \`scripts/fetch-audio.ts\`. Do not edit by hand.`,
    '',
    `- Clips written: **${Object.keys(ordered).length}** of ${cellsWanted.length} tone cells (${mb} MB total, ${format.bitrate} mono MP3 at ${SAMPLE_RATE} Hz)`,
    `- Visible tone cells with no audio: **${missingShown.length}** (${byTone(missingShown)})`,
    `- Hidden single-source cells with no audio: ${missing.length - missingShown.length}`,
    failed.length ? `- Failed to process: ${failed.join('; ')}` : '- No processing failures',
    '',
    '## Sources',
    '',
    ...Object.entries(sources).map(
      ([k, s]) => `- \`${k}\`: ${s.name}, ${s.licence}, ${s.author}. ${s.url} (${Object.values(ordered).filter((c) => c.source === k).length} clips)`,
    ),
    '',
    '## Visible tone cells with no audio',
    '',
    'Almost all are neutral-tone cells. ' + NOTES[0],
    '',
    ...[1, 2, 3, 4, 5].map((t) => {
      const list = missingShown.filter((c) => c.id.endsWith(String(t))).map((c) => c.id);
      return `- **Tone ${t}** (${list.length}): ${list.join(', ') || 'none'}`;
    }),
    '',
    '## Clips whose tone is an inference',
    '',
    ...(Object.entries(ordered).filter(([, c]) => !c.verified).map(([id, c]) => `- \`${id}\` from \`${c.original}\`: ${c.note}`)),
    '',
    '## Source files not used',
    '',
    'Files in the source pack with no matching tone cell. The pack records all four tones for every syllable whether or not the tone occurs, and includes a few combinations that are not Mandarin syllables.',
    '',
    davinUnused.join(', '),
    '',
  ];
  mkdirSync(join(ROOT, 'reports'), { recursive: true });
  writeFileSync(join(ROOT, 'reports', 'audio-coverage.md'), md.join('\n'));

  console.log(`\n${Object.keys(ordered).length} clips, ${mb} MB. Missing for ${missingShown.length} visible cells (${byTone(missingShown)}).`);
  if (failed.length) console.log('Failed:', failed.join('; '));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
