import { useEffect, useRef, useState } from 'preact/hooks';
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
  resetAllData,
  statuses,
  toneNotes,
  memoryOnly,
} from '../lib/store';
import { cacheSupported, cachedCount, clearAudioCache, downloadAll, downloadState, stopDownloadAll, totalClipCount } from '../lib/audio';
import { applyImport, buildAnkiExport, buildExport, deliverFile, type ImportSummary } from '../lib/transfer';
import { online } from '../lib/viewport';
import { Download, Upload, WifiOff, Trash } from './icons';

const mb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Reset app": two steps, the second an alert dialog with a way to back up first. */
function ResetApp({ onExport, exporting }: { onExport: () => void; exporting: boolean }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'working'>('idle');
  const dialogRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (step === 'confirm') dialogRef.current?.focus();
  }, [step]);

  const cancel = () => {
    setStep('idle');
    // Back to the button that opened the warning.
    setTimeout(() => openRef.current?.focus(), 0);
  };

  const reset = async () => {
    setStep('working');
    try {
      await resetAllData();
      setStep('idle');
      notify('Your data and downloaded audio have been deleted. The app is as new.');
      document.querySelector<HTMLElement>('.page h1')?.focus();
    } catch (err) {
      setStep('confirm');
      notify(`Could not reset: ${(err as Error).message}`, 'error');
    }
  };

  return (
    <section class="reset" aria-labelledby="reset-title">
      <h2 id="reset-title">Reset app</h2>
      <p>
        Delete your notes, progress, recordings, edited characters, settings and downloaded audio from this device. The app goes back to how it was the
        first time you opened it.
      </p>
      {step === 'idle' ? (
        <div class="actions">
          <button ref={openRef} type="button" class="btn danger" onClick={() => setStep('confirm')}>
            <Trash size={16} aria-hidden="true" />
            Reset app…
          </button>
        </div>
      ) : (
        <div
          ref={dialogRef}
          class="result bad reset-confirm"
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="reset-confirm-title"
          aria-describedby="reset-confirm-text"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && step === 'confirm') {
              e.preventDefault();
              cancel();
            }
          }}
        >
          <p id="reset-confirm-title">
            <b>Delete everything on this device?</b>
          </p>
          <p id="reset-confirm-text">
            This deletes your notes, progress, recordings, edited characters, settings and downloaded audio from this device. It cannot be undone. If you might
            want your data back, export a backup first.
          </p>
          <div class="actions">
            <button type="button" class="btn" disabled={exporting || step === 'working'} onClick={onExport}>
              <Download size={16} aria-hidden="true" />
              {exporting ? 'Preparing…' : 'Export backup first'}
            </button>
            <button type="button" class="btn danger" disabled={step === 'working'} onClick={() => void reset()}>
              {step === 'working' ? 'Deleting…' : 'Delete everything'}
            </button>
            <button type="button" class="btn quiet" disabled={step === 'working'} onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function DataPage() {
  const [busy, setBusy] = useState<string | null>(null);
  // Ticked each time the page opens: a restore replaces what is here unless the box is cleared.
  const [replace, setReplace] = useState(true);
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

  const doExport = async () => {
    setBusy('export');
    setExported(null);
    try {
      const { bytes, filename, counts } = await buildExport();
      deliverFile(bytes, filename, 'application/zip');
      setExported(
        `Saved ${filename} (${mb(bytes.length)}) with ${plural(counts.statuses, 'status', 'statuses')}, ${plural(counts.notes, 'note')}, ${plural(counts.recordings, 'recording')} and ${plural(counts.characters, 'edited character')}.`,
      );
    } catch (err) {
      notify(`The backup could not be made: ${(err as Error).message}`, 'error');
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
      notify(`Anki export ready: ${plural(cards, 'card')}, ${plural(clips, 'recording')}.`);
    } catch (err) {
      notify(`The Anki export could not be made: ${(err as Error).message}`, 'error');
    }
    setBusy(null);
  };

  return (
    <article class="page">
      <h1 tabIndex={-1}>My data</h1>
      <p class="lede">
        Everything you add is kept in this browser on this device. There is no account and nothing is sent anywhere. Make a backup to keep it safe or to move
        it to another device.
      </p>

      <section>
        <h2>What is saved here</h2>
        <div class="stat-grid">
          <div class="stat">
            <b>{statusCount}</b>
            <span>tones marked shaky or solid</span>
          </div>
          <div class="stat">
            <b>{noteCount}</b>
            <span>{noteCount === 1 ? 'note' : 'notes'}</span>
          </div>
          <div class="stat">
            <b>{recs.length}</b>
            <span>
              your {recs.length === 1 ? 'recording' : 'recordings'}
              {recs.length ? `, ${mb(recBytes)}` : ''}
            </span>
          </div>
          <div class="stat">
            <b>{Object.keys(overrides.value).length}</b>
            <span>edited characters</span>
          </div>
        </div>
      </section>

      <section>
        <h2>Keeping your data safe</h2>
        {memoryOnly.value ? (
          <p class="result bad">This browser is not letting the app save anything, so your changes will be lost when you close the tab. Private browsing is the usual cause.</p>
        ) : (
          <>
            <p>
              {!p.supported
                ? 'This browser decides for itself when to clear saved data. Keep a backup.'
                : p.granted === null
                  ? 'The app asks the browser to keep your data the first time you save something.'
                  : p.granted
                    ? 'The browser has agreed to keep your data, even when the device is short of space.'
                    : 'The browser may clear this site’s data if the device runs short of space or you do not use the app for a long time. Installing the app to your home screen makes that much less likely. Keep a backup.'}
            </p>
            {p.usage !== undefined && p.quota !== undefined && (
              <p class="hint">
                Using {mb(p.usage)} of about {mb(p.quota)} available.
              </p>
            )}
            {p.supported && !p.granted && (
              <div class="actions">
                <button type="button" class="btn" onClick={() => void requestPersistence(true)}>
                  {p.granted === null ? 'Ask the browser now' : 'Ask again'}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <h2>Native recordings offline</h2>
        {!cacheSupported.value ? (
          <p class="result bad">This browser cannot save the recordings for offline use here. They will play when you are online.</p>
        ) : (
          <>
            <p>
              Each syllable’s recordings are saved the first time you play it. To have them all without a connection, download the full set:{' '}
              <b>
                {totalClipCount} recordings, about {mb(AUDIO_TOTAL_BYTES)}
              </b>
              .
            </p>
            <p>
              <b>
                {dl.running ? dl.done : cached} of {totalClipCount}
              </b>{' '}
              saved on this device.{dl.failed > 0 && ` ${dl.failed} could not be downloaded; try again when the connection is better.`}
            </p>
            <div class="progress" role="progressbar" aria-label="Recordings downloaded" aria-valuemin={0} aria-valuemax={totalClipCount} aria-valuenow={dl.running ? dl.done : cached}>
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
                Remove downloaded recordings
              </button>
            </div>
          </>
        )}
      </section>

      <section>
        <h2>Anki</h2>
        <p>
          Make Anki flashcards: one card per tone, with the pinyin, character, meaning, example words, your notes and the native recording.
          {filtersActive.value
            ? ` The chart filters are on, so this covers the ${cellIds.length} tones that match them.`
            : ` This covers all ${cellIds.length} tones. To export only some, set filters on the chart first.`}
        </p>
        <div class="actions">
          <button type="button" class="btn" disabled={!!busy || !cellIds.length} onClick={() => void doAnki()}>
            <Download size={16} aria-hidden="true" />
            {busy === 'anki' ? 'Preparing…' : `Export ${cellIds.length} cards for Anki`}
          </button>
        </div>
        <p class="hint">The download includes short instructions for importing it into Anki.</p>
      </section>

      <section class="backup" aria-labelledby="backup-title">
        <h2 id="backup-title">Backup and restore</h2>
        <p>
          A backup is one file with your statuses (and so your Learn progress), notes, recordings, edited characters and settings. Restoring replaces what is
          here, or, if you turn that off, combines the two: the newer version of anything wins, and nothing is added twice.
        </p>
        <div class="actions">
          <button type="button" class="btn primary" disabled={!!busy} onClick={() => void doExport()}>
            <Download size={16} aria-hidden="true" />
            {busy === 'export' ? 'Preparing…' : 'Export backup'}
          </button>
          <button type="button" class="btn" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            {busy === 'import' ? 'Restoring…' : 'Restore from backup'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            class="sr-only"
            tabIndex={-1}
            aria-label="Choose a backup file to restore"
            onChange={(e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              if (replace) setConfirmReplace(file);
              else void doImport(file, false);
            }}
          />
        </div>
        <label class="check replace-check">
          <input type="checkbox" checked={replace} aria-describedby="replace-hint" onChange={(e) => setReplace((e.target as HTMLInputElement).checked)} />
          <span>
            Replace my current data with the backup
            <small id="replace-hint">Turn off to combine the backup with what is already here.</small>
          </span>
        </label>
        {confirmReplace && (
          <div class="result bad" role="alertdialog" aria-label="Confirm replace">
            This deletes your current notes, progress, recordings, edited characters and settings on this device, then loads {confirmReplace.name}.
            <div class="actions" style="margin-top:8px">
              <button type="button" class="btn danger" onClick={() => void doImport(confirmReplace, true)}>
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
            {imported.status + imported.notes + imported.recordings + imported.overrides + imported.settings === 0
              ? 'Nothing new: everything in that backup is already here.'
              : `Restored ${plural(imported.status, 'status', 'statuses')}, ${plural(imported.notes, 'note')}, ${plural(imported.recordings, 'recording')}, ${plural(imported.overrides, 'edited character')} and ${plural(imported.settings, 'setting')}.`}
            {imported.skippedRecordings > 0 && ` ${plural(imported.skippedRecordings, 'recording was', 'recordings were')} already here.`}
          </p>
        )}
        {importError && (
          <p class="result bad" role="alert">
            Could not restore: {importError}
          </p>
        )}
      </section>

      <ResetApp onExport={() => void doExport()} exporting={busy === 'export'} />
    </article>
  );
}
