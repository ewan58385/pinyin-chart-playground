/** Browse by category: an index of the categories, and one page per category. */
import { CATEGORIES, CATEGORY_BY_ID, CATEGORY_SECTIONS, categorySyllables, type Category } from '../data/categories';
import { FINALS, FINAL_BY_ID } from '../data/finals';
import { INITIALS, INITIAL_BY_ID } from '../data/initials';
import type { Syllable } from '../data';
import { route } from '../lib/router';
import { settings, statuses, visibleTones } from '../lib/store';
import { progressOf } from '../data/learn';
import { Crumbs, MoreLink, StatusSummary, count } from './common';
import { CardLegend, SyllableCard } from './SyllableCard';

const cellsOf = (syls: Syllable[], show: boolean) => syls.flatMap((s) => visibleTones(s, show).map((cell) => ({ syllable: s, cell })));

function CategoryIndex() {
  const show = settings.value.showUnverified;
  return (
    <div class="block-wrap">
      <article class="block overview">
        <Crumbs />
        <header class="block-head">
          <h1>Browse by category</h1>
          <p class="lede">The same syllables, sorted by what kind of sound they are.</p>
        </header>
        {CATEGORY_SECTIONS.map((sec) => (
          <section class="member" key={sec.kind}>
            <h2>{sec.title}</h2>
            <p class="hint small">{sec.blurb}</p>
            <ul class="ov-list wide">
              {CATEGORIES.filter((c) => c.kind === sec.kind).map((c) => {
                const syls = categorySyllables(c, show);
                const p = progressOf(cellsOf(syls, show), statuses.value);
                return (
                  <li key={c.id}>
                    <span class="ov-block">
                      <MoreLink href={`#/browse/${c.id}`}>{c.label}</MoreLink>
                      <small>{c.description}</small>
                    </span>
                    <small class="count">
                      {count(syls.length, 'syllable')} · {p.solid} solid · {p.shaky} shaky · {p.fresh} new
                    </small>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </article>
    </div>
  );
}

function CategoryPage({ c }: { c: Category }) {
  const show = settings.value.showUnverified;
  const syls = categorySyllables(c, show);
  const groups: { key: string; title: string; syls: Syllable[] }[] =
    c.groupBy === 'final'
      ? FINALS.map((f) => ({ key: f.id, title: FINAL_BY_ID[f.id].surface, syls: syls.filter((s) => s.final === f.id) }))
      : INITIALS.map((i) => ({ key: i.id, title: INITIAL_BY_ID[i.id].display, syls: syls.filter((s) => s.initial === i.id) }));
  const list = CATEGORIES.filter((x) => x.kind === c.kind);
  const index = list.indexOf(c);
  return (
    <div class="block-wrap">
      <article class="block">
        <Crumbs />
        <header class="block-head">
          <h1>{c.label}</h1>
          <p class="lede">{c.description}</p>
          {c.note && <p class="hint judgement">{c.note}</p>}
          <div class="block-nextprev">
            {list[index - 1] ? <a href={`#/browse/${list[index - 1].id}`} rel="prev">← {list[index - 1].label}</a> : <span />}
            {list[index + 1] ? <a href={`#/browse/${list[index + 1].id}`} rel="next">{list[index + 1].label} →</a> : <span />}
          </div>
        </header>
        <StatusSummary cells={cellsOf(syls, show)} syllables={syls.length} />
        <CardLegend />
        {groups
          .filter((g) => g.syls.length)
          .map((g) => (
            <section class="member" key={g.key}>
              <h2>
                <span class="py" lang="zh-Latn">
                  {g.title}
                </span>
                <small class="count">{count(g.syls.length, 'syllable')}</small>
              </h2>
              <div class="cards">
                {g.syls.map((s) => (
                  <SyllableCard key={s.id} s={s} />
                ))}
              </div>
            </section>
          ))}
      </article>
    </div>
  );
}

export function BrowsePage() {
  const c = route.value.block ? CATEGORY_BY_ID[route.value.block] : undefined;
  return c ? <CategoryPage key={c.id} c={c} /> : <CategoryIndex />;
}
