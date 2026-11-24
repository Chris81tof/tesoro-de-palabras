// Erzeugt die App-Icons in icons/ ohne Zeichenprogramm und ohne fremde Bilder: eigene Rastergrafik, die als PNG geschrieben wird.
// Das Motiv ist die Kachel mit achtzackigem Stern (wie in js/core/art.js). Start: node scripts/make-icons.mjs
// tests/icons-files.test.mjs prüft, dass die Dateien in icons/ genau diesem Skript entsprechen.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const C = { paper: [251, 244, 230], cobalt: [31, 74, 138], ochre: [224, 168, 46], accent: [156, 63, 30] };

// Punkt im Vieleck (gerade-ungerade-Regel)
function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const star = (cx, cy, outer, inner) => Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8 - Math.PI / 2;
  const r = i % 2 ? inner : outer;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});
const inRect = (x, y, a, b) => x >= a && x <= b && y >= a && y <= b;
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const STAR_OUT = star(0.5, 0.5, 0.365, 0.18);
const STAR_IN = star(0.5, 0.5, 0.335, 0.16);
const DOTS = [[0.17, 0.17], [0.83, 0.17], [0.17, 0.83], [0.83, 0.83]];

// Farbe an einem Punkt der Kachel (Koordinaten 0 bis 1), von unten nach oben gemalt
function tile(x, y) {
  let c = C.cobalt;
  if (inRect(x, y, 0.06, 0.94)) c = C.paper;
  if (inRect(x, y, 0.09, 0.91) && !inRect(x, y, 0.102, 0.898)) c = C.cobalt;
  if (inPoly(x, y, STAR_OUT)) c = C.cobalt;
  if (inPoly(x, y, STAR_IN)) c = C.ochre;
  if (inCircle(x, y, 0.5, 0.5, 0.09)) c = C.cobalt;
  if (inCircle(x, y, 0.5, 0.5, 0.045)) c = C.accent;
  for (const [dx, dy] of DOTS) if (inCircle(x, y, dx, dy, 0.028)) c = C.accent;
  return c;
}

// Maskierbare Icons: die Kachel kleiner (Sicherheitszone), der Rand ist Kobalt
const SCALE = { any: 1, maskable: 0.72 };

function pixel(x, y, scale) {
  const u = (x - 0.5) / scale + 0.5, v = (y - 0.5) / scale + 0.5;
  return u < 0 || u > 1 || v < 0 || v > 1 ? C.cobalt : tile(u, v);
}

// size × size Pixel, 4 × 4 Teilpunkte je Pixel, RGB
export function rasterize(size, kind = "any") {
  const scale = SCALE[kind] ?? 1;
  const N = 4;
  const buf = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const c = pixel((px + (sx + 0.5) / N) / size, (py + (sy + 0.5) / N) / size, scale);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const o = (py * size + px) * 3;
      buf[o] = Math.round(r / (N * N));
      buf[o + 1] = Math.round(g / (N * N));
      buf[o + 2] = Math.round(b / (N * N));
    }
  }
  return buf;
}

let table;
function crc32(buf) {
  if (!table) {
    table = Array.from({ length: 256 }, (_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c >>> 0;
    });
  }
  let c = 0xffffffff;
  for (const byte of buf) c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// RGB-Pixel als PNG (ohne Alpha, damit nichts durchscheint)
export function encodePng(size, rgb) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

export const ICONS = [
  ["apple-touch-icon.png", 180, "any"],
  ["favicon-32.png", 32, "any"],
  ["icon-192.png", 192, "any"],
  ["icon-512.png", 512, "any"],
  ["icon-maskable-512.png", 512, "maskable"]
];

export const iconBytes = (size, kind) => encodePng(size, rasterize(size, kind));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = new URL("../icons/", import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const [name, size, kind] of ICONS) {
    writeFileSync(new URL(name, dir), iconBytes(size, kind));
    console.log("geschrieben:", "icons/" + name);
  }
}
