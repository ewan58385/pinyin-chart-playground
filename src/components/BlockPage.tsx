import { useEffect } from 'preact/hooks';
import { BLOCKS, blockFor, blockHash, type Block, type BlockKind } from '../data/blocks';
import { FINAL_BY_ID } from '../data/finals';
import { INITIAL_BY_ID } from '../data/initials';
import { syllableAt, type Syllable } from '../data';
import { FINALS } from '../data/finals';
import { INITIALS } from '../data/initials';
import { settings, syllableVisible } from '../lib/store';
import { scopeCells } from '../lib/scope';
import { Crumbs, PracticeButton, StatusSummary, count } from './common';
import { route } from '../lib/router';
import { CardLegend, SyllableCard } from './SyllableCard';
import { ChartIcon } from './icons';

/** Side (desktop) or strip (mobile) navigation between the overview and group pages. */
export function BlockNav({ current }: { current?: Block }) {
  const page = route.value.page;
  const group = (kind: BlockKind, heading: string) => (
    <div class="bn-group">
      <h2>
        <a href={`#/${kind}`} aria-current={!current && page === kind ? 'page' : undefined}>
          {heading}
        </a>
      </h2>
      <ul>
        {BLOCKS[kind].map((b) => (
          <li key={b.id}>
            <a href={blockHash(b)} aria-current={current && b.kind === current.kind && b.id === current.id ? 'page' : undefined} lang="zh-Latn">
              {b.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <nav class="block-nav" aria-label="Finals and initials">
      <a class="bn-chart" href="#/" aria-label="Whole chart: back to the main chart">
        <ChartIcon size={18} aria-hidden="true" />
        <span>Whole chart</span>
      </a>
      {group('finals', 'Finals')}
      {group('initials', 'Initials')}
    </nav>
  );
}

/** The syllables of one member (one final or one initial) of the block. */
function Member({ block, member }: { block: Block; member: string }) {
  const show = settings.value.showUnverified;
  const pairs = block.kind === 'finals' ? INITIALS.map((i) => syllableAt(i.id, member)) : FINALS.map((f) => syllableAt(member, f.id));
  const syls = pairs.filter((s): s is Syllable => !!s && syllableVisible(s, show));
  const head = block.kind === 'finals' ? FINAL_BY_ID[member] : INITIAL_BY_ID[member];
  const title = block.kind === 'finals' ? FINAL_BY_ID[member].surface : INITIAL_BY_ID[member].display;
  const sub = block.kind === 'finals' ? ('canonical' in head && head.canonical !== title ? `= ${head.canonical}` : FINAL_BY_ID[member].type + ' final') : member ? '' : 'no initial';
  if (!syls.length) return null;
  return (
    <section class="member">
      <h2>
        <span class="py" lang="zh-Latn">
          {title}
        </span>
        {sub && <small>{sub}</small>}
        <small class="count">{count(syls.length, 'syllable')}</small>
      </h2>
      <div class="cards">
        {syls.map((s) => (
          <SyllableCard key={s.id} s={s} />
        ))}
      </div>
    </section>
  );
}

export function BlockPage() {
  const r = route.value;
  const kind = r.page as BlockKind;
  const block = blockFor(kind, r.block ?? '') ?? BLOCKS[kind][0];
  const list = BLOCKS[kind];
  const index = list.indexOf(block);
  const prev = list[index - 1];
  const next = list[index + 1];
  const show = settings.value.showUnverified;
  const cells = scopeCells({ kind, id: block.id }, {}, show);
  const syllableCount = new Set(cells.map((c) => c.syllable.id)).size;

  // Left and right arrows move between blocks of the same kind, unless typing or inside the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable || el.closest('.detail')) return;
      if (e.key === 'ArrowLeft' && prev) {
        e.preventDefault();
        location.hash = blockHash(prev);
      } else if (e.key === 'ArrowRight' && next) {
        e.preventDefault();
        location.hash = blockHash(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev?.id, next?.id]);

  return (
    <>
      <BlockNav current={block} />
      <div class="block-wrap">
        <article class="block">
          <Crumbs />
          <header class="block-head">
            <h1>{block.title}</h1>
            <p class="lede">{block.description}</p>
            <div class="block-nextprev">
              {prev ? (
                <a href={blockHash(prev)} rel="prev" aria-label={`Previous: ${prev.title}`}>
                  ← {prev.label}
                </a>
              ) : (
                <span />
              )}
              {next ? (
                <a href={blockHash(next)} rel="next" aria-label={`Next: ${next.title}`}>
                  {next.label} →
                </a>
              ) : (
                <span />
              )}
            </div>
          </header>
          <StatusSummary cells={cells} syllables={syllableCount} />
          <p class="page-actions">
            <PracticeButton scope={{ kind, id: block.id }}>Practise this {kind === 'finals' ? 'group' : 'initial group'}</PracticeButton>
          </p>
          <CardLegend />
          {block.members.map((m) => (
            <Member key={m} block={block} member={m} />
          ))}
          {block.confusable.length > 0 && (
            <section class="member confusable-blocks">
              <h2>Easily confused with</h2>
              <ul class="plain">
                {block.confusable.map((c) => {
                  const other = blockFor(kind, c.id)!;
                  return (
                    <li key={c.id}>
                      <a href={blockHash(other)}>{other.title}</a> <span class="why">{c.why}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </article>
      </div>
    </>
  );
}
