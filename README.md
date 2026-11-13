# Pinyin Chart

An interactive Mandarin pinyin chart for personal study. Every syllable and tone has native audio, an example character with example words, and your own notes and recordings with A/B comparison.

It is a static site and an installable PWA. There is no account and no backend: everything you add stays in your browser, and one zip moves it between devices.

## Run it

Needs Node 20.19 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests on the data, the pure logic and the pitch tracker
npm run build      # type-checks, then writes the site to dist/
npm run preview    # serves dist/ at http://localhost:4173, with the service worker
```

The generated data, audio clips and fonts are committed, so the app builds without network access or any of the data tooling.

The microphone and the service worker both need a secure origin. `localhost` counts; a phone reaching your laptop over the LAN does not. To try it on a phone, deploy it (below).

## Deploy

Either host works. Both give you HTTPS, which recording and offline use require.

### GitHub Pages

1. Create a repository on GitHub and push this folder to its `main` branch.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) runs on every push to `main`: it runs the tests, builds, and publishes `dist/`.
4. The site appears at `https://<your-username>.github.io/<repository-name>/`.

The workflow sets `BASE_PATH=/<repository-name>/` so asset URLs resolve under that path. For a user site (`<name>.github.io`) or a custom domain, change `BASE_PATH` to `/` in the workflow. Pages on a private repository needs a paid GitHub plan.

### Cloudflare Pages

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
2. Build command: `npm run build`. Build output directory: `dist`. Add the environment variable `NODE_VERSION` = `22`.
3. Deploy. The site is served from the root of `<project>.pages.dev`, so leave `BASE_PATH` unset.

Without Git: `npm run build`, then `npx wrangler pages deploy dist --project-name pinyin-chart`.

## Install to the home screen

Open the deployed site, then:

- **iPhone or iPad:** in Safari, tap **Share**, then **Add to Home Screen**. (Chrome and other browsers on iOS also offer this from their share menu on iOS 16.4 and later.)
- **Android:** in Chrome, open the **⋮** menu and choose **Install app** (or **Add to Home screen**).
- **Desktop Chrome or Edge:** click the install icon at the right of the address bar.

The app shell, chart data and fonts (about 2 MB) are stored on first load, so the chart opens offline from then on. Audio is stored as you play it, or all at once from **My data → Download all for offline** (1,281 clips, 6.2 MB).

## Using it

- **Chart.** Initials down the side (∅ row first), finals across the top in six groups. Tap a syllable to open it. The group names and the initials in the headers are links (underlined, with a chevron) to their own pages, and the corner cell links to the Finals and Initials overviews. The top bar has search, filters, and a button that flips the axes. The **⋯** (More) menu holds Settings and About, plus quick toggles for cell detail, status colours, unverified cells and light or dark.
- **Finals and Initials** (`#/finals`, `#/initials`). Two overview pages: all 36 finals in their six groups with each final's type (simple, compound, nasal, front or back nasal) and spelling cues (hidden vowel, ü written u, fake i, o said as uo), and the null initial plus the 21 initials by articulation group and by the easy / tougher / problem label in the data, with the y / w spelling table. Each group has a progress bar (solid and shaky shares, with the count in words). The side navigation starts with a "Whole chart" title that leads back to the chart; on phones it is a strip that scrolls with that title pinned. Everything shown comes from the data and tags.
- **Group pages** (`#/finals/e`, `#/initials/retroflex`). Every final group and every initial group has a page: its syllables as cards, a new / shaky / solid summary, links to the groups it is confused with, previous and next, a Practise button, and the same tone panel. A card shows one box per tone (the tone-marked letter above the example character); each box opens that tone. Breadcrumbs (Chart › Finals › E group) are all links.
- **Browse** (`#/browse`). The same syllables by category, each derived from the data: finals by type (simple, compound, nasal, front nasal, back nasal), spelling tags (fake i, ü written u, o said as uo, hidden vowel, y / w spelling), and initials by difficulty (easy, tougher, problem) and articulation tag (null initial, unaspirated, aspirated, retroflex, palatal, dental sibilant). Where a label is a judgement call in the data (the type of `er`, `s` being labelled easy) the page says so.
- **Learn** (`#/learn`): *the path*, for understanding and orientation. Nine stages from the sounds the data labels simplest to the hardest: simple finals with easy initials; simple finals with tougher initials; compound finals; nasal finals; j q x; zh ch sh r; z c and the fake i of s; a review of spelling that hides the sound; neutral tones. Each stage says what it covers and why it comes where it does, and lists its syllables as study cards: one syllable per card, a row per tone with a Listen button, the example character and gloss, and a new / shaky / solid control; Open shows the full syllable. Progress comes from your own marks (a stage is "mostly solid" at four fifths). Nothing is locked: "Next up" recommends the first stage not yet mostly solid and lists the shaky tones worth revisiting. Learn runs no drills; each stage links to Practice. The stage definitions are data (`src/data/learn.ts`); the path stores nothing of its own.
- **Search.** `zhi`, `zhī`, `zhi1` or a character such as `知` all jump to the cell. `lv4`, `lü4` and `lu:4` are the same. Press `/` to focus the search box.
- **Syllable view.** Pick a tone to hear it. Each tone has its example character, gloss and up to three words (all editable), a new / shaky / solid status, your recordings, a compare block that plays native then yours, with swap, loop, 0.75× speed, waveforms and a pitch-contour overlay, and one note box, "Note on this tone". Below that are links to syllables it is confused with (with a button that plays the pair back to back).
- **Settings** (`#/settings`). Mode (system, light, dark); seven colour presets (warm paper, ink, sepia, cool slate, high contrast, linen, forest); seven curated accents or a custom hex that is contrast-checked and moved to AA if needed; three typeface pairings (Source Serif & Sans, Literata & Inter, Noto Serif & Sans) and two Chinese faces (Song serif, Hei sans), all self-hosted subsets that work offline; four text sizes; chart density (compact, comfortable, spacious), cell detail, cell borders (hairline, ruled, none); tone colours off, standard or colour-blind safe; tone marks or numbers; example characters on or off; reduce motion; and the Practice toggles. Settings live with your data, go into exports, and are applied before the first paint from a small cache (the settings themselves stay in IndexedDB).
- **Practice** (`#/practice`; loaded as its own chunk): *drills*. Pick a set (a learning stage, a final group, an initial group, a category, one syllable, or "my shaky syllables") and step through it one tone at a time: the syllable's study card (Listen, status), the pairs it is confused with, record a take, compare native then mine, with previous / next and the position kept in the address. Practice carries no stage descriptions: each session links back to its stage ("Read about this stage") or its group or category page, and every such page has a Practise button. Tones without a native recording (all neutral tones) say so and still let you record. Two listening tools sit on the same page, ten questions each, with no streaks, badges or reminders: the *listening quiz* (pick the syllable from four easily confused ones, or the tone; ends with a tone-confusion table and an offer to mark the misses shaky that only acts if you accept) and the *minimal-pair trainer* (two syllables back to back, which came first; pairs are built from the data: zh / j / z, ch / q / c, sh / x / s, aspirated against unaspirated, in / ing, en / eng, u / ü, and the same syllable in different tones). Shaky tones and recent misses come up more often; errors fade over two weeks. Settings can hide Practice.
- **Phones.** Below 860 px the top bar keeps search and the More menu, and a bottom tab bar holds Chart, Finals, Initials, Learn and Practice (Browse and My data move into the More menu). The syllable panel becomes a bottom sheet that sits above the tab bar.
- **Hear it on Forvo.** Every tone panel has a link that opens forvo.com in a new tab: the page for the tone's example character (your own if you edited it), `https://forvo.com/word/<character>/`, or, where there is no character, a search for the pinyin among Mandarin entries, `https://forvo.com/search/<pinyin>/zh/`. It is a plain outbound link: nothing is fetched, embedded, cached or stored from Forvo, and it needs a connection.
- **Keyboard.** Arrow keys move between syllables on the chart, Enter opens one, Escape closes it.

## Your data

All of it is in IndexedDB in the browser you used: notes, statuses, recordings (audio stored with its MIME type), edited characters, practice results and settings. Notes typed into the older per-syllable boxes ("How it sounds", "Watch out") were folded into the first tone's note on upgrade and are also kept, unseen, in a legacy store. It is kept apart from the bundled chart data, so app updates never touch it.

- **Move or back up:** *My data → Export everything* writes one zip (`data.json` plus one audio file per take). Import it on the other device. Imports merge: where both sides changed something the newer edit wins, and recordings are matched by id, so importing the same file twice changes nothing. There is also a "replace everything" option.
- **Persistence:** the app asks the browser for persistent storage the first time you save something and shows the answer on the *My data* page. Browsers decide this themselves; installing to the home screen makes a "yes" much more likely. Keep an export either way.
- **Anki:** *My data → Anki* exports the tones matching the current chart filters as a CSV plus the native clips.

## How the chart data is made

Nothing linguistic is typed in by hand. `scripts/build-data.ts` derives everything from downloaded sources and writes `src/data/generated/`.

| Source | Used for | Licence |
|---|---|---|
| [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) | readings, glosses, example words | CC BY-SA 4.0 |
| [Unihan](https://www.unicode.org/reports/tr38/) `kXHC1983`, `kTGHZ2013`, `kHanyuPinlu`, `kMandarin` | independent second source for readings | Unicode License v3 |
| [SUBTLEX-CH](https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch) | character and word frequency | free for research; cite Cai & Brysbaert (2010) |
| [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) | which words and single characters are taught, and at what level | MIT |

**Syllables.** A syllable is on the chart because a dictionary attests it, never because an initial and a final were combined. Four sources are compared (CC-CEDICT and three Unihan dictionary fields). A syllable or tone cell is `verified` when at least two agree. Cells with one source are kept in the data with `verified: false` and hidden unless you turn on *Unverified cells*.

**Example characters.** For each syllable and tone the script prefers a character that is a word by itself (an HSK level 1–6 single-character word, or one that the subtitle corpus segments as a word often enough), ranked by how often the character is read that way. If none qualifies it takes the most frequent character together with a common word that contains it (`"fallback": "word"`). If nothing common exists the cell is left blank. The thresholds are constants at the top of the script and are recorded in `data-meta.json`.

**Curation.** `scripts/curation.ts` is a short, commented list of rejected picks (for example 鸟 for *diǎo*) and re-ordered senses (干 *gàn* "to do" before "tree trunk"). It only rejects or reorders what CC-CEDICT already says.

**Reports.** Each run rewrites `reports/data-report.md` (everything unverified, rare, off-grid or blank) and the audio script rewrites `reports/audio-coverage.md`.

To regenerate:

```sh
npm run data:sources   # downloads the sources into .cache/ (about 35 MB, not committed)
npm run data:build     # syllables, example characters, search index, report
npm run data:audio     # needs ffmpeg
npm run data:fonts     # needs python3 with fonttools and brotli; rerun when the characters change
npm run data:icons     # needs python3 with Pillow
```

## Native audio

- **Source:** [davinfifield/mp3-chinese-pinyin-sound](https://github.com/davinfifield/mp3-chinese-pinyin-sound) (also on npm as `@hanzikite/pinyin-mp3`), released under the Unlicense, a public-domain dedication. The speaker is not credited.
- **Processing** (`scripts/fetch-audio.ts`): high-pass filter (the source files carry a DC offset), trim to the speech using each clip's own noise floor, level so the loud part of every syllable matches, short fades, mono 24 kHz MP3 at 48 kbit/s. Output is `public/audio/{syllable}{tone}.mp3`, with ü written `v` (`lv4.mp3`).
- **Manifest:** `audio-manifest.json` lists source, licence, author and original URL for every clip. The About page shows the attribution.
- **Coverage:** 1,281 clips, 6.2 MB. 187 visible cells have none: 166 neutral-tone cells and 21 others, listed in `reports/audio-coverage.md`. The pack's own "neutral tone" files (ma5, ma, de5, de, le5, ne5, zi) are byte-identical copies of its first-tone files, so they are not used and the app says a neutral tone has no native recording. `zhai.mp3` (no tone number in the pack) is used as zhài and flagged unverified. The pack's non-syllables (diang, shong, rei, muo, nia, lün) are not used.
- **At run time** (`src/lib/audio.ts`): clips are plain static files, cached in Cache Storage under `native-audio-v1` the first time a syllable is played or all at once from *My data*, and played through one shared audio element fed with blob URLs and unlocked inside a tap (iOS Safari needs that for sequences and looping).
- **Adding a pack:** put files named like `ma1.mp3`, `lv4.wav`, `de.mp3` (no number means neutral) in a folder and run

  ```sh
  npm run data:audio -- --pack ./my-pack --pack-name "Pack name" --pack-licence "CC BY 4.0" --pack-author "Author" --pack-url https://example.com
  ```

  Its clips take priority over the default source and are attributed separately. Check the pack's licence allows redistribution before deploying.

## Pitch overlay and recordings

The compare block draws the pitch contour of the native clip and of your take on one chart. Both go through the same tracker, `src/lib/pitch.ts` (YIN with parabolic interpolation, 60–600 Hz, voicing decided from the normalised difference and from level relative to the clip's own noise floor, octave correction, light median smoothing). By default each trace is in semitones around that speaker's own median, so a low voice overlays a high one and you compare shapes; **Absolute Hz** (remembered as a setting) shows the real pitches on a logarithmic axis. The axis fits both traces with padding, and each trace is labelled with its median in Hz. When no contour can be measured for a take the chart says why (too quiet, too short, mostly unvoiced, clipped, or not decodable in this browser) and what to try, instead of showing nothing.

Recording asks the browser for raw audio: `echoCancellation`, `noiseSuppression` and `autoGainControl` are all off, because those stages reshape a sustained tone.

**Why takes used to have no contour** (`scripts/diagnose-pitch.ts` → `reports/pitch-diagnosis.md`). Test-tone glides sent through the real recording path (WebM/Opus and MP4/AAC, decoded at 44.1 and 48 kHz) tracked fine with the old code, so codecs, sample rates and silence trimming were not the problem. Level gating was: the old tracker kept only frames above 12% of the clip's peak, so a tap on the device just before a quiet take removed the whole contour (832 of the 1,281 native clips in that test; 5 with the new tracker). Its absolute clarity threshold also dropped breathy or creaky speech. The new tracker gates 6 dB above the clip's own noise floor and corrects octaves; on the native clips it returns a contour for every clean clip and loses 4 under added room noise (the old one lost 6).

## Typefaces and icons

Three Latin pairings and two Chinese faces, all under the SIL Open Font License: Source Serif 4 + Source Sans 3 (Adobe), Literata (TypeTogether) + Inter (Rasmus Andersson), Noto Serif + Noto Sans (Google), and Source Han Serif + Source Han Sans (Adobe). `scripts/build-fonts.py` downloads them, subsets the Latin faces to ASCII, Latin-1, every pinyin vowel with a tone mark and common punctuation, and the Han faces to exactly the characters the data uses, then renames them ("Chart Serif", "Chart Sans B", "Chart Han Sans", …) as the licence requires of modified versions. IBM Plex was tried and dropped: it lacks the caron vowels (ǎ ǐ ǒ ǔ), so it cannot set third tones. The licence texts are in `src/assets/fonts/licences/`. Icons are [Lucide](https://lucide.dev) (ISC).

## Layout

```
src/data/            initials, finals, blocks, categories, learn (the stages), themes, tags, confusable pairs
src/data/generated/  syllables.json, cells.json, char-index.json, audio-index.json (built by scripts)
src/lib/             pinyin spelling, IndexedDB, state, audio player and cache, recorder, pitch tracker (pitch.ts) and overlay axis (overlay.ts), export/import
src/components/      chart, detail view, syllable card, overview / group / browse / learn pages, navigation
src/practice/        guided session, listening quiz, minimal pairs (a separate chunk)
src/styles/          tokens and layout; fonts.css is generated
scripts/             data, audio, font and icon builders; curation.ts; diagnose-pitch
tests/               data invariants, pinyin logic, pitch tracker, contrast, routes and breadcrumbs, stages and progress, categories, practice scopes, Forvo links, database upgrade, export format
public/audio/        the native clips
audio-manifest.json  attribution for every clip
reports/             data-report.md, audio-coverage.md, pitch-diagnosis.md
```

## What has and has not been tested

Tested in a real browser (Firefox 159, headless, with a simulated microphone, at 1440×900 and 390×844, light and dark): native playback, recording and saving takes, best take, rename, native-then-mine comparison, the overview, group, browse, learn and practice pages, breadcrumbs, the phone tab bar and bottom sheet, notes autosave, status and heatmap, character edits, search, keyboard navigation, the back button, export, wipe, import, re-import, a malformed zip, Anki export, downloading all audio, and loading and playing with the network switched off.

Not tested, because no device was available:

- **iOS Safari and Android Chrome on a phone.** The code follows the known requirements (one shared audio element started from a tap, MP4/AAC accepted and preferred for recording, the stored MIME type used on playback, 16 px inputs so the page does not zoom), but please run through record → compare → export on your iPhone once.
- **Chrome and Safari on desktop.** Nothing browser-specific is used beyond MediaRecorder, IndexedDB, Cache Storage and Web Audio.
- **Recordings crossing browsers.** The app asks the browser for MP4/AAC first because it plays everywhere; Safari records it, and recent Chrome should too. Firefox records WebM/Opus only, which some iOS versions cannot play, so a take recorded in Firefox may be silent on an iPhone. If playback fails the app says so rather than failing silently.

## Open items

- **Reference chart image.** The image was not attached when this was built, so the syllable set has not been compared against it cell by cell. `reports/data-report.md` has the evidence for the rare cells (dia, lo, den, rua, nun, eng, ê and others).
- **Unverified data** is listed in `reports/data-report.md`, `reports/audio-coverage.md`, and on the app's About page.

## Licences

The app code is yours to license as you wish. The bundled example data derives from CC-CEDICT and carries its CC BY-SA 4.0 licence. SUBTLEX-CH is published for research use; only frequency ranks derived from it are bundled. The audio pack is under the Unlicense. See the table above and the About page for the rest.
