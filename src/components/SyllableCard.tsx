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

/**
 * The key for syllable cards, shared by every page that lists them. The
 * sample boxes use the cards' own classes, so the key always matches.
 */
export function CardLegend() {
  const sample = (cls: string, text: string) => (
    <span class={`tone-btn key-box ${cls}`} aria-hidden="true">
      <span class="han">{text}</span>
    </span>
  );
  return (
    <div class="card-legend">
      <p>Each syllable has up to five tones. The boxes run from first tone to neutral, left to right.</p>
      <ul class="legend-key" aria-label="Key">
        <li>
          {sample('s-new', 'ā')}
          New
        </li>
        <li>
          {sample('s-shaky', 'ā')}
          Shaky
        </li>
        <li>
          {sample('s-solid', 'ā')}
          Solid
        </li>
        <li>
          {sample('s-new rec', 'ā')}
          Line underneath: you have a recording
        </li>
        <li>
          {sample('s-new none', '·')}
          Dot: no common example character
        </li>
        <li>
          <span class="tone-btn key-box absent" aria-hidden="true" />
          Dashed box: this tone does not occur
        </li>
      </ul>
    </div>
  );
}
