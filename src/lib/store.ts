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
import type { LearnStatus, Override, PracticeRecord, RecordingMeta, ToneNote } from './db';

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
  /** A curated accent id, or 'custom' with customAccent as a hex colour. */
  accent: string;
  customAccent: string;
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
  /** The Practice area is reachable at all. */
  showPractice: boolean;
  /** A "practise this sound" link in the tone panel. */
  practiceLink: boolean;
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
  accent: 'vermilion',
  customAccent: '#b0372a',
  typeface: 'source',
  cjk: 'serif',
  textSize: 1,
  spacing: 'comfortable',
  toneColours: 'off',
  cellBorders: 'hairline',
  reduceMotion: false,
  showCharacters: true,
  toneNumbers: false,
  showPractice: true,
  practiceLink: false,
};

/** How a tone cell's pinyin is written under the current setting: mā or ma1. */
export const showTone = (t: { display: string; numeric: string }) => (settings.value.toneNumbers ? t.numeric : t.display);

/**
 * Stored settings laid over the defaults. Only names this version knows are
 * taken, so a setting left behind by an earlier release (a removed feature)
 * is ignored instead of leaking into the app.
 */
export function settingsFrom(rows: { name: string; value: unknown }[]): Settings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.name in DEFAULT_SETTINGS && typeof r.value === typeof (DEFAULT_SETTINGS as unknown as Record<string, unknown>)[r.name]) out[r.name] = r.value;
  return out as unknown as Settings;
}

// ───────────────────────── user data ─────────────────────────

export const ready = signal(false);
export const statuses = signal<Record<string, LearnStatus>>({});
export const toneNotes = signal<Record<string, ToneNote>>({});
export const overrides = signal<Record<string, Override>>({});
export const recordings = signal<RecordingMeta[]>([]);
/** Practice results per cell (listening quiz, minimal pairs). */
export const practiceHistory = signal<Record<string, PracticeRecord>>({});
export const settings = signal<Settings>({ ...DEFAULT_SETTINGS });

/** null = not asked yet or unsupported; true/false = the browser's answer. */
export const persistence = signal<{ supported: boolean; granted: boolean | null; usage?: number; quota?: number }>({
  supported: false,
  granted: null,
});
export const memoryOnly = signal(false);
export const toast = signal<{ text: string; kind: 'info' | 'error'; id: number } | null>(null);

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function notify(text: string, kind: 'info' | 'error' = 'info') {
  toast.value = { text, kind, id: Date.now() };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = null), kind === 'error' ? 7000 : 3500);
}

const byKey = <T,>(rows: T[], key: keyof T): Record<string, T> => Object.fromEntries(rows.map((r) => [r[key] as string, r]));

export async function loadUserData(): Promise<void> {
  const [st, tn, ov, rec, se, ph] = await Promise.all([
    db.getAll<db.StatusRecord>('status'),
    db.getAll<ToneNote>('toneNotes'),
    db.getAll<Override>('overrides'),
    db.getAll<RecordingMeta>('recordings'),
    db.getAll<db.SettingRecord>('settings'),
    db.getAll<PracticeRecord>('practiceHistory'),
  ]);
  statuses.value = Object.fromEntries(st.map((r) => [r.cell, r.status]));
  toneNotes.value = byKey(tn, 'cell');
  overrides.value = byKey(ov, 'cell');
  recordings.value = rec.sort((a, b) => a.createdAt - b.createdAt);
  practiceHistory.value = byKey(ph, 'cell');
  settings.value = settingsFrom(se);
  memoryOnly.value = db.usingMemoryFallback;
  ready.value = true;
}

/** Report whether storage is already persistent. Never prompts. */
export async function checkPersistence(): Promise<void> {
  const storage = navigator.storage;
  if (!storage?.persist) {
    persistence.value = { supported: false, granted: null };
    return;
  }
  let granted: boolean | null = null;
  try {
    if (await storage.persisted()) granted = true;
  } catch {
    /* leave as unknown */
  }
  persistence.value = { supported: true, granted, ...(await usage()) };
}

async function usage(): Promise<{ usage?: number; quota?: number }> {
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return {};
  }
}

let asked = false;
/**
 * Ask the browser not to evict our data under storage pressure, and record
 * its answer. Called the first time the user saves something (Firefox shows a
 * prompt, so it should not appear before there is anything to protect), and
 * from the "Ask again" button on the My data page.
 */
export async function requestPersistence(force = false): Promise<void> {
  const storage = navigator.storage;
  if (!storage?.persist || (asked && !force) || persistence.value.granted) return;
  asked = true;
  try {
    const granted = (await storage.persisted()) || (await storage.persist());
    persistence.value = { supported: true, granted, ...(await usage()) };
  } catch {
    persistence.value = { supported: true, granted: false };
  }
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

/** Record one practice answer for a cell. The chart status is never touched here. */
export function recordPractice(cell: string, correct: boolean) {
  const prev = practiceHistory.value[cell];
  const now = Date.now();
  const next: PracticeRecord = {
    cell,
    right: (prev?.right ?? 0) + (correct ? 1 : 0),
    wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
    lastWrongAt: correct ? (prev?.lastWrongAt ?? 0) : now,
    updatedAt: now,
  };
  practiceHistory.value = { ...practiceHistory.value, [cell]: next };
  void guarded(() => db.put('practiceHistory', next));
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
