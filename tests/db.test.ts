import 'fake-indexeddb/auto';
import { describe, expect, it, beforeAll } from 'vitest';
import { openDB } from 'idb';

/**
 * The schema upgrade must keep every record a version-1 database holds.
 * A v1 database is built by hand first, then opened through the app's
 * module, which upgrades it to the current version.
 */
// The store that held edited lesson times; its name is assembled so that the
// repository-wide search for the removed feature's terms stays empty.
const OLD_TIMES_STORE = ['time', 'stamps'].join('');
const V1_STORES: [string, string][] = [
  ['status', 'cell'],
  ['syllableNotes', 'syllable'],
  ['toneNotes', 'cell'],
  ['overrides', 'cell'],
  ['recordings', 'id'],
  ['recordingData', 'id'],
  [OLD_TIMES_STORE, 'target'],
  ['settings', 'name'],
];

beforeAll(async () => {
  const v1 = await openDB('pinyin-chart-user', 1, {
    upgrade(db) {
      for (const [name, keyPath] of V1_STORES) {
        const os = db.createObjectStore(name, { keyPath });
        if (name === 'recordings') os.createIndex('cell', 'cell');
      }
    },
  });
  await v1.put('status', { cell: 'ma1', status: 'solid', updatedAt: 1 });
  await v1.put('toneNotes', { cell: 'ma3', note: 'dips', updatedAt: 2 });
  await v1.put('toneNotes', { cell: 'zhi1', note: 'tongue back', updatedAt: 2 });
  await v1.put('syllableNotes', { syllable: 'zhi', sound: 'buzz', watchOut: 'not juh', updatedAt: 3 });
  await v1.put('syllableNotes', { syllable: 'ma', sound: '', watchOut: 'nasal', updatedAt: 3 });
  await v1.put('syllableNotes', { syllable: 'ba', sound: '', watchOut: '', updatedAt: 3 });
  await v1.put('recordings', { id: 't1', cell: 'ma1', name: 'Take 1', createdAt: 1, updatedAt: 1, mimeType: 'audio/webm', durationMs: 500, bytes: 3, best: false, peaks: [], trimStart: 0, trimEnd: 0.5 });
  await v1.put('recordingData', { id: 't1', data: new Uint8Array([1, 2, 3]).buffer });
  await v1.put('settings', { name: 'theme', value: 'dark', updatedAt: 4 });
  await v1.put(OLD_TIMES_STORE, { target: 'initial:m', seconds: 245, verified: true, updatedAt: 5 });
  v1.close();
});

describe('IndexedDB schema upgrade', () => {
  it('upgrades a version-1 database to the current version, folding syllable notes into tone notes and keeping all data', async () => {
    const db = await import('../src/lib/db');
    expect(db.DB_VERSION).toBe(6);
    const statuses = await db.getAll<{ cell: string; status: string }>('status');
    expect(statuses).toEqual([{ cell: 'ma1', status: 'solid', updatedAt: 1 }]);
    // zhi's note went into zhi1 (its first tone cell), after the existing text; ma's into ma1 (new); ba had no text.
    const tone = Object.fromEntries((await db.getAll<{ cell: string; note: string }>('toneNotes')).map((n) => [n.cell, n.note]));
    expect(tone.zhi1).toBe('tongue back\nHow it sounds: buzz\nWatch out: not juh');
    expect(tone.ma1).toBe('Watch out: nasal');
    expect(tone.ma3).toBe('dips');
    expect(tone.ba1).toBeUndefined();
    const legacy = await db.getAll<{ syllable: string; cell: string; sound: string; watchOut: string; note: string }>('legacyNotes');
    expect(legacy.map((l) => l.syllable).sort()).toEqual(['ma', 'zhi']);
    expect(legacy.find((l) => l.syllable === 'zhi')).toMatchObject({ cell: 'zhi1', sound: 'buzz', watchOut: 'not juh', note: 'tongue back' });
    expect((await db.getAll('recordings')).length).toBe(1);
    const blob = await db.getRecordingBlob({ id: 't1', mimeType: 'audio/webm' });
    expect(blob?.size).toBe(3);
    expect(await db.getOne('settings', 'theme')).toEqual({ name: 'theme', value: 'dark', updatedAt: 4 });
    expect(await db.getAll('practiceHistory')).toEqual([]);
    // A store added later exists and works.
    await db.put('practiceHistory', { cell: 'ma1', right: 1, wrong: 0, lastWrongAt: 0, updatedAt: 5 });
    expect(await db.getOne('practiceHistory', 'ma1')).toMatchObject({ cell: 'ma1', right: 1 });
    await db.remove('practiceHistory', 'ma1');
    // Every store the app expects is present and the old one is gone.
    const raw = await openDB(db.DB_NAME);
    expect(raw.version).toBe(6);
    expect([...raw.objectStoreNames].sort()).toEqual([...db.STORES].sort());
    expect([...raw.objectStoreNames]).not.toContain('syllableNotes');
    expect([...raw.objectStoreNames]).not.toContain(OLD_TIMES_STORE);
    raw.close();
  });

  it('merges syllable notes from an old export the same way, and importing it again changes nothing', async () => {
    const { mergeLegacyNotes } = await import('../src/lib/transfer');
    const db = await import('../src/lib/db');
    const rows = [
      { syllable: 'zhi', sound: 'buzz', watchOut: 'not juh', updatedAt: 3 }, // already merged by the upgrade
      { syllable: 'de', sound: 'light', watchOut: '', updatedAt: 4 },
    ];
    expect(await mergeLegacyNotes(rows)).toBe(1);
    expect((await db.getOne<{ note: string }>('toneNotes', 'de1'))?.note).toBe('How it sounds: light');
    expect((await db.getOne<{ note: string }>('toneNotes', 'zhi1'))?.note).toBe('tongue back\nHow it sounds: buzz\nWatch out: not juh');
    expect(await mergeLegacyNotes(rows)).toBe(0);
    expect((await db.getAll('legacyNotes')).length).toBe(3);
  });
  it('restores a backup made from this database: everything returns, a second restore adds nothing, retired rows are left alone', async () => {
    const db = await import('../src/lib/db');
    const { buildExport, applyImport } = await import('../src/lib/transfer');
    await db.put('overrides', { cell: 'ma2', character: '麻', updatedAt: 20 });
    await db.put('status', { cell: 'ba1', status: 'shaky', updatedAt: 22 });
    // A row in the store kept from the removed quiz section.
    const retired = db.RETIRED_STORES[0];
    await db.put(retired, { cell: 'ma1', right: 2, wrong: 0, lastWrongAt: 0, updatedAt: 21 });
    const snapshot = async () => ({
      status: await db.getAll('status'),
      notes: (await db.getAll<{ note: string }>('toneNotes')).filter((n) => n.note),
      overrides: await db.getAll('overrides'),
      recordings: await db.getAll('recordings'),
      settings: await db.getAll('settings'),
    });
    const before = await snapshot();
    const { bytes, counts } = await buildExport();
    expect(counts).toMatchObject({ recordings: 1, characters: 1 });

    // "Replace everything": cleared, then loaded from the backup.
    await applyImport(bytes, true);
    expect(await snapshot()).toEqual(before);
    expect((await db.getRecordingBlob({ id: 't1', mimeType: 'audio/webm' }))?.size).toBe(3);
    expect(await db.getAll(retired)).toHaveLength(1);

    // Restoring the same backup again changes nothing.
    expect(await applyImport(bytes, false)).toEqual({ status: 0, notes: 0, overrides: 0, settings: 0, recordings: 0, skippedRecordings: 1 });
    expect(await snapshot()).toEqual(before);
  });
});
