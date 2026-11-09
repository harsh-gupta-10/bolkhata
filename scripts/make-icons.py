#!/usr/bin/env python3
"""Draw simple BolKhata PWA icons: saffron tile, cream circle, ink mic."""

import struct
import zlib
from pathlib import Path


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int) -> None:
    pixels = bytearray(size * size * 4)
    cx = (size - 1) / 2
    radius = size * 0.34
    for y in range(size):
        for x in range(size):
            i = (y * size + x) * 4
            pixels[i : i + 4] = (109, 44, 36, 255)
            dx = x - cx
            dy = y - cx
            if dx * dx + dy * dy <= radius * radius:
                pixels[i : i + 4] = (244, 234, 215, 255)
            nx = x / size
            ny = y / size
            head = 0.44 <= nx <= 0.56 and 0.28 <= ny <= 0.50
            stem = 0.475 <= nx <= 0.525 and 0.50 <= ny <= 0.66
            foot = 0.40 <= nx <= 0.60 and 0.64 <= ny <= 0.68
            arc = 0.46 <= ny <= 0.58 and abs((nx - 0.5) ** 2 / 0.018 + (ny - 0.48) ** 2 / 0.012 - 1) < 0.18 and nx > 0.38
            if head or stem or foot or (arc and not (0.46 < nx < 0.54 and ny < 0.52)):
                pixels[i : i + 4] = (60, 39, 24, 255)
    raw = b"".join(b"\x00" + pixels[y * size * 4 : (y + 1) * size * 4] for y in range(size))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    public = Path(__file__).resolve().parents[1] / "public"
    public.mkdir(exist_ok=True)
    write_png(public / "icon-192.png", 192)
    write_png(public / "icon-512.png", 512)
    write_png(public / "apple-touch-icon.png", 180)


if __name__ == "__main__":
    main()
