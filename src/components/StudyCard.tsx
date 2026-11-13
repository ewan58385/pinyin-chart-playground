/**
 * A syllable as a study item, for Learn and Practice: one syllable per card,
 * each tone on its own row with a Listen button, the example character and
 * gloss, and a new / shaky / solid control. Unlike the chart's reference card
 * (SyllableCard) it is something to work through, not a position in a grid.
 */
import type { ComponentChildren } from 'preact';
import type { Syllable } from '../data';
import { FINAL_BY_ID } from '../data/finals';
import { INITIAL_BY_ID } from '../data/initials';
import type { LearnStatus } from '../lib/db';
import { TONE_NAMES, type Tone } from '../lib/pinyin';
import { nativeItem, nowPlaying, play, stopPlayback } from '../lib/audio';
import { setStatus, settings, showTone } from '../lib/store';
import { cardTones } from './cardData';
import { Play, Stop } from './icons';

const STATUSES: { value: LearnStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'shaky', label: 'Shaky' },
  { value: 'solid', label: 'Solid' },
];

export function StudyCard({
  s,
  only,
  current,
  action,
}: {
  s: Syllable;
  /** Tones that belong to the current set; the others are shown dimmed. */
  only?: number[];
  /** The tone being worked on, marked on its row. */
  current?: Tone;
  /** The card's primary action, in the card's header. */
  action: ComponentChildren;
}) {
  const set = settings.value;
  const rows = cardTones(s, set.showUnverified, only).filter((t) => t.cell);
  const initial = INITIAL_BY_ID[s.initial];
  const final = FINAL_BY_ID[s.final];
  const playingKey = nowPlaying.value;
  return (
    <article class="study-card" aria-labelledby={`study-${s.id}`}>
      <header class="study-head">
        <h3 id={`study-${s.id}`} class="study-syl" lang="zh-Latn">
          {s.id}
        </h3>
        <span class="study-parts">
          {initial.id ? initial.display : '∅'} + {final.surface}
        </span>
        <span class="study-action">{action}</span>
      </header>
      <ul class="study-tones">
        {rows.map((t) => {
          const cell = t.cell!;
          const key = `native:${cell.numeric}`;
          const playing = playingKey === key;
          const groupId = `st-${cell.numeric}`;
          return (
            <li key={cell.numeric} class={`study-tone s-${t.status}${t.inScope ? '' : ' aside'}${current === t.tone ? ' current' : ''}`}>
              <button
                type="button"
                class="icon-btn listen"
                disabled={!t.hasAudio}
                aria-label={t.hasAudio ? (playing ? `Stop ${cell.display}` : `Listen to ${cell.display}`) : `${cell.display}: no native recording`}
                title={t.hasAudio ? undefined : 'No native recording'}
                onClick={() => (playing ? stopPlayback() : void play([nativeItem(cell.numeric)], { rate: set.rate }))}
              >
                {playing ? <Stop size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              </button>
              <span class="study-what" id={groupId}>
                <span class="py" data-tone={t.tone} lang="zh-Latn">
                  {showTone(cell)}
                </span>
                {set.showCharacters && (
                  <span class="han" lang="zh-Hans">
                    {t.character || '·'}
                  </span>
                )}
                <span class="sr-only">{TONE_NAMES[t.tone]}</span>
              </span>
              <span class="study-gloss">{t.meaning || (t.character ? '' : 'No common character')}</span>
              <span class="seg study-status" role="radiogroup" aria-labelledby={groupId}>
                {STATUSES.map((o) => (
                  <button type="button" role="radio" aria-checked={t.status === o.value} aria-label={`${cell.display}: ${o.label}`} onClick={() => setStatus(cell.numeric, o.value)}>
                    {o.label}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
