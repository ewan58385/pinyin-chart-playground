/**
 * App state. User data is mirrored from IndexedDB into signals at startup, and
 * every change is written back straight away.
 */
import { signal, computed } from '@preact/signals';
import {
  CELLS,
  SYLLABLES,
  SYLLABLE_BY_ID,
  syllableInfo,
  type CellExample,
  type ExampleWord,
  type Syllable,
  type ToneCell,
} from '../data';
import type { FinalGroup, FinalType } from '../data/finals';
import type { Difficulty } from '../data/initials';
import * as db from './db';
import { APPEARANCE_CACHE_KEY } from './theme';
import { clearAudioCache, stopPlayback } from './audio';
import type { LearnStatus, Override, RecordingMeta, ToneNote } from './db';
import { platform, type StorageReport } from '../platform';

// ───────────────────────── settings ─────────────────────────

export interface Settings {
  flipAxes: boolean;
  /** How much each chart cell shows. 'auto' is compact on narrow screens. */
  density: 'auto' | 'compact' | 'full';
  heatmap: boolean;
  /** Show syllables and tone cells that only one source attests. */
  showUnverified: boolean;
  theme: 'system' | 'light' | 'dark';
  rate: 0.75 | 1;
  mineFirst: boolean;
  loop: boolean;
  showPitch: boolean;
  /** Pitch overlay: semitones around each speaker's median, or absolute Hz. */
  pitchMode: 'relative' | 'hz';
  // Appearance (src/data/themes.ts, applied by src/lib/theme.ts)
  preset: string;
  typeface: string;
  cjk: 'serif' | 'sans';
  /** 0–3, see TEXT_SIZES. */
  textSize: number;
  /** Chart spacing. */
  spacing: 'compact' | 'comfortable' | 'spacious';
  toneColours: 'off' | 'standard' | 'safe';
  cellBorders: 'hairline' | 'none' | 'ruled';
  reduceMotion: boolean;
  /** Chart cells show example characters (off: pinyin and tone pips only). */
  showCharacters: boolean;
  /** Write tones as numbers (ma1) instead of marks (mā). */
  toneNumbers: boolean;
  /** The Finals / Initials side panel is folded to a slim rail (wide screens only). */
  blockNavCollapsed: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  flipAxes: false,
  density: 'auto',
  heatmap: true,
  showUnverified: false,
  theme: 'system',
  rate: 1,
  mineFirst: false,
  loop: false,
  showPitch: true,
  pitchMode: 'relative',
  preset: 'paper',
  typeface: 'source',
  cjk: 'serif',
  textSize: 1,
  spacing: 'comfortable',
  toneColours: 'off',
  cellBorders: 'hairline',
  reduceMotion: false,
  showCharacters: true,
  toneNumbers: false,
  blockNavCollapsed: false,
};

/** How a tone cell's pinyin is written under the current setting: mā or ma1. */
export const showTone = (t: { display: string; numeric: string }) => (settings.value.toneNumbers ? t.numeric : t.display);

/** The values a setting may take, where it is a fixed choice. Anything else falls back to the default. */
const CHOICES: Partial<Record<keyof Settings, readonly unknown[]>> = {
  density: ['auto', 'compact', 'full'],
  theme: ['system', 'light', 'dark'],
  rate: [0.75, 1],
  pitchMode: ['relative', 'hz'],
  cjk: ['serif', 'sans'],
  textSize: [0, 1, 2, 3],
  spacing: ['compact', 'comfortable', 'spacious'],
  toneColours: ['off', 'standard', 'safe'],
  cellBorders: ['hairline', 'none', 'ruled'],
};

/**
 * Stored settings laid over the defaults. Never throws: rows that are not
 * objects, names this version does not know (a removed feature, such as the
 * old accent choice), values of the wrong type, and values outside a fixed
 * choice are all ignored, so whatever is in storage, the app starts.
 */
export function settingsFrom(rows: unknown): Settings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  if (!Array.isArray(rows)) return out as unknown as Settings;
  const defaults = DEFAULT_SETTINGS as unknown as Record<string, unknown>;
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const { name, value } = row as { name?: unknown; value?: unknown };
    if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(defaults, name)) continue;
    if (typeof value !== typeof defaults[name]) continue;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    const allowed = CHOICES[name as keyof Settings];
    if (allowed && !allowed.includes(value)) continue;
    out[name] = value;
  }
  return out as unknown as Settings;
}

// ───────────────────────── user data ─────────────────────────

export const ready = signal(false);
export const statuses = signal<Record<string, LearnStatus>>({});
export const toneNotes = signal<Record<string, ToneNote>>({});
export const overrides = signal<Record<string, Override>>({});
export const recordings = signal<RecordingMeta[]>([]);
export const settings = signal<Settings>({ ...DEFAULT_SETTINGS });

/** Where the user's data is kept and whether the browser has agreed to keep it (see StorageReport). */
export const persistence = signal<StorageReport>({ kind: platform.isNative ? 'app' : 'browser', canRequest: false, persisted: null });
export const memoryOnly = signal(false);
export const toast = signal<{ text: string; kind: 'info' | 'error'; id: number } | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function notify(text: string, kind: 'info' | 'error' = 'info') {
  toast.value = { text, kind, id: Date.now() };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = null), kind === 'error' ? 7000 : 3500);
}

const byKey = <T,>(rows: T[], key: keyof T): Record<string, T> => Object.fromEntries(rows.map((r) => [r[key] as string, r]));

/** Every row of a store, or none if the store cannot be read: startup must not fail on storage. */
async function rowsOf<T>(store: db.StoreName, valid: (row: T) => boolean): Promise<T[]> {
  try {
    const rows = await db.getAll<T>(store);
    return Array.isArray(rows) ? rows.filter((r) => !!r && typeof r === 'object' && valid(r)) : [];
  } catch (err) {
    console.warn(`Could not read ${store}:`, err);
    return [];
  }
}

export async function loadUserData(): Promise<void> {
  const hasCell = (r: { cell?: unknown }) => typeof r.cell === 'string';
  const [st, tn, ov, rec, se] = await Promise.all([
    rowsOf<db.StatusRecord>('status', hasCell),
    rowsOf<ToneNote>('toneNotes', hasCell),
    rowsOf<Override>('overrides', hasCell),
    rowsOf<RecordingMeta>('recordings', (r) => typeof r.id === 'string' && typeof r.cell === 'string'),
    rowsOf<db.SettingRecord>('settings', () => true),
  ]);
  statuses.value = Object.fromEntries(st.map((r) => [r.cell, r.status]));
  toneNotes.value = byKey(tn, 'cell');
  overrides.value = byKey(ov, 'cell');
  recordings.value = rec.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  settings.value = settingsFrom(se);
  // Rows left by removed settings (an old accent choice, for example) are ignored above and deleted here.
  for (const r of se) {
    if (typeof r.name === 'string' && !Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, r.name)) void db.remove('settings', r.name).catch(() => {});
  }
  memoryOnly.value = db.usingMemoryFallback;
  ready.value = true;
}

/**
 * "Reset app": delete everything the app has stored on this device (statuses,
 * and with them Learn progress; notes; the user's recordings; edited
 * characters; settings; the downloaded native recordings) and reload the
 * in-memory state, so the app is back to its first run. The service worker's
 * copy of the app itself is kept, so it still opens offline.
 */
export async function resetAllData(): Promise<void> {
  stopPlayback();
  await db.clearAll();
  await clearAudioCache();
  try {
    localStorage.removeItem(APPEARANCE_CACHE_KEY);
  } catch {
    /* no localStorage: nothing cached */
  }
  filters.value = { ...EMPTY_FILTERS };
  filtersOpen.value = false;
  await loadUserData();
}

/** Report where the data is kept and whether it may be cleared. Never prompts. */
export async function checkPersistence(): Promise<void> {
  persistence.value = await platform.storageStatus();
}

let asked = false;
/**
 * Ask the browser not to evict our data under storage pressure, and record
 * its answer. Called the first time the user saves something (Firefox shows a
 * prompt, so it should not appear before there is anything to protect), and
 * from the "Ask again" button on the My data page.
 */
export async function requestPersistence(force = false): Promise<void> {
  const p = persistence.value;
  if (p.kind === 'app' || (asked && !force) || p.persisted) return;
  asked = true;
  persistence.value = await platform.requestPersistentStorage();
}

async function guarded(fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    void requestPersistence();
    return true;
  } catch (err) {
    notify(err instanceof db.StorageFullError ? err.message : `Could not save: ${(err as Error).message}`, 'error');
    return false;
  }
}

export function setSetting<K extends keyof Settings>(name: K, value: Settings[K]) {
  settings.value = { ...settings.value, [name]: value };
  void db.put('settings', { name, value, updatedAt: Date.now() }).catch(() => {});
}

export function setStatus(cell: string, status: LearnStatus) {
  const next = { ...statuses.value };
  if (status === 'new') delete next[cell];
  else next[cell] = status;
  statuses.value = next;
  // 'new' is stored too, so that an import can tell "reset to new" from "never set".
  void guarded(() => db.put('status', { cell, status, updatedAt: Date.now() }));
}

export function saveToneNote(cell: string, note: string) {
  const next: ToneNote = { cell, note, updatedAt: Date.now() };
  toneNotes.value = { ...toneNotes.value, [cell]: next };
  return guarded(() => db.put('toneNotes', next));
}

export function saveOverride(cell: string, patch: Partial<Pick<Override, 'character' | 'meaning' | 'words'>>) {
  const next: Override = { ...overrides.value[cell], ...patch, cell, updatedAt: Date.now() };
  overrides.value = { ...overrides.value, [cell]: next };
  return guarded(() => db.put('overrides', next));
}

export function clearOverride(cell: string) {
  const next = { ...overrides.value };
  delete next[cell];
  overrides.value = next;
  void guarded(() => db.remove('overrides', cell));
}

export async function addRecording(meta: RecordingMeta, data: ArrayBuffer): Promise<boolean> {
  const ok = await guarded(() => db.putRecording(meta, data));
  if (ok) recordings.value = [...recordings.value, meta];
  return ok;
}

export function updateRecording(id: string, patch: Partial<Pick<RecordingMeta, 'name' | 'best'>>) {
  const now = Date.now();
  const target = recordings.value.find((r) => r.id === id);
  if (!target) return;
  const changed: RecordingMeta[] = [];
  recordings.value = recordings.value.map((r) => {
    if (r.id === id) {
      const next = { ...r, ...patch, updatedAt: now };
      changed.push(next);
      return next;
    }
    // Only one best take per tone cell.
    if (patch.best && r.cell === target.cell && r.best) {
      const next = { ...r, best: false, updatedAt: now };
      changed.push(next);
      return next;
    }
    return r;
  });
  void guarded(async () => {
    for (const r of changed) await db.put('recordings', r);
  });
}

export function removeRecording(id: string) {
  recordings.value = recordings.value.filter((r) => r.id !== id);
  void guarded(() => db.deleteRecording(id));
}

// ───────────────────────── derived views ─────────────────────────

export const recordingsByCell = computed(() => {
  const map: Record<string, RecordingMeta[]> = {};
  for (const r of recordings.value) (map[r.cell] ??= []).push(r);
  return map;
});

/** The take to compare against: the starred one, else the newest. */
export function preferredTake(cell: string): RecordingMeta | undefined {
  const takes = recordingsByCell.value[cell];
  if (!takes?.length) return undefined;
  return takes.find((t) => t.best) ?? takes[takes.length - 1];
}

export interface ResolvedExample {
  character: string;
  meaning: string;
  words: ExampleWord[];
  bundled: CellExample | undefined;
  /** Which fields the user has replaced. */
  edited: { character: boolean; meaning: boolean; words: boolean };
}

/** Bundled example for a tone cell with the user's overrides laid on top. */
export function resolveExample(cell: string, ov: Record<string, Override> = overrides.value): ResolvedExample {
  const bundled = CELLS[cell];
  const o = ov[cell];
  return {
    character: o?.character ?? bundled?.character ?? '',
    meaning: o?.meaning ?? bundled?.meaning ?? '',
    words: o?.words ?? bundled?.words ?? [],
    bundled,
    edited: { character: o?.character !== undefined, meaning: o?.meaning !== undefined, words: o?.words !== undefined },
  };
}

/** Is this tone cell drawn on the chart? */
export const cellVisible = (cell: ToneCell, showUnverified: boolean) => showUnverified || cell.status !== 'single-source';
export const visibleTones = (s: Syllable, showUnverified = settings.value.showUnverified) =>
  s.tones.filter((t) => cellVisible(t, showUnverified));
export const syllableVisible = (s: Syllable, showUnverified = settings.value.showUnverified) =>
  showUnverified || s.status === 'standard';

// ───────────────────────── filters ─────────────────────────

export interface Filters {
  statuses: LearnStatus[];
  hasRecording: boolean;
  groups: FinalGroup[];
  types: FinalType[];
  difficulties: Difficulty[];
  tags: string[];
}
export const EMPTY_FILTERS: Filters = { statuses: [], hasRecording: false, groups: [], types: [], difficulties: [], tags: [] };
export const filters = signal<Filters>({ ...EMPTY_FILTERS });
export const filtersOpen = signal(false);

export const filtersActive = computed(() => {
  const f = filters.value;
  return f.statuses.length + f.groups.length + f.types.length + f.difficulties.length + f.tags.length + (f.hasRecording ? 1 : 0);
});

/** Tone cells of a syllable that pass the tone-level filters (status, has recording). */
function matchingTones(s: Syllable, f: Filters, st: Record<string, LearnStatus>, rec: Record<string, RecordingMeta[]>, showUnverified: boolean) {
  return s.tones.filter(
    (t) =>
      cellVisible(t, showUnverified) &&
      (!f.statuses.length || f.statuses.includes(st[t.numeric] ?? 'new')) &&
      (!f.hasRecording || !!rec[t.numeric]?.length),
  );
}

/** syllable id → ids of its tone cells that match. Syllables that do not match are absent. */
export const matches = computed(() => {
  const f = filters.value;
  const st = statuses.value;
  const rec = recordingsByCell.value;
  const showUnverified = settings.value.showUnverified;
  const out: Record<string, string[]> = {};
  for (const s of SYLLABLES) {
    if (!syllableVisible(s, showUnverified)) continue;
    const info = syllableInfo(s);
    if (f.groups.length && !f.groups.includes(info.group)) continue;
    if (f.types.length && !f.types.includes(info.finalType)) continue;
    if (f.difficulties.length && (!info.difficulty || !f.difficulties.includes(info.difficulty))) continue;
    if (f.tags.length && !f.tags.every((t) => s.tags.includes(t))) continue;
    const tones = matchingTones(s, f, st, rec, showUnverified);
    if (tones.length) out[s.id] = tones.map((t) => t.numeric);
  }
  return out;
});

export const visibleSyllableCount = computed(() => SYLLABLES.filter((s) => syllableVisible(s, settings.value.showUnverified)).length);

export function toggleFilter<K extends 'statuses' | 'groups' | 'types' | 'difficulties' | 'tags'>(key: K, value: Filters[K][number]) {
  const list = filters.value[key] as string[];
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  filters.value = { ...filters.value, [key]: next };
}

export const getSyllable = (id: string | undefined): Syllable | undefined => (id ? SYLLABLE_BY_ID[id] : undefined);
