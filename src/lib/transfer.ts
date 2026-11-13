/**
 * Export and import of everything the user has created, as one zip:
 *
 *   data.json                 notes, status, overrides, settings, recording metadata
 *   recordings/<id>.<ext>     one audio file per take, in the format the browser recorded
 *
 * Import merges by default: for each record the newer `updatedAt` wins, and
 * recordings are matched by id, so importing the same file twice changes
 * nothing. "Replace" clears existing data first.
 *
 * The pack/unpack/merge functions are pure so they can be tested without a browser.
 */
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import * as db from './db';
import type { LegacyNote, Override, RecordingMeta, SettingRecord, StatusRecord, ToneNote } from './db';
import { hasLegacyText, mergeNotes } from './notes';
import { extensionFor } from './recorder';
import { CELLS, TONE_CELL, hasNativeAudio } from '../data';
import { toAscii } from './pinyin';
import { getNativeBlob } from './audio';
import { resolveExample, toneNotes, statuses } from './store';

export const EXPORT_FORMAT = 'pinyin-chart-export';
/**
 * 1: first release. 2: + a per-cell audio preference list. 3: syllableNotes gone (older files import; their
 * syllable notes are merged into the first tone cell's note). 4: the edited lesson
 * times are gone (older files import; fields this version does not know are dropped).
 * 5: + practiceHistory. 6: the per-cell audio preference list of versions 2–5 is gone
 * (older files import; that field is dropped). Files of version 6 made before the
 * quiz section was removed also carry practiceHistory; it is dropped on import,
 * and new files leave it out (a field removed, none added, so the version stays 6).
 */
export const EXPORT_VERSION = 6;

export interface ExportData {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  status: StatusRecord[];
  /** Only in files from versions 1–2: per-syllable "How it sounds" / "Watch out". Merged on import. */
  syllableNotes?: { syllable: string; sound?: string; watchOut?: string; updatedAt: number }[];
  toneNotes: ToneNote[];
  overrides: Override[];
  settings: SettingRecord[];
  /** `file` is the path of the audio inside the zip. */
  recordings: (RecordingMeta & { file: string })[];
}

export interface ExportBundle {
  data: ExportData;
  /** Recording id → audio bytes. */
  audio: Record<string, Uint8Array>;
}

export function packExport(bundle: ExportBundle): Uint8Array {
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    'data.json': strToU8(JSON.stringify(bundle.data, null, 1)),
  };
  for (const rec of bundle.data.recordings) {
    const bytes = bundle.audio[rec.id];
    // Recordings are already compressed audio; store them as they are.
    if (bytes) files[rec.file] = [bytes, { level: 0 }];
  }
  return zipSync(files as Parameters<typeof zipSync>[0]);
}

export function unpackExport(zip: Uint8Array): ExportBundle {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zip);
  } catch {
    throw new Error('That file is not a zip archive.');
  }
  const raw = files['data.json'];
  if (!raw) throw new Error('That zip has no data.json in it, so it is not a Pinyin Chart export.');
  let data: ExportData;
  try {
    data = JSON.parse(strFromU8(raw));
  } catch {
    throw new Error('data.json in that zip could not be read.');
  }
  if (data.format !== EXPORT_FORMAT) throw new Error('That zip is not a Pinyin Chart export.');
  if (data.version > EXPORT_VERSION) throw new Error('That export was made by a newer version of the app. Update this copy first.');
  const audio: Record<string, Uint8Array> = {};
  for (const rec of data.recordings ?? []) {
    const bytes = files[rec.file];
    if (bytes) audio[rec.id] = bytes;
  }
  // Only the fields this version knows are kept; older files may carry fields for removed features.
  return {
    data: {
      format: data.format,
      version: data.version,
      exportedAt: data.exportedAt,
      status: data.status ?? [],
      ...(data.syllableNotes?.length ? { syllableNotes: data.syllableNotes } : {}),
      toneNotes: data.toneNotes ?? [],
      overrides: data.overrides ?? [],
      settings: data.settings ?? [],
      recordings: (data.recordings ?? []).filter((r) => audio[r.id]),
    },
    audio,
  };
}

/** Rows from `incoming` that should be written: new keys, or newer than what is there. */
export function newerRows<T extends { updatedAt: number }>(existing: T[], incoming: T[], key: keyof T): T[] {
  const have = new Map(existing.map((r) => [r[key] as string, r.updatedAt]));
  return incoming.filter((r) => {
    const mine = have.get(r[key] as string);
    return mine === undefined || r.updatedAt > mine;
  });
}

// ───────────────────────── browser side ─────────────────────────

export async function buildExport(): Promise<{ bytes: Uint8Array; filename: string; counts: Record<string, number> }> {
  const [status, tNotes, ov, se, recs] = await Promise.all([
    db.getAll<StatusRecord>('status'),
    db.getAll<ToneNote>('toneNotes'),
    db.getAll<Override>('overrides'),
    db.getAll<SettingRecord>('settings'),
    db.getAll<RecordingMeta>('recordings'),
  ]);
  const audio: Record<string, Uint8Array> = {};
  const recordings: ExportData['recordings'] = [];
  for (const r of recs) {
    const row = await db.getOne<db.RecordingData>('recordingData', r.id);
    if (!row) continue;
    audio[r.id] = new Uint8Array(row.data);
    recordings.push({ ...r, file: `recordings/${r.id}.${extensionFor(r.mimeType)}` });
  }
  const now = new Date();
  const data: ExportData = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    status,
    toneNotes: tNotes.filter((n) => n.note),
    overrides: ov,
    settings: se,
    recordings,
  };
  const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  return {
    bytes: packExport({ data, audio }),
    filename: `pinyin-chart-${stamp}.zip`,
    counts: {
      statuses: status.filter((s) => s.status !== 'new').length,
      notes: data.toneNotes.length,
      recordings: recordings.length,
      characters: ov.length,
      settings: se.length,
    },
  };
}

export interface ImportSummary {
  status: number;
  notes: number;
  overrides: number;
  settings: number;
  recordings: number;
  skippedRecordings: number;
}

export async function applyImport(zip: Uint8Array, replace: boolean): Promise<ImportSummary> {
  const { data, audio } = unpackExport(zip);
  if (replace) for (const store of db.STORES) if (!db.RETIRED_STORES.includes(store)) await db.clearStore(store);

  const merge = async <T extends { updatedAt: number }>(store: db.StoreName, rows: T[], key: keyof T) => {
    const fresh = newerRows(await db.getAll<T>(store), rows, key);
    for (const row of fresh) await db.put(store, row);
    return fresh.length;
  };

  const summary: ImportSummary = {
    status: await merge('status', data.status, 'cell'),
    notes: (await merge('toneNotes', data.toneNotes, 'cell')) + (await mergeLegacyNotes(data.syllableNotes ?? [])),
    overrides: await merge('overrides', data.overrides, 'cell'),
    settings: await merge('settings', data.settings, 'name'),
    recordings: 0,
    skippedRecordings: 0,
  };

  const existing = new Map((await db.getAll<RecordingMeta>('recordings')).map((r) => [r.id, r]));
  for (const { file: _file, ...meta } of data.recordings) {
    const mine = existing.get(meta.id);
    if (!mine) {
      const bytes = audio[meta.id];
      // Copy into a fresh buffer: the unzip result is a view on one large buffer.
      await db.putRecording(meta, bytes.slice().buffer);
      summary.recordings++;
    } else if (meta.updatedAt > mine.updatedAt) {
      await db.put('recordings', meta); // renamed or re-starred on the other device
      summary.recordings++;
    } else {
      summary.skippedRecordings++;
    }
  }
  return summary;
}

/**
 * Old exports carry per-syllable notes. Each is folded into the first tone
 * cell's note (the same rule as the database upgrade) and kept in the hidden
 * legacy store. Returns how many notes changed.
 */
export async function mergeLegacyNotes(rows: NonNullable<ExportData['syllableNotes']>): Promise<number> {
  let changed = 0;
  const now = Date.now();
  for (const n of rows) {
    if (!hasLegacyText(n)) continue;
    const cell = db.firstCellOf(n.syllable);
    const existing = await db.getOne<ToneNote>('toneNotes', cell);
    const merged = mergeNotes(existing?.note ?? '', n.sound ?? '', n.watchOut ?? '');
    if (merged !== (existing?.note ?? '')) {
      await db.put('toneNotes', { cell, note: merged, updatedAt: now });
      changed++;
    }
    if (!(await db.getOne<LegacyNote>('legacyNotes', n.syllable))) {
      await db.put('legacyNotes', { syllable: n.syllable, cell, sound: n.sound ?? '', watchOut: n.watchOut ?? '', note: existing?.note ?? '', updatedAt: n.updatedAt ?? now, migratedAt: now });
    }
  }
  return changed;
}

/** Hand a file to the user: the share sheet where it can take files (phones), else a download. */
export async function deliverFile(bytes: Uint8Array, filename: string, type: string, preferShare = false): Promise<'shared' | 'downloaded'> {
  const blob = new Blob([bytes as BlobPart], { type });
  if (preferShare && typeof navigator.share === 'function' && typeof File !== 'undefined') {
    const file = new File([blob], filename, { type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return 'shared';
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return 'shared';
        // fall through to a plain download
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}

// ───────────────────────── Anki ─────────────────────────

const csvField = (s: string) => `"${s.replace(/"/g, '""').replace(/\r?\n/g, '<br>')}"`;

/**
 * A zip for Anki: cards.csv plus the native clips it refers to.
 * One card per tone cell. Import the CSV, then copy the files in media/ into
 * Anki's collection.media folder.
 */
export async function buildAnkiExport(cellIds: string[]): Promise<{ bytes: Uint8Array; filename: string; cards: number; clips: number }> {
  const header = ['#separator:Comma', '#html:true', '#columns:Pinyin,Character,Meaning,Audio,Example words,My notes,Tags'];
  const rows: string[] = [];
  const files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  let clips = 0;
  for (const id of cellIds) {
    const hit = TONE_CELL[id];
    if (!hit) continue;
    const ex = resolveExample(id);
    const audioName = `pinyin-chart-${toAscii(id)}.mp3`;
    let audioField = '';
    if (hasNativeAudio(id)) {
      const blob = await getNativeBlob(id);
      if (blob) {
        files[`media/${audioName}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
        audioField = `[sound:${audioName}]`;
        clips++;
      }
    }
    const notes = toneNotes.value[id]?.note ?? '';
    const words = ex.words.map((w) => `${w.word} ${w.pinyin}: ${w.meaning}`).join('\n');
    const tags = [...hit.syllable.tags, `tone${hit.cell.tone}`, statuses.value[id] ?? 'new'].join(' ').replace(/ü/g, 'v');
    rows.push([hit.cell.display, ex.character, ex.meaning, audioField, words, notes, tags].map(csvField).join(','));
  }
  files['cards.csv'] = strToU8([...header, ...rows].join('\n') + '\n');
  files['README.txt'] = strToU8(
    [
      'Pinyin Chart: Anki export',
      '',
      '1. In Anki choose File > Import and pick cards.csv.',
      '   The columns are: Pinyin, Character, Meaning, Audio, Example words, My notes, Tags.',
      '   Map them to the fields of a note type of your choice.',
      '2. Copy every file in the media folder into your Anki collection.media folder',
      '   (Tools > Check Media shows where it is). The Audio column refers to them by name.',
      '',
    ].join('\n'),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  return { bytes: zipSync(files as Parameters<typeof zipSync>[0]), filename: `pinyin-chart-anki-${stamp}.zip`, cards: rows.length, clips };
}

export const hasBundledExample = (cell: string) => cell in CELLS;
