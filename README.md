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
3. The included workflow (`.github/workflows/deploy.yml`) runs on every push to `main`: it runs the tests, builds, publishes `dist/`, then loads the published page and fails the run if it is not the built app.

   If Source is left at **Deploy from a branch**, GitHub also publishes the repository itself on every push. Its `index.html` points at `/src/main.tsx`, which only exists in development, so whenever that deployment finishes after the workflow's, the site shows only "Pinyin Chart is starting…". The workflow's last step catches this; the fix is to set Source to **GitHub Actions** and re-run the workflow.
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

The app shell, chart data and fonts (about 2 MB) are stored on first load, so the chart opens offline from then on. Audio is stored as you play it, or all at once from **My data → Download all for offline** (1,302 clips, 5.5 MB).

## Using it

- **Chart.** Initials down the side (∅ row first), finals across the top in six groups. Tap a syllable to open it. The group names and the initials in the headers are links (underlined, with a chevron) to their own pages, and the corner cell links to the Finals and Initials overviews. The top bar has search, filters, and a button that flips the axes. The **⋯** (More) menu holds Settings and About, plus quick toggles for the detail in each square, status colours, rare syllables (hidden by default) and light or dark.
- **Finals and Initials** (`#/finals`, `#/initials`). Two overview pages. Finals shows each of the six groups as a heading, its progress bar and a wrapping row of small tiles, one per final, linking to the group page: the final, its full form where the spelling is short (iu = iou), and a one-letter type label (S simple, C compound, N nasal) explained once in a key at the top; a short line under each group names its spelling points (hidden vowel, ü written u, fake i, o said as uo), and each tile's tooltip gives its type, syllable count and spelling points. Initials shows the 21 initials plus ∅ (no initial) by how they are made and by how hard they tend to be (easy, tougher, problem), with the y / w spelling table. Each group has a progress bar (solid and shaky shares, with the count in words). On Initials each group is a padded card with its description, progress bar and initials. The side navigation starts with a "Chart" title, centred, that leads back to the chart. On wide screens its foot has a **Hide panel** button that folds it to a slim rail (the chart link and a button to unfold it); the choice is remembered as a setting. On phones it is a strip that scrolls with that title pinned, and it does not fold.
- **Group pages** (`#/finals/e`, `#/initials/retroflex`). Every final group and every initial group has a page: its syllables as cards, a new / shaky / solid summary, links to the groups it is confused with, previous and next, and the same tone panel. A card shows one box per tone (the tone-marked letter above the example character); each box opens that tone. A key above the cards (one shared component, also on Browse pages) explains the boxes: new, shaky and solid colours, the line for a recording, the dot for no common character, and the dashed box for a tone that does not occur. Breadcrumbs (Chart › Finals › E group) are all links.
- **Browse** (`#/browse`). The same syllables by category, each derived from the data: finals by type (simple, compound, nasal, front nasal, back nasal), spelling tags (fake i, ü written u, o said as uo, hidden vowel, y / w spelling), and initials by difficulty (easy, tougher, problem) and articulation tag (null initial, unaspirated, aspirated, retroflex, palatal, dental sibilant). Where a grouping is not clear-cut (`er` among the compound finals, `s` among the easy initials) the page adds a short note.
- **Learn** (`#/learn`). Nine stages from the easiest sounds to the hardest: simple finals with easy initials; simple finals with tougher initials; compound finals; nasal finals; j q x; zh ch sh r; z c and the i of si; a review of spelling that hides the sound; neutral tones. Each stage page opens with a short list: what it covers, which initials and finals it uses (read from its syllables), which tones, and why it comes where it does. Below that is a still picture of the chart with only the stage's syllables filled in, at their true rows and columns (all 36 columns with their six groups; initial blocks with nothing in the stage are compressed into thin labelled bands; the caption reads "Syllables in this section. Rows with none are compressed."). It is drawn from the data on the page, so it follows any change to the chart, and it scrolls sideways inside its own box on a phone. Then come the syllables as study cards: one syllable per card, a row per tone with a Listen button, the example character and gloss, and a new / shaky / solid control; Open shows the full syllable. Progress comes from your own marks (a stage is "mostly solid" at four fifths). Nothing is locked: "Next up" recommends the first stage not yet mostly solid and lists the tones marked shaky. The stage definitions are data (`src/data/learn.ts`); the path stores nothing of its own.
- **Search.** `zhi`, `zhī`, `zhi1` or a character such as `知` all jump to the cell. `lv4`, `lü4` and `lu:4` are the same. Press `/` to focus the search box.
- **Syllable view.** Pick a tone to hear it. Each tone has its example character, gloss and up to three words (all editable), a new / shaky / solid status, your recordings, a compare block that plays native then yours, with swap, loop, 0.75× speed, waveforms and a pitch-contour overlay, and one note box, "Note on this tone". Below that are links to syllables it is confused with (with a button that plays the pair back to back).
- **Settings** (`#/settings`). Mode (system, light, dark); seven colour presets (warm paper, ink, sepia, cool slate, high contrast, linen, forest), all with the one vermilion accent; three typeface pairings (Source Serif & Sans, Literata & Inter, Noto Serif & Sans) and two Chinese faces (Song serif, Hei sans), all self-hosted subsets that work offline; four text sizes; chart density (compact, comfortable, spacious), detail in each square, square borders (hairline, ruled, none); tone colours off, standard or colour-blind safe; tone marks or numbers; example characters on or off; rare syllables shown or hidden; and reduce motion. Every segmented control gives each option an equal share with a hairline between options, and the chosen one is inset in its own segment; in Settings the labels wrap inside their segment, and on very narrow rows (small phones at the largest text size) the options stack. Settings live with your data, go into exports, and are applied before the first paint from a small cache (the settings themselves stay in IndexedDB).
- **Phones.** Below 860 px the top bar keeps search and the More menu, and a bottom tab bar holds Chart, Finals, Initials, Learn and My data (Browse moves into the More menu). The syllable panel becomes a bottom sheet that sits above the tab bar.
- **Hear it on Forvo.** Every tone panel has a link that opens forvo.com in a new tab: the page for the tone's example character (your own if you edited it), `https://forvo.com/word/<character>/`, or, where there is no character, a search for the pinyin among Mandarin entries, `https://forvo.com/search/<pinyin>/zh/`. It is a plain outbound link: nothing is fetched, embedded, cached or stored from Forvo, and it needs a connection.
- **Text size and the phone tab bar.** Text size is a CSS `zoom` on the app frame, and inside a zoomed element every length (viewport units and safe-area insets included) is multiplied by the zoom. So screen-relative sizes go through `--vh`, `--vw` and `--safe-*` (base.css), which divide by the text scale first: the frame is always exactly the visible viewport (`dvh`, so it follows the mobile address bar) and the tab bar sits flush at the bottom, growing with the text.
- **Keyboard.** Arrow keys move between syllables on the chart, Enter opens one, Escape closes it.

## Your data

All of it is in IndexedDB in the browser you used: notes, statuses, recordings (audio stored with its MIME type), edited characters and settings. Learn keeps nothing of its own: its progress is read from your statuses. Notes typed into the older per-syllable boxes ("How it sounds", "Watch out") were folded into the first tone's note on upgrade and are also kept, unseen, in a legacy store. It is kept apart from the bundled chart data, so app updates never touch it.

- **Backup and restore:** near the foot of *My data* (a tab on phones, in the top navigation on wide screens). **Export backup** writes one zip (`data.json` plus one audio file per recording) with your statuses, notes, recordings, edited characters and settings. **Restore from backup** replaces what is here by default: the option "Replace my current data with the backup" is ticked each time the page opens, and a confirmation step names what will be deleted. Clear it to combine instead: where both sides changed something the newer edit wins, and recordings are matched by id, so restoring the same file twice changes nothing. There is no share button; the backup is a normal download. A file that is not a backup is refused with a message saying why. Backups from every earlier version restore; fields of removed features are ignored (including an accent colour from before the accent became fixed).
- **Reset app:** the last section of *My data*. It deletes everything the app keeps on this device (statuses, and so Learn progress; notes; your recordings; edited characters; settings; the downloaded native recordings) after a second confirmation step that warns it cannot be undone and offers **Export backup first**. Escape or Cancel backs out. The service worker's copy of the app is kept, so the app still opens offline, and recordings stream and cache again when played. It works with the in-memory fallback too.
- **Persistence:** the app asks the browser for persistent storage the first time you save something and shows the answer on the *My data* page. Browsers decide this themselves; installing to the home screen makes a "yes" much more likely. Keep a backup either way.
- **Anki:** *My data → Anki* exports the tones matching the current chart filters as a CSV plus the native recordings.

## How the chart data is made

Nothing linguistic is typed in by hand. `scripts/build-data.ts` derives everything from downloaded sources and writes `src/data/generated/`.

| Source | Used for | Licence |
|---|---|---|
| [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) | readings, glosses, example words | CC BY-SA 4.0 |
| [Unihan](https://www.unicode.org/reports/tr38/) `kXHC1983`, `kTGHZ2013`, `kHanyuPinlu`, `kMandarin` | independent second source for readings | Unicode License v3 |
| [SUBTLEX-CH](https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch) | character and word frequency | free for research; cite Cai & Brysbaert (2010) |
| [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) | which words and single characters are taught, and at what level | MIT |

**Syllables.** A syllable is on the chart because a dictionary attests it, never because an initial and a final were combined. Four sources are compared (CC-CEDICT and three Unihan dictionary fields). A syllable or tone cell is `verified` when at least two agree. Cells with one source are kept in the data with `verified: false` and hidden unless you turn on *Rare syllables* (the app calls them rare).

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

- **Source:** the syllables set of *Audio-cmn*, 1,707 MP3 files recorded with SWAC Record and supplied as a local folder. Speaker: Chen Wang (王琛). Authors (from the file tags): Wang Chen, Lopez Hugo, Vion Nicolas, © 2013. Licence: CC BY-SA 3.0 (the file tags say `CC-BY-SA-3.0`; the set's README says "CC-by-sa"). **The set's web address is not given in the folder, so it is recorded as UNKNOWN** in the manifest; the About page credits the set by name without a link. The trimmed and levelled clips in `public/audio/` are adaptations and are shared under the same licence.
- **Files:** `cmn-{pinyin}{tone}.mp3`, tones 1–5 (5 = neutral), ü written `v` (`cmn-lv4.mp3`); after j, q, x and y the pinyin spelling is u, so `cmn-jv4.mp3` is the cell ju4. Names starting with `_` (`cmn-_hm1.mp3`, `cmn-_ng2.mp3`, …) are marked by the source as outside the standard syllables. Four files carry no tags and are sampled at 22.05 kHz instead of 48 kHz; the README attributes the whole set to the same speaker.
- **Processing** (`scripts/build-audio.ts`): high-pass filter, trim to the speech using each clip's own noise floor (weak onsets such as f, h, s and x are followed down to 1.5× the noise floor first, so they are not cut), level so the loud part of every syllable matches, short fades, mono 24 kHz MP3 at 48 kbit/s. Output is `public/audio/{syllable}{tone}.mp3`, with ü written `v` (`lv4.mp3`) and the neutral tone as 5.
- **Checks:** every clip must be one utterance of a syllable's length, start at the noise floor, have no clipped samples, and differ from every other tone of its syllable. The 19 neutral-tone files are judged as one set: 16 of them hold more than one syllable or run far longer than any syllable, and their median pitch is about an octave below the speaker's first tones, so none is used. The result is in `reports/audio-coverage.md`.
- **Manifest:** `audio-manifest.json` lists source, speaker, licence, authors and original file name for every clip, plus every excluded file and why. The About page shows the attribution.
- **Coverage:** 1,302 clips, 5.5 MB. Every visible cell of the four full tones has one; the 166 visible neutral-tone cells have none. The app shows a plain "No recording" where a clip is missing, and the About page's Limitations say neutral tones have no native recording (that line is worked out from the actual coverage). 398 files in the set match no cell on the chart and are listed in the report.
- **At run time** (`src/lib/audio.ts`): clips are plain static files, cached in Cache Storage under `native-audio-v2` the first time a syllable is played or all at once from *My data*, and played through one shared audio element fed with blob URLs and unlocked inside a tap (iOS Safari needs that for sequences and looping). The bucket name changes whenever the recordings are replaced; any other bucket (such as `native-audio-v1`, which held the previous recordings) is deleted at startup, and clips are fetched with revalidation so the browser's HTTP cache cannot hand back an old one.
- **Regenerating:** put the folder at `.cache/sources/audio-cmn/syllabs/` (gitignored, not committed) and run `npm run data:audio` (needs ffmpeg and ffprobe), or point at another folder with `npm run data:audio -- --source <folder>`. Nothing is downloaded.

## Pitch overlay and recordings

The compare block draws the pitch contour of the native clip and of your take on one chart. Both go through the same tracker, `src/lib/pitch.ts` (YIN with parabolic interpolation, 60–600 Hz, voicing decided from the normalised difference and from level relative to the clip's own noise floor, octave correction, light median smoothing). By default each trace is in semitones around that speaker's own median, so a low voice overlays a high one and you compare shapes; **Absolute Hz** (remembered as a setting) shows the real pitches on a logarithmic axis. The axis fits both traces with padding, and each trace is labelled with its median in Hz. When no contour can be measured for a take the chart says why (too quiet, too short, mostly unvoiced, clipped, or not decodable in this browser) and what to try, instead of showing nothing.

Recording asks the browser for raw audio: `echoCancellation`, `noiseSuppression` and `autoGainControl` are all off, because those stages reshape a sustained tone.

**Why takes used to have no contour** (`scripts/diagnose-pitch.ts` → `reports/pitch-diagnosis.md`). Test-tone glides sent through the real recording path (WebM/Opus and MP4/AAC, decoded at 44.1 and 48 kHz) tracked fine with the old code, so codecs, sample rates and silence trimming were not the problem. Level gating was: the old tracker kept only frames above 12% of the clip's peak, so a tap on the device just before a quiet take removed the whole contour (832 of the 1,281 native clips then in use, in that test; 5 with the new tracker). Its absolute clarity threshold also dropped breathy or creaky speech. The new tracker gates 6 dB above the clip's own noise floor and corrects octaves; on the native clips it returns a contour for every clean clip and loses 4 under added room noise (the old one lost 6).

## Typefaces and icons

Three Latin pairings and two Chinese faces, all under the SIL Open Font License: Source Serif 4 + Source Sans 3 (Adobe), Literata (TypeTogether) + Inter (Rasmus Andersson), Noto Serif + Noto Sans (Google), and Source Han Serif + Source Han Sans (Adobe). `scripts/build-fonts.py` downloads them, subsets the Latin faces to ASCII, Latin-1, every pinyin vowel with a tone mark and common punctuation, and the Han faces to exactly the characters the data uses, then renames them ("Chart Serif", "Chart Sans B", "Chart Han Sans", …) as the licence requires of modified versions. IBM Plex was tried and dropped: it lacks the caron vowels (ǎ ǐ ǒ ǔ), so it cannot set third tones. The licence texts are in `src/assets/fonts/licences/`. Icons are [Lucide](https://lucide.dev) (ISC).

## Layout

```
src/data/            initials, finals, blocks, categories, learn (the stages), themes, tags, confusable pairs
src/data/generated/  syllables.json, cells.json, char-index.json, audio-index.json (built by scripts)
src/lib/             pinyin spelling, IndexedDB, state, audio player and cache, recorder, pitch tracker (pitch.ts) and overlay axis (overlay.ts), export/import
src/components/      chart, detail view, syllable card, overview / group / browse / learn pages, navigation
src/styles/          tokens and layout; fonts.css is generated
scripts/             data, audio, font and icon builders; curation.ts; diagnose-pitch
tests/               data invariants, pinyin logic, pitch tracker, contrast, routes and breadcrumbs, stages and progress, stage pictures, categories, scopes, Forvo links, the audio index, links to removed pages, database upgrade and backup round trip, export format
public/audio/        the native clips
audio-manifest.json  attribution for every clip
reports/             data-report.md, audio-coverage.md, pitch-diagnosis.md
```

## What has and has not been tested

Tested in a real browser (Firefox 159, headless, with a simulated microphone, at 1440×900 and 390×844, light and dark): native playback across tones (ma1, fa2, o2, xin3, ju4, he4), recording and saving your recordings, best recording, rename, native-then-mine comparison with the pitch overlay, every segmented control in Settings and the tone panel (at 1440, 390, 360 and 320 px, Normal and Larger text), the Initials and Finals overview spacing, the card key on group and Browse pages, the About page, page titles, Reset app (confirm step, Escape, export from the warning, everything gone at once, audio kept, app usable after), no sideways page scroll at 320, 360, 390, 768 and 1440 px with Normal and Larger text on every page, the overview, group, browse and learn pages (all nine stages with their fact lists and chart pictures, left-aligned, no sideways page scroll on a phone), the Finals / Initials panel (folding and unfolding with the keyboard, the folded state surviving a reload, the phone strip's labels on the same line as their items), breadcrumbs, old links to the removed section landing on Learn, the phone tab bar and bottom sheet, notes autosave, status and heatmap, character edits, search, keyboard navigation, the back button, backup (status, note, recording and edited character), wiping the database, restoring, restoring the same file again (nothing added), a malformed zip, Anki export, the old audio cache being deleted, downloading all audio, and loading and playing with the server stopped.

Not tested, because no device was available:

- **iOS Safari and Android Chrome on a phone.** The code follows the known requirements (one shared audio element started from a tap, MP4/AAC accepted and preferred for recording, the stored MIME type used on playback, 16 px inputs so the page does not zoom), but please run through record → compare → export on your iPhone once.
- **Chrome and Safari on desktop.** Nothing browser-specific is used beyond MediaRecorder, IndexedDB, Cache Storage and Web Audio.
- **Recordings crossing browsers.** The app asks the browser for MP4/AAC first because it plays everywhere; Safari records it, and recent Chrome should too. Firefox records WebM/Opus only, which some iOS versions cannot play, so a take recorded in Firefox may be silent on an iPhone. If playback fails the app says so rather than failing silently.

## Open items

- **Reference chart image.** The image was not attached when this was built, so the syllable set has not been compared against it cell by cell. `reports/data-report.md` has the evidence for the rare cells (dia, lo, den, rua, nun, eng, ê and others).
- **Unverified data** is listed in `reports/data-report.md` and `reports/audio-coverage.md`. The app shows single-source syllables as "Rare" (hidden by default) and no longer shows the other build flags.

## Licences

The app code is yours to license as you wish. The bundled example data derives from CC-CEDICT and carries its CC BY-SA 4.0 licence. SUBTLEX-CH is published for research use; only frequency ranks derived from it are bundled. The native audio clips are adapted from the Audio-cmn syllables set (speaker Chen Wang; authors Wang Chen, Lopez Hugo, Vion Nicolas) under CC BY-SA 3.0, and the adapted clips are shared under the same licence; the set's web address is UNKNOWN (see Native audio). See the table above and the About page for the rest.
