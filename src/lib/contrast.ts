/**
 * WCAG 2 contrast arithmetic, used by the theme test and by the custom
 * accent colour check in Settings.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export const toHex = ({ r, g, b }: Rgb) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance, 0 (black) to 1 (white). */
export function luminance(c: Rgb): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** Contrast ratio between two colours, 1 to 21. */
export function contrast(a: Rgb | string, b: Rgb | string): number {
  const ca = typeof a === 'string' ? parseHex(a) : a;
  const cb = typeof b === 'string' ? parseHex(b) : b;
  if (!ca || !cb) return 1;
  const la = luminance(ca);
  const lb = luminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

// ───────────────────────── HSL helpers, for adjusting a custom accent ─────────────────────────

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function toHsl({ r, g, b }: Rgb): Hsl {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  h /= 6;
  return { h, s, l };
}

export function fromHsl({ h, s, l }: Hsl): Rgb {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255 };
}

/**
 * The nearest shade of `hex` (same hue and saturation, lightness moved) that
 * reaches `ratio` against `background`. Returns the colour unchanged when it
 * already passes, and null when no lightness does.
 */
export function ensureContrast(hex: string, background: string, ratio = AA_TEXT): string | null {
  const c = parseHex(hex);
  const bg = parseHex(background);
  if (!c || !bg) return null;
  if (contrast(c, bg) >= ratio) return toHex(c);
  const hsl = toHsl(c);
  const darkBg = luminance(bg) < 0.5;
  // Move away from the background's lightness in steps.
  for (let step = 1; step <= 40; step++) {
    const l = darkBg ? hsl.l + step * 0.02 : hsl.l - step * 0.02;
    if (l < 0 || l > 1) break;
    const candidate = fromHsl({ ...hsl, l });
    if (contrast(candidate, bg) >= ratio) return toHex(candidate);
  }
  return null;
}

/** Mix two colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a)!;
  const cb = parseHex(b)!;
  return toHex({ r: ca.r + (cb.r - ca.r) * t, g: ca.g + (cb.g - ca.g) * t, b: ca.b + (cb.b - ca.b) * t });
}
