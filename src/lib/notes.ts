/**
 * Folding the old per-syllable notes ("How it sounds", "Watch out") into the
 * single "Note on this tone" box. Pure, so the IndexedDB upgrade, the import
 * of old exports and the tests all use the same rule.
 */

export const SOUND_PREFIX = 'How it sounds: ';
export const WATCH_PREFIX = 'Watch out: ';

/**
 * The tone note, then "How it sounds: …" and "Watch out: …" each on its own
 * line, only for fields with text. Idempotent: a line already present (as a
 * whole line) is not added again.
 */
export function mergeNotes(note: string, sound: string, watchOut: string): string {
  const lines = note.split('\n');
  const out = note.trim() ? [note.replace(/\s+$/, '')] : [];
  const add = (prefix: string, text: string) => {
    const t = text.trim();
    if (!t) return;
    const line = `${prefix}${t}`;
    if (lines.some((l) => l.trim() === line)) return;
    out.push(line);
  };
  add(SOUND_PREFIX, sound);
  add(WATCH_PREFIX, watchOut);
  return out.join('\n');
}

/** A legacy syllable note has something worth merging. */
export const hasLegacyText = (n: { sound?: string; watchOut?: string }) => !!(n.sound?.trim() || n.watchOut?.trim());
