/**
 * User data, all in IndexedDB. This database is never touched by an app
 * update: bundled chart data lives in the JS bundle and the service-worker
 * cache, user data lives here.
 *
 * Recording audio is stored as an ArrayBuffer plus its MIME type rather than
 * as a Blob, because Blob storage in IndexedDB has been unreliable in Safari.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { SYLLABLE_BY_ID, type ExampleWord } from '../data';
import { hasLegacyText, mergeNotes } from './notes';

export type LearnStatus = 'new' | 'shaky' | 'solid';

export interface StatusRecord {
  cell: string;
  status: LearnStatus;
  updatedAt: number;
}
/**
 * The per-syllable notes of versions 1–2 ("How it sounds", "Watch out").
 * Folded into the first tone cell's note at version 3 and kept here, hidden,
 * so nothing typed is ever lost.
 */
export interface LegacyNote {
  syllable: string;
  /** The tone cell whose note received the text. */
  cell: string;
  sound: string;
  watchOut: string;
  /** That cell's note before the merge. */
  note: string;
  updatedAt: number;
  migratedAt: number;
}
export interface ToneNote {
  cell: string;
  note: string;
  updatedAt: number;
}
export interface Override {
  cell: string;
  character?: string;
  meaning?: string;
  words?: ExampleWord[];
  updatedAt: number;
}
export interface RecordingMeta {
  id: string;
  cell: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** As reported by MediaRecorder: audio/webm in Chrome, audio/mp4 in Safari. */
  mimeType: string;
  durationMs: number;
  bytes: number;
  best: boolean;
  /** Waveform peaks, 0–1. */
  peaks: number[];
  /** Seconds of leading and trailing silence to skip on playback. */
  trimStart: number;
  trimEnd: number;
}
export interface RecordingData {
  id: string;
  data: ArrayBuffer;
}
export interface SettingRecord {
  name: string;
  value: unknown;
  updatedAt: number;
}
/**
 * Quiz results per tone cell, from a section of the app that has since been
 * removed. The store stays declared so an upgrade does not delete rows people
 * already have; nothing reads or writes it any more, and exports leave it out.
 */
export interface PracticeRecord {
  cell: string;
  right: number;
  wrong: number;
  /** When it was last answered wrongly (0 = never). */
  lastWrongAt: number;
  updatedAt: number;
}

interface Schema extends DBSchema {
  status: { key: string; value: StatusRecord };
  legacyNotes: { key: string; value: LegacyNote };
  toneNotes: { key: string; value: ToneNote };
  overrides: { key: string; value: Override };
  recordings: { key: string; value: RecordingMeta; indexes: { cell: string } };
  recordingData: { key: string; value: RecordingData };
  settings: { key: string; value: SettingRecord };
  practiceHistory: { key: string; value: PracticeRecord };
}

export type StoreName = 'status' | 'legacyNotes' | 'toneNotes' | 'overrides' | 'recordings' | 'recordingData' | 'settings' | 'practiceHistory';
export const STORES: StoreName[] = ['status', 'legacyNotes', 'toneNotes', 'overrides', 'recordings', 'recordingData', 'settings', 'practiceHistory'];
/** Stores kept only so their rows survive: nothing writes, clears or exports them. */
export const RETIRED_STORES: StoreName[] = ['practiceHistory'];
const KEY_PATH: Record<StoreName, string> = {
  status: 'cell',
  legacyNotes: 'syllable',
  toneNotes: 'cell',
  overrides: 'cell',
  recordings: 'id',
  recordingData: 'id',
  settings: 'name',
  practiceHistory: 'cell',
};

/**
 * Schema history. Nothing a user typed is ever dropped by an upgrade.
 *   1  initial release
 *   2  + a per-cell audio preference store (removed again at 6)
 *   3  syllableNotes folded into the first tone cell's toneNote and kept in
 *      legacyNotes; the syllableNotes store is then removed (Round 2, step 6)
 *   4  the store that held edited lesson times is removed; from here on any
 *      store this version does not declare is dropped on upgrade (Round 2, step 7)
 *   5  + practiceHistory (Round 2, step 10)
 *   6  the per-cell audio preference store is dropped with the feature it served.
 *      (practiceHistory is still declared, unused, so the rows in it are kept.)
 */
export const DB_VERSION = 6;

/** The first tone cell of a syllable, where its old note goes. */
export const firstCellOf = (syllable: string): string => SYLLABLE_BY_ID[syllable]?.tones[0]?.numeric ?? `${syllable}1`;

export class StorageFullError extends Error {
  constructor() {
    super('Storage is full. Delete some of your recordings, or export a backup and then remove old ones.');
    this.name = 'StorageFullError';
  }
}

export const DB_NAME = 'pinyin-chart-user';
let dbPromise: Promise<IDBPDatabase<Schema> | null> | null = null;
/** Used when IndexedDB is unavailable (some private-browsing modes): data lasts until the tab closes. */
const memory: Record<string, Map<string, unknown>> = Object.fromEntries(STORES.map((s) => [s, new Map()]));
export let usingMemoryFallback = false;

function open(): Promise<IDBPDatabase<Schema> | null> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available');
        return await openDB<Schema>(DB_NAME, DB_VERSION, {
          async upgrade(db, oldVersion, _newVersion, tx) {
            // Create whatever is missing; existing stores and their data are left alone.
            for (const store of STORES) {
              if (db.objectStoreNames.contains(store)) continue;
              const os = db.createObjectStore(store, { keyPath: KEY_PATH[store] });
              if (store === 'recordings') (os as unknown as IDBObjectStore).createIndex('cell', 'cell');
            }
            if (oldVersion < 3 && db.objectStoreNames.contains('syllableNotes' as never)) {
              // Fold each syllable note into the first tone cell's note; keep the originals.
              const raw = tx.objectStore('syllableNotes' as never) as unknown as { getAll(): Promise<{ syllable: string; sound?: string; watchOut?: string; updatedAt?: number }[]> };
              const notes = tx.objectStore('toneNotes');
              const legacy = tx.objectStore('legacyNotes');
              const now = Date.now();
              for (const n of await raw.getAll()) {
                if (!hasLegacyText(n)) continue;
                const cell = firstCellOf(n.syllable);
                const existing = await notes.get(cell);
                const merged = mergeNotes(existing?.note ?? '', n.sound ?? '', n.watchOut ?? '');
                if (merged !== (existing?.note ?? '')) await notes.put({ cell, note: merged, updatedAt: now });
                await legacy.put({ syllable: n.syllable, cell, sound: n.sound ?? '', watchOut: n.watchOut ?? '', note: existing?.note ?? '', updatedAt: n.updatedAt ?? now, migratedAt: now });
              }
              db.deleteObjectStore('syllableNotes' as never);
            }
            // Stores that this version no longer uses (user data in them was either
            // migrated above or belonged to a removed feature) are dropped.
            for (const name of [...db.objectStoreNames]) if (!(STORES as string[]).includes(name)) db.deleteObjectStore(name);
          },
        });
      } catch (err) {
        console.warn('IndexedDB unavailable, keeping data in memory only:', err);
        usingMemoryFallback = true;
        return null;
      }
    })();
  }
  return dbPromise;
}

function rethrow(err: unknown): never {
  const name = (err as DOMException)?.name;
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') throw new StorageFullError();
  throw err;
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await open();
  if (!db) return [...memory[store].values()] as T[];
  return (await db.getAll(store)) as T[];
}

export async function getOne<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await open();
  if (!db) return memory[store].get(key) as T | undefined;
  return (await db.get(store, key)) as T | undefined;
}

export async function put(store: StoreName, value: object): Promise<void> {
  const db = await open();
  const key = (value as Record<string, string>)[KEY_PATH[store]];
  if (!db) {
    memory[store].set(key, value);
    return;
  }
  try {
    await db.put(store, value as never);
  } catch (err) {
    rethrow(err);
  }
}

export async function remove(store: StoreName, key: string): Promise<void> {
  const db = await open();
  if (!db) {
    memory[store].delete(key);
    return;
  }
  await db.delete(store, key);
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await open();
  if (!db) {
    memory[store].clear();
    return;
  }
  await db.clear(store);
}

/**
 * Empty every store of user data (the stores themselves stay). Used by
 * "Reset app". Works on the in-memory fallback too.
 */
export async function clearAll(): Promise<void> {
  for (const store of STORES) await clearStore(store);
}

/** Write a recording's metadata and audio together, so one never exists without the other. */
export async function putRecording(meta: RecordingMeta, data: ArrayBuffer): Promise<void> {
  const db = await open();
  if (!db) {
    memory.recordings.set(meta.id, meta);
    memory.recordingData.set(meta.id, { id: meta.id, data });
    return;
  }
  try {
    const tx = db.transaction(['recordings', 'recordingData'], 'readwrite');
    await Promise.all([tx.objectStore('recordings').put(meta), tx.objectStore('recordingData').put({ id: meta.id, data }), tx.done]);
  } catch (err) {
    rethrow(err);
  }
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await open();
  if (!db) {
    memory.recordings.delete(id);
    memory.recordingData.delete(id);
    return;
  }
  const tx = db.transaction(['recordings', 'recordingData'], 'readwrite');
  await Promise.all([tx.objectStore('recordings').delete(id), tx.objectStore('recordingData').delete(id), tx.done]);
}

export async function getRecordingBlob(meta: Pick<RecordingMeta, 'id' | 'mimeType'>): Promise<Blob | null> {
  const row = await getOne<RecordingData>('recordingData', meta.id);
  return row ? new Blob([row.data], { type: meta.mimeType }) : null;
}
