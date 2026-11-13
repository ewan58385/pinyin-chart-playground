/**
 * Turning the appearance settings into CSS on <html>: colour tokens as
 * custom properties, everything else as data attributes. The same values are
 * cached in localStorage purely so the inline script in index.html can apply
 * them before the first paint; IndexedDB stays the source of truth and the
 * cache is rewritten from it on every load.
 */
import { ACCENT, CJK_FACES, PRESET_BY_ID, PRESETS, TEXT_SIZES, TONE_PALETTES, TYPEFACES, type Mode, type Palette } from '../data/themes';
import { contrast, mix } from './contrast';

export const APPEARANCE_CACHE_KEY = 'pinyin-chart-appearance';

export interface DerivedAccent {
  accent: string;
  strong: string;
  wash: string;
  onAccent: string;
}

/**
 * The four accent tokens for a palette: the fixed vermilion and its strong
 * shade, a wash mixed from it and the paper, and whichever of near-white and
 * near-black reads better on it.
 */
export function deriveAccent(mode: Mode, pal: Palette): DerivedAccent {
  const { accent, strong } = ACCENT[mode];
  const darkPaper = contrast('#000000', pal.paper) < contrast('#ffffff', pal.paper);
  const wash = mix(pal.paper, accent, darkPaper ? 0.22 : 0.14);
  const onAccent = contrast('#ffffff', accent) >= contrast('#000000', accent) ? mix('#ffffff', pal.paper, 0.1) : mix('#000000', pal.paper, 0.1);
  return { accent, strong, wash, onAccent };
}

export interface AppearanceSettings {
  theme: 'system' | 'light' | 'dark';
  preset: string;
  typeface: string;
  cjk: string;
  textSize: number;
  spacing: string;
  toneColours: string;
  cellBorders: string;
  reduceMotion: boolean;
}

export interface Applied {
  attrs: Record<string, string>;
  vars: Record<string, string>;
}

const systemDark = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

/** Resolve settings to the attributes and custom properties for <html>. */
export function resolveAppearance(s: AppearanceSettings, dark = s.theme === 'dark' || (s.theme === 'system' && systemDark())): Applied {
  const mode: Mode = dark ? 'dark' : 'light';
  const preset = PRESET_BY_ID[s.preset] ?? PRESETS[0];
  const pal = preset[mode];
  const acc = deriveAccent(mode, pal);
  const face = TYPEFACES.find((t) => t.id === s.typeface) ?? TYPEFACES[0];
  const han = CJK_FACES.find((c) => c.id === s.cjk) ?? CJK_FACES[0];
  const vars: Record<string, string> = {
    '--paper': pal.paper,
    '--surface': pal.surface,
    '--sunken': pal.sunken,
    '--ink': pal.ink,
    '--ink-2': pal.ink2,
    '--ink-3': pal.ink3,
    '--rule': pal.rule,
    '--rule-strong': pal.ruleStrong,
    '--shaky': pal.shaky,
    '--shaky-wash': pal.shakyWash,
    '--solid': pal.solid,
    '--solid-wash': pal.solidWash,
    '--accent': acc.accent,
    '--accent-strong': acc.strong,
    '--accent-wash': acc.wash,
    '--on-accent': acc.onAccent,
    '--font-serif': `${face.serif}, ${han.family}, Georgia, serif`,
    '--font-sans': `${face.sans}, ${han.family}, -apple-system, 'Segoe UI', Arial, sans-serif`,
    '--font-han': `${han.family}, 'Noto ${han.id === 'sans' ? 'Sans' : 'Serif'} CJK SC', ${han.id === 'sans' ? 'sans-serif' : 'serif'}`,
    '--text-scale': String(TEXT_SIZES[s.textSize] ?? 1),
  };
  if (s.toneColours === 'standard' || s.toneColours === 'safe') {
    TONE_PALETTES[s.toneColours][mode].forEach((c, i) => (vars[`--tone-${i + 1}`] = c));
  }
  const attrs: Record<string, string> = {
    'data-theme': dark ? 'dark' : 'light',
    'data-preset': preset.id,
    'data-spacing': s.spacing,
    'data-tones': s.toneColours,
    'data-borders': s.cellBorders,
    'data-size': String(s.textSize),
    'data-reduce-motion': s.reduceMotion ? 'true' : 'false',
  };
  return { attrs, vars };
}

/** Write the resolved appearance to <html> and cache it for the next load. */
export function applyAppearance(s: AppearanceSettings): Applied {
  const applied = resolveAppearance(s);
  const html = document.documentElement;
  for (const [k, v] of Object.entries(applied.attrs)) html.setAttribute(k, v);
  for (const [k, v] of Object.entries(applied.vars)) html.style.setProperty(k, v);
  html.style.colorScheme = applied.attrs['data-theme'];
  try {
    localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify({ ...applied, system: s.theme === 'system', light: s.theme === 'system' ? resolveAppearance(s, false) : null, dark: s.theme === 'system' ? resolveAppearance(s, true) : null }));
  } catch {
    /* no localStorage: the first paint will use the stylesheet defaults */
  }
  return applied;
}
