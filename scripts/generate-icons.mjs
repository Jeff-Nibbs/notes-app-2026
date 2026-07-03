// Generates the PWA icons in public/icons/ with no image dependencies —
// draws pixels directly and encodes PNGs using node's zlib.
// Run: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "../public/icons");

// --- Minimal PNG encoder -------------------------------------------------

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Drawing helpers ------------------------------------------------------

// Signed distance to a rounded rectangle centered at (cx, cy).
function roundedRectDist(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r;
}

function coverage(dist) {
  return Math.min(1, Math.max(0, 0.5 - dist));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawIcon(size, { fullBleed = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const bgHalf = fullBleed ? size / 2 + 2 : size * 0.46;
  const bgRadius = fullBleed ? 0 : size * 0.21;

  // White "note lines" glyph: three capsules of decreasing width.
  const glyphScale = fullBleed ? 0.72 : 0.94;
  const bars = [
    { w: 0.46, y: -0.17 },
    { w: 0.46, y: 0.0 },
    { w: 0.3, y: 0.17 },
  ].map((b) => ({
    hw: (b.w / 2) * size * glyphScale,
    cy: cy + b.y * size * glyphScale,
    hh: size * 0.036 * glyphScale,
    // Bars are left-aligned to a common margin.
    cx: cx - ((0.46 / 2) * size - (b.w / 2) * size) * glyphScale,
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const bg = coverage(
        roundedRectDist(x + 0.5, y + 0.5, cx, cy, bgHalf, bgHalf, bgRadius)
      );
      // Indigo vertical gradient.
      const t = y / size;
      let r = lerp(0x63, 0x43, t);
      let g = lerp(0x66, 0x38, t);
      let b = lerp(0xf1, 0xca, t);
      let a = bg;

      let glyph = 0;
      for (const bar of bars) {
        glyph = Math.max(
          glyph,
          coverage(
            roundedRectDist(x + 0.5, y + 0.5, bar.cx, bar.cy, bar.hw, bar.hh, bar.hh)
          )
        );
      }
      glyph *= bg;
      r = lerp(r, 255, glyph);
      g = lerp(g, 255, glyph);
      b = lerp(b, 255, glyph);

      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = Math.round(a * 255);
    }
  }
  return encodePng(size, size, rgba);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "icon-192.png"), drawIcon(192));
writeFileSync(join(outDir, "icon-512.png"), drawIcon(512));
writeFileSync(
  join(outDir, "icon-512-maskable.png"),
  drawIcon(512, { fullBleed: true })
);
writeFileSync(
  join(outDir, "apple-touch-icon.png"),
  drawIcon(180, { fullBleed: true })
);
console.log(`Icons written to ${outDir}`);
