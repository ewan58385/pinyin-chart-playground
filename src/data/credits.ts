/**
 * Everything the app bundles that someone else made: who made it, under which
 * licence, and where the licence text is. This one list feeds the in-app
 * "Credits and licences" page, THIRD_PARTY_NOTICES.md, the README inside the
 * Anki export and open-data/ (scripts/build-notices.ts, scripts/build-open-data.ts).
 *
 * Licences were checked against each source's own licence text or file header on
 * LICENCES_CHECKED_ON; THIRD_PARTY_NOTICES.md records what was read and where.
 */
import { AUDIO_SOURCES, DATA_META } from './index';
import fontInfo from '../assets/fonts/font-info.json';
import packageInfo from './generated/notices-packages.json';

export const LICENCES_CHECKED_ON = '2026-11-13';

export type CreditGroup = 'recordings' | 'dictionary' | 'wordLists' | 'fonts' | 'icons' | 'software';

export const CREDIT_GROUPS: { id: CreditGroup; title: string }[] = [
  { id: 'recordings', title: 'Recordings' },
  { id: 'dictionary', title: 'Dictionary and character data' },
  { id: 'wordLists', title: 'Word lists' },
  { id: 'fonts', title: 'Fonts' },
  { id: 'icons', title: 'Icons' },
  { id: 'software', title: 'Software libraries' },
];

export interface Credit {
  id: string;
  group: CreditGroup;
  name: string;
  url: string;
  /** What it gives the app, in a learner's words. */
  provides: string;
  /** Copyright holder or authors, as the source names them. */
  holder: string;
  licence: string;
  licenceUrl?: string;
  version?: string;
  /** Key of the full licence text in licence-texts.json: a repository path, or "npm:<package>". */
  licenceText?: string;
  /** Plain-language notes: changes made, how the source states its licence. */
  notes?: string[];
  /** Adaptations must be shared under the same licence (Creative Commons ShareAlike). */
  shareAlike?: boolean;
}

/** The libraries whose code is in the app as shipped. */
export const SOFTWARE_PACKAGES: { name: string; provides: string }[] = [
  { name: 'preact', provides: 'Draws the interface' },
  { name: '@preact/signals', provides: 'Keeps the interface in step with your data' },
  { name: '@preact/signals-core', provides: 'Keeps the interface in step with your data' },
  { name: 'idb', provides: 'Saves your data in the browser' },
  { name: 'fflate', provides: 'Reads and writes backup files' },
  { name: 'workbox-window', provides: 'Keeps the app working offline' },
  { name: 'workbox-core', provides: 'Keeps the app working offline' },
  { name: 'workbox-precaching', provides: 'Keeps the app working offline' },
  { name: 'workbox-routing', provides: 'Keeps the app working offline' },
  { name: 'workbox-strategies', provides: 'Keeps the app working offline' },
  { name: 'vite-plugin-pwa', provides: 'Installs updates of the app' },
  { name: 'vite', provides: 'Loads the app’s files' },
  { name: '@capacitor/core', provides: 'Runs the app on Android' },
  { name: '@capacitor/android', provides: 'Runs the app on Android' },
  { name: '@capacitor/app', provides: 'The Android back button and the app version' },
  { name: '@capacitor/filesystem', provides: 'Prepares backups and Anki files for sharing on Android' },
  { name: '@capacitor/share', provides: 'Sends backups and Anki files to other apps on Android' },
  { name: '@capacitor/splash-screen', provides: 'The launch screen on Android' },
];

/**
 * Libraries compiled into the Android app (android/app, resolved by Gradle). Licences
 * read from each library's published POM file and, for ion-android-filesystem, its
 * LICENSE file; Apache Cordova's NOTICE is reproduced as Apache-2.0 section 4(d) asks.
 */
const ANDROID_LIBRARIES: Credit[] = [
  {
    id: 'androidx',
    group: 'software',
    name: 'AndroidX (Android Jetpack libraries)',
    url: 'https://developer.android.com/jetpack/androidx',
    provides: 'Android app: windows, launch screen, back gesture and file sharing',
    holder: 'The Android Open Source Project',
    licence: 'Apache License 2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceText: 'licences/apache-2.0.txt',
  },
  {
    id: 'kotlin',
    group: 'software',
    name: 'Kotlin standard library and kotlinx.coroutines',
    url: 'https://kotlinlang.org',
    provides: 'Android app: used by the libraries above',
    holder: 'JetBrains s.r.o. and Kotlin Programming Language contributors',
    licence: 'Apache License 2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceText: 'licences/apache-2.0.txt',
  },
  {
    id: 'cordova-android',
    group: 'software',
    name: 'Apache Cordova Android framework',
    url: 'https://cordova.apache.org',
    version: '14.0.1',
    provides: 'Android app: part of the Capacitor runtime',
    holder: 'The Apache Software Foundation',
    licence: 'Apache License 2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceText: 'licences/apache-2.0.txt',
    notes: ['NOTICE: Apache Cordova. Copyright 2015-2020 The Apache Software Foundation. This product includes software developed at The Apache Software Foundation (http://www.apache.org/).'],
  },
  {
    id: 'guava-listenablefuture',
    group: 'software',
    name: 'Guava ListenableFuture',
    url: 'https://github.com/google/guava',
    version: '1.0',
    provides: 'Android app: used by the libraries above',
    holder: 'The Guava Authors',
    licence: 'Apache License 2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceText: 'licences/apache-2.0.txt',
  },
  {
    id: 'jetbrains-annotations',
    group: 'software',
    name: 'JetBrains Java Annotations',
    url: 'https://github.com/JetBrains/java-annotations',
    provides: 'Android app: used by the libraries above',
    holder: 'JetBrains s.r.o.',
    licence: 'Apache License 2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceText: 'licences/apache-2.0.txt',
  },
  {
    id: 'jspecify',
    group: 'software',
    name: 'JSpecify',
    url: 'https://jspecify.dev',
    version: '1.0.0',
    provides: 'Android app: used by the libraries above',
    holder: 'The JSpecify Authors',
    licence: 'Apache License 2.0',
    licenceUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
    licenceText: 'licences/apache-2.0.txt',
  },
  {
    id: 'ion-android-filesystem',
    group: 'software',
    name: 'ion-android-filesystem',
    url: 'https://github.com/ionic-team/ion-android-filesystem',
    version: '1.1.1',
    provides: 'Android app: writes the files you share',
    holder: 'Ionic',
    licence: 'MIT',
    licenceText: 'licences/ion-android-filesystem-MIT.txt',
  },
];

interface PackageInfo {
  version: string;
  licence: string;
  holder: string;
  url: string;
}
const packages = packageInfo as Record<string, PackageInfo>;
const pkg = (name: string): PackageInfo => packages[name] ?? { version: '', licence: '', holder: '', url: `https://www.npmjs.com/package/${name}` };

const audio = Object.values(AUDIO_SOURCES)[0];
const src = DATA_META.sources;
const versions = (DATA_META as unknown as { sourceVersions?: Record<string, string> }).sourceVersions ?? {};

export const CREDITS: Credit[] = [
  {
    id: 'audio',
    group: 'recordings',
    name: audio.name,
    url: audio.url,
    provides: 'The native recording of every syllable and tone',
    holder: audio.author,
    licence: audio.licence,
    licenceUrl: audio.licenceUrl,
    notes: [
      audio.copyright.replace(/^Copyright©\s*/, '© ') + '.',
      audio.licenceNote,
      `Changes made for this app: ${audio.changes} These adapted recordings are shared under the same licence.`,
      'Only the syllable recordings are used; the project’s separate set of HSK word recordings is not.',
    ],
    shareAlike: true,
  },
  {
    id: 'cedict',
    group: 'dictionary',
    name: src.cedict.name,
    url: src.cedict.homepage,
    provides: 'Example characters, meanings, example words and readings',
    holder: `${src.cedict.author}; based on CEDICT © 1997, 1998 Paul Andrew Denisowski`,
    licence: src.cedict.licence,
    licenceUrl: src.cedict.licenceUrl,
    version: versions.cedict,
    notes: [
      'Changes made for this app: meanings shortened, a few senses reordered, and example words selected. The example data in this app is adapted from CC-CEDICT and shared under the same licence.',
    ],
    shareAlike: true,
  },
  {
    id: 'unihan',
    group: 'dictionary',
    name: src.unihan.name,
    url: src.unihan.homepage,
    provides: 'Readings of characters, how often each reading is used, and the list of standard characters',
    holder: src.unihan.author,
    licence: src.unihan.licence,
    licenceUrl: src.unihan.licenceUrl,
    version: versions.unihan,
    licenceText: 'licences/unicode-license-v3.txt',
  },
  {
    id: 'hsk',
    group: 'wordLists',
    name: src.hsk.name,
    url: src.hsk.homepage,
    provides: 'The HSK level of each word (the level only)',
    holder: src.hsk.author,
    licence: src.hsk.licence,
    licenceUrl: src.hsk.licenceUrl,
    version: versions.hsk,
    licenceText: 'licences/complete-hsk-vocabulary-MIT.txt',
  },
  {
    id: 'hsk-vocabulary',
    group: 'wordLists',
    name: 'hsk-vocabulary',
    url: 'https://github.com/clem109/hsk-vocabulary',
    provides: 'Levels of the earlier HSK (via complete-hsk-vocabulary)',
    holder: 'Clement Venard',
    licence: 'MIT',
    licenceText: 'licences/hsk-vocabulary-MIT.txt',
  },
  {
    id: 'hanyu-shuiping-kaoshi',
    group: 'wordLists',
    name: 'hanyu-shuiping-kaoshi',
    url: 'https://github.com/gigacool/hanyu-shuiping-kaoshi',
    provides: 'Levels of the earlier HSK (via hsk-vocabulary)',
    holder: 'gigacool',
    licence: 'MIT',
    licenceText: 'licences/hanyu-shuiping-kaoshi-MIT.txt',
  },
  {
    id: 'hsk30',
    group: 'wordLists',
    name: 'hsk30',
    url: 'https://github.com/elkmovie/hsk30',
    provides: 'Levels of HSK 3.0 (via complete-hsk-vocabulary), taken from the official HSK 3.0 standard',
    holder: 'Pleco Inc.',
    licence: 'MIT',
    licenceText: 'licences/hsk30-MIT.txt',
  },
  ...fontInfo.map(
    (f): Credit => ({
      id: `font-${f.id}`,
      group: 'fonts',
      name: f.name,
      url: f.url,
      provides: /Han/.test(f.name) ? 'Chinese characters' : 'Pinyin and text',
      holder: f.copyright,
      licence: f.licence,
      licenceUrl: 'https://openfontlicense.org',
      version: f.version.replace(/;.*$/, ''),
      licenceText: f.licenceFile,
      notes: [`The copy in this app contains only the characters it uses and is renamed “${f.renamedTo}”, as the licence requires for modified versions.`],
    }),
  ),
  {
    id: 'lucide',
    group: 'icons',
    name: 'Lucide',
    url: 'https://lucide.dev',
    provides: 'The icons',
    holder: 'Lucide Icons and Contributors; icons derived from Feather © Cole Bemis',
    licence: 'ISC (icons derived from Feather: MIT)',
    version: pkg('lucide-preact').version,
    licenceText: 'npm:lucide-preact',
  },
  ...SOFTWARE_PACKAGES.map(
    ({ name, provides }): Credit => ({
      id: `npm-${name}`,
      group: 'software',
      name,
      url: pkg(name).url,
      provides,
      holder: pkg(name).holder,
      licence: pkg(name).licence,
      version: pkg(name).version,
      licenceText: `npm:${name}`,
    }),
  ),
  ...ANDROID_LIBRARIES,
];

/** Plain-text attribution lines for the credits with the given ids, for READMEs that travel with the data. */
export function attributionText(ids: string[]): string[] {
  const out: string[] = [];
  for (const c of CREDITS.filter((x) => ids.includes(x.id))) {
    const what = c.provides.charAt(0).toLowerCase() + c.provides.slice(1);
    const by = c.holder.replace(/\.$/, '');
    out.push(`${c.name}${c.version ? ` (${c.version})` : ''}: ${what}.`);
    out.push(`  By ${by}. Licence: ${c.licence}${c.licenceUrl ? ` (${c.licenceUrl})` : ''}. ${c.url}`);
    for (const n of c.notes ?? []) out.push(`  ${n}`);
  }
  return out;
}
