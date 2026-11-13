/**
 * Downloads the raw data sources into .cache/sources/ (not committed).
 * Safe to rerun: files already present are kept unless --force is given.
 *
 * Run: npm run data:sources
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { unzipSync } from 'fflate';
import { CACHE, SOURCES } from './lib/sources';

const force = process.argv.includes('--force');

async function download(url: string): Promise<Uint8Array> {
  console.log('Downloading', url);
  const res = await fetch(url, { headers: { 'User-Agent': 'data-fetch' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function save(dir: string, name: string, data: Uint8Array) {
  mkdirSync(join(CACHE, dir), { recursive: true });
  writeFileSync(join(CACHE, dir, name), data);
}

/** Download a zip and keep only the named members. */
async function fetchZip(dir: string, url: string, members: string[]) {
  if (!force && members.every((m) => existsSync(join(CACHE, dir, m)))) return;
  const files = unzipSync(await download(url));
  for (const m of members) {
    if (!files[m]) throw new Error(`${m} not found in ${url}`);
    save(dir, m, files[m]);
  }
}

async function main() {
  if (force || !existsSync(join(CACHE, 'cedict', 'cedict.txt'))) {
    save('cedict', 'cedict.txt', gunzipSync(await download(SOURCES.cedict.url)));
  }
  await fetchZip('unihan', SOURCES.unihan.url, ['Unihan_Readings.txt']);
  await fetchZip('subtlex-chr', SOURCES.subtlexChr.url, ['SUBTLEX-CH-CHR']);
  await fetchZip('subtlex-wf', SOURCES.subtlexWf.url, ['SUBTLEX-CH-WF']);
  if (force || !existsSync(join(CACHE, 'hsk', 'complete.json'))) {
    save('hsk', 'complete.json', await download(SOURCES.hsk.url));
  }
  console.log('Sources ready in', CACHE);
}

main().catch((err) => {
  console.error(`\n${err.message}\nNo network? The generated data in src/data/generated/ is committed, so the app still builds.`);
  process.exit(1);
});
