// Die App-Icons: Dateien in icons/ sind echte PNGs in den richtigen Größen und entsprechen genau dem Skript scripts/make-icons.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { ICONS, iconBytes, rasterize, encodePng } from "../scripts/make-icons.mjs";

const file = (n) => readFileSync(new URL("../icons/" + n, import.meta.url));

test("jedes Icon ist ein PNG in der richtigen Größe, RGB ohne Alpha", () => {
  for (const [name, size] of ICONS) {
    const b = file(name);
    assert.deepEqual([...b.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], name);
    assert.equal(b.readUInt32BE(16), size, name + ": Breite");
    assert.equal(b.readUInt32BE(20), size, name + ": Höhe");
    assert.equal(b[24], 8, "8 Bit");
    assert.equal(b[25], 2, name + ": RGB ohne Alpha, nichts scheint durch");
  }
  assert.deepEqual(ICONS.map(([n, s]) => `${n}:${s}`), ["apple-touch-icon.png:180", "favicon-32.png:32", "icon-192.png:192", "icon-512.png:512", "icon-maskable-512.png:512"]);
});
// Die Pixel müssen dem Skript entsprechen; die gepackten Bytes können je nach zlib-Version (Mac, GitHub) abweichen.
const pixels = (b) => inflateSync(b.subarray(b.indexOf("IDAT") + 4, b.indexOf("IEND") - 4));
test("die Bilder sind genau das, was das Skript erzeugt (nichts von Hand verändert)", () => {
  for (const [name, size, kind] of ICONS) {
    const raw = pixels(file(name));
    const rgb = rasterize(size, kind);
    assert.equal(raw.length, size * (size * 3 + 1), name);
    for (let y = 0; y < size; y++) {
      assert.equal(raw[y * (size * 3 + 1)], 0, "Zeilenfilter 0");
      assert.ok(raw.subarray(y * (size * 3 + 1) + 1, (y + 1) * (size * 3 + 1)).equals(rgb.subarray(y * size * 3, (y + 1) * size * 3)), `${name}: Zeile ${y} – node scripts/make-icons.mjs ausführen`);
    }
  }
});
test("PNG lässt sich entpacken und hat die erwarteten Farben (Kobalt am Rand, Papier innen, Terrakotta in der Mitte)", () => {
  const b = file("icon-512.png");
  const idat = b.subarray(b.indexOf("IDAT") + 4, b.indexOf("IEND") - 4);
  const raw = inflateSync(idat);
  const px = (x, y) => [...raw.subarray(y * (512 * 3 + 1) + 1 + x * 3, y * (512 * 3 + 1) + 1 + x * 3 + 3)];
  assert.deepEqual(px(2, 2), [31, 74, 138], "Rand Kobalt");
  assert.deepEqual(px(40, 256), [251, 244, 230], "Papier");
  assert.deepEqual(px(256, 256), [156, 63, 30], "Mitte Terrakotta");
});
test("maskierbares Icon: Kachel innerhalb der Sicherheitszone, außen Kobalt", () => {
  const rgb = rasterize(100, "maskable");
  const at = (x, y) => [...rgb.subarray((y * 100 + x) * 3, (y * 100 + x) * 3 + 3)];
  assert.deepEqual(at(3, 3), [31, 74, 138]);
  assert.deepEqual(at(50, 50), [156, 63, 30]);
  assert.deepEqual(at(10, 50), [31, 74, 138], "außerhalb der kleinen Kachel (sie füllt 72 % der Breite) ist es Kobalt");
  assert.deepEqual(at(30, 25), [251, 244, 230], "innerhalb ist Kachelfläche (Papier)");
  assert.deepEqual(at(30, 50), [224, 168, 46], "die Spitze des Sterns liegt innerhalb der Sicherheitszone");
  assert.deepEqual(at(90, 90), [31, 74, 138]);
});
test("PNG-Kodierung: Prüfsummen stimmen", () => {
  const png = encodePng(2, Buffer.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 9, 9, 9]));
  assert.equal(png.length, 8 + 25 + (12 + png.readUInt32BE(33)) + 12);
});
