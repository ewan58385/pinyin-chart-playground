/**
 * Outbound links to Forvo (forvo.com), a site of human pronunciation
 * recordings. A link only: nothing is fetched, embedded, cached or stored
 * from Forvo, which is an external site and not part of this app.
 *
 * Forvo is organised by words, so the link uses the tone cell's example
 * character (or the user's own) when there is one, and otherwise a search
 * for the pinyin restricted to Mandarin Chinese (Forvo's language code zh).
 *
 * URL shapes, as Forvo's own pages are indexed (checked 2026-11-12):
 *   https://forvo.com/word/妈/          a word page
 *   https://forvo.com/search/中/zh/     a search limited to Mandarin
 */
const FORVO = 'https://forvo.com';

/** The page for one written word or character. */
export const forvoWordUrl = (word: string) => `${FORVO}/word/${encodeURIComponent(word.trim())}/`;

/** A search for a term among Mandarin Chinese entries. */
export const forvoSearchUrl = (term: string) => `${FORVO}/search/${encodeURIComponent(term.trim())}/zh/`;

export interface ForvoLink {
  url: string;
  /** What the link looks up: a character or word, or the pinyin. */
  term: string;
  kind: 'word' | 'search';
}

/** The link for a tone cell: its example character if it has one, else a Mandarin search for its pinyin. */
export function forvoLink(character: string, pinyin: string): ForvoLink {
  const ch = character.trim();
  if (ch) return { url: forvoWordUrl(ch), term: ch, kind: 'word' };
  return { url: forvoSearchUrl(pinyin), term: pinyin.trim(), kind: 'search' };
}
