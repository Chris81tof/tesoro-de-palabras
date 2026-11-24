// Kontrast nach WCAG 2.x (nur zum Prüfen der Farben, wird von der App nicht geladen).
const hex = (h) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim());
  if (!m) throw new Error("keine Hex-Farbe: " + h);
  const s = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};

export function luminance(color) {
  const [r, g, b] = hex(color).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Kontrastverhältnis von 1 bis 21
export function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Variablen aus einem CSS-Block lesen: { "--paper": "#fbf4e6", … }
export function varsOf(block) {
  return Object.fromEntries([...block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => [m[1], m[2].trim()]));
}
