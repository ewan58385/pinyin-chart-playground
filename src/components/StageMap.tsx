/**
 * A still picture of where a Learn stage's syllables sit on the chart. It is
 * drawn from the data (src/lib/stageMap.ts) every time, so it follows any
 * change to the chart. Not a control: no links, no hover, not focusable.
 */
import { useMemo } from 'preact/hooks';
import type { Stage } from '../data/learn';
import { stageMap } from '../lib/stageMap';
import { overrides, resolveExample, settings } from '../lib/store';

const HEAD_W = 30; // row headers
const COL_W = 25;
const GAP = 5; // between final groups
const GROUP_H = 14;
const FINAL_H = 17;
const HEAD_H = GROUP_H + FINAL_H;
const ROW_H = 30;
const BAND_H = 15;
const PAD = 2;

/** The character shown in a cell: the most frequent example among the stage's tones (the user's own if edited). */
function cellCharacter(cells: string[]): string {
  let best = '';
  let bestRank = Infinity;
  for (const id of cells) {
    const ex = resolveExample(id, overrides.value);
    if (!ex.character) continue;
    const rank = ex.edited.character ? -1 : (ex.bundled?.frequencyRank ?? 99999);
    if (rank < bestRank) {
      bestRank = rank;
      best = ex.character;
    }
  }
  return best;
}

export function StageMap({ stage, index }: { stage: Stage; index: number }) {
  const show = settings.value.showUnverified;
  const chars = settings.value.showCharacters;
  const ov = overrides.value;
  const map = useMemo(() => stageMap(stage, show), [stage.id, show]);

  const view = useMemo(() => {
    const groupOf = (col: number) => map.groupStarts.filter((g) => g <= col).length - 1;
    const x = (col: number) => HEAD_W + col * COL_W + groupOf(col) * GAP;
    const ys: number[] = [];
    let y = HEAD_H + PAD;
    for (const r of map.rows) {
      ys.push(y);
      y += r.kind === 'row' ? ROW_H : BAND_H;
    }
    const width = x(map.columns.length - 1) + COL_W + PAD;
    const height = y + PAD;
    const activeCols = new Set(map.cells.map((c) => c.col));
    const activeRows = new Set(map.cells.map((c) => c.row));
    const tones = (id: string) =>
      map.cells.find((c) => c.syllable.id === id)!.syllable.tones.filter((t) => (stage.tones === 'neutral') === (t.tone === 5) && (show || t.status !== 'single-source')).map((t) => t.numeric);
    // Horizontal rules where the initial block changes, as on the chart.
    const rules: number[] = [];
    map.rows.forEach((r, i) => {
      if (i === 0) return;
      const prev = map.rows[i - 1];
      const blockOf = (m: typeof r) => (m.kind === 'row' ? m.initial.block : m.block);
      if (blockOf(prev) !== blockOf(r)) rules.push(ys[i]);
    });
    return { x, ys, width, height, activeCols, activeRows, tones, rules };
    // ov: an edited character changes what the cells show.
  }, [map, chars, ov]);

  const { x, ys, width, height, activeCols, activeRows, tones, rules } = view;
  const names = map.cells.map((c) => c.syllable.id);
  const titleId = `stage-map-${stage.id}`;

  return (
    <figure class="stage-map">
      <div class="stage-map-scroll" tabIndex={-1}>
        <svg
          role="img"
          aria-labelledby={titleId}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          style={{ minWidth: `${Math.round(width * 0.9)}px` }}
          focusable="false"
        >
          <title id={titleId}>
            Where the {names.length} syllables of stage {index + 1} sit on the chart: {names.join(', ')}.
          </title>
          <rect class="sm-bg" x="0" y="0" width={width} height={height} />

          {/* final groups and their columns */}
          {map.groupStarts.map((start, g) => {
            const end = (map.groupStarts[g + 1] ?? map.columns.length) - 1;
            const label = map.columns[start].group;
            return (
              <text class="sm-group" x={(x(start) + x(end) + COL_W) / 2} y={GROUP_H - 3} text-anchor="middle">
                {label}
              </text>
            );
          })}
          {map.columns.map((f, col) => (
            <text class={`sm-final${activeCols.has(col) ? ' on' : ''}`} x={x(col) + COL_W / 2} y={HEAD_H - 5} text-anchor="middle" {...fit(f.surface, COL_W - 2)}>
              {f.surface}
            </text>
          ))}
          {map.groupStarts.slice(1).map((start) => (
            <line class="sm-sep" x1={x(start) - GAP / 2} x2={x(start) - GAP / 2} y1={2} y2={height - PAD} />
          ))}
          <line class="sm-sep" x1={HEAD_W - 2} x2={width - PAD} y1={HEAD_H} y2={HEAD_H} />

          {/* rows: initials, or a folded band for a block with nothing in this stage */}
          {map.rows.map((r, i) =>
            r.kind === 'row' ? (
              <text class={`sm-initial${activeRows.has(i) ? ' on' : ''}`} x={HEAD_W - 6} y={ys[i] + ROW_H / 2 + 4} text-anchor="end">
                {r.initial.display}
              </text>
            ) : (
              <g>
                <rect class="sm-band" x={HEAD_W - 2} y={ys[i] + 1} width={width - HEAD_W - PAD + 2} height={BAND_H - 2} />
                <text class="sm-band-label" x={HEAD_W + 3} y={ys[i] + BAND_H / 2 + 3}>
                  {r.initials.map((n) => n.display).join(' ')}
                </text>
              </g>
            ),
          )}
          {rules.map((y) => (
            <line class="sm-sep" x1={2} x2={width - PAD} y1={y} y2={y} />
          ))}

          {/* the rest of the chart, faintly, so its gaps stay visible */}
          {map.others.map((c) => (
            <circle class="sm-dot" cx={x(c.col) + COL_W / 2} cy={ys[c.row] + ROW_H / 2} r={1.6} />
          ))}

          {/* the stage's own syllables */}
          {map.cells.map((c) => {
            const cx = x(c.col);
            const cy = ys[c.row];
            const han = chars ? cellCharacter(tones(c.syllable.id)) : '';
            return (
              <g>
                <rect class="sm-cell" x={cx + 1} y={cy + 1} width={COL_W - 2} height={ROW_H - 2} rx={2} />
                <text class="sm-syl" x={cx + COL_W / 2} y={han ? cy + 11.5 : cy + ROW_H / 2 + 3.5} text-anchor="middle" {...fit(c.syllable.id, COL_W - 4)}>
                  {c.syllable.id}
                </text>
                {han && (
                  <text class="sm-han" x={cx + COL_W / 2} y={cy + 25} text-anchor="middle">
                    {han}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption class="hint small">
        Where this stage’s syllables sit on the chart. Rows with none of them are folded into thin bands.
      </figcaption>
    </figure>
  );
}

/** Squeeze a label into its cell when it would not fit at the normal size (zhuang, chuang, shuang). */
function fit(text: string, room: number): { textLength?: number; lengthAdjust?: string } {
  const estimate = text.length * 5.1; // ~average advance at 9.5px sans
  return estimate > room ? { textLength: room, lengthAdjust: 'spacingAndGlyphs' } : {};
}
