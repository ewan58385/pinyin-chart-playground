import { describe, expect, it, vi } from 'vitest';

/**
 * Without IndexedDB (some private-browsing modes) the app keeps data in
 * memory. "Reset app" must clear that too.
 */
describe('reset without IndexedDB', () => {
  it('clears the in-memory fallback and the downloaded audio, and reloads the empty state', async () => {
    vi.stubGlobal('indexedDB', undefined);
    // A stand-in for Cache Storage: the downloaded native recordings, and the service worker's copy of the app.
    const buckets = new Map<string, string[]>([
      ['native-audio-v2', ['/audio/ma1.mp3', '/audio/ma2.mp3']],
      ['workbox-precache-v2', ['/index.html']],
    ]);
    vi.stubGlobal('caches', {
      keys: async () => [...buckets.keys()],
      delete: async (name: string) => buckets.delete(name),
      open: async (name: string) => {
        if (!buckets.has(name)) buckets.set(name, []);
        return { keys: async () => buckets.get(name)!.map((url) => ({ url })) };
      },
    });
    const db = await import('../src/lib/db');
    const store = await import('../src/lib/store');
    await db.put('status', { cell: 'ma1', status: 'shaky', updatedAt: 1 });
    await db.put('overrides', { cell: 'ma1', character: '妈', updatedAt: 1 });
    await db.putRecording({ id: 'r1', cell: 'ma1', name: 'Recording 1', createdAt: 1, updatedAt: 1, mimeType: 'audio/webm', durationMs: 400, bytes: 2, best: false, peaks: [], trimStart: 0, trimEnd: 0.4 }, new Uint8Array([1, 2]).buffer);
    await store.loadUserData();
    expect(db.usingMemoryFallback).toBe(true);
    expect(store.memoryOnly.value).toBe(true);
    expect(store.recordings.value).toHaveLength(1);

    const audio = await import('../src/lib/audio');
    await audio.refreshCachedCount();
    expect(audio.cachedCount.value).toBe(2);

    await store.resetAllData();

    // The downloaded audio is gone and the count is back to 0; the app's own offline copy is kept.
    expect(buckets.get('native-audio-v2') ?? []).toEqual([]);
    expect(buckets.has('workbox-precache-v2')).toBe(true);
    expect(audio.cachedCount.value).toBe(0);
    expect(audio.downloadState.value).toMatchObject({ running: false, done: 0 });

    for (const name of db.STORES) expect(await db.getAll(name), name).toEqual([]);
    expect(store.statuses.value).toEqual({});
    expect(store.overrides.value).toEqual({});
    expect(store.recordings.value).toEqual([]);
    vi.unstubAllGlobals();
  });
});
