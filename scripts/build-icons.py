#!/usr/bin/env python3
"""
Draws the app icons: a vermilion seal with the character 拼 (pīn, as in 拼音).

  public/pwa-192.png, public/pwa-512.png     home-screen icons
  public/pwa-maskable-512.png                full-bleed version for Android's icon masks
  public/apple-touch-icon.png                180 px, opaque, for iOS
  public/favicon.png                         browser tab

Needs Pillow and the Source Han Serif font that build-fonts.py downloads.
Run: python3 scripts/build-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / ".cache" / "fonts" / "source-han-serif" / "SourceHanSerifCN-SemiBold.otf"
OUT = ROOT / "public"
VERMILION = (176, 55, 42, 255)
PAPER = (247, 244, 238, 255)
GLYPH = "拼"


def draw(size: int, radius_ratio: float, glyph_ratio: float, background=None) -> Image.Image:
    scale = 4  # draw large and downsample for clean edges
    s = size * scale
    img = Image.new("RGBA", (s, s), background or (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * radius_ratio), fill=VERMILION)
    font = ImageFont.truetype(str(FONT), int(s * glyph_ratio))
    left, top, right, bottom = d.textbbox((0, 0), GLYPH, font=font)
    x = (s - (right - left)) / 2 - left
    y = (s - (bottom - top)) / 2 - top
    d.text((x, y), GLYPH, font=font, fill=PAPER)
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    if not FONT.exists():
        raise SystemExit(f"Font not found: {FONT}\nDownload it from https://github.com/adobe-fonts/source-han-serif (SubsetOTF/CN).")
    OUT.mkdir(exist_ok=True)
    draw(192, 0.19, 0.66).save(OUT / "pwa-192.png")
    draw(512, 0.19, 0.66).save(OUT / "pwa-512.png")
    # Maskable: no rounded corners, glyph inside the central 80% safe zone.
    draw(512, 0.0, 0.52).save(OUT / "pwa-maskable-512.png")
    # iOS rounds the corners itself and wants no transparency.
    draw(180, 0.0, 0.62, background=VERMILION).convert("RGB").save(OUT / "apple-touch-icon.png")
    draw(64, 0.19, 0.7).save(OUT / "favicon.png")
    print("Wrote icons to", OUT)


if __name__ == "__main__":
    main()
