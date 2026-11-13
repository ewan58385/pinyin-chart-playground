/**
 * Native audio caching, and one shared player for native clips and recordings.
 *
 * Caching: clips are not in the service worker's precache. The app keeps them
 * in its own Cache Storage bucket, filled lazily (a whole syllable on first
 * play) or all at once from the Data page. That bucket is not touched when the
 * app updates.
 *
 * Playback: everything goes through a single <audio> element fed with blob
 * URLs. iOS Safari only lets an element play without a tap once that element
 * has been started by a tap, so reusing one element is what makes
 * "native, then mine" sequences and looping work there. Blob URLs also avoid
 * HTTP range requests, which cached responses cannot answer.
 */
import { signal } from '@preact/signals';
import { AUDIO_CLIPS, SYLLABLES, TONE_CELL, hasNativeAudio, type Syllable } from '../data';
import { toAscii } from './pinyin';

/**
 * The bucket name changes whenever the clips are replaced by a different
 * recording set: v1 held the previous set, v2 holds the current one. The old
 * bucket is deleted at startup (purgeStaleAudioCaches), so nobody keeps
 * hearing the previous recordings.
 */
const CACHE_NAME = 'native-audio-v2';

export const nativeUrl = (cellId: string) => `${import.meta.env.BASE_URL}audio/${toAscii(cellId)}.mp3`;

/**
 * Remove audio buckets left by earlier releases. Anything in Cache Storage
 * that is neither this bucket nor one of the service worker's own is stale.
 */
export async function purgeStaleAudioCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    for (const name of await caches.keys()) {
      if (name !== CACHE_NAME && !name.startsWith('workbox-')) await caches.delete(name);
    }
  } catch {
    /* nothing to do */
  }
}

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(CACHE_NAME);
  } catch {
    return null; // Cache Storage is unavailable over plain http and in some private modes
  }
}

/** Fetch one clip into the cache. Returns false if it could not be fetched. */
async function cacheClip(cache: Cache | null, cellId: string): Promise<Blob | null> {
  const url = nativeUrl(cellId);
  try {
    // Revalidate with the server so the browser's HTTP cache cannot hand back a clip from an earlier set.
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    if (cache) await cache.put(url, res.clone());
    return await res.blob();
  } catch {
    return null;
  }
}

const warmed = new Set<string>();

/** Cache every tone of a syllable in the background. Called on first play. */
export function warmSyllable(s: Syllable): void {
  if (warmed.has(s.id)) return;
  warmed.add(s.id);
  void (async () => {
    const cache = await openCache();
    if (!cache) return;
    for (const t of s.tones) {
      if (!hasNativeAudio(t.numeric)) continue;
      if (!(await cache.match(nativeUrl(t.numeric)))) await cacheClip(cache, t.numeric);
    }
    void refreshCachedCount();
  })();
}

/** The clip for a tone cell: from the cache if present, else from the network. Null if there is none. */
export async function getNativeBlob(cellId: string): Promise<Blob | null> {
  if (!hasNativeAudio(cellId)) return null;
  const cache = await openCache();
  const hit = cache ? await cache.match(nativeUrl(cellId)) : undefined;
  if (hit) return hit.blob();
  const blob = await cacheClip(cache, cellId);
  const owner = TONE_CELL[cellId]?.syllable;
  if (blob && owner) warmSyllable(owner);
  return blob;
}

// ───────────────────────── download everything ─────────────────────────

export const cachedCount = signal<number | null>(null);
export const downloadState = signal<{ running: boolean; done: number; total: number; failed: number }>({
  running: false,
  done: 0,
  total: 0,
  failed: 0,
});
export const cacheSupported = signal(true);

const allClipIds = () => SYLLABLES.flatMap((s) => s.tones.map((t) => t.numeric)).filter(hasNativeAudio);
export const totalClipCount = Object.keys(AUDIO_CLIPS).length;

export async function refreshCachedCount(): Promise<void> {
  const cache = await openCache();
  cacheSupported.value = !!cache;
  if (!cache) {
    cachedCount.value = 0;
    return;
  }
  const keys = await cache.keys();
  cachedCount.value = keys.length;
}

let cancelDownload = false;
export function stopDownloadAll() {
  cancelDownload = true;
}

export async function downloadAll(): Promise<void> {
  if (downloadState.value.running) return;
  const cache = await openCache();
  if (!cache) return;
  cancelDownload = false;
  const ids = allClipIds();
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  const todo = ids.filter((id) => !have.has(new URL(nativeUrl(id), location.href).pathname));
  let done = ids.length - todo.length;
  let failed = 0;
  downloadState.value = { running: true, done, total: ids.length, failed };
  let next = 0;
  const worker = async () => {
    while (next < todo.length && !cancelDownload) {
      const id = todo[next++];
      if (await cacheClip(cache, id)) done++;
      else failed++;
      downloadState.value = { running: true, done, total: ids.length, failed };
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  downloadState.value = { running: false, done, total: ids.length, failed };
  await refreshCachedCount();
}

export async function clearAudioCache(): Promise<void> {
  if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME);
  warmed.clear();
  await refreshCachedCount();
}

// ───────────────────────── player ─────────────────────────

export interface PlayItem {
  /** Identifies what is playing, for highlighting: "native:ma1", "take:<id>". */
  key: string;
  load: () => Promise<Blob | null>;
  /** Skip leading silence (seconds) and stop early (seconds from the start of the file). */
  start?: number;
  end?: number;
}

export const nowPlaying = signal<string | null>(null);
export const playError = signal<string | null>(null);

// 44-byte header + 2 samples of silence, to unlock the element inside a tap.
const SILENCE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAA';

let el: HTMLAudioElement | null = null;
let unlocked = false;
let session = 0;
let currentUrl: string | null = null;
let stopTimer: ReturnType<typeof setTimeout> | undefined;

function element(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
  }
  return el;
}

/** Call synchronously from a tap or key handler before any await. */
export function unlockAudio(): void {
  if (unlocked) return;
  const a = element();
  a.src = SILENCE;
  a.play().then(
    () => (unlocked = true),
    () => {},
  );
}

function release() {
  clearTimeout(stopTimer);
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

export function stopPlayback(): void {
  session++;
  release();
  if (el) {
    el.onended = null;
    el.onerror = null;
    el.pause();
  }
  nowPlaying.value = null;
}

function playOne(item: PlayItem, blob: Blob, rate: number, mySession: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const a = element();
    release();
    currentUrl = URL.createObjectURL(blob);
    const finish = () => {
      clearTimeout(stopTimer);
      a.onended = null;
      a.onerror = null;
      resolve();
    };
    a.onended = finish;
    a.onerror = () => reject(new Error('This audio format cannot be played in this browser.'));
    a.src = currentUrl;
    a.defaultPlaybackRate = rate;
    a.playbackRate = rate;
    // Keep the pitch when slowing down: tones are pitch.
    a.preservesPitch = true;
    (a as unknown as { webkitPreservesPitch: boolean }).webkitPreservesPitch = true;
    const begin = () => {
      if (mySession !== session) return;
      nowPlaying.value = item.key;
      if (item.end !== undefined) {
        const span = (item.end - (item.start ?? 0)) / rate;
        stopTimer = setTimeout(() => {
          a.pause();
          finish();
        }, Math.max(80, span * 1000));
      }
    };
    const start = () => {
      if (item.start) {
        try {
          a.currentTime = item.start;
        } catch {
          /* seeking is best-effort; some recordings have no seek index */
        }
      }
      a.play().then(begin, (err: Error) => reject(err));
    };
    if (item.start) a.addEventListener('loadedmetadata', start, { once: true });
    else start();
  });
}

/**
 * Play items in order. Must be called from a user gesture the first time.
 * With loop, the sequence repeats until stopPlayback() or another play().
 */
export async function play(items: PlayItem[], opts: { rate?: number; loop?: boolean; gapMs?: number } = {}): Promise<void> {
  stopPlayback();
  unlockAudio(); // after the stop, so the silent clip is not paused before it starts
  const mySession = session;
  const { rate = 1, loop = false, gapMs = 350 } = opts;
  playError.value = null;
  try {
    // Load everything first so the gap between clips is not at the mercy of the network.
    const blobs = await Promise.all(items.map((i) => i.load()));
    if (mySession !== session) return;
    const ready = items.map((item, i) => ({ item, blob: blobs[i] })).filter((x): x is { item: PlayItem; blob: Blob } => !!x.blob);
    if (!ready.length) {
      playError.value = navigator.onLine === false ? 'This clip has not been downloaded for offline use yet.' : 'No audio available.';
      return;
    }
    do {
      for (let i = 0; i < ready.length; i++) {
        await playOne(ready[i].item, ready[i].blob, rate, mySession);
        if (mySession !== session) return;
        nowPlaying.value = null;
        if (i < ready.length - 1 || loop) await new Promise((r) => setTimeout(r, gapMs));
        if (mySession !== session) return;
      }
    } while (loop && mySession === session);
  } catch (err) {
    if (mySession !== session) return;
    const e = err as Error;
    playError.value =
      e.name === 'NotAllowedError' ? 'The browser blocked playback. Tap the play button again.' : e.message || 'Playback failed.';
  } finally {
    if (mySession === session) {
      release();
      nowPlaying.value = null;
    }
  }
}

export const nativeItem = (cellId: string): PlayItem => ({ key: `native:${cellId}`, load: () => getNativeBlob(cellId) });
