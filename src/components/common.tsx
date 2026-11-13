/** Small pieces shared by the group, overview, browse, learn and practice pages. */
import type { ComponentChildren } from 'preact';
import { crumbsFor, practiceHash, type Scope } from '../lib/routes';
import { route } from '../lib/router';
import { recordingsByCell, settings, statuses } from '../lib/store';
import { ChevronRight, Target } from './icons';

/** "1 syllable", "3 syllables". */
export const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The trail to the current page. Every segment is a link; the last one is the page itself. */
export function Crumbs() {
  const trail = crumbsFor(route.value);
  return (
    <nav class="crumbs" aria-label="Breadcrumb">
      {trail.map((c, i) => (
        <>
          {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
          <a href={c.href} aria-current={i === trail.length - 1 ? 'page' : undefined}>
            {c.label}
          </a>
        </>
      ))}
    </nav>
  );
}

/** How many of these tone cells are new, shaky and solid, and how many have a recording. */
export function StatusSummary({ cells, syllables }: { cells: { cell: { numeric: string } }[]; syllables?: number }) {
  const st = statuses.value;
  const rec = recordingsByCell.value;
  let shaky = 0;
  let solid = 0;
  let recorded = 0;
  for (const c of cells) {
    const s = st[c.cell.numeric];
    if (s === 'shaky') shaky++;
    else if (s === 'solid') solid++;
    if (rec[c.cell.numeric]?.length) recorded++;
  }
  return (
    <div class="block-summary" aria-label="Status summary">
      <div class="stat">
        <b>{syllables ?? cells.length}</b>
        <span>{syllables !== undefined ? `${syllables === 1 ? 'syllable' : 'syllables'}, ${count(cells.length, 'tone')}` : 'tones'}</span>
      </div>
      <div class="stat">
        <b>{cells.length - shaky - solid}</b>
        <span>new</span>
      </div>
      <div class="stat s-shaky">
        <b>{shaky}</b>
        <span>shaky</span>
      </div>
      <div class="stat s-solid">
        <b>{solid}</b>
        <span>solid</span>
      </div>
      <div class="stat">
        <b>{recorded}</b>
        <span>with a recording</span>
      </div>
    </div>
  );
}

/** A visible way into a guided practice session for a scope. Hidden when Practice is turned off in Settings. */
export function PracticeButton({ scope, children }: { scope: Scope; children: ComponentChildren }) {
  if (!settings.value.showPractice) return null;
  return (
    <a class="btn primary practice-btn" href={practiceHash(scope)}>
      <Target size={15} aria-hidden="true" />
      {children}
    </a>
  );
}

/** The way from Learn into Practice: a plain button-styled link, secondary to the page's own reading. Hidden when Practice is off. */
export function PracticeLink({ scope, children }: { scope: Scope; children: ComponentChildren }) {
  if (!settings.value.showPractice) return null;
  return (
    <a class="btn practice-link-btn" href={practiceHash(scope)}>
      <Target size={15} aria-hidden="true" />
      {children}
    </a>
  );
}

/** A heading-style link with a chevron, for "this goes to its own page". */
export function MoreLink({ href, children }: { href: string; children: ComponentChildren }) {
  return (
    <a class="more-link" href={href}>
      {children}
      <ChevronRight size={15} aria-hidden="true" />
    </a>
  );
}
