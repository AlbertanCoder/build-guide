#!/usr/bin/env python3
"""
Make the app icons from one logo SVG.

    python scripts/standalone/make-icons.py                      # uses shad-drone-icon.svg
    python scripts/standalone/make-icons.py docs/images/logo/logo-B.svg

Writes docs/icons/:
    icon-192.png, icon-512.png        the installable-app icons (transparent corners)
    icon-maskable-512.png             full-bleed square; the logo sits inside the safe zone so any OS mask is safe
    apple-touch-icon.png              180 x 180 for iOS
    favicon.ico                       16, 24, 32, 48, 64, 128, 256 px, also used for the desktop shortcut

Needs Pillow and Playwright for Python (Chromium draws the SVG). No other packages.
"""
import io
import os
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(REPO, "shad-drone-icon.svg")
OUT = os.path.join(REPO, "docs", "icons")
MASK_BG = (18, 58, 46, 255)   # the page's deep pine, #123a2e
SAFE = 0.72                   # share of a maskable icon the logo may use (the safe zone is the middle 80%)

os.makedirs(OUT, exist_ok=True)
svg = open(SRC, encoding="utf-8").read()


def render(px):
    """Draw the SVG at px x px with a transparent background and return a Pillow image."""
    import re
    sized = re.sub(r'(<svg[^>]*?)\swidth="[^"]*"\sheight="[^"]*"', r'\1', svg, count=1)
    sized = sized.replace("<svg ", '<svg width="%d" height="%d" ' % (px, px), 1)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": px, "height": px})
        pg.set_content('<body style="margin:0;background:transparent">' + sized + "</body>")
        png = pg.locator("svg").screenshot(omit_background=True)
        b.close()
    return Image.open(io.BytesIO(png)).convert("RGBA")


big = render(1024)


def at(px):
    return big.resize((px, px), Image.LANCZOS)


at(192).save(os.path.join(OUT, "icon-192.png"))
at(512).save(os.path.join(OUT, "icon-512.png"))
at(180).save(os.path.join(OUT, "apple-touch-icon.png"))

mask = Image.new("RGBA", (512, 512), MASK_BG)
inner = at(int(512 * SAFE))
off = (512 - inner.width) // 2
mask.alpha_composite(inner, (off, off))
mask.save(os.path.join(OUT, "icon-maskable-512.png"))

sizes = [(s, s) for s in (16, 24, 32, 48, 64, 128, 256)]
at(256).save(os.path.join(OUT, "favicon.ico"), format="ICO", sizes=sizes)

print("source:", os.path.relpath(SRC, REPO))
for f in sorted(os.listdir(OUT)):
    print("  docs/icons/" + f, os.path.getsize(os.path.join(OUT, f)), "bytes")
