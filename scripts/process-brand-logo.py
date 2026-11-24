#!/usr/bin/env python3
"""
Reusable branding asset generator for AlumTrack.

Reads the source "Alumtrack 01 logo" image from the user's Pictures folder,
keys out a solid near-black background if the source is flattened, and writes
a clean transparent PNG plus all favicon sizes used by the app.

Usage:  python scripts/process-brand-logo.py
"""

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = Path(os.environ["USERPROFILE"]) / "Pictures" / "Bluetooth"
CANDIDATES = [
    SOURCE_DIR / "Alumtrack 01 logo.jpg",
    SOURCE_DIR / "Alumtrack 01 logo.png",
    SOURCE_DIR / "Alumtrack logo.webp",
]
PUBLIC = ROOT / "public"
ASSETS = PUBLIC / "assets"
CANVAS = 1254


def find_source():
    for path in CANDIDATES:
        if path.exists():
            return path
    raise SystemExit(
        "Source logo not found. Expected one of: "
        + ", ".join(str(p) for p in CANDIDATES)
    )


def key_out_black(image: Image.Image) -> Image.Image:
    """Remove a near-black background with a soft anti-aliased alpha ramp."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            luminance = max(r, g, b)
            if luminance <= 18:
                pixels[x, y] = (r, g, b, 0)
            elif luminance < 70:
                # Smoothly restore partially transparent anti-aliased edges.
                alpha = int(a * (luminance - 18) / 52)
                pixels[x, y] = (r, g, b, alpha)
    return rgba


def transparent_background(image: Image.Image) -> bool:
    alpha = image.convert("RGBA").getchannel("A")
    return alpha.getextrema()[0] < 250


def normalize(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    if not transparent_background(image):
        print("Source is flattened - keying out near-black background.")
        image = key_out_black(image)

    # Trim stray transparent padding, then center on a square transparent canvas.
    bbox = image.getchannel("A").getbbox()
    if bbox:
        image = image.crop(bbox)
    image.thumbnail((CANVAS, CANVAS), Image.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(
        image,
        ((CANVAS - image.width) // 2, (CANVAS - image.height) // 2),
    )
    return canvas


def save_logo(logo: Image.Image):
    ASSETS.mkdir(parents=True, exist_ok=True)
    targets = [ASSETS / "alumtrack-logo.png", PUBLIC / "alumtrack-logo.png"]
    for target in targets:
        logo.save(target, "PNG", optimize=True)
        print(f"logo -> {target.relative_to(ROOT)}")


def save_favicons(logo: Image.Image):
    sizes = [16, 32, 48, 180, 512]
    for size in sizes:
        resized = logo.resize((size, size), Image.LANCZOS)
        resized.save(PUBLIC / f"favicon-{size}x{size}.png", "PNG", optimize=True)

    logo.resize((32, 32), Image.LANCZOS).save(PUBLIC / "favicon.png", "PNG", optimize=True)
    logo.resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-icon.png", "PNG", optimize=True)
    logo.resize((512, 512), Image.LANCZOS).save(PUBLIC / "icon.png", "PNG", optimize=True)

    ico_sizes = [(size, size) for size in (16, 32, 48)]
    logo.save(
        PUBLIC / "favicon.ico",
        "ICO",
        sizes=ico_sizes,
        append_images=[logo.resize((s, s), Image.LANCZOS) for s, _ in ico_sizes[1:]],
    )
    print("favicons -> public/favicon.ico, favicon.png, apple-icon.png, icon.png, favicon-{16,32,48,180,512}x*.png")


def main():
    source = find_source()
    print(f"source -> {source}")
    logo = normalize(Image.open(source))
    save_logo(logo)
    save_favicons(logo)


if __name__ == "__main__":
    main()
