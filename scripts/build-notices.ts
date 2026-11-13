/**
 * Builds the licence notices from src/data/credits.ts:
 *
 *   src/data/generated/notices-packages.json   version, licence and copyright holder of each bundled npm package
 *   src/data/generated/licence-texts.json      the full licence texts, for the in-app Credits and licences page
 *   THIRD_PARTY_NOTICES.md                      every component, its licence, version, URL, and full text where required
 *
 * Run: npm run data:notices   (after npm install; again whenever a dependency, font or source changes)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/sources';

const GEN = join(ROOT, 'src', 'data', 'generated');

/** What was read to confirm each licence (see the date in credits.ts). */
const EVIDENCE: Record<string, string> = {
  audio:
    'README.md of github.com/hugolpz/audio-cmn (byte-identical to the copy in the source folder): "License: CC-by-sa". The repository has no LICENSE file. The SWAC tags inside every recording: SWAC_COLL_LICENSE=CC-BY-SA-3.0, SWAC_COLL_AUTHORS="Wang Chen, Lopez Hugo, Vion Nicolas", SWAC_SPEAK_NAME="Chen Wang 王琛".',
  cedict: 'Header of the downloaded cedict file: "License: Creative Commons Attribution-ShareAlike 4.0 International License, https://creativecommons.org/licenses/by-sa/4.0/".',
  unihan: 'Header of Unihan_Readings.txt ("For terms of use and license, see https://www.unicode.org/terms_of_use.html"); that page states Unicode Data Files are under the Unicode License v3; full text read at https://www.unicode.org/license.txt.',
  hsk: 'LICENSE file of github.com/drkameleon/complete-hsk-vocabulary (MIT, © 2026 Yanis Zafirópulos). Only the "level" field is used; its README credits its frequency and part-of-speech data to other sources, which are not used.',
  'hsk-vocabulary': 'LICENSE file of github.com/clem109/hsk-vocabulary (MIT, © 2018 Clement Venard). Its README names gigacool/hanyu-shuiping-kaoshi as its source.',
  'hanyu-shuiping-kaoshi': 'LICENSE file of github.com/gigacool/hanyu-shuiping-kaoshi (MIT, © 2018 gigacool).',
  hsk30: 'LICENSE file of github.com/elkmovie/hsk30 (MIT, © 2021 Pleco Inc.). Its README: extracted from the official HSK 3.0 PDF published by the Ministry of Education of China.',
  lucide: 'LICENSE file of the installed lucide-preact package (ISC; Feather-derived icons MIT).',
  androidx: 'The <licenses> element of each AndroidX artifact’s POM in the Gradle cache (e.g. androidx.core:core 1.17.0, androidx.appcompat:appcompat 1.7.1): "The Apache Software License, Version 2.0". Full text from https://www.apache.org/licenses/LICENSE-2.0.txt.',
  kotlin: 'POMs of org.jetbrains.kotlin:kotlin-stdlib 2.2.20 and org.jetbrains.kotlinx:kotlinx-coroutines-core/-android 1.10.2: "Apache-2.0".',
  'cordova-android': 'POM of org.apache.cordova:framework 14.0.1: "Apache License, Version 2.0"; NOTICE file of github.com/apache/cordova-android at tag rel/14.0.1.',
  'guava-listenablefuture': 'POM of com.google.guava:listenablefuture 1.0 and its parent guava-parent 26.0-android: "The Apache Software License, Version 2.0".',
  'jetbrains-annotations': 'POM of org.jetbrains:annotations 23.0.0: "The Apache Software License, Version 2.0".',
  jspecify: 'POM of org.jspecify:jspecify 1.0.0: "The Apache License, Version 2.0".',
  'ion-android-filesystem': 'POM of io.ionic.libs:ionfilesystem-android 1.1.1 points to the LICENSE file of github.com/ionic-team/ion-android-filesystem: MIT, © 2025 Ionic.',
};

// ───────────────────────── npm packages ─────────────────────────

function licenceFile(dir: string): string | null {
  const f = readdirSync(dir).find((x) => /^licen[cs]e(\.md|\.txt)?$/i.test(x));
  return f ? join(dir, f) : null;
}

function packageInfo(name: string) {
  const dir = join(ROOT, 'node_modules', name);
  const pj = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const file = licenceFile(dir);
  // Some packages append the licences of the tools they bundle for their own use (Vite does).
  // The app ships only the package's own code, so only its own licence is kept.
  const text = file ? readFileSync(file, 'utf8').split(/^# Licenses of bundled dependencies/m)[0].replace(/^# Vite core license\n[^\n]*\n\n/, '') : '';
  const holder = (text.match(/^\s*Copyright[^\n]*$/im)?.[0] ?? '').replace(/^\s*Copyright\s*(\(c\)|©)?\s*/i, '').trim();
  const repo = typeof pj.repository === 'string' ? pj.repository : pj.repository?.url;
  const url = (pj.homepage as string | undefined) ?? (repo ? repo.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:/, 'https:') : `https://www.npmjs.com/package/${name}`);
  return { version: pj.version as string, licence: pj.license as string, holder, url, text, file };
}

const { SOFTWARE_PACKAGES } = await import('../src/data/credits');
const names = [...SOFTWARE_PACKAGES.map((p) => p.name), 'lucide-preact'];
const packages: Record<string, { version: string; licence: string; holder: string; url: string }> = {};
const npmTexts: Record<string, string> = {};
for (const name of names) {
  const p = packageInfo(name);
  if (!p.text) throw new Error(`${name}: no LICENSE file found`);
  packages[name] = { version: p.version, licence: p.licence, holder: p.holder, url: p.url };
  npmTexts[`npm:${name}`] = p.text.trim();
}
writeFileSync(join(GEN, 'notices-packages.json'), JSON.stringify(packages, null, 1) + '\n');

// Read the credits again now that the package details are written.
const { CREDITS, CREDIT_GROUPS, LICENCES_CHECKED_ON } = await import(`../src/data/credits?fresh=${Date.now()}`);

// ───────────────────────── licence texts ─────────────────────────

const texts: Record<string, string> = {};
for (const c of CREDITS) {
  if (!c.licenceText) continue;
  if (c.licenceText.startsWith('npm:')) texts[c.licenceText] = npmTexts[c.licenceText];
  else {
    const path = join(ROOT, c.licenceText);
    if (!existsSync(path)) throw new Error(`${c.id}: licence text ${c.licenceText} not found`);
    texts[c.licenceText] = readFileSync(path, 'utf8').trim();
  }
}
writeFileSync(join(GEN, 'licence-texts.json'), JSON.stringify(texts) + '\n');

// ───────────────────────── THIRD_PARTY_NOTICES.md ─────────────────────────

const md: string[] = [
  '# Third-party notices',
  '',
  `Generated by \`scripts/build-notices.ts\` from \`src/data/credits.ts\`. Do not edit by hand. Licences checked against each source on ${LICENCES_CHECKED_ON}.`,
  '',
  'This file lists the work of others that Pinyin Chart includes, with the licence each is used under. It does not state a licence for the app’s own code.',
  '',
  'Material under Creative Commons Attribution-ShareAlike (the example data adapted from CC-CEDICT, and the adapted recordings) must be shared under the same licence; see `open-data/`.',
  '',
];
for (const g of CREDIT_GROUPS) {
  const list = CREDITS.filter((c: { group: string }) => c.group === g.id);
  if (!list.length) continue;
  md.push(`## ${g.title}`, '');
  for (const c of list) {
    md.push(`### ${c.name}${c.version ? ` (${c.version})` : ''}`, '');
    md.push(`- Used for: ${c.provides}`);
    md.push(`- Copyright / authors: ${c.holder || 'see the licence text below'}`);
    md.push(`- Licence: ${c.licence}${c.licenceUrl ? ` (${c.licenceUrl})` : ''}`);
    md.push(`- URL: ${c.url}`);
    if (EVIDENCE[c.id]) md.push(`- Licence evidence read: ${EVIDENCE[c.id]}`);
    else if (c.licenceText?.startsWith('npm:')) md.push(`- Licence evidence read: the LICENSE file and package.json of the installed package`);
    else if (c.group === 'fonts') md.push(`- Licence evidence read: the font's licence file (${c.licenceText}) and the copyright and licence records in the font itself`);
    for (const n of c.notes ?? []) md.push(`- ${n}`);
    md.push('');
    if (c.licenceText) md.push('```text', texts[c.licenceText], '```', '');
  }
}
writeFileSync(join(ROOT, 'THIRD_PARTY_NOTICES.md'), md.join('\n'));
console.log(`${CREDITS.length} credits, ${Object.keys(texts).length} licence texts, ${Object.keys(packages).length} packages`);
