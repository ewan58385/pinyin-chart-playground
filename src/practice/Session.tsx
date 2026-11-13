/**
 * A guided practice session: the tone cells of a scope (a stage, a group, an
 * initial group, a category, one syllable, or everything marked shaky), one
 * at a time. Each step is the ordinary tone panel, so everything it can do
 * is here: play the native clip, record a take, compare, set the status,
 * keep a note; with the confusable pairs underneath. Nothing new is stored.
 */
import { useEffect, useMemo } from 'preact/hooks';
import { route, setPracticeStep } from '../lib/router';
import { scopeLabel, scopeText, type Scope } from '../lib/routes';
import { scopeCells, startIndex } from '../lib/scope';
import { settings, statuses } from '../lib/store';
import { hasNativeAudio } from '../data';
import { TONE_NAMES } from '../lib/pinyin';
import { ToneView } from '../components/ToneView';
import { StudyCard } from '../components/StudyCard';
import { blockFor, blockHash } from '../data/blocks';
import { nativeItem, nowPlaying, play, stopPlayback } from '../lib/audio';
import { Confusables } from '../components/Detail';
import { Crumbs } from '../components/common';
import { ArrowRight, ChevronLeft, Play, Stop } from '../components/icons';

function aboutLink(scope: Scope): { href: string; label: string } | null {
  switch (scope.kind) {
    case 'stage':
      return { href: `#/learn/${scope.id}`, label: 'Read about this stage' };
    case 'finals':
    case 'initials':
      return { href: blockHash(blockFor(scope.kind, scope.id)!), label: 'Open the group page' };
    case 'category':
      return { href: `#/browse/${scope.id}`, label: 'Open the category page' };
    case 'syllable':
      return { href: `#/s/${encodeURIComponent(scope.id)}`, label: `Open ${scope.id} on the chart` };
    default:
      return null;
  }
}

export function Session({ scope }: { scope: Scope }) {
  // The set is fixed when the session starts, so marking a cell solid does not reshuffle it.
  const cells = useMemo(() => scopeCells(scope, statuses.peek(), settings.peek().showUnverified), [scopeText(scope)]);
  const r = route.value;
  const st = statuses.value;
  let index = cells.findIndex((c) => c.syllable.id === r.syllable && c.cell.tone === r.tone);
  if (index < 0) index = startIndex(cells, st);
  const current = cells[index];

  // Put the current step on the address, so reload and Back come back to it.
  useEffect(() => {
    if (current && (r.syllable !== current.syllable.id || r.tone !== current.cell.tone)) setPracticeStep(current.syllable.id, current.cell.tone);
  }, [current?.cell.numeric]);

  const go = (i: number) => {
    const c = cells[Math.max(0, Math.min(cells.length - 1, i))];
    stopPlayback();
    setPracticeStep(c.syllable.id, c.cell.tone);
    document.querySelector('.page-wrap')?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return;
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, cells]);

  if (!cells.length) {
    return (
      <article class="page practice">
        <Crumbs />
        <h1>{scopeLabel(scope)}</h1>
        <p class="lede">{scope.kind === 'shaky' ? 'Nothing is marked shaky at the moment. Mark a tone shaky in its panel and it will appear here.' : 'There is nothing to practise in this set.'}</p>
        <p class="page-actions">
          <a class="btn" href="#/practice">
            Back to Practice
          </a>
        </p>
      </article>
    );
  }

  const solid = cells.filter((c) => st[c.cell.numeric] === 'solid').length;
  const shaky = cells.filter((c) => st[c.cell.numeric] === 'shaky').length;
  const last = index === cells.length - 1;
  // The explanation of the set lives on its own page; the session only links to it.
  const about = aboutLink(scope);
  return (
    <article class="page practice session">
      <Crumbs />
      <header class="session-head">
        <h1>{scopeLabel(scope)}</h1>
        {about && (
          <p class="session-about">
            <a href={about.href}>{about.label}</a>
          </p>
        )}
        <p class="session-count" role="status">
          Step {index + 1} of {cells.length}
          <small>
            {solid} solid · {shaky} shaky · {cells.length - solid - shaky} new
          </small>
        </p>
        <div class="progress" role="progressbar" aria-label="Position in this set" aria-valuemin={1} aria-valuemax={cells.length} aria-valuenow={index + 1}>
          <i style={{ width: `${((index + 1) / cells.length) * 100}%` }} />
        </div>
      </header>

      <nav class="session-nav" aria-label="Steps">
        <button type="button" class="btn" disabled={index === 0} onClick={() => go(index - 1)}>
          <ChevronLeft size={16} aria-hidden="true" />
          Previous
        </button>
        <span class="session-what" lang="zh-Latn">
          <b class="py" data-tone={current.cell.tone}>
            {current.cell.display}
          </b>
          <small>
            {current.syllable.id}, {TONE_NAMES[current.cell.tone]}
          </small>
        </span>
        {last ? (
          <a class="btn primary" href="#/practice">
            Finish
          </a>
        ) : (
          <button type="button" class="btn primary" onClick={() => go(index + 1)}>
            Next
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </nav>

      {!hasNativeAudio(current.cell.numeric) && (
        <p class="hint session-noaudio">This tone has no native recording, so there is nothing to play or compare against. You can still record yourself, set its status and keep a note.</p>
      )}

      <StudyCard
        key={current.syllable.id}
        s={current.syllable}
        only={cells.filter((c) => c.syllable.id === current.syllable.id).map((c) => c.cell.tone)}
        current={current.cell.tone}
        action={
          <button
            type="button"
            class="btn primary"
            disabled={!hasNativeAudio(current.cell.numeric)}
            aria-label={nowPlaying.value === `native:${current.cell.numeric}` ? `Stop ${current.cell.display}` : `Listen to ${current.cell.display}`}
            onClick={() => (nowPlaying.value === `native:${current.cell.numeric}` ? stopPlayback() : void play([nativeItem(current.cell.numeric)], { rate: settings.value.rate }))}
          >
            {nowPlaying.value === `native:${current.cell.numeric}` ? <Stop size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            Listen
          </button>
        }
      />

      <div class="session-panel">
        <ToneView key={current.cell.numeric} syl={current.syllable} cell={current.cell} parts={['compare', 'note']} />
        <Confusables syl={current.syllable} tone={current.cell} />
      </div>
    </article>
  );
}
