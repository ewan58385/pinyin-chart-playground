/**
 * Hash routing, so the app works from any path on a static host and the
 * back button closes the detail sheet instead of leaving the app. The route
 * grammar lives in routes.ts.
 */
import { signal, computed } from '@preact/signals';
import { CHART, hashFor, hasPanel, isRedirect, parseHash, type Page, type Route } from './routes';
import type { Tone } from './pinyin';
import type { BlockKind } from '../data/blocks';

export type { Page, Route } from './routes';

/** The route for the current address. An old link that redirects also has its address rewritten, without a new history entry. */
function current(): Route {
  const r = parseHash(location.hash);
  if (isRedirect(location.hash)) history.replaceState(null, '', hashFor(r));
  return r;
}

export const route = signal<Route>(current());
/** The open syllable only, so the chart does not redraw when just the tone changes. */
export const openId = computed(() => route.value.syllable);

/**
 * True while the open syllable's history entry was added by openSyllable on the page
 * underneath, so closing it can step back to that page instead of leaving two entries
 * for the same page (which made the next Back press look as if it did nothing).
 */
let sheetPushed = false;

window.addEventListener('hashchange', () => {
  route.value = current();
  if (!route.value.syllable) sheetPushed = false;
});

export function goPage(page: Page) {
  location.hash = hashFor({ page, block: null, syllable: null, tone: null });
}

export function goBlock(kind: BlockKind, id: string) {
  location.hash = hashFor({ page: kind, block: id, syllable: null, tone: null });
}

/**
 * Open a syllable on the current page (chart or block page). Opening from a
 * closed state adds a history entry; switching between syllables replaces it.
 */
export function openSyllable(syllable: string, tone: Tone | null = null) {
  const r = route.value;
  const base = hasPanel(r) ? r : CHART;
  const next: Route = { ...base, syllable, tone };
  if (hasPanel(r) && r.syllable) {
    history.replaceState(null, '', hashFor(next));
    route.value = next;
  } else {
    sheetPushed = hasPanel(r);
    location.hash = hashFor(next);
  }
}

export function selectTone(tone: Tone) {
  const r = route.value;
  if (!r.syllable) return;
  const next = { ...r, tone };
  history.replaceState(null, '', hashFor(next));
  route.value = next;
}

export function closeSyllable() {
  if (sheetPushed) {
    // Back to the entry openSyllable came from: the same page without the syllable.
    sheetPushed = false;
    history.back();
    return;
  }
  const next: Route = { ...route.value, syllable: null, tone: null };
  history.replaceState(null, '', hashFor(next));
  route.value = next;
}
