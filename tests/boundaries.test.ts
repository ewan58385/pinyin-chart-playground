import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(import.meta.dirname, '..', 'src');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });

describe('platform boundary', () => {
  it('imports Capacitor only in src/platform/ (and nowhere else in the app)', () => {
    const offenders = files(SRC)
      .filter((f) => !relative(SRC, f).startsWith('platform'))
      .filter((f) => /from\s+['"]@capacitor\/|import\(\s*['"]@capacitor\/|\bCapacitor\./.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });
  it('never puts a server URL in the Capacitor config', () => {
    const cfg = readFileSync(join(SRC, '..', 'capacitor.config.ts'), 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    expect(cfg).not.toMatch(/\burl\s*:/);
    expect(cfg).not.toMatch(/cleartext\s*:\s*true/);
  });
});
