import type { Syllable } from '../data';
import { settings } from '../lib/store';
import { cardTones } from './cardData';
import { openSyllable, route } from '../lib/router';
import { TONE_NAMES, toneLetter } from '../lib/pinyin';

/**
 * One syllable as a card: its name, and a box per tone. Used wherever
 * syllables are listed outside the chart table (group, initial, category and
 * stage pages). The name opens the syllable; each tone box opens that tone.
 *
 * A tone box shows only the letter that carries the tone mark (ā á ǎ à a, or
 * the tone number) above the example character, so five boxes always fit the
 * card however long the syllable is. The full pinyin is in the box's
 * accessible name and in the panel it opens.
 */
export function SyllableCard({ s, only }: { s: Syllable; only?: number[] }) {
  const set = settings.value;
  const r = route.value;
  const selected = r.syllable === s.id;
  return (
    <div class={`scard${selected ? ' sel' : ''}`}>
      <button type="button" class="scard-name" aria-label={`${s.id}: open`} aria-pressed={selected} onClick={() => openSyllable(s.id)}>
        <span class="syl" lang="zh-Latn">
          {s.id}
        </span>
      </button>
      <div class="tone-row" role="group" aria-label={`Tones of ${s.id}`}>
        {cardTones(s, set.showUnverified, only).map((t) => {
          if (!t.cell) return <span class="tone-btn absent" aria-hidden="true" />;
          const cls = ['tone-btn', `s-${t.status}`];
          if (t.recorded) cls.push('rec');
          if (!t.character) cls.push('none');
          if (!t.inScope) cls.push('aside');
          const current = selected && r.tone === t.tone;
          return (
            <button
              type="button"
              class={cls.join(' ')}
              aria-label={`${t.cell.display}, ${TONE_NAMES[t.tone]}${t.character ? `, ${t.character}` : ''}${t.status !== 'new' ? `, ${t.status}` : ''}${t.recorded ? ', has a recording' : ''}`}
              aria-current={current ? 'true' : undefined}
              onClick={() => openSyllable(s.id, t.tone)}
            >
              <span class="mark" data-tone={t.tone} lang="zh-Latn">
                {set.toneNumbers ? t.tone : toneLetter(s.id, t.tone)}
              </span>
              {set.showCharacters && (
                <span class="han" lang="zh-Hans">
                  {t.character || '·'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The one-line key that goes with a list of cards. */
export function CardLegend() {
  return (
    <p class="hint small card-legend">
      Each box is one tone, first to neutral: the tone mark above, the example character below. Tap a box to open that tone, or the syllable's name to open
      the syllable. A missing box means that tone does not occur; a dot means no common character.
    </p>
  );
}
