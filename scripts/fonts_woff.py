#!/usr/bin/env python3
"""Génère un .woff à côté de chaque .woff2 de fonts/ (même nom de base).

react-pdf (fontkit) ne lit pas le .woff2 dès qu'un glyphe est accentué : le PDF
embarque donc les .woff. Les .woff restent convertis des .woff2 de la charte,
les glyphes sont identiques à ceux de l'interface.

Usage : python3 scripts/fonts_woff.py   (dépendances : fonttools, brotli)
Le script est déterministe : le relancer laisse les fichiers identiques.
"""
from pathlib import Path

from fontTools.ttLib import TTFont

FONTS = Path(__file__).resolve().parent.parent / "fonts"


def convert(src: Path) -> Path:
    dst = src.with_suffix(".woff")
    font = TTFont(src)
    # Sans cela, fontTools écrit la date du jour dans la table head.
    font.recalcTimestamp = False
    font.flavor = "woff"
    font.save(dst)
    return dst


def main() -> None:
    sources = sorted(FONTS.glob("*.woff2"))
    if not sources:
        raise SystemExit(f"aucun .woff2 dans {FONTS}")
    for src in sources:
        print(f"{src.name} -> {convert(src).name}")


if __name__ == "__main__":
    main()
