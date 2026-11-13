/**
 * Browser features the app relies on, checked once at startup. None stops the app
 * opening: without storage it keeps changes in memory (store.ts says so), without
 * recording or Web Audio those parts are unavailable. The app shows one notice
 * naming what is missing (FeatureNotice in app.tsx).
 */

export type Feature = 'storage' | 'recording' | 'webAudio';

/** What each missing feature means for the learner. */
export const FEATURE_LOSS: Record<Feature, string> = {
  storage: 'saving your notes and recordings',
  recording: 'recording your voice',
  webAudio: 'pitch curves and waveforms',
};

interface Env {
  indexedDB?: unknown;
  MediaRecorder?: unknown;
  AudioContext?: unknown;
  webkitAudioContext?: unknown;
  navigator?: { mediaDevices?: { getUserMedia?: unknown } };
}

export function missingFeatures(env: Env = globalThis as unknown as Env): Feature[] {
  const out: Feature[] = [];
  let idb = false;
  try {
    idb = !!env.indexedDB;
  } catch {
    // Some browsers throw on access when storage is blocked.
  }
  if (!idb) out.push('storage');
  if (typeof env.MediaRecorder === 'undefined' || typeof env.navigator?.mediaDevices?.getUserMedia !== 'function') out.push('recording');
  if (typeof env.AudioContext === 'undefined' && typeof env.webkitAudioContext === 'undefined') out.push('webAudio');
  return out;
}

/** "a", "a and b", "a, b and c". */
export function listOf(items: string[]): string {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
