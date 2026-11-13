# Pitch contour diagnosis

Generated 2026-11-12 by `scripts/diagnose-pitch.ts`. "Old" is the tracker the app shipped before Round 2; "new" is `src/lib/pitch.ts`.

## 1. Test-tone glides through the recording path

Each glide is encoded as a browser would record it, decoded at the sample rates AudioContexts use, trimmed with speechBounds, then tracked.

| Signal | Codec | Decode rate | Trim | Old: points, direction | New: points, direction, median Hz |
|---|---|---|---|---|---|
| low 70→120 Hz | WAV | 48000 | 0.29–1.07 s | 58, rising | 59, rising, 95.7 |
| low 70→120 Hz | WebM/Opus (Chrome, Firefox) | 48000 | 0.29–1.07 s | 58, rising | 59, rising, 95.7 |
| low 70→120 Hz | WebM/Opus (Chrome, Firefox) | 44100 | 0.29–1.07 s | 58, rising | 59, rising, 95.7 |
| low 70→120 Hz | MP4/AAC (Safari) | 48000 | 0.29–1.07 s | 58, rising | 59, rising, 95.7 |
| low 70→120 Hz | MP4/AAC (Safari) | 44100 | 0.29–1.07 s | 58, rising | 59, rising, 95.7 |
| low 120→70 Hz | WAV | 48000 | 0.29–1.07 s | 57, falling | 59, falling, 94.8 |
| low 120→70 Hz | WebM/Opus (Chrome, Firefox) | 48000 | 0.29–1.07 s | 57, falling | 59, falling, 94.8 |
| low 120→70 Hz | WebM/Opus (Chrome, Firefox) | 44100 | 0.29–1.07 s | 57, falling | 59, falling, 94.8 |
| low 120→70 Hz | MP4/AAC (Safari) | 48000 | 0.29–1.07 s | 57, falling | 59, falling, 94.8 |
| low 120→70 Hz | MP4/AAC (Safari) | 44100 | 0.29–1.07 s | 57, falling | 59, falling, 94.8 |
| mid 100→200 Hz | WAV | 48000 | 0.29–1.07 s | 60, rising | 61, rising, 151.3 |
| mid 100→200 Hz | WebM/Opus (Chrome, Firefox) | 48000 | 0.29–1.07 s | 60, rising | 61, rising, 151.3 |
| mid 100→200 Hz | WebM/Opus (Chrome, Firefox) | 44100 | 0.29–1.07 s | 60, rising | 61, rising, 151.3 |
| mid 100→200 Hz | MP4/AAC (Safari) | 48000 | 0.29–1.07 s | 60, rising | 61, rising, 151.3 |
| mid 100→200 Hz | MP4/AAC (Safari) | 44100 | 0.29–1.07 s | 60, rising | 61, rising, 151.3 |
| mid 200→100 Hz | WAV | 48000 | 0.29–1.07 s | 59, falling | 61, falling, 150.4 |
| mid 200→100 Hz | WebM/Opus (Chrome, Firefox) | 48000 | 0.29–1.07 s | 59, falling | 61, falling, 150.3 |
| mid 200→100 Hz | WebM/Opus (Chrome, Firefox) | 44100 | 0.29–1.07 s | 59, falling | 61, falling, 150.3 |
| mid 200→100 Hz | MP4/AAC (Safari) | 48000 | 0.29–1.07 s | 59, falling | 61, falling, 150.4 |
| mid 200→100 Hz | MP4/AAC (Safari) | 44100 | 0.29–1.07 s | 59, falling | 61, falling, 150.4 |
| high 180→350 Hz | WAV | 48000 | 0.29–1.07 s | 61, rising | 62, rising, 265.8 |
| high 180→350 Hz | WebM/Opus (Chrome, Firefox) | 48000 | 0.29–1.07 s | 61, rising | 62, rising, 265.7 |
| high 180→350 Hz | WebM/Opus (Chrome, Firefox) | 44100 | 0.29–1.07 s | 61, rising | 62, rising, 265.7 |
| high 180→350 Hz | MP4/AAC (Safari) | 48000 | 0.29–1.07 s | 61, rising | 62, rising, 265.7 |
| high 180→350 Hz | MP4/AAC (Safari) | 44100 | 0.29–1.07 s | 61, rising | 62, rising, 265.7 |
| high 350→180 Hz | WAV | 48000 | 0.29–1.07 s | 61, falling | 62, falling, 264.7 |
| high 350→180 Hz | WebM/Opus (Chrome, Firefox) | 48000 | 0.29–1.07 s | 61, falling | 62, falling, 264.7 |
| high 350→180 Hz | WebM/Opus (Chrome, Firefox) | 44100 | 0.29–1.07 s | 61, falling | 62, falling, 264.7 |
| high 350→180 Hz | MP4/AAC (Safari) | 48000 | 0.29–1.07 s | 61, falling | 62, falling, 264.8 |
| high 350→180 Hz | MP4/AAC (Safari) | 44100 | 0.29–1.07 s | 61, falling | 62, falling, 264.8 |
| mid, quiet (−32 dBFS) | WAV | 48000 | 0.29–1.07 s | 60, rising | 59, rising, 149.9 |
| mid, quiet (−32 dBFS) | WebM/Opus (Chrome, Firefox) | 48000 | 0.29–1.07 s | 60, rising | 59, rising, 149.8 |
| mid, quiet (−32 dBFS) | WebM/Opus (Chrome, Firefox) | 44100 | 0.29–1.07 s | 60, rising | 59, rising, 149.8 |
| mid, quiet (−32 dBFS) | MP4/AAC (Safari) | 48000 | 0.29–1.07 s | 60, rising | 59, rising, 149.9 |
| mid, quiet (−32 dBFS) | MP4/AAC (Safari) | 44100 | 0.29–1.07 s | 60, rising | 59, rising, 149.9 |
| mid, quiet + room noise | WAV | 48000 | 0.31–1.04 s | 57, rising | 59, rising, 149.8 |
| mid, quiet + room noise | WebM/Opus (Chrome, Firefox) | 48000 | 0.30–1.05 s | 57, rising | 59, rising, 149.8 |
| mid, quiet + room noise | WebM/Opus (Chrome, Firefox) | 44100 | 0.30–1.05 s | 57, rising | 59, rising, 149.9 |
| mid, quiet + room noise | MP4/AAC (Safari) | 48000 | 0.30–1.05 s | 57, rising | 59, rising, 149.7 |
| mid, quiet + room noise | MP4/AAC (Safari) | 44100 | 0.30–1.05 s | 57, rising | 59, rising, 149.8 |
| mid, tap click before | WAV | 48000 | 0.30–1.06 s | 60, rising | 61, rising, 151.3 |
| mid, tap click before | WebM/Opus (Chrome, Firefox) | 48000 | 0.07–1.07 s | 60, rising | 61, rising, 151.3 |
| mid, tap click before | WebM/Opus (Chrome, Firefox) | 44100 | 0.07–1.07 s | 60, rising | 61, rising, 151.3 |
| mid, tap click before | MP4/AAC (Safari) | 48000 | 0.07–1.07 s | 60, rising | 61, rising, 151.3 |
| mid, tap click before | MP4/AAC (Safari) | 44100 | 0.07–1.07 s | 60, rising | 61, rising, 151.3 |
| mid, quiet + tap click | WAV | 48000 | 0.39–0.70 s | 26, rising | 27, rising, 131.6 |
| mid, quiet + tap click | WebM/Opus (Chrome, Firefox) | 48000 | 0.07–1.06 s | 60, rising | 59, rising, 149.8 |
| mid, quiet + tap click | WebM/Opus (Chrome, Firefox) | 44100 | 0.07–1.06 s | 60, rising | 59, rising, 149.8 |
| mid, quiet + tap click | MP4/AAC (Safari) | 48000 | 0.07–1.07 s | 60, rising | 59, rising, 149.9 |
| mid, quiet + tap click | MP4/AAC (Safari) | 44100 | 0.07–1.07 s | 60, rising | 59, rising, 149.9 |
| low, quiet + tap click | WAV | 48000 | 0.33–0.95 s | 55, rising | 56, rising, 94.4 |
| low, quiet + tap click | WebM/Opus (Chrome, Firefox) | 48000 | 0.07–1.07 s | 58, rising | 58, rising, 95.3 |
| low, quiet + tap click | WebM/Opus (Chrome, Firefox) | 44100 | 0.07–1.07 s | 58, rising | 58, rising, 95.3 |
| low, quiet + tap click | MP4/AAC (Safari) | 48000 | 0.07–1.07 s | 58, rising | 58, rising, 95.3 |
| low, quiet + tap click | MP4/AAC (Safari) | 44100 | 0.07–1.07 s | 58, rising | 58, rising, 95.3 |
| very low 60→90 Hz | WAV | 48000 | 0.29–1.07 s | 47, rising | 59, rising, 75.5 |
| very low 60→90 Hz | WebM/Opus (Chrome, Firefox) | 48000 | 0.29–1.07 s | 47, rising | 59, rising, 75.5 |
| very low 60→90 Hz | WebM/Opus (Chrome, Firefox) | 44100 | 0.29–1.07 s | 46, rising | 59, rising, 75.5 |
| very low 60→90 Hz | MP4/AAC (Safari) | 48000 | 0.29–1.07 s | 47, rising | 59, rising, 75.5 |
| very low 60→90 Hz | MP4/AAC (Safari) | 44100 | 0.29–1.07 s | 47, rising | 59, rising, 75.5 |

Old tracker: 0 of 60 runs returned no contour, 0 the wrong direction. New: 0 empty, 0 wrong.

## 2. The native clips as a regression set (real speech)

Every clip in public/audio, decoded at 48 kHz like a recording, clean and under microphone-like conditions.

| Clips | Old: no contour | Old: under 10 points | New: no contour | Mean points old / new | Mic-like noise: old / new empty | Quiet + tap click: old / new empty |
|---|---|---|---|---|---|---|
| 1281 | 4 | 11 | 0 | 42.7 / 45.3 | 6 / 4 | 832 / 5 |
