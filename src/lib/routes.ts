/**
 * Hash routes, as pure functions so they can be tested without a browser.
 * Hash routing works from any path on a static host.
 *
 *   #/                         chart;  #/s/zhi  #/s/zhi/1  with zhi open (on its first tone)
 *   #/finals                   finals overview;   #/finals/e  the E group (#/finals/e/zhe/1 with zhe open)
 *   #/initials                 initials overview; #/initials/retroflex  the zh ch sh r page
 *   #/browse                   categories;        #/browse/nasal  one category (…/ban/1 with ban open)
 *   #/learn                    the learning path; #/learn/compound  one stage (…/mai/2 with mai open)
 *   #/data  #/settings  #/about  #/credits
 *
 * Links to a section that no longer exists (#/practice/…) lead to Learn: to
 * the stage they named, if they named one, else to the Learn index.
 */
import { SYLLABLE_BY_ID } from '../data';
import { blockFor, blockHash, type BlockKind } from '../data/blocks';
import { CATEGORY_BY_ID } from '../data/categories';
import { STAGE_BY_ID } from '../data/learn';
import type { Tone } from './pinyin';

export type Page = 'chart' | 'finals' | 'initials' | 'browse' | 'learn' | 'data' | 'settings' | 'about' | 'credits';
export interface Route {
  page: Page;
  /**
   * The sub-page: a block id (finals, initials), a category id (browse) or a
   * stage id (learn). Null on the overview or index page.
   */
  block: string | null;
  syllable: string | null;
  tone: Tone | null;
}

export const CHART: Route = { page: 'chart', block: null, syllable: null, tone: null };

function syllableAndTone(parts: string[]): Pick<Route, 'syllable' | 'tone'> {
  const s = parts[0] ? SYLLABLE_BY_ID[parts[0]] : undefined;
  if (!s) return { syllable: null, tone: null };
  const n = Number(parts[1]);
  return { syllable: s.id, tone: s.tones.some((t) => t.tone === n) ? (n as Tone) : null };
}

const SIMPLE_PAGES = ['data', 'about', 'settings', 'credits'] as const;
/** The first path segment of a section that has been removed; its links are redirected. */
const REMOVED_SECTION = 'practice';

/** True when a hash is an old link that parseHash redirects, so the address bar should be rewritten. */
export const isRedirect = (hash: string) => decodeURIComponent(hash.replace(/^#\/?/, '')).split('/')[0] === REMOVED_SECTION;

export function parseHash(hash: string): Route {
  const parts = decodeURIComponent(hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
  const head = parts[0];
  if ((SIMPLE_PAGES as readonly string[]).includes(head)) return { page: head as Page, block: null, syllable: null, tone: null };
  if (head === 'finals' || head === 'initials') {
    const block = blockFor(head as BlockKind, parts[1] ?? '');
    return block ? { page: head, block: block.id, ...syllableAndTone(parts.slice(2)) } : { page: head, block: null, syllable: null, tone: null };
  }
  if (head === 'browse') {
    const cat = parts[1] ? CATEGORY_BY_ID[parts[1]] : undefined;
    return cat ? { page: 'browse', block: cat.id, ...syllableAndTone(parts.slice(2)) } : { page: 'browse', block: null, syllable: null, tone: null };
  }
  if (head === 'learn') {
    const stage = parts[1] ? STAGE_BY_ID[parts[1]] : undefined;
    return stage ? { page: 'learn', block: stage.id, ...syllableAndTone(parts.slice(2)) } : { page: 'learn', block: null, syllable: null, tone: null };
  }
  if (head === REMOVED_SECTION) {
    // An old link into the removed section: its stage, if it named one, else the Learn index.
    const stage = parts[1] === 'stage' && parts[2] ? STAGE_BY_ID[parts[2]] : undefined;
    return { page: 'learn', block: stage?.id ?? null, syllable: null, tone: null };
  }
  if (head === 's') return { page: 'chart', block: null, ...syllableAndTone(parts.slice(1)) };
  return CHART;
}

export function hashFor(r: Route): string {
  const syl = r.syllable ? `/${encodeURIComponent(r.syllable)}${r.tone ? `/${r.tone}` : ''}` : '';
  switch (r.page) {
    case 'finals':
    case 'initials':
      return r.block ? `${blockHash({ kind: r.page, id: r.block })}${syl}` : `#/${r.page}`;
    case 'browse':
    case 'learn':
      return r.block ? `#/${r.page}/${r.block}${syl}` : `#/${r.page}`;
    case 'chart':
      return r.syllable ? `#/s${syl}` : '#/';
    default:
      return `#/${r.page}`;
  }
}

/** Pages on which a syllable opens in the side panel (or bottom sheet). */
export const hasPanel = (r: Pick<Route, 'page' | 'block'>) => r.page === 'chart' || ((r.page === 'finals' || r.page === 'initials' || r.page === 'browse' || r.page === 'learn') && !!r.block);

// ───────────────────────── breadcrumbs ─────────────────────────

export interface Crumb {
  label: string;
  href: string;
}

const PAGE_LABEL: Record<Page, string> = {
  chart: 'Chart',
  finals: 'Finals',
  initials: 'Initials',
  browse: 'Browse',
  learn: 'Learn',
  data: 'My data',
  settings: 'Settings',
  about: 'About',
  credits: 'Credits and licences',
};

/** The trail to a route. Every segment is a working link; the last is the page itself. */
export function crumbsFor(r: Route): Crumb[] {
  const trail: Crumb[] = [{ label: 'Chart', href: '#/' }];
  if (r.page === 'chart') return trail;
  const top = { page: r.page, block: null, syllable: null, tone: null } as Route;
  trail.push({ label: PAGE_LABEL[r.page], href: hashFor(top) });
  if (!r.block) return trail;
  const here = hashFor({ ...r, syllable: null, tone: null });
  if (r.page === 'finals' || r.page === 'initials') trail.push({ label: blockFor(r.page, r.block)!.title, href: here });
  else if (r.page === 'browse') trail.push({ label: CATEGORY_BY_ID[r.block].label, href: here });
  else if (r.page === 'learn') trail.push({ label: STAGE_BY_ID[r.block].title, href: here });
  return trail;
}
