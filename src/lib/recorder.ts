/**
 * Microphone recording with MediaRecorder.
 *
 * Browsers disagree on the container: Safari writes MP4/AAC, Chrome and
 * Firefox write WebM/Opus (recent Chrome can also write MP4). MP4 is asked for
 * first because it plays everywhere, which matters when takes are exported on
 * one device and imported on another. Whatever the browser actually produced
 * is stored with the take.
 */
import { signal } from '@preact/signals';
import { audioContext } from './analysis';
import { platform, type MicrophoneRefusal } from '../platform';

export const MAX_RECORDING_MS = 10_000;

const PREFERRED_TYPES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];

export function recordingUnavailableReason(): string | null {
  if (!window.isSecureContext) return 'Recording only works when the app is opened over a secure (https) connection.';
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    if (platform.isNative) return 'Recording is not available on this device. Updating Android System WebView from Google Play usually fixes this.';
    if (!navigator.mediaDevices?.getUserMedia) return 'This browser does not give web pages access to the microphone.';
    return 'This browser cannot record audio.';
  }
  return null;
}

function pickMimeType(): string | undefined {
  return PREFERRED_TYPES.find((t) => {
    try {
      return MediaRecorder.isTypeSupported(t);
    } catch {
      return false;
    }
  });
}

/** A recording that could not start, with a message fit to show and, where it helps, a way to fix it. */
export class RecordingError extends Error {
  constructor(
    message: string,
    /** "settings": offer to open the app's page in the system settings. */
    readonly fix?: 'settings',
  ) {
    super(message);
  }
}

/** What to say when the microphone was refused, by how it was refused. */
export function refusalMessage(native: boolean, refusal: MicrophoneRefusal | null): RecordingError {
  if (!native) {
    return new RecordingError('Microphone access was refused. Allow the microphone for this site in your browser settings, then try again. Everything else still works.');
  }
  if (refusal === 'denied') {
    return new RecordingError('Microphone access was refused. To record, tap Record again and choose Allow. Everything else still works.');
  }
  return new RecordingError(
    'Microphone access is turned off for this app. To record, open Settings, then Permissions, then Microphone, and allow it. Everything else still works.',
    'settings',
  );
}

function describeError(err: unknown): string {
  const name = (err as DOMException)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return refusalMessage(false, null).message;
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No microphone was found on this device.';
  if (name === 'NotReadableError') return 'The microphone is in use by another app.';
  return `Recording could not start: ${(err as Error)?.message ?? 'no reason was given'}.`;
}

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  /** Level samples taken while recording, used for the waveform if the file cannot be decoded. */
  livePeaks: number[];
}

export interface ActiveRecording {
  stop: () => void;
  cancel: () => void;
  result: Promise<RecordingResult | null>;
}

/** Live state for the UI while a recording runs. */
export const recState = signal<{ active: boolean; elapsedMs: number; level: number }>({ active: false, elapsedMs: 0, level: 0 });

/**
 * Start recording. Rejects with a message fit to show the user if the
 * microphone cannot be opened. Stops by itself after MAX_RECORDING_MS.
 */
export async function startRecording(): Promise<ActiveRecording> {
  const unavailable = recordingUnavailableReason();
  if (unavailable) throw new Error(unavailable);

  let stream: MediaStream;
  try {
    // Raw microphone audio: echo cancellation, noise suppression and automatic
    // gain all reshape a sustained tone (suppression treats it as noise, gain
    // control flattens its level), which is exactly what the pitch overlay
    // needs intact. Browsers that cannot honour a constraint ignore it.
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (platform.isNative && (name === 'NotAllowedError' || name === 'SecurityError')) {
      throw refusalMessage(true, await platform.microphoneRefusal());
    }
    throw new RecordingError(describeError(err));
  }

  const mimeType = pickMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64_000 } : undefined);
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error(describeError(err));
  }

  const chunks: Blob[] = [];
  const livePeaks: number[] = [];
  let cancelled = false;
  const startedAt = performance.now();

  // Level meter. Purely cosmetic: recording carries on if it cannot be set up.
  let raf = 0;
  let source: MediaStreamAudioSourceNode | null = null;
  const ac = audioContext();
  if (ac) {
    try {
      void ac.resume();
      source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) if (Math.abs(v) > peak) peak = Math.abs(v);
        livePeaks.push(Math.min(1, peak));
        recState.value = { active: true, elapsedMs: performance.now() - startedAt, level: Math.min(1, peak) };
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch {
      source = null;
    }
  }
  const ticker = setInterval(() => {
    if (!raf) recState.value = { active: true, elapsedMs: performance.now() - startedAt, level: 0 };
  }, 100);

  const cleanup = () => {
    clearTimeout(limit);
    clearInterval(ticker);
    cancelAnimationFrame(raf);
    source?.disconnect();
    // Release the microphone so the browser's recording indicator goes away.
    stream.getTracks().forEach((t) => t.stop());
    recState.value = { active: false, elapsedMs: 0, level: 0 };
  };

  const result = new Promise<RecordingResult | null>((resolve) => {
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => {
      cleanup();
      resolve(null);
    };
    recorder.onstop = () => {
      const durationMs = performance.now() - startedAt;
      cleanup();
      if (cancelled || !chunks.length) return resolve(null);
      const type = recorder.mimeType || chunks[0].type || mimeType || 'audio/webm';
      resolve({ blob: new Blob(chunks, { type }), mimeType: type, durationMs, livePeaks });
    };
  });

  const stop = () => {
    if (recorder.state !== 'inactive') recorder.stop();
  };
  const limit = setTimeout(stop, MAX_RECORDING_MS);
  recState.value = { active: true, elapsedMs: 0, level: 0 };
  recorder.start();

  return {
    stop,
    cancel: () => {
      cancelled = true;
      stop();
    },
    result,
  };
}

/** File extension for an exported take. */
export function extensionFor(mimeType: string): string {
  const base = mimeType.split(';')[0].trim().toLowerCase();
  return { 'audio/mp4': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac' }[base] ?? 'bin';
}

/** Squash a long list of live level samples down to n waveform peaks. */
export function resamplePeaks(samples: number[], n = 72): number[] {
  if (!samples.length) return [];
  const out: number[] = [];
  const max = Math.max(...samples) || 1;
  for (let i = 0; i < n; i++) {
    const a = Math.floor((i * samples.length) / n);
    const b = Math.max(a + 1, Math.floor(((i + 1) * samples.length) / n));
    out.push(Math.round((Math.max(...samples.slice(a, b)) / max) * 100) / 100);
  }
  return out;
}
