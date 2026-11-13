/**
 * Hash routes, as pure functions so they can be tested without a browser.
 * Hash routing works from any path on a static host.
 *
 *   #/                         chart;  #/s/zhi  #/s/zhi/1  with zhi open (on its first tone)
 *   #/finals                   finals overview;   #/finals/e  the E group (#/finals/e/zhe/1 with zhe open)
 *   #/initials                 initials overview; #/initials/retroflex  the zh ch sh r page
 *   #/browse                   categories;        #/browse/nasal  one category (…/ban/1 with ban open)
 *   #/learn                    the learning path; #/learn/compound  one stage (…/mai/2 with mai open)
 *   #/practice                 practice hub;      #/practice/stage/compound, /finals/e, /initials/retroflex,
 *                              /category/nasal, /syllable/zhi, /shaky  a guided session (…/mai/2 = the current step)
 *   #/data  #/settings  #/about
 */
import { SYLLABLE_BY_ID } from '../data';
import { blockFor, blockHash, type BlockKind } from '../data/blocks';
import { CATEGORY_BY_ID } from '../data/categories';
import { STAGE_BY_ID } from '../data/learn';
import type { Tone } from './pinyin';

export type Page = 'chart' | 'finals' | 'initials' | 'browse' | 'learn' | 'practice' | 'data' | 'settings' | 'about';
export interface Route {
  page: Page;
  /**
   * The sub-page: a block id (finals, initials), a category id (browse), a
   * stage id (learn) or a practice scope such as "stage/compound". Null on
   * the overview or index page.
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

export type ScopeKind = 'stage' | 'finals' | 'initials' | 'category' | 'syllable' | 'shaky';
export interface Scope {
  kind: ScopeKind;
  id: string;
}

/** "stage/compound" → { kind, id }; null when the scope does not name anything real. */
export function parseScope(text: string | null): Scope | null {
  if (!text) return null;
  if (text === 'shaky') return { kind: 'shaky', id: '' };
  const [kind, ...rest] = text.split('/');
  const id = rest.join('/');
  if (kind === 'stage' && STAGE_BY_ID[id]) return { kind, id };
  if ((kind === 'finals' || kind === 'initials') && blockFor(kind, id)) return { kind, id: blockFor(kind, id)!.id };
  if (kind === 'category' && CATEGORY_BY_ID[id]) return { kind, id };
  if (kind === 'syllable' && SYLLABLE_BY_ID[id]) return { kind, id };
  return null;
}
export const scopeText = (s: Scope) => (s.kind === 'shaky' ? 'shaky' : `${s.kind}/${s.id}`);

const SIMPLE_PAGES = ['data', 'about', 'settings'] as const;

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
  if (head === 'practice') {
    if (parts[1] === 'shaky') return { page: 'practice', block: 'shaky', ...syllableAndTone(parts.slice(2)) };
    const scope = parseScope(parts[1] && parts[2] ? `${parts[1]}/${parts[2] === 'v' && parts[1] === 'finals' ? 'ü' : parts[2]}` : null);
    if (scope) return { page: 'practice', block: scopeText(scope), ...syllableAndTone(parts.slice(3)) };
    // The older form #/practice/zhi1 named a tone cell.
    const m = parts[1]?.match(/^(.+?)([1-5])$/);
    if (m && SYLLABLE_BY_ID[m[1]]) return { page: 'practice', block: `syllable/${m[1]}`, syllable: null, tone: null };
    return { page: 'practice', block: null, syllable: null, tone: null };
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
    case 'practice':
      return r.block ? `#/practice/${r.block.replace(/^finals\/ü$/, 'finals/v').split('/').map(encodeURIComponent).join('/')}${syl}` : '#/practice';
    case 'chart':
      return r.syllable ? `#/s${syl}` : '#/';
    default:
      return `#/${r.page}`;
  }
}

/** Pages on which a syllable opens in the side panel (or bottom sheet). */
export const hasPanel = (r: Pick<Route, 'page' | 'block'>) => r.page === 'chart' || ((r.page === 'finals' || r.page === 'initials' || r.page === 'browse' || r.page === 'learn') && !!r.block);

export const practiceHash = (scope: Scope) => hashFor({ page: 'practice', block: scopeText(scope), syllable: null, tone: null });

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
  practice: 'Practice',
  data: 'My data',
  settings: 'Settings',
  about: 'About',
};

/** The name of a practice scope, for headings and crumbs. */
export function scopeLabel(scope: Scope): string {
  switch (scope.kind) {
    case 'stage':
      return STAGE_BY_ID[scope.id].title;
    case 'finals':
    case 'initials':
      return blockFor(scope.kind, scope.id)!.title;
    case 'category':
      return CATEGORY_BY_ID[scope.id].label;
    case 'syllable':
      return scope.id;
    case 'shaky':
      return 'My shaky syllables';
  }
}

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
  else if (r.page === 'practice') {
    const scope = parseScope(r.block);
    if (scope) trail.push({ label: scopeLabel(scope), href: here });
  }
  return trail;
}
