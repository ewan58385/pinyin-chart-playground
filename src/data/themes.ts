/**
 * Appearance presets, accents and tone palettes. Every colour here is checked
 * for WCAG AA contrast by tests/contrast.test.ts: text colours against every
 * background they can sit on, accents as text and as button backgrounds.
 *
 * The design stays one family: warm or cool off-whites and near-blacks,
 * hairline rules, a single accent. Presets change the paper, not the layout.
 */

export type Mode = 'light' | 'dark';

/** The colour tokens a preset provides, per mode. */
export interface Palette {
  paper: string;
  surface: string;
  sunken: string;
  ink: string;
  ink2: string;
  ink3: string;
  rule: string;
  ruleStrong: string;
  shaky: string;
  shakyWash: string;
  solid: string;
  solidWash: string;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  light: Palette;
  dark: Palette;
}

const p = (
  paper: string,
  surface: string,
  sunken: string,
  ink: string,
  ink2: string,
  ink3: string,
  rule: string,
  ruleStrong: string,
  shaky: string,
  shakyWash: string,
  solid: string,
  solidWash: string,
): Palette => ({ paper, surface, sunken, ink, ink2, ink3, rule, ruleStrong, shaky, shakyWash, solid, solidWash });

export const PRESETS: Preset[] = [
  {
    id: 'paper',
    label: 'Warm paper',
    description: 'Off-white paper and near-black ink; the default.',
    light: p('#f7f4ee', '#fcfaf6', '#efebe3', '#1d1b18', '#57524a', '#645e55', '#dcd6ca', '#b9b1a2', '#7b590e', '#f1e2bd', '#3f6838', '#d8e6d2'),
    dark: p('#171614', '#1e1c19', '#121110', '#ece7dd', '#b7b0a3', '#958e82', '#34302b', '#524c44', '#dcb663', '#40351c', '#9cc194', '#26372a'),
  },
  {
    id: 'ink',
    label: 'Ink',
    description: 'Neutral white and black, no warmth.',
    light: p('#f6f6f4', '#fcfcfb', '#ededea', '#141414', '#4d4d4b', '#636360', '#dadad6', '#b4b4ae', '#7a5d10', '#efe3c3', '#3f6b3b', '#d6e5d3'),
    dark: p('#111111', '#191919', '#0b0b0b', '#f0f0ec', '#b9b9b3', '#979791', '#303030', '#4e4e4a', '#dcb663', '#3c3218', '#9cc194', '#243527'),
  },
  {
    id: 'sepia',
    label: 'Sepia',
    description: 'Old-book cream and brown.',
    light: p('#f3e9d8', '#f9f2e4', '#eadfca', '#3b2f22', '#64533f', '#725f49', '#dccbb0', '#b89f7e', '#7d5a0c', '#eedcb5', '#4b6c3a', '#d9e3c9'),
    dark: p('#1f1a14', '#272019', '#17130e', '#eadfca', '#bfae94', '#9d8c72', '#3b3128', '#5a4b3b', '#dcb663', '#40351c', '#a3c295', '#283628'),
  },
  {
    id: 'slate',
    label: 'Cool slate',
    description: 'Blue-grey paper and slate ink.',
    light: p('#eef1f4', '#f7f9fb', '#e3e8ed', '#1b2430', '#4c5866', '#546171', '#d0d8e0', '#a8b3bf', '#7a5a10', '#ece2c4', '#3e6b3f', '#d4e4d4'),
    dark: p('#161b22', '#1d242d', '#10141a', '#e3e8ee', '#aeb8c4', '#8f9aa8', '#2d3640', '#46525f', '#dcb663', '#3a3420', '#9cc194', '#243528'),
  },
  {
    id: 'contrast',
    label: 'High contrast',
    description: 'Pure white or black with the strongest ink.',
    light: p('#ffffff', '#ffffff', '#f0f0f0', '#000000', '#1a1a1a', '#2e2e2e', '#9a9a9a', '#555555', '#5c4100', '#f3e7c6', '#245a28', '#d4ead6'),
    dark: p('#000000', '#0a0a0a', '#000000', '#ffffff', '#e6e6e6', '#d0d0d0', '#5a5a5a', '#8c8c8c', '#f0cf7a', '#3a3010', '#b5dcad', '#1e3a22'),
  },
  {
    id: 'linen',
    label: 'Linen',
    description: 'Greyer, softer warm paper.',
    light: p('#ebe8e1', '#f3f1ec', '#e2ded5', '#26231f', '#5a564f', '#5e5951', '#d2cdc2', '#aba69a', '#7c5a0f', '#ead9b4', '#436a3d', '#d2e0cb'),
    dark: p('#1b1a17', '#23221e', '#141311', '#e8e4dc', '#b5b0a6', '#948f85', '#36342f', '#54514a', '#dcb663', '#3d341c', '#9cc194', '#263628'),
  },
  {
    id: 'forest',
    label: 'Forest',
    description: 'Green-tinted paper and deep green ink.',
    light: p('#edf0ea', '#f6f8f3', '#e2e7dd', '#1c241c', '#4a5649', '#5b6859', '#cfd7cc', '#a6b2a3', '#7a5a10', '#ebe1c2', '#386638', '#d0e3cf'),
    dark: p('#141a15', '#1b221c', '#0e1310', '#e2e9df', '#adb9ab', '#8e9b8d', '#2b352c', '#44524a', '#dcb663', '#3a341c', '#9cc194', '#223527'),
  },
];
export const PRESET_BY_ID: Record<string, Preset> = Object.fromEntries(PRESETS.map((x) => [x.id, x]));

export interface AccentPair {
  accent: string;
  strong: string;
}
export interface Accent {
  id: string;
  label: string;
  light: AccentPair;
  dark: AccentPair;
}
/** Curated accents; the wash and on-accent colours are derived from these and the paper. */
export const ACCENTS: Accent[] = [
  { id: 'vermilion', label: 'Vermilion', light: { accent: '#b0372a', strong: '#8d2a20' }, dark: { accent: '#e27365', strong: '#f09284' } },
  { id: 'ochre', label: 'Ochre', light: { accent: '#8a5a07', strong: '#6c4604' }, dark: { accent: '#dfae4a', strong: '#ecc46e' } },
  { id: 'forest', label: 'Forest', light: { accent: '#2f6b35', strong: '#235228' }, dark: { accent: '#8cc48a', strong: '#a8d6a5' } },
  { id: 'teal', label: 'Teal', light: { accent: '#1c6b6b', strong: '#145252' }, dark: { accent: '#73c3c0', strong: '#95d6d3' } },
  { id: 'indigo', label: 'Indigo', light: { accent: '#3b4fa8', strong: '#2d3c84' }, dark: { accent: '#9aa9ee', strong: '#b6c1f4' } },
  { id: 'plum', label: 'Plum', light: { accent: '#8a3a6e', strong: '#6c2c55' }, dark: { accent: '#dd9ac6', strong: '#e9b6d7' } },
  { id: 'slate', label: 'Slate blue', light: { accent: '#4a6180', strong: '#384b64' }, dark: { accent: '#9db4cf', strong: '#b8cadf' } },
];
export const ACCENT_BY_ID: Record<string, Accent> = Object.fromEntries(ACCENTS.map((x) => [x.id, x]));

export type ToneColourSet = 'off' | 'standard' | 'safe';
/** Five tone colours per mode: 1, 2, 3, 4 and neutral. */
export const TONE_PALETTES: Record<Exclude<ToneColourSet, 'off'>, { light: string[]; dark: string[] }> = {
  standard: {
    light: ['#2b5fb3', '#276c2e', '#7b3fa0', '#b03030', '#5f5f5f'],
    dark: ['#8fb3ef', '#8fcf8f', '#cfa6ea', '#ef9a8f', '#b0b0b0'],
  },
  // Colour-blind-safe, derived from Okabe & Ito (blue, bluish green, reddish purple, vermilion) and a grey.
  safe: {
    light: ['#0b5fa5', '#00735a', '#9c3c7f', '#a94600', '#5f5f5f'],
    dark: ['#7fbce8', '#4fd1a8', '#e39ac8', '#f2a05f', '#b5b5b5'],
  },
};

export const TYPEFACES: { id: string; label: string; serif: string; sans: string; description: string }[] = [
  { id: 'source', label: 'Source Serif & Sans', serif: "'Chart Serif'", sans: "'Chart Sans'", description: 'Source Serif 4 for pinyin and headings, Source Sans 3 for the interface (Adobe).' },
  { id: 'literata', label: 'Literata & Inter', serif: "'Chart Serif B'", sans: "'Chart Sans B'", description: 'Literata, a book face, with Inter for the interface.' },
  { id: 'noto', label: 'Noto Serif & Sans', serif: "'Chart Serif C'", sans: "'Chart Sans C'", description: 'Noto Serif and Noto Sans: plain and wide.' },
];
export const CJK_FACES: { id: string; label: string; family: string }[] = [
  { id: 'serif', label: 'Song (serif)', family: "'Chart Han'" },
  { id: 'sans', label: 'Hei (sans)', family: "'Chart Han Sans'" },
];

export const TEXT_SIZES = [0.92, 1, 1.08, 1.18];
