/**
 * The Finals and Initials overview pages: the parents of the group pages.
 * Everything shown comes from the data modules (finals, initials, tags,
 * blocks); nothing linguistic is written here.
 */
import { FINAL_BLOCKS, INITIAL_BLOCKS, blockHash, type Block } from '../data/blocks';
import { FINAL_BY_ID } from '../data/finals';
import { INITIALS, INITIAL_BY_ID, type Difficulty } from '../data/initials';
import { DIFFICULTY_DESCRIPTION, TAG_BY_ID } from '../data/tags';
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

const TYPE_LETTER: Record<string, string> = { simple: 'S', compound: 'C', nasal: 'N' };

/** One short line under a group: the spelling points its finals carry (the y / w spelling is explained further down the page). */
function GroupCues({ block }: { block: Block }) {
  const show = settings.value.showUnverified;
  const parts = SPELLING_TAGS.filter((t) => t !== 'spelling-variant')
    .map((t) => {
      const finals = block.members.filter((id) => blockSyllables('finals', block.id).some((s) => s.final === id && syllableVisible(s, show) && s.tags.includes(t)));
      return finals.length ? { t, finals } : null;
    })
    .filter((x): x is { t: string; finals: string[] } => !!x);
  if (!parts.length) return null;
  return (
    <p class="final-cues">
      {parts.map((p, i) => (
        <>
          {i > 0 && ' · '}
          <span title={TAG_BY_ID[p.t].explain}>{TAG_BY_ID[p.t].label}</span>:{' '}
          <span lang="zh-Latn">{p.finals.map((id) => FINAL_BY_ID[id].surface).join(', ')}</span>
        </>
      ))}
    </p>
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
            <p class="lede">The 36 finals in six groups, in the order of the chart’s columns. Each group has its own page with every syllable that uses its finals.</p>
            <p class="final-key" aria-label="Key">
              <span>
                <span class="ft-type" aria-hidden="true">S</span> simple: one vowel
              </span>
              <span>
                <span class="ft-type" aria-hidden="true">C</span> compound: more than one vowel
              </span>
              <span>
                <span class="ft-type" aria-hidden="true">N</span> nasal: ends in -n or -ng
              </span>
              <span>
                <b lang="zh-Latn">iu = iou</b> the full form behind a short spelling
              </span>
            </p>
          </header>

          {FINAL_BLOCKS.map((b) => (
            <section class="member" key={b.id}>
              <h2>
                <MoreLink href={blockHash(b)}>{b.title}</MoreLink>
              </h2>
              <GroupProgress block={b} />
              <ul class="final-tiles">
                {b.members.map((id) => {
                  const f = FINAL_BY_ID[id];
                  const syls = blockSyllables('finals', b.id).filter((s) => s.final === id && syllableVisible(s, show));
                  const cues = SPELLING_TAGS.filter((t) => syls.some((s) => s.tags.includes(t))).map((t) => TAG_BY_ID[t].label);
                  const full = f.canonical !== f.surface ? ` (short for ${f.canonical})` : '';
                  const about = `${f.surface}${full}: ${f.type} final, ${count(syls.length, 'syllable')}${cues.length ? `; ${cues.join(', ')}` : ''}`;
                  return (
                    <li key={id}>
                      <a class="final-tile" href={blockHash(b)} aria-label={`${about}. Open the ${b.title}`} title={about}>
                        <span class="py" lang="zh-Latn">
                          {f.surface}
                        </span>
                        {f.canonical !== f.surface && (
                          <small class="eq" lang="zh-Latn">
                            = {f.canonical}
                          </small>
                        )}
                        <span class="ft-type" aria-hidden="true">
                          {TYPE_LETTER[f.type]}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <GroupCues block={b} />
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
            {FINAL_BY_ID.er.note && <p class="hint">{FINAL_BY_ID.er.note}</p>}
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
            <p class="lede">The 21 initials, plus ∅ for syllables with no initial, in the order of the chart’s rows. Each group has its own page.</p>
          </header>

          <section class="member">
            <h2>By how they are made</h2>
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
                const flagged = list.filter((i) => i.note);
                return (
                  <li key={d}>
                    <span class="ov-block">
                      <MoreLink href={`#/browse/${d}`}>{CATEGORY_BY_ID[d].label}</MoreLink>
                      <small>{DIFFICULTY_DESCRIPTION[d]}.</small>
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
            <p>{TAG_BY_ID['spelling-variant'].explain} These syllables sit in the ∅ (no initial) row of the chart, under the final they spell:</p>
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
