import { useEffect, useRef, useState } from 'preact/hooks';
import { hasNativeAudio, type Syllable, type ToneCell } from '../data';
import { FINAL_BY_ID } from '../data/finals';
import { INITIAL_BY_ID } from '../data/initials';
import { TAG_BY_ID, DIFFICULTY_LABEL } from '../data/tags';
import { confusablesFor } from '../data/confusables';
import {
  getSyllable,
  overrides,
  resolveExample,
  settings,
  showTone,
  statuses,
  visibleTones,
} from '../lib/store';
import { route, closeSyllable, openSyllable, selectTone } from '../lib/router';
import { nativeItem, play, stopPlayback, nowPlaying } from '../lib/audio';
import { narrow } from '../lib/viewport';
import { Close, Play, Stop } from './icons';
import { ToneView } from './ToneView';

const SOURCE_NAME: Record<string, string> = {
  cedict: 'CC-CEDICT',
  xhc: 'Xiàndài Hànyǔ Cídiǎn (via Unihan)',
  tghz: 'Tōngyòng Guīfàn Hànzì Zìdiǎn (via Unihan)',
  pinlu: 'Xiàndài Hànyǔ Pínlǜ Cídiǎn (via Unihan)',
};

function ToneTabs({ syl, tones, current }: { syl: Syllable; tones: ToneCell[]; current: ToneCell }) {
  const ov = overrides.value;
  const st = statuses.value;
  return (
    <div class="tone-tabs" role="tablist" aria-label={`Tones of ${syl.id}`}>
      {tones.map((t) => {
        const ex = resolveExample(t.numeric, ov);
        const status = st[t.numeric];
        return (
          <button
            type="button"
            role="tab"
            aria-selected={t.numeric === current.numeric}
            aria-label={`${t.display}${ex.character ? ' ' + ex.character : ''}${status && status !== 'new' ? ', ' + status : ''}`}
            onClick={() => {
              selectTone(t.tone);
              // Picking a tone plays it, so the tones can be heard one after another.
              if (hasNativeAudio(t.numeric)) void play([nativeItem(t.numeric)], { rate: settings.value.rate });
              else stopPlayback();
            }}
          >
            <span class="py" data-tone={t.tone}>
              {showTone(t)}
            </span>
            <span class="han" lang="zh-Hans">
              {settings.value.showCharacters ? ex.character : ''}
            </span>
            {settings.value.heatmap && status && status !== 'new' && <i class={`st s-${status}`} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

export function Confusables({ syl, tone }: { syl: Syllable; tone: ToneCell }) {
  const list = confusablesFor(syl);
  if (!list.length) return null;
  return (
    <section class="d-section">
      <h3>Easily confused with</h3>
      <ul class="rows">
        {list.map(({ syllable: other, reason }) => {
          // Compare like with like: the same tone if the other syllable has it.
          const theirs = other.tones.find((t) => t.tone === tone.tone && hasNativeAudio(t.numeric)) ?? other.tones.find((t) => hasNativeAudio(t.numeric));
          const mine = hasNativeAudio(tone.numeric) ? tone : syl.tones.find((t) => hasNativeAudio(t.numeric));
          const pairKeys = [mine && `native:${mine.numeric}`, theirs && `native:${theirs.numeric}`];
          const playingPair = !!nowPlaying.value && pairKeys.includes(nowPlaying.value) && pairKeys[1] === `native:${theirs?.numeric}`;
          const ex = theirs ? resolveExample(theirs.numeric) : undefined;
          return (
            <li key={other.id}>
              <button type="button" class="jump" onClick={() => openSyllable(other.id, theirs?.tone ?? null)} aria-label={`Open ${other.id}`}>
                <span class="py" data-tone={theirs?.tone}>
                  {theirs ? showTone(theirs) : other.id}
                </span>
                <span class="han" lang="zh-Hans">
                  {ex?.character}
                </span>
              </button>
              <span class="why">{reason}</span>
              <button
                type="button"
                class="btn"
                disabled={!mine || !theirs}
                aria-label={mine && theirs ? `Hear ${mine.display} then ${theirs.display}` : 'No audio for this pair'}
                onClick={() => mine && theirs && void play([nativeItem(mine.numeric), nativeItem(theirs.numeric)], { rate: settings.value.rate, gapMs: 450 })}
              >
                {playingPair && nowPlaying.value === `native:${theirs?.numeric}` ? <Stop size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                Pair
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Detail() {
  const syl = getSyllable(route.value.syllable ?? undefined);
  const [full, setFull] = useState(false);
  const [dragY, setDragY] = useState<number | null>(null);
  const drag = useRef<{ startY: number; moved: boolean } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) return el.blur();
      closeSyllable();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!syl) return null;
  const tones = visibleTones(syl);
  if (!tones.length) return null;
  const current = tones.find((t) => t.tone === route.value.tone) ?? tones[0];
  const initial = INITIAL_BY_ID[syl.initial];
  const final = FINAL_BY_ID[syl.final];

  // The sheet handle: tap to toggle height, drag down to shrink or close, up to expand.
  const grip = {
    onPointerDown: (e: PointerEvent) => {
      drag.current = { startY: e.clientY, moved: false };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: PointerEvent) => {
      if (!drag.current) return;
      const dy = e.clientY - drag.current.startY;
      if (Math.abs(dy) > 6) drag.current.moved = true;
      setDragY(dy);
    },
    onPointerUp: (e: PointerEvent) => {
      if (!drag.current) return;
      const dy = e.clientY - drag.current.startY;
      const moved = drag.current.moved;
      drag.current = null;
      setDragY(null);
      if (!moved) setFull((f) => !f);
      else if (dy < -40) setFull(true);
      else if (dy > 60) full ? setFull(false) : closeSyllable();
    },
    onPointerCancel: () => {
      drag.current = null;
      setDragY(null);
    },
  };

  return (
    <aside
      class={`detail${full ? ' full' : ''}${dragY !== null ? ' dragging' : ''}`}
      aria-label={`Details for ${syl.id}`}
      style={narrow.value && dragY !== null ? { transform: `translateY(${Math.max(0, dragY)}px)` } : undefined}
    >
      <button type="button" class="d-grip" aria-label={full ? 'Shrink the panel' : 'Expand the panel'} {...grip} />
      <header class="d-head">
        <div class="d-title">
          <h2 lang="zh-Latn">{syl.id}</h2>
          <p class="d-parts">
            <b>{initial.display}</b> + <b>{final.surface}</b>
            {final.canonical !== final.surface && syl.initial !== '' && <> (= {final.canonical})</>}
            {' · '}
            {final.group} group, {final.type} final
            {initial.difficulty && <> · {initial.difficulty} initial</>}
          </p>
        </div>
        <button type="button" class="icon-btn" aria-label="Close" onClick={closeSyllable}>
          <Close size={20} aria-hidden="true" />
        </button>
      </header>

      <div class="d-body">
        <ToneTabs syl={syl} tones={tones} current={current} />
        <ToneView key={current.numeric} syl={syl} cell={current} />

        <Confusables syl={syl} tone={current} />

        <section class="d-section">
          <h3>About this syllable</h3>
          <dl class="taglist">
            {initial.difficulty && (
              <>
                <dt>
                  <span class="tag">{initial.difficulty}</span>
                </dt>
                <dd>
                  Initial {initial.display} is in the “{DIFFICULTY_LABEL[initial.difficulty]}” group.
                  {!initial.difficultyVerified && initial.note ? ` ${initial.note}` : ''}
                </dd>
              </>
            )}
            {syl.tags
              .filter((t) => TAG_BY_ID[t])
              .map((t) => (
                <>
                  <dt>
                    <span class="tag">{TAG_BY_ID[t].label}</span>
                  </dt>
                  <dd>{TAG_BY_ID[t].explain}</dd>
                </>
              ))}
          </dl>
          <div class="fineprint" style="margin-top:12px">
            {syl.pseudoInitial && (
              <p>
                Spelled with {syl.pseudoInitial}-, but filed on the ∅ row under final {final.surface}.
              </p>
            )}
            {!final.typeVerified && final.note && <p>{final.note}</p>}
            <p>
              Attested in {syl.sources.map((x) => SOURCE_NAME[x] ?? x).join('; ')}.
              {syl.status === 'single-source' && ' Only one source has this syllable, so it is marked unverified.'}
            </p>
          </div>
        </section>
      </div>
    </aside>
  );
}
