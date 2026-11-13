/**
 * Decoding and encoding audio through ffmpeg for the analysis scripts
 * (scripts/diagnose-pitch.ts). Requires ffmpeg on the PATH.
 */
import { execFile, spawn } from 'node:child_process';

function run(cmd: string, argv: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFile(cmd, argv, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) =>
      err ? reject(new Error(`${cmd} failed: ${(stderr as Buffer).toString('utf8').trim().split('\n').pop() ?? err.message}`)) : resolve(stdout as Buffer),
    );
  });
}

/** Decode any audio file to mono float samples at the given rate. */
export async function decodePcm(path: string, sampleRate = 24000): Promise<{ samples: Float32Array; sampleRate: number }> {
  const raw = await run('ffmpeg', ['-v', 'error', '-i', path, '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', '-']);
  const samples = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength - (raw.byteLength % 4)));
  return { samples, sampleRate };
}

/** Encode float samples to a file, to mimic what a browser's MediaRecorder writes. */
export function encodePcm(samples: Float32Array, sampleRate: number, dest: string, extra: string[] = []): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0', ...extra, dest]);
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err || `ffmpeg exited ${code}`))));
    p.stdin.end(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
  });
}
