import { useEffect, useRef } from 'preact/hooks';
import { FINAL_GROUPS, FINALS, type Final } from '../data/finals';
import { INITIALS, type Initial } from '../data/initials';
import { syllableAt, type Syllable } from '../data';
import {
  matches,
  overrides,
  recordingsByCell,
  resolveExample,
  settings,
  statuses,
  syllableVisible,
  cellVisible,
  filtersActive,
} from '../lib/store';
import { openId, openSyllable } from '../lib/router';
import { narrow } from '../lib/viewport';
import { TONES, TONE_NAMES } from '../lib/pinyin';
import { blockHash, blockOfFinal, blockOfInitial } from '../data/blocks';
import { ChevronRight } from './icons';

const groupStart = new Set(FINAL_GROUPS.map((g) => g.finals[0].id));
const blockStart = new Set(INITIALS.filter((x, i) => i > 0 && x.block !== INITIALS[i - 1].block).map((x) => x.id));

function FinalHead({ f }: { f: Final }) {
  return (
    <>
      {f.surface}
      {f.canonical !== f.surface && <small>{f.canonical}</small>}
    </>
  );
}

function Cell({ s, compact }: { s: Syllable; compact: boolean }) {
  const show = settings.value.showUnverified;
  const chars = settings.value.showCharacters;
  const st = statuses.value;
  const rec = recordingsByCell.value;
  const matched = matches.value[s.id];
  const filtering = filtersActive.value > 0;
  const tones = TONES.map((tone) => s.tones.find((t) => t.tone === tone && cellVisible(t, show)));
  const examples = tones.map((t) => (t ? resolveExample(t.numeric, overrides.value) : null));

  const label =
    `${s.id}: ` +
    tones
      .map((t, i) => (t ? `${t.display}${examples[i]?.character ? ' ' + examples[i]!.character : ''}` : null))
      .filter(Boolean)
      .join(', ');

  const slotClass = (i: number) => {
    const t = tones[i];
    if (!t) return '';
    const cls = [`s-${st[t.numeric] ?? 'new'}`];
    if (rec[t.numeric]?.length) cls.push('rec');
    if (t.status === 'single-source') cls.push('single');
    if (filtering && matched && !matched.includes(t.numeric)) cls.push('off');
    return cls.join(' ');
  };

  let body;
  if (compact) {
    // The one character shown is the most frequent of the syllable's examples.
    let best = '';
    let bestRank = Infinity;
    examples.forEach((ex) => {
      if (!ex?.character) return;
      const rank = ex.edited.character ? -1 : (ex.bundled?.frequencyRank ?? 99999);
      if (rank < bestRank) {
        bestRank = rank;
        best = ex.character;
      }
    });
    body = (
      <>
        <span class="syl">{s.id}</span>
        {chars && <span class="one">{best}</span>}
        <span class="pips" aria-hidden="true">
          {tones.map((t, i) => (
            <i class={t ? slotClass(i) : 'absent'} data-tone={t?.tone} />
          ))}
        </span>
      </>
    );
  } else if (!chars) {
    // Characters off: the syllable and a pip per tone, like compact but without the character.
    body = (
      <>
        <span class="syl">{s.id}</span>
        <span class="pips" aria-hidden="true">
          {tones.map((t, i) => (
            <i class={t ? slotClass(i) : 'absent'} data-tone={t?.tone} />
          ))}
        </span>
      </>
    );
  } else {
    body = (
      <>
        <span class="syl">{s.id}</span>
        <span class="tones" aria-hidden="true">
          {tones.map((t, i) =>
            t ? (
              <i class={`${slotClass(i)}${examples[i]?.character ? '' : ' none'}`} data-tone={t.tone}>
                {examples[i]?.character || '·'}
              </i>
            ) : (
              <i />
            ),
          )}
        </span>
      </>
    );
  }

  const selected = openId.value === s.id;
  return (
    <button
      type="button"
      class={`cell${s.status === 'single-source' ? ' unverified' : ''}`}
      data-syl={s.id}
      aria-label={label}
      aria-pressed={selected}
      tabIndex={selected || (!openId.value && s.id === 'a') ? 0 : -1}
    >
      {body}
    </button>
  );
}

/** Keep a cell clear of the sticky headers (and of the bottom sheet on phones). */
function ensureVisible(wrap: HTMLElement, el: HTMLElement) {
  const w = wrap.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const headH = 64;
  const headW = 50;
  const bottomLimit = narrow.value ? w.top + Math.max(140, w.height * 0.3) : w.bottom - 22; // clear of the scrollbar
  let dx = 0;
  let dy = 0;
  if (r.left < w.left + headW) dx = r.left - (w.left + headW) - 8;
  else if (r.right > w.right - 8) dx = r.right - (w.right - 8);
  if (r.top < w.top + headH) dy = r.top - (w.top + headH) - 8;
  else if (r.bottom > bottomLimit) dy = r.bottom - bottomLimit;
  if (dx || dy) wrap.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
}

export function Chart() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const s = settings.value;
  const flipped = s.flipAxes;
  const compact = s.density === 'compact' || (s.density === 'auto' && narrow.value) || !s.showCharacters;
  const show = s.showUnverified;
  const selected = openId.value;
  const matched = matches.value;
  const filtering = filtersActive.value > 0;

  const at = (initial: Initial, final: Final) => {
    const syl = syllableAt(initial.id, final.id);
    return syl && syllableVisible(syl, show) ? syl : undefined;
  };

  useEffect(() => {
    if (!selected || !wrapRef.current) return;
    const el = wrapRef.current.querySelector<HTMLElement>(`[data-syl="${CSS.escape(selected)}"]`);
    if (el) ensureVisible(wrapRef.current, el);
  }, [selected, flipped, compact]);

  const onClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-syl]');
    if (btn) openSyllable(btn.dataset.syl!);
  };

  // Arrow keys move between syllables, skipping the gaps.
  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-syl]');
    if (!step || !btn) return;
    const td = btn.parentElement as HTMLTableCellElement;
    let r = Number(td.dataset.r);
    let c = Number(td.dataset.c);
    for (;;) {
      r += step[0];
      c += step[1];
      const next = wrapRef.current?.querySelector<HTMLElement>(`td[data-r="${r}"][data-c="${c}"]`);
      if (!next) return;
      const target = next.querySelector<HTMLElement>('[data-syl]');
      if (target) {
        e.preventDefault();
        target.focus();
        return;
      }
    }
  };

  const cell = (initial: Initial, final: Final, r: number, c: number, startClass: string) => {
    const syl = at(initial, final);
    const cls = [startClass];
    if (!syl) cls.push('gap');
    else {
      if (syl.id === selected) cls.push('sel');
      if (filtering && !matched[syl.id]) cls.push('dim');
    }
    return (
      <td key={`${initial.id}|${final.id}`} class={cls.join(' ')} data-r={r} data-c={c}>
        {syl && <Cell s={syl} compact={compact} />}
      </td>
    );
  };

  const table = flipped ? (
    <table class={`chart${compact ? ' compact' : ''}${s.heatmap ? ' heat' : ''}`}>
      <thead>
        <tr class="r-heads single">
          <th class="corner" scope="col">
            <a class="headlink" href="#/finals" aria-label="Finals: open the overview of all finals">
              Finals ↓
            </a>
            <a class="headlink" href="#/initials" aria-label="Initials: open the overview of all initials">
              Initials →
            </a>
          </th>
          {INITIALS.map((i) => (
            <th scope="col" class={blockStart.has(i.id) ? 'g-start' : ''}>
              <a class="headlink" href={blockHash(blockOfInitial(i))} aria-label={`${i.id ? i.id : 'no initial'}: open its group page`} title="Open this group's page">
                {i.display}
                <ChevronRight size={11} aria-hidden="true" />
              </a>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {FINAL_GROUPS.map((g) => (
          <>
            <tr class="grouprow" key={`g-${g.id}`}>
              <th colSpan={3} scope="rowgroup">
                <a class="headlink" href={blockHash(blockOfFinal(g.finals[0]))} aria-label={`${g.id} group: open its page`}>
                  {g.id} group
                  <ChevronRight size={12} aria-hidden="true" />
                </a>
              </th>
              <td colSpan={INITIALS.length - 2} />
            </tr>
            {g.finals.map((f) => {
              const r = FINALS.indexOf(f);
              return (
                <tr key={f.id}>
                  <th class="rowhead" scope="row">
                    <FinalHead f={f} />
                  </th>
                  {INITIALS.map((i, c) => cell(i, f, r, c, blockStart.has(i.id) ? 'g-start' : ''))}
                </tr>
              );
            })}
          </>
        ))}
      </tbody>
    </table>
  ) : (
    <table class={`chart${compact ? ' compact' : ''}${s.heatmap ? ' heat' : ''}`}>
      <thead>
        <tr class="r-groups">
          <th class="corner" rowSpan={2} scope="col">
            <a class="headlink" href="#/initials" aria-label="Initials: open the overview of all initials">
              Initials ↓
            </a>
            <a class="headlink" href="#/finals" aria-label="Finals: open the overview of all finals">
              Finals →
            </a>
          </th>
          {FINAL_GROUPS.map((g) => (
            <th colSpan={g.finals.length} scope="colgroup" class="g-start">
              <a class="headlink" href={blockHash(blockOfFinal(g.finals[0]))} aria-label={`${g.id} group: open its page`}>
                {g.id} <span>group</span>
                <ChevronRight size={12} aria-hidden="true" />
              </a>
            </th>
          ))}
        </tr>
        <tr class="r-heads">
          {FINALS.map((f) => (
            <th scope="col" class={groupStart.has(f.id) ? 'g-start' : ''}>
              <FinalHead f={f} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {INITIALS.map((i, r) => (
          <tr key={i.id} class={blockStart.has(i.id) ? 'b-start' : ''}>
            <th class="rowhead" scope="row">
              <a class="headlink" href={blockHash(blockOfInitial(i))} aria-label={`${i.id ? i.id : 'no initial'}: open its group page`} title="Open this group's page">
                {i.display}
                <ChevronRight size={11} aria-hidden="true" />
              </a>
            </th>
            {FINALS.map((f, c) => cell(i, f, r, c, groupStart.has(f.id) ? 'g-start' : ''))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div class="chart-wrap" ref={wrapRef} onClick={onClick} onKeyDown={onKeyDown}>
      {table}
      <div class="chart-foot">
        <div class="key">
          {compact ? (
            <span>Each bar under a syllable is one tone, first to neutral.</span>
          ) : (
            <span>Characters are in tone order: {TONES.map((t) => TONE_NAMES[t].replace(' tone', '')).join(', ')}. A dot marks a tone with no common character.</span>
          )}
          {s.heatmap && (
            <>
              <span>
                <i class="swatch s-shaky" /> shaky
              </span>
              <span>
                <i class="swatch s-solid" /> solid
              </span>
            </>
          )}
          <span>
            <i class="swatch rec" /> has a recording
          </span>
          <span>Empty squares are syllables Mandarin does not have.</span>
        </div>
      </div>
    </div>
  );
}
