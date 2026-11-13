import { describe, expect, it } from 'vitest';
import { ACCENTS, PRESETS, TONE_PALETTES, type Mode } from '../src/data/themes';
import { AA_LARGE, AA_TEXT, contrast, ensureContrast, mix, parseHex } from '../src/lib/contrast';
import { deriveAccent } from '../src/lib/theme';

const modes: Mode[] = ['light', 'dark'];

describe('contrast arithmetic', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 2);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(parseHex('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(parseHex('nope')).toBeNull();
  });
  it('moves a colour until it passes, keeping its hue', () => {
    const fixed = ensureContrast('#ff9999', '#ffffff')!;
    expect(contrast(fixed, '#ffffff')).toBeGreaterThanOrEqual(AA_TEXT);
    expect(ensureContrast('#1d1b18', '#f7f4ee')).toBe('#1d1b18');
  });
});

describe('every preset meets WCAG AA in both modes', () => {
  for (const preset of PRESETS) {
    for (const mode of modes) {
      const pal = preset[mode];
      const backgrounds = [pal.paper, pal.surface, pal.sunken];
      it(`${preset.label}, ${mode}: ink colours against every background`, () => {
        for (const bg of backgrounds) {
          for (const [name, fg] of [
            ['ink', pal.ink],
            ['ink2', pal.ink2],
            ['ink3', pal.ink3],
          ] as const) {
            expect(contrast(fg, bg), `${name} on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
          }
        }
        // Status colours are text on their washes and on the paper; rules only need to be visible.
        expect(contrast(pal.shaky, pal.shakyWash)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrast(pal.solid, pal.solidWash)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrast(pal.shaky, pal.paper)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrast(pal.solid, pal.paper)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrast(pal.ruleStrong, pal.paper)).toBeGreaterThanOrEqual(1.6);
      });
      it(`${preset.label}, ${mode}: every curated accent works as text and as a button`, () => {
        for (const a of ACCENTS) {
          const d = deriveAccent(a[mode].accent, a[mode].strong, pal);
          for (const bg of backgrounds) expect(contrast(d.accent, bg), `${a.id} accent on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT);
          expect(contrast(d.strong, pal.paper), `${a.id} strong`).toBeGreaterThanOrEqual(AA_TEXT);
          expect(contrast(d.onAccent, d.accent), `${a.id} on-accent`).toBeGreaterThanOrEqual(AA_TEXT);
          expect(contrast(pal.ink, d.wash), `${a.id} ink on wash`).toBeGreaterThanOrEqual(AA_TEXT);
        }
      });
      it(`${preset.label}, ${mode}: tone colours are readable`, () => {
        for (const set of ['standard', 'safe'] as const) {
          for (const c of TONE_PALETTES[set][mode]) {
            expect(contrast(c, pal.paper), `${set} ${c} on paper`).toBeGreaterThanOrEqual(AA_TEXT);
            expect(contrast(c, pal.surface), `${set} ${c} on surface`).toBeGreaterThanOrEqual(AA_TEXT);
          }
        }
      });
    }
  }
  it('a custom accent is adjusted until it passes against the paper', () => {
    for (const preset of PRESETS)
      for (const mode of modes) {
        const d = deriveAccent('#ffcc00', null, preset[mode]);
        expect(contrast(d.accent, preset[mode].paper)).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrast(d.onAccent, d.accent)).toBeGreaterThanOrEqual(AA_LARGE);
      }
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});
