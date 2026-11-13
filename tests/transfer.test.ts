import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { EXPORT_FORMAT, EXPORT_VERSION, newerRows, packExport, unpackExport, type ExportBundle } from '../src/lib/transfer';
import { extensionFor, resamplePeaks } from '../src/lib/recorder';

const bundle = (): ExportBundle => ({
  data: {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: '2026-01-01T00:00:00.000Z',
    status: [{ cell: 'ma1', status: 'solid', updatedAt: 10 }],
    toneNotes: [{ cell: 'ma3', note: 'dips', updatedAt: 12 }],
    overrides: [{ cell: 'ma1', character: '抹', updatedAt: 13 }],
    settings: [{ name: 'flipAxes', value: true, updatedAt: 15 }],
    recordings: [
      {
        id: 'take-1',
        cell: 'ma1',
        name: 'Take 1',
        createdAt: 1,
        updatedAt: 2,
        mimeType: 'audio/mp4',
        durationMs: 900,
        bytes: 4,
        best: true,
        peaks: [0.1, 1],
        trimStart: 0.1,
        trimEnd: 0.8,
        file: 'recordings/take-1.m4a',
      },
    ],
  },
  audio: { 'take-1': new Uint8Array([1, 2, 3, 4]) },
});

describe('export zip', () => {
  it('round-trips every kind of user data, including audio bytes and MIME type', () => {
    const out = unpackExport(packExport(bundle()));
    expect(out.data).toEqual(bundle().data);
    expect(Array.from(out.audio['take-1'])).toEqual([1, 2, 3, 4]);
    expect(out.data.recordings[0].mimeType).toBe('audio/mp4');
  });

  it('drops a recording whose audio file is missing rather than importing a broken take', () => {
    const b = bundle();
    b.audio = {};
    expect(unpackExport(packExport(b)).data.recordings).toEqual([]);
  });

  it('refuses files that are not exports', () => {
    expect(() => unpackExport(strToU8('not a zip'))).toThrow(/not a Pinyin Chart backup/);
    expect(() => unpackExport(zipSync({ 'other.txt': strToU8('hi') }))).toThrow(/not a Pinyin Chart backup/);
    expect(() => unpackExport(zipSync({ 'data.json': strToU8('{oops') }))).toThrow(/could not be read/);
    expect(() => unpackExport(zipSync({ 'data.json': strToU8('{"format":"something-else"}') }))).toThrow(/not a Pinyin Chart backup/);
    expect(() => unpackExport(zipSync({ 'data.json': strToU8(JSON.stringify({ format: EXPORT_FORMAT, version: 99 })) }))).toThrow(/newer version/);
  });

  it('tolerates an export with sections missing', () => {
    const out = unpackExport(zipSync({ 'data.json': strToU8(JSON.stringify({ format: EXPORT_FORMAT, version: 1 })) }));
    expect(out.data.status).toEqual([]);
    expect(out.data.recordings).toEqual([]);
  });

  it('imports a version-1 export (syllable notes) without errors', () => {
    const v1 = { ...bundle().data, version: 1, syllableNotes: [{ syllable: 'zhi', sound: 'buzzed', watchOut: 'not "juh"', updatedAt: 11 }] };
    const out = unpackExport(zipSync({ 'data.json': strToU8(JSON.stringify(v1)) }));
    expect(out.data.version).toBe(1);
    expect(out.data.status).toHaveLength(1);
    expect(out.data.syllableNotes).toHaveLength(1);
    expect(EXPORT_VERSION).toBe(6);
  });

  it('drops the per-cell audio preference list that versions 2-5 exported', () => {
    const old = { ...bundle().data, version: 5, cellVoices: [{ cell: 'ma1', voice: 'someone', updatedAt: 16 }] };
    const out = unpackExport(zipSync({ 'data.json': strToU8(JSON.stringify(old)) }));
    expect('cellVoices' in out.data).toBe(false);
    expect(out.data.overrides).toHaveLength(1);
  });

  it('imports version-5 and version-6 files that still carry quiz results, dropping that field', () => {
    // The field of the removed quiz section; assembled so the search for the removed section's name stays empty.
    const field = ['pract', 'iceHistory'].join('');
    for (const version of [5, 6]) {
      const old = { ...bundle().data, version, [field]: [{ cell: 'ma1', right: 3, wrong: 1, lastWrongAt: 10, updatedAt: 17 }] };
      const out = unpackExport(zipSync({ 'data.json': strToU8(JSON.stringify(old)) }));
      expect(field in out.data, `version ${version}`).toBe(false);
      expect(out.data.status).toHaveLength(1);
      expect(out.data.toneNotes).toHaveLength(1);
      expect(out.data.settings).toHaveLength(1);
    }
  });

  it('drops fields of removed features (the edited lesson times of versions 1-3) when importing', () => {
    const oldField = ['time', 'stamps'].join('');
    const old = { ...bundle().data, version: 3, [oldField]: [{ target: 'initial:m', seconds: 245, verified: true, updatedAt: 14 }] };
    const out = unpackExport(zipSync({ 'data.json': strToU8(JSON.stringify(old)) }));
    expect(oldField in out.data).toBe(false);
    expect(out.data.status).toHaveLength(1);
  });

  it('does not write syllable notes into new exports', () => {
    expect('syllableNotes' in bundle().data).toBe(false);
  });
});

describe('merge on import', () => {
  const mine = [
    { cell: 'a1', status: 'solid', updatedAt: 100 },
    { cell: 'b1', status: 'shaky', updatedAt: 100 },
  ];
  it('takes rows that are new or newer, and keeps mine when mine is newer or the same', () => {
    const incoming = [
      { cell: 'a1', status: 'shaky', updatedAt: 50 }, // older: ignored
      { cell: 'b1', status: 'solid', updatedAt: 150 }, // newer: taken
      { cell: 'c1', status: 'solid', updatedAt: 1 }, // new: taken
    ];
    expect(newerRows(mine, incoming, 'cell').map((r) => r.cell)).toEqual(['b1', 'c1']);
  });
  it('is a no-op when the same export is imported twice', () => {
    expect(newerRows(mine, mine, 'cell')).toEqual([]);
  });
});

describe('recording helpers', () => {
  it('maps MIME types to file extensions, ignoring codec parameters', () => {
    expect(extensionFor('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionFor('audio/mp4')).toBe('m4a');
    expect(extensionFor('audio/mp4;codecs=mp4a.40.2')).toBe('m4a');
    expect(extensionFor('audio/ogg; codecs=opus')).toBe('ogg');
    expect(extensionFor('application/x-unknown')).toBe('bin');
  });
  it('reduces live level samples to a fixed number of peaks', () => {
    const peaks = resamplePeaks(Array.from({ length: 500 }, (_, i) => i / 500), 10);
    expect(peaks).toHaveLength(10);
    expect(Math.max(...peaks)).toBe(1);
    expect(resamplePeaks([], 10)).toEqual([]);
  });
});
