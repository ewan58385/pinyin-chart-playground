import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CREDITS, CREDIT_GROUPS, SOFTWARE_PACKAGES, attributionText } from '../src/data/credits';
import { CELLS, DATA_META } from '../src/data';
import licenceTexts from '../src/data/generated/licence-texts.json';
import packages from '../src/data/generated/notices-packages.json';
import fontInfo from '../src/assets/fonts/font-info.json';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const texts = licenceTexts as Record<string, string>;

describe('credits and licences', () => {
  it('gives every credit a group, holder, licence and URL', () => {
    const groups = new Set(CREDIT_GROUPS.map((g) => g.id));
    for (const c of CREDITS) {
      expect(groups.has(c.group), c.id).toBe(true);
      expect(c.licence, c.id).toBeTruthy();
      expect(c.holder, c.id).toBeTruthy();
      expect(c.url, c.id).toMatch(/^https:\/\//);
      expect(c.licence, c.id).not.toMatch(/unknown/i);
    }
    expect(new Set(CREDITS.map((c) => c.id)).size).toBe(CREDITS.length);
  });

  it('ships the full licence text wherever one is named', () => {
    for (const c of CREDITS) if (c.licenceText) expect(texts[c.licenceText]?.length ?? 0, c.id).toBeGreaterThan(200);
    // MIT, ISC, OFL and Unicode notices must travel with copies.
    for (const c of CREDITS.filter((x) => /MIT|ISC|Open Font|Unicode/.test(x.licence))) expect(c.licenceText, c.id).toBeTruthy();
  });

  it('credits every bundled library and every font file', () => {
    for (const { name } of SOFTWARE_PACKAGES) expect((packages as Record<string, unknown>)[name], name).toBeDefined();
    const shipped = readdirSync(join(ROOT, 'src/assets/fonts')).filter((f) => f.endsWith('.woff2'));
    const credited = fontInfo.flatMap((f) => f.files);
    expect(credited.sort()).toEqual(shipped.sort());
    for (const f of fontInfo) expect(existsSync(join(ROOT, f.licenceFile)), f.licenceFile).toBe(true);
  });

  it('marks the CC BY-SA material as ShareAlike and says what was changed', () => {
    for (const id of ['audio', 'cedict']) {
      const c = CREDITS.find((x) => x.id === id)!;
      expect(c.shareAlike, id).toBe(true);
      expect(c.notes?.some((n) => /Changes made for this app/.test(n)), id).toBe(true);
    }
    expect(attributionText(['audio']).join('\n')).toMatch(/Chen Wang/);
  });
});

describe('no data from non-commercial sources', () => {
  const forbidden = /subtlex|brysbaert|ugent/i;
  it('lists no such source and has no frequencyRank field', () => {
    expect(JSON.stringify(DATA_META)).not.toMatch(forbidden);
    for (const [id, c] of Object.entries(CELLS)) {
      expect('frequencyRank' in c, id).toBe(false);
      expect(typeof c.commonRank, id).toBe('number');
    }
  });
  it('keeps the shipped data and notices free of it', () => {
    for (const f of ['src/data/generated/cells.json', 'src/data/generated/char-index.json', 'src/data/generated/data-meta.json', 'THIRD_PARTY_NOTICES.md', 'reports/data-report.md'])
      expect(readFileSync(join(ROOT, f), 'utf8'), f).not.toMatch(/subtlex|brysbaert|ugent|frequencyRank/i);
  });
});

describe('open-data/', () => {
  it('carries the same data the app ships, with a licence and README', () => {
    for (const f of ['cells.json', 'syllables.json', 'char-index.json', 'data-meta.json'])
      expect(readFileSync(join(ROOT, 'open-data/data', f), 'utf8'), f).toBe(readFileSync(join(ROOT, 'src/data/generated', f), 'utf8'));
    expect(readFileSync(join(ROOT, 'open-data/audio-manifest.json'), 'utf8')).toBe(readFileSync(join(ROOT, 'audio-manifest.json'), 'utf8'));
    const licence = readFileSync(join(ROOT, 'open-data/LICENSE'), 'utf8');
    expect(licence).toMatch(/creativecommons\.org\/licenses\/by-sa\/4\.0/);
    expect(licence).toMatch(/creativecommons\.org\/licenses\/by-sa\/3\.0/);
    expect(licence).toMatch(/UNICODE LICENSE V3/);
    expect(existsSync(join(ROOT, 'open-data/README.md'))).toBe(true);
  });
});
