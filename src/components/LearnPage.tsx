/**
 * Learn is the path: stages from the easiest sounds to the
 * hardest, what each covers and why, a picture of where its syllables sit on
 * the chart, its syllables to listen to and mark, and progress read from the
 * user's own statuses. Nothing is locked.
 */
import { STAGES, STAGE_BY_ID, nextStage, progressOf, shakiest, stageCells, stageSyllables, type Stage } from '../data/learn';
import { INITIALS, INITIAL_BY_ID } from '../data/initials';
import { FINALS } from '../data/finals';
import { openSyllable, route } from '../lib/router';
import { settings, showTone, statuses } from '../lib/store';
import { Crumbs, MoreLink, StatusSummary, count } from './common';
import { StudyCard } from './StudyCard';
import { StageMap } from './StageMap';
import { ArrowRight } from './icons';

function ProgressBar({ stage }: { stage: Stage }) {
  const p = progressOf(stageCells(stage, settings.value.showUnverified), statuses.value);
  return (
    <span class="mini-progress wide" aria-label={`${p.solid} of ${p.cells} tones solid, ${p.shaky} shaky`}>
      <span class="bar" aria-hidden="true">
        <i class="solid" style={{ width: `${(p.solid / Math.max(1, p.cells)) * 100}%` }} />
        <i class="shaky" style={{ width: `${(p.shaky / Math.max(1, p.cells)) * 100}%` }} />
      </span>
      <small>
        {p.solid} of {p.cells} solid{p.shaky ? ` · ${p.shaky} shaky` : ''}
        {p.mostlySolid ? ' · mostly solid' : ''}
      </small>
    </span>
  );
}

function LearnIndex() {
  const st = statuses.value;
  const next = nextStage(st, settings.value.showUnverified);
  const revisit = shakiest(st);
  return (
    <div class="block-wrap">
      <article class="block overview">
        <Crumbs />
        <header class="block-head">
          <h1>Learn</h1>
          <p class="lede">
            Nine stages, from the easiest sounds to the hardest. Your progress comes from the new, shaky and solid marks you set on each tone. Nothing is
            locked: start anywhere.
          </p>
        </header>

        <section class="next-up" aria-label="Next up">
          <h2>Next up</h2>
          {next ? (
            <>
              <p class="next-title">
                <MoreLink href={`#/learn/${next.id}`}>
                  Stage {STAGES.indexOf(next) + 1}: {next.title}
                </MoreLink>
              </p>
              <p>{next.covers}</p>
              <ProgressBar stage={next} />
              <p class="page-actions">
                <a class="btn primary" href={`#/learn/${next.id}`}>
                  Open the stage
                </a>
              </p>
            </>
          ) : (
            <p>Every stage is mostly solid. The review stage and any tones still marked shaky are there to revisit.</p>
          )}
          {revisit.length > 0 && (
            <div class="revisit">
              <h3>Shaky, worth revisiting</h3>
              <ul class="chips">
                {revisit.map((c) => (
                  <li key={c.cell.numeric}>
                    <a class="ov-chip" href={`#/s/${encodeURIComponent(c.syllable.id)}/${c.cell.tone}`} lang="zh-Latn">
                      <span class="py" data-tone={c.cell.tone}>
                        {showTone(c.cell)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section class="member">
          <h2>The stages</h2>
          <ol class="stage-list">
            {STAGES.map((s, i) => (
              <li key={s.id} class={next?.id === s.id ? 'current' : undefined}>
                <span class="stage-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span class="stage-body">
                  <MoreLink href={`#/learn/${s.id}`}>{s.title}</MoreLink>
                  <small>{s.covers}</small>
                  <ProgressBar stage={s} />
                </span>
              </li>
            ))}
          </ol>
          <p class="hint small">
            A stage counts as mostly solid when four in five of its tones are marked solid. The order goes from single vowels to compound and nasal finals,
            and from easy initials to the tricky ones. It is a suggestion, not a rule.
          </p>
        </section>
      </article>
    </div>
  );
}

/** "a, o and e": a short list in words. */
const listed = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

function StagePage({ stage }: { stage: Stage }) {
  const show = settings.value.showUnverified;
  const cells = stageCells(stage, show);
  const syls = stageSyllables(stage, show);
  const index = STAGES.indexOf(stage);
  const prev = STAGES[index - 1];
  const next = STAGES[index + 1];
  const groups = INITIALS.map((i) => ({ initial: i, syls: syls.filter((s) => s.initial === i.id) })).filter((g) => g.syls.length);
  // Which initials and finals the stage uses, read from its syllables, in chart order.
  const initials = INITIALS.filter((i) => syls.some((s) => s.initial === i.id));
  const finals = FINALS.filter((f) => syls.some((s) => s.final === f.id));
  return (
    <div class="block-wrap">
      <article class="block">
        <Crumbs />
        <header class="block-head">
          <p class="stage-kicker">
            Stage {index + 1} of {STAGES.length}
            {stage.review ? ' · review' : ''}
          </p>
          <h1>{stage.title}</h1>
          <ul class="stage-facts">
            <li>
              <b>Covers:</b> {stage.covers}
            </li>
            <li>
              <b>Initials:</b>{' '}
              {initials.length === INITIALS.length ? (
                'all of them, on every row of the chart'
              ) : (
                <span lang="zh-Latn">{listed(initials.map((i) => (i.id ? i.display : '∅ (no initial)')))}</span>
              )}
              .
            </li>
            <li>
              <b>Finals:</b> {finals.length === FINALS.length ? 'all 36' : <span lang="zh-Latn">{listed(finals.map((f) => f.surface))}</span>}.
            </li>
            <li>
              <b>Tones:</b> {stage.tones === 'neutral' ? 'the neutral tone only' : 'the four full tones (first to fourth)'}; {count(syls.length, 'syllable')},{' '}
              {count(cells.length, 'tone')}.
            </li>
            <li>
              <b>Why here:</b> {stage.why}
            </li>
          </ul>
          <div class="block-nextprev">
            {prev ? <a href={`#/learn/${prev.id}`} rel="prev">← {prev.title}</a> : <span />}
            {next ? <a href={`#/learn/${next.id}`} rel="next">{next.title} →</a> : <span />}
          </div>
        </header>
        <StageMap stage={stage} index={index} />
        <StatusSummary cells={cells} syllables={syls.length} />
        <p class="hint small study-intro">
          Listen to each tone and mark how well you know it. Open a syllable for its example words, your recordings and notes.
          {stage.tones === 'neutral' ? ' Only the neutral tone of each syllable belongs to this stage; the others are dimmed.' : ''}
        </p>
        {groups.map((g) => (
          <section class="member" key={g.initial.id}>
            <h2>
              <span class="py" lang="zh-Latn">
                {INITIAL_BY_ID[g.initial.id].display}
              </span>
              <small class="count">{count(g.syls.length, 'syllable')}</small>
            </h2>
            <div class="study-list">
              {g.syls.map((s) => {
                const only = stage.tones === 'neutral' ? [5] : undefined;
                const first = s.tones.find((t) => !only || only.includes(t.tone))?.tone ?? null;
                return (
                  <StudyCard
                    key={s.id}
                    s={s}
                    only={only}
                    action={
                      <button type="button" class="btn" aria-label={`Open ${s.id}`} onClick={() => openSyllable(s.id, first)}>
                        Open
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    }
                  />
                );
              })}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}

export function LearnPage() {
  const stage = route.value.block ? STAGE_BY_ID[route.value.block] : undefined;
  return stage ? <StagePage key={stage.id} stage={stage} /> : <LearnIndex />;
}
