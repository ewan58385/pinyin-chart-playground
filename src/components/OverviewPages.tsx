/**
 * The Finals and Initials overview pages: the parents of the group pages.
 * Everything shown comes from the data modules (finals, initials, tags,
 * blocks); nothing linguistic is written here.
 */
import { FINAL_BLOCKS, INITIAL_BLOCKS, blockHash, type Block } from '../data/blocks';
import { FINAL_BY_ID } from '../data/finals';
import { INITIALS, INITIAL_BY_ID, type Difficulty } from '../data/initials';
import { DIFFICULTY_LABEL, TAG_BY_ID } from '../data/tags';
import { CATEGORY_BY_ID } from '../data/categories';
import { YW_SPELLINGS } from '../lib/pinyin';
import { blockSyllables, scopeCells } from '../lib/scope';
import { settings, statuses, syllableVisible } from '../lib/store';
import { progressOf } from '../data/learn';
import { BlockNav } from './BlockPage';
import { Crumbs, MoreLink, count } from './common';

const SPELLING_TAGS = ['hidden-vowel', 'ü-as-u', 'fake-i', 'o-as-uo', 'spelling-variant', 'erhua'];
const TAG_CATEGORY: Record<string, string> = { 'hidden-vowel': 'hidden-vowel', 'ü-as-u': 'umlaut-u', 'fake-i': 'fake-i', 'o-as-uo': 'o-as-uo', 'spelling-variant': 'y-w' };

/** A readable progress bar for a group: solid and shaky shares of its tones, with the count in words. */
function GroupProgress({ block }: { block: Block }) {
  const p = progressOf(scopeCells({ kind: block.kind, id: block.id }, settings.value.showUnverified), statuses.value);
  const total = Math.max(1, p.cells);
  return (
    <div class="group-progress">
      <div
        class="pbar"
        role="progressbar"
        aria-label={`${block.title}: tones marked solid`}
        aria-valuemin={0}
        aria-valuemax={p.cells}
        aria-valuenow={p.solid}
        aria-valuetext={`${p.solid} of ${p.cells} solid, ${p.shaky} shaky, ${p.fresh} new`}
      >
        <i class="solid" style={{ width: `${(p.solid / total) * 100}%` }} />
        <i class="shaky" style={{ width: `${(p.shaky / total) * 100}%` }} />
      </div>
      <p class="pbar-label" aria-hidden="true">
        <b>
          {p.solid} of {p.cells} solid
        </b>
        {p.shaky > 0 && <span class="k-shaky">{p.shaky} shaky</span>}
        <span>{p.fresh} new</span>
      </p>
    </div>
  );
}

export function FinalsOverview() {
  const show = settings.value.showUnverified;
  return (
    <>
      <BlockNav />
      <div class="block-wrap">
        <article class="block overview">
          <Crumbs />
          <header class="block-head">
            <h1>Finals</h1>
            <p class="lede">The 36 finals in six groups, in the order of the chart's columns. Each group has a page of its own with every syllable that uses its finals.</p>
          </header>

          {FINAL_BLOCKS.map((b) => (
            <section class="member" key={b.id}>
              <h2>
                <MoreLink href={blockHash(b)}>{b.title}</MoreLink>
              </h2>
              <GroupProgress block={b} />
              <ul class="ov-list">
                {b.members.map((id) => {
                  const f = FINAL_BY_ID[id];
                  const syls = blockSyllables('finals', b.id).filter((s) => s.final === id && syllableVisible(s, show));
                  const cues = SPELLING_TAGS.filter((t) => syls.some((s) => s.tags.includes(t)));
                  const nasal = syls.some((s) => s.tags.includes('front-nasal')) ? 'front nasal -n' : syls.some((s) => s.tags.includes('back-nasal')) ? 'back nasal -ng' : '';
                  return (
                    <li key={id}>
                      <a class="ov-item" href={blockHash(b)} aria-label={`${f.surface}: open the ${b.title}`}>
                        <span class="py" lang="zh-Latn">
                          {f.surface}
                        </span>
                        {f.canonical !== f.surface && <small class="eq">= {f.canonical}</small>}
                      </a>
                      <span class="ov-tags">
                        <span class="tag">{f.type}</span>
                        {nasal && <span class="tag">{nasal}</span>}
                        {cues.map((t) => (
                          <span class="tag cue" key={t} title={TAG_BY_ID[t].explain}>
                            {TAG_BY_ID[t].label}
                          </span>
                        ))}
                        {!f.typeVerified && (
                          <span class="tag flag" title={f.note}>
                            type is a judgement call
                          </span>
                        )}
                      </span>
                      <small class="count">{count(syls.length, 'syllable')}</small>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section class="member">
            <h2>How the columns are spelled</h2>
            <dl class="ov-notes">
              {SPELLING_TAGS.map((t) => (
                <div key={t}>
                  <dt>{TAG_CATEGORY[t] ? <MoreLink href={`#/browse/${TAG_CATEGORY[t]}`}>{TAG_BY_ID[t].label}</MoreLink> : TAG_BY_ID[t].label}</dt>
                  <dd>{TAG_BY_ID[t].explain}</dd>
                </div>
              ))}
            </dl>
            {FINAL_BY_ID.er.note && <p class="hint small">{FINAL_BY_ID.er.note}</p>}
          </section>

          <section class="member">
            <h2>Browse finals by type</h2>
            <p class="ov-links">
              {['simple', 'compound', 'nasal', 'front-nasal', 'back-nasal'].map((id) => (
                <MoreLink key={id} href={`#/browse/${id}`}>
                  {CATEGORY_BY_ID[id].label}
                </MoreLink>
              ))}
            </p>
          </section>
        </article>
      </div>
    </>
  );
}

const DIFFICULTIES: Difficulty[] = ['easy', 'tougher', 'problem'];

export function InitialsOverview() {
  return (
    <>
      <BlockNav />
      <div class="block-wrap">
        <article class="block overview">
          <Crumbs />
          <header class="block-head">
            <h1>Initials</h1>
            <p class="lede">The null initial (∅) and the 21 initials, in the order of the chart's rows. Each articulation group has a page of its own.</p>
          </header>

          <section class="member">
            <h2>By articulation</h2>
            <ul class="ov-list wide">
              {INITIAL_BLOCKS.map((b) => (
                <li key={b.id}>
                  <span class="ov-block">
                    <MoreLink href={blockHash(b)}>{b.title}</MoreLink>
                    <small>{b.description}</small>
                    <GroupProgress block={b} />
                  </span>
                  <span class="ov-initials">
                    {b.members.map((id) => {
                      const i = INITIAL_BY_ID[id];
                      return (
                        <a class="ov-chip" key={id} href={blockHash(b)} aria-label={`${id || 'no initial'}${i.difficulty ? `, ${i.difficulty}` : ''}: open ${b.title}`}>
                          <span class="py" lang="zh-Latn">
                            {i.display}
                          </span>
                          {i.difficulty && <small>{i.difficulty}</small>}
                        </a>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section class="member">
            <h2>By difficulty</h2>
            <ul class="ov-list wide">
              {DIFFICULTIES.map((d) => {
                const list = INITIALS.filter((i) => i.difficulty === d);
                const flagged = list.filter((i) => !i.difficultyVerified && i.note);
                return (
                  <li key={d}>
                    <span class="ov-block">
                      <MoreLink href={`#/browse/${d}`}>{CATEGORY_BY_ID[d].label}</MoreLink>
                      <small>{DIFFICULTY_LABEL[d]}</small>
                    </span>
                    <span class="ov-initials">
                      {list.map((i) => {
                        const b = INITIAL_BLOCKS.find((x) => x.members.includes(i.id))!;
                        return (
                          <a class="ov-chip" key={i.id} href={blockHash(b)} aria-label={`${i.id}: open ${b.title}`}>
                            <span class="py" lang="zh-Latn">
                              {i.display}
                            </span>
                          </a>
                        );
                      })}
                    </span>
                    {flagged.map((i) => (
                      <small class="hint" key={i.id}>
                        {i.note}
                      </small>
                    ))}
                  </li>
                );
              })}
            </ul>
            <p class="ov-links">
              {['unaspirated', 'aspirated', 'retroflex', 'palatal', 'dental-sibilant', 'null-initial'].map((id) => (
                <MoreLink key={id} href={`#/browse/${id}`}>
                  {CATEGORY_BY_ID[id].label}
                </MoreLink>
              ))}
            </p>
          </section>

          <section class="member">
            <h2>y and w</h2>
            <p>{TAG_BY_ID['spelling-variant'].explain} These syllables sit on the ∅ row of the chart, under the final they are a spelling of:</p>
            <ul class="yw-list" lang="zh-Latn">
              {Object.entries(YW_SPELLINGS).map(([spelling, v]) => (
                <li key={spelling}>
                  <span class="py">{spelling}</span> <small>= {v.final}</small>
                </li>
              ))}
            </ul>
            <p class="ov-links">
              <MoreLink href="#/browse/y-w">{CATEGORY_BY_ID['y-w'].label}</MoreLink>
            </p>
          </section>
        </article>
      </div>
    </>
  );
}
