import { describe, expect, it, vi } from 'vitest';

/**
 * Without IndexedDB (some private-browsing modes) the app keeps data in
 * memory. "Reset app" must clear that too.
 */
describe('reset without IndexedDB', () => {
  it('clears the in-memory fallback and reloads the empty state', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const db = await import('../src/lib/db');
    const store = await import('../src/lib/store');
    await db.put('status', { cell: 'ma1', status: 'shaky', updatedAt: 1 });
    await db.put('overrides', { cell: 'ma1', character: '妈', updatedAt: 1 });
    await db.putRecording({ id: 'r1', cell: 'ma1', name: 'Recording 1', createdAt: 1, updatedAt: 1, mimeType: 'audio/webm', durationMs: 400, bytes: 2, best: false, peaks: [], trimStart: 0, trimEnd: 0.4 }, new Uint8Array([1, 2]).buffer);
    await store.loadUserData();
    expect(db.usingMemoryFallback).toBe(true);
    expect(store.memoryOnly.value).toBe(true);
    expect(store.recordings.value).toHaveLength(1);

    await store.resetAllData();

    for (const name of db.STORES) expect(await db.getAll(name), name).toEqual([]);
    expect(store.statuses.value).toEqual({});
    expect(store.overrides.value).toEqual({});
    expect(store.recordings.value).toEqual([]);
    vi.unstubAllGlobals();
  });
});
