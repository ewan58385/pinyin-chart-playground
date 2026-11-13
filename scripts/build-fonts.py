#!/usr/bin/env python3
"""
Builds the self-hosted, subsetted web fonts:

  src/assets/fonts/chart-serif.woff2      Source Serif 4  (headings, pinyin)       pairing "source"
  src/assets/fonts/chart-sans.woff2       Source Sans 3   (interface text)
  src/assets/fonts/chart-serif-b.woff2    Literata                                 pairing "literata"
  src/assets/fonts/chart-sans-b.woff2     Inter
  src/assets/fonts/chart-serif-c.woff2    Noto Serif                               pairing "noto"
  src/assets/fonts/chart-sans-c.woff2     Noto Sans
  src/assets/fonts/chart-han-core.woff2   Source Han Serif CN Medium: the characters shown on the chart
  src/assets/fonts/chart-han-more.woff2   ...the extra characters used in example words and glosses
  src/assets/fonts/chart-han-sans-*.woff2 Source Han Sans CN Medium, the same two subsets
  src/styles/fonts.css                    @font-face rules, with unicode-range for the Han files

The Han subset covers exactly the characters in src/data/generated/font-chars.json,
so rerun this after `npm run data:build` changes the data.

The source fonts are under the SIL Open Font License, several with Reserved
Font Names. A subset is a modified version, so every output font is renamed
("Chart Serif", "Chart Sans B", "Chart Han Sans", ...) and keeps its copyright
and licence records. The Latin subsets cover ASCII, Latin-1, every pinyin
vowel with a tone mark and common punctuation; the Han subsets cover exactly
the characters in src/data/generated/font-chars.json.

Needs: python3 -m pip install fonttools brotli
Run:   npm run data:fonts
"""
import io
import json
import shutil
import sys
import urllib.request
from pathlib import Path

try:
    from fontTools import subset
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
    import brotli  # noqa: F401  (needed by fontTools to write woff2)
except ImportError as err:  # pragma: no cover
    sys.exit(f"Missing Python package ({err.name}). Run: python3 -m pip install fonttools brotli")

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "fonts"
OUT = ROOT / "src" / "assets" / "fonts"

SOURCES = {
    "serif": {
        "home": "https://github.com/adobe-fonts/source-serif",
        "dir": "source-serif-4",
        "file": "SourceSerif4[opsz,wght].ttf",
        "url": "https://github.com/google/fonts/raw/main/ofl/sourceserif4/SourceSerif4%5Bopsz%2Cwght%5D.ttf",
        "licence": ("OFL.txt", "https://github.com/google/fonts/raw/main/ofl/sourceserif4/OFL.txt"),
    },
    "sans": {
        "home": "https://github.com/adobe-fonts/source-sans",
        "dir": "source-sans-3",
        "file": "SourceSans3[wght].ttf",
        "url": "https://github.com/google/fonts/raw/main/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf",
        "licence": ("OFL.txt", "https://github.com/google/fonts/raw/main/ofl/sourcesans3/OFL.txt"),
    },
    "han": {
        "home": "https://github.com/adobe-fonts/source-han-serif",
        "dir": "source-han-serif",
        "file": "SourceHanSerifCN-Medium.otf",
        "url": "https://github.com/adobe-fonts/source-han-serif/raw/release/SubsetOTF/CN/SourceHanSerifCN-Medium.otf",
        "licence": ("LICENSE.txt", "https://github.com/adobe-fonts/source-han-serif/raw/release/LICENSE.txt"),
    },
    "han-sans": {
        "home": "https://github.com/adobe-fonts/source-han-sans",
        "dir": "source-han-sans",
        "file": "SourceHanSansCN-Medium.otf",
        "url": "https://github.com/adobe-fonts/source-han-sans/raw/release/SubsetOTF/CN/SourceHanSansCN-Medium.otf",
        "licence": ("LICENSE.txt", "https://github.com/adobe-fonts/source-han-sans/raw/release/LICENSE.txt"),
    },
    "literata": {
        "home": "https://github.com/googlefonts/literata",
        "dir": "literata",
        "file": "Literata[opsz,wght].ttf",
        "url": "https://github.com/google/fonts/raw/main/ofl/literata/Literata%5Bopsz%2Cwght%5D.ttf",
        "licence": ("OFL.txt", "https://github.com/google/fonts/raw/main/ofl/literata/OFL.txt"),
    },
    "inter": {
        "home": "https://github.com/rsms/inter",
        "dir": "inter",
        "file": "Inter[opsz,wght].ttf",
        "url": "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
        "licence": ("OFL.txt", "https://github.com/google/fonts/raw/main/ofl/inter/OFL.txt"),
    },
    "noto-serif": {
        "home": "https://github.com/notofonts/latin-greek-cyrillic",
        "dir": "noto-serif",
        "file": "NotoSerif[wdth,wght].ttf",
        "url": "https://github.com/google/fonts/raw/main/ofl/notoserif/NotoSerif%5Bwdth%2Cwght%5D.ttf",
        "licence": ("OFL.txt", "https://github.com/google/fonts/raw/main/ofl/notoserif/OFL.txt"),
    },
    "noto-sans": {
        "home": "https://github.com/notofonts/latin-greek-cyrillic",
        "dir": "noto-sans",
        "file": "NotoSans[wdth,wght].ttf",
        "url": "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf",
        "licence": ("OFL.txt", "https://github.com/google/fonts/raw/main/ofl/notosans/OFL.txt"),
    },
}

# Latin: ASCII, Latin-1, every pinyin vowel with a tone mark, and common punctuation.
PINYIN = "āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüêńňǹḿĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙǕǗǙǛÜ"
PUNCT = "‐‑–—‘’“”„†•…′″‹›€←↑→↓↔−≈≠≤≥×÷·°½¼¾"
LATIN = set(range(0x20, 0x7F)) | set(range(0xA0, 0x100)) | {ord(c) for c in PINYIN + PUNCT}
# Symbols and CJK punctuation the Han font also supplies.
HAN_EXTRA = "∅，。、；：？！（）《》〈〉「」“”‘’…—·～〇"
LATIN_FEATURES = ["kern", "liga", "ccmp", "locl", "mark", "mkmk", "tnum", "lnum", "pnum", "onum", "case", "frac", "zero"]


def fetch(key: str) -> Path:
    src = SOURCES[key]
    folder = CACHE / src["dir"]
    folder.mkdir(parents=True, exist_ok=True)
    for name, url in [(src["file"], src["url"]), src["licence"]]:
        path = folder / name
        if not path.exists():
            print("Downloading", url)
            req = urllib.request.Request(url, headers={"User-Agent": "font-fetch"})
            with urllib.request.urlopen(req, timeout=300) as res, open(path, "wb") as out:
                shutil.copyfileobj(res, out)
    return folder / src["file"]


def rename(font: TTFont, family: str) -> None:
    """Drop the reserved font name from the name table, keeping copyright and licence records."""
    ps = family.replace(" ", "")
    replace = {1: family, 4: family, 6: ps, 16: family, 3: f"{ps};subset", 25: ps}
    name = font["name"]
    name.names = [n for n in name.names if n.nameID not in (17, 18, 21, 22)]
    for record in name.names:
        if record.nameID in replace:
            record.string = replace[record.nameID]
    if "CFF " in font:
        cff = font["CFF "].cff
        cff.fontNames = [ps]
        top = cff.topDictIndex[0]
        for attr in ("FullName", "FamilyName"):
            if hasattr(top, attr):
                setattr(top, attr, family)


def build(key: str, out_name: str, family: str, unicodes, limits=None, features=None) -> int:
    font = TTFont(fetch(key))
    if limits:
        # Narrow the variable axes, then reload: the subsetter needs a freshly parsed gvar table.
        buf = io.BytesIO()
        instancer.instantiateVariableFont(font, limits).save(buf)
        buf.seek(0)
        font = TTFont(buf)
    opts = subset.Options()
    opts.layout_features = features or ["ccmp", "locl"]
    opts.name_IDs = ["*"]
    opts.name_languages = [0x409]
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    opts.drop_tables += ["DSIG", "BASE", "vhea", "vmtx", "VORG"]
    subsetter = subset.Subsetter(opts)
    subsetter.populate(unicodes=sorted(unicodes))
    subsetter.subset(font)
    rename(font, family)
    font.flavor = "woff2"
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / out_name
    font.save(path)
    covered = set(font.getBestCmap())
    missing = sorted(set(unicodes) - covered)
    size = path.stat().st_size
    print(f"{out_name}: {size / 1024:.0f} KB, {len(covered)} characters" + (f", not in source font: {''.join(map(chr, missing))}" if missing else ""))
    return size


def unicode_range(codepoints) -> str:
    cps = sorted(set(codepoints))
    parts, start, prev = [], None, None
    for cp in cps:
        if start is None:
            start = prev = cp
        elif cp == prev + 1:
            prev = cp
        else:
            parts.append((start, prev))
            start = prev = cp
    if start is not None:
        parts.append((start, prev))
    return ", ".join(f"U+{a:X}" if a == b else f"U+{a:X}-{b:X}" for a, b in parts)


def attribution_han() -> str:
    """Han characters in the audio attribution shown on the About page (the speaker's name)."""
    index = json.loads((ROOT / "src" / "data" / "generated" / "audio-index.json").read_text("utf8"))
    text = json.dumps(index.get("sources", {}), ensure_ascii=False)
    return "".join(sorted({c for c in text if "\u3400" <= c <= "\u9fff" or "\uf900" <= c <= "\ufaff"}))


# Which subset files come from which source font.
OUTPUTS = {
    "serif": ["chart-serif.woff2"],
    "sans": ["chart-sans.woff2"],
    "literata": ["chart-serif-b.woff2"],
    "inter": ["chart-sans-b.woff2"],
    "noto-serif": ["chart-serif-c.woff2"],
    "noto-sans": ["chart-sans-c.woff2"],
    "han": ["chart-han-core.woff2", "chart-han-more.woff2"],
    "han-sans": ["chart-han-sans-core.woff2", "chart-han-sans-more.woff2"],
}


def write_info() -> None:
    """Name, version, copyright and licence of each source font, read from the font files, for the credits."""
    info = []
    for key, src in SOURCES.items():
        sub = TTFont(OUT / OUTPUTS[key][0])
        n = sub["name"]
        orig = TTFont(CACHE / src["dir"] / src["file"], lazy=True) if (CACHE / src["dir"] / src["file"]).exists() else None
        name = (orig and (orig["name"].getDebugName(16) or orig["name"].getDebugName(1))) or src["dir"]
        info.append({
            "id": key,
            "name": name,
            "version": (n.getDebugName(5) or "").strip(),
            "copyright": (n.getDebugName(0) or "").strip(),
            "licence": "SIL Open Font License 1.1",
            "licenceFile": f"src/assets/fonts/licences/{src['dir']}-{src['licence'][0]}",
            "url": src["home"],
            "files": OUTPUTS[key],
            "renamedTo": n.getDebugName(1),
        })
    (OUT / "font-info.json").write_text(json.dumps(info, ensure_ascii=False, indent=1) + "\n", "utf8")


def main() -> None:
    if "--info-only" in sys.argv:
        write_info()
        return
    chars = json.loads((ROOT / "src" / "data" / "generated" / "font-chars.json").read_text("utf8"))
    core = {ord(c) for c in chars["chart"] + HAN_EXTRA}
    more = {ord(c) for c in chars["detail"] + attribution_han()} - core

    total = 0
    total += build("serif", "chart-serif.woff2", "Chart Serif", LATIN, {"wght": (400, 700)}, LATIN_FEATURES)
    total += build("sans", "chart-sans.woff2", "Chart Sans", LATIN, {"wght": (400, 700)}, LATIN_FEATURES)
    total += build("literata", "chart-serif-b.woff2", "Chart Serif B", LATIN, {"wght": (400, 700), "opsz": 14}, LATIN_FEATURES)
    total += build("inter", "chart-sans-b.woff2", "Chart Sans B", LATIN, {"wght": (400, 700), "opsz": 14}, LATIN_FEATURES)
    total += build("noto-serif", "chart-serif-c.woff2", "Chart Serif C", LATIN, {"wght": (400, 700), "wdth": 100}, LATIN_FEATURES)
    total += build("noto-sans", "chart-sans-c.woff2", "Chart Sans C", LATIN, {"wght": (400, 700), "wdth": 100}, LATIN_FEATURES)
    total += build("han", "chart-han-core.woff2", "Chart Han", core)
    total += build("han", "chart-han-more.woff2", "Chart Han", more)
    total += build("han-sans", "chart-han-sans-core.woff2", "Chart Han Sans", core)
    total += build("han-sans", "chart-han-sans-more.woff2", "Chart Han Sans", more)

    licences = OUT / "licences"
    licences.mkdir(exist_ok=True)
    for key, src in SOURCES.items():
        shutil.copyfile(CACHE / src["dir"] / src["licence"][0], licences / f"{src['dir']}-{src['licence'][0]}")

    def face(family, file, weight="400 700", extra=""):
        return f"""@font-face {{
  font-family: '{family}';
  src: url('../assets/fonts/{file}') format('woff2');
  font-weight: {weight};
  font-style: normal;
  font-display: swap;{extra}
}}
"""

    core_range = f"\n  unicode-range: {unicode_range(core)};"
    more_range = f"\n  unicode-range: {unicode_range(more)};"
    css = "/* Generated by scripts/build-fonts.py. Do not edit by hand. */\n"
    css += "/* Pairing 'source': Source Serif 4 + Source Sans 3. */\n"
    css += face("Chart Serif", "chart-serif.woff2") + face("Chart Sans", "chart-sans.woff2")
    css += "/* Pairing 'literata': Literata + Inter. */\n"
    css += face("Chart Serif B", "chart-serif-b.woff2") + face("Chart Sans B", "chart-sans-b.woff2")
    css += "/* Pairing 'noto': Noto Serif + Noto Sans. */\n"
    css += face("Chart Serif C", "chart-serif-c.woff2") + face("Chart Sans C", "chart-sans-c.woff2")
    css += "/* The characters on the chart itself, then the extra characters in example words and glosses (fetched when first needed). */\n"
    css += face("Chart Han", "chart-han-core.woff2", extra=core_range) + face("Chart Han", "chart-han-more.woff2", extra=more_range)
    css += "/* The same two subsets of a sans-serif Han face. */\n"
    css += face("Chart Han Sans", "chart-han-sans-core.woff2", extra=core_range) + face("Chart Han Sans", "chart-han-sans-more.woff2", extra=more_range)
    (ROOT / "src" / "styles").mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "styles" / "fonts.css").write_text(css, "utf8")
    write_info()
    print(f"Total {total / 1024:.0f} KB. Wrote src/styles/fonts.css")


if __name__ == "__main__":
    main()
