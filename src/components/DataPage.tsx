import { useRef, useState } from 'preact/hooks';
import { AUDIO_TOTAL_BYTES } from '../data';
import {
  filtersActive,
  loadUserData,
  matches,
  notify,
  overrides,
  persistence,
  recordings,
  requestPersistence,
  statuses,
  toneNotes,
  memoryOnly,
} from '../lib/store';
import { cacheSupported, cachedCount, clearAudioCache, downloadAll, downloadState, stopDownloadAll, totalClipCount } from '../lib/audio';
import { applyImport, buildAnkiExport, buildExport, deliverFile, type ImportSummary } from '../lib/transfer';
import { narrow, online } from '../lib/viewport';
import { Download, Upload, Share, WifiOff } from './icons';

const mb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export function DataPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState<File | null>(null);
  const [imported, setImported] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const recs = recordings.value;
  const recBytes = recs.reduce((n, r) => n + r.bytes, 0);
  const statusCount = Object.values(statuses.value).filter((s) => s !== 'new').length;
  const noteCount = Object.values(toneNotes.value).filter((n) => n.note).length;
  const p = persistence.value;
  const dl = downloadState.value;
  const cached = cachedCount.value ?? 0;
  const canShare = typeof navigator.share === 'function' && narrow.value;

  const doExport = async (share: boolean) => {
    setBusy('export');
    setExported(null);
    try {
      const { bytes, filename, counts } = await buildExport();
      const how = await deliverFile(bytes, filename, 'application/zip', share);
      setExported(
        `${how === 'shared' ? 'Shared' : 'Saved'} ${filename} (${mb(bytes.length)}): ${counts.statuses} statuses, ${counts.notes} notes, ${counts.recordings} recordings, ${counts.characters} edited characters.`,
      );
    } catch (err) {
      notify(`Export failed: ${(err as Error).message}`, 'error');
    }
    setBusy(null);
  };

  const doImport = async (file: File, replaceAll: boolean) => {
    setBusy('import');
    setImported(null);
    setImportError(null);
    try {
      const summary = await applyImport(new Uint8Array(await file.arrayBuffer()), replaceAll);
      await loadUserData();
      setImported(summary);
    } catch (err) {
      setImportError((err as Error).message);
    }
    setBusy(null);
    setConfirmReplace(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const cellIds = Object.values(matches.value).flat();
  const doAnki = async () => {
    setBusy('anki');
    try {
      const { bytes, filename, cards, clips } = await buildAnkiExport(cellIds);
      await deliverFile(bytes, filename, 'application/zip');
      notify(`Anki export: ${cards} cards, ${clips} audio clips.`);
    } catch (err) {
      notify(`Anki export failed: ${(err as Error).message}`, 'error');
    }
    setBusy(null);
  };

  return (
    <article class="page">
      <h1>My data</h1>
      <p class="lede">
        Everything you add lives in this browser only: there is no account and no server. Export it to back it up or to move it between your phone and
        laptop.
      </p>

      <section>
        <h2>What is stored here</h2>
        <div class="stat-grid">
          <div class="stat">
            <b>{statusCount}</b>
            <span>tones marked shaky or solid</span>
          </div>
          <div class="stat">
            <b>{noteCount}</b>
            <span>notes</span>
          </div>
          <div class="stat">
            <b>{recs.length}</b>
            <span>recordings{recs.length ? `, ${mb(recBytes)}` : ''}</span>
          </div>
          <div class="stat">
            <b>{Object.keys(overrides.value).length}</b>
            <span>edited characters</span>
          </div>
        </div>
      </section>

      <section>
        <h2>Move or back up</h2>
        <p>
          One zip holds your notes, statuses, recordings, edited characters, settings and practice results. Importing merges: for anything
          changed in both places the newer version wins, and recordings are never duplicated.
        </p>
        <div class="actions">
          <button type="button" class="btn primary" disabled={!!busy} onClick={() => void doExport(false)}>
            <Download size={16} aria-hidden="true" />
            {busy === 'export' ? 'Preparing…' : 'Export everything'}
          </button>
          {canShare && (
            <button type="button" class="btn" disabled={!!busy} onClick={() => void doExport(true)}>
              <Share size={16} aria-hidden="true" />
              Share…
            </button>
          )}
          <button type="button" class="btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            {busy === 'import' ? 'Importing…' : 'Import a zip'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            class="sr-only"
            tabIndex={-1}
            aria-label="Choose an export zip to import"
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              if (replace) setConfirmReplace(file);
              else void doImport(file, false);
            }}
          />
        </div>
        <label class="check">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace((e.target as HTMLInputElement).checked)} />
          Replace everything here with the import, instead of merging
        </label>
        {confirmReplace && (
          <div class="result bad" role="alertdialog" aria-label="Confirm replace">
            This deletes all notes, statuses and recordings in this browser, then loads {confirmReplace.name}.
            <div class="actions" style="margin-top:8px">
              <button type="button" class="btn primary" onClick={() => void doImport(confirmReplace, true)}>
                Delete and replace
              </button>
              <button
                type="button"
                class="btn"
                onClick={() => {
                  setConfirmReplace(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {exported && (
          <p class="result" role="status">
            {exported}
          </p>
        )}
        {imported && (
          <p class="result" role="status">
            Imported {imported.status} statuses, {imported.notes} notes, {imported.recordings} recordings, {imported.overrides} edited characters and{' '}
            {imported.practice} practice results.
            {imported.skippedRecordings > 0 && ` ${imported.skippedRecordings} recordings were already here.`}
          </p>
        )}
        {importError && (
          <p class="result bad" role="alert">
            {importError}
          </p>
        )}
      </section>

      <section>
        <h2>Storage</h2>
        {memoryOnly.value ? (
          <p class="result bad">This browser is refusing storage, so nothing is being saved. Private browsing is the usual cause.</p>
        ) : (
          <>
            <p>
              Persistent storage:{' '}
              <b>
                {!p.supported
                  ? 'not supported by this browser'
                  : p.granted === null
                    ? 'not requested yet (it is requested the first time you save something)'
                    : p.granted
                      ? 'granted'
                      : 'not granted'}
              </b>
              .{' '}
              {p.supported && p.granted
                ? 'The browser will not clear your data to free up space.'
                : 'The browser may clear this site’s data if the device runs short of space or the site goes unused for a long time. Installing the app to your home screen makes that much less likely. Keep an export as a backup.'}
            </p>
            {p.usage !== undefined && p.quota !== undefined && (
              <p class="hint">
                Using {mb(p.usage)} of about {mb(p.quota)} available to this site.
              </p>
            )}
            {p.supported && !p.granted && (
              <div class="actions">
                <button type="button" class="btn" onClick={() => void requestPersistence(true)}>
                  {p.granted === null ? 'Request it now' : 'Ask again'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h2>Native audio offline</h2>
        {!cacheSupported.value ? (
          <p class="result bad">This browser is not offering offline storage for audio here (it needs https). Clips will play from the network.</p>
        ) : (
          <>
            <p>
              Clips are saved the first time you play a syllable. To have all of them without a connection, download the full set:{' '}
              <b>{totalClipCount} clips, about {mb(AUDIO_TOTAL_BYTES)}</b>.
            </p>
            <p>
              <b>
                {dl.running ? dl.done : cached} of {totalClipCount}
              </b>{' '}
              saved on this device.{dl.failed > 0 && ` ${dl.failed} could not be fetched; try again when the connection is better.`}
            </p>
            <div class="progress" role="progressbar" aria-label="Audio downloaded" aria-valuemin={0} aria-valuemax={totalClipCount} aria-valuenow={dl.running ? dl.done : cached}>
              <i style={{ width: `${(((dl.running ? dl.done : cached) / totalClipCount) * 100).toFixed(1)}%` }} />
            </div>
            <div class="actions" style="margin-top:12px">
              {dl.running ? (
                <button type="button" class="btn" onClick={stopDownloadAll}>
                  Pause
                </button>
              ) : (
                <button type="button" class="btn primary" disabled={!online.value || cached >= totalClipCount} onClick={() => void downloadAll()}>
                  {online.value ? <Download size={16} aria-hidden="true" /> : <WifiOff size={16} aria-hidden="true" />}
                  {cached >= totalClipCount ? 'All downloaded' : !online.value ? 'Offline' : cached > 0 ? 'Download the rest' : 'Download all for offline'}
                </button>
              )}
              <button type="button" class="btn quiet" disabled={dl.running || cached === 0} onClick={() => void clearAudioCache()}>
                Remove downloaded audio
              </button>
            </div>
          </>
        )}
      </section>

      <section>
        <h2>Anki</h2>
        <p>
          Exports one card per tone, with pinyin, character, meaning, example words, your notes and the native clip, as a CSV plus audio files.
          {filtersActive.value
            ? ` The chart filters are on, so this covers the ${cellIds.length} tones that match them.`
            : ` No chart filters are on, so this covers all ${cellIds.length} tones. Set filters on the chart first to export a selection.`}
        </p>
        <div class="actions">
          <button type="button" class="btn" disabled={!!busy || !cellIds.length} onClick={() => void doAnki()}>
            <Download size={16} aria-hidden="true" />
            {busy === 'anki' ? 'Preparing…' : `Export ${cellIds.length} cards for Anki`}
          </button>
        </div>
        <p class="hint">The zip includes a short README on importing the CSV and where the audio files go.</p>
      </section>
    </article>
  );
}
