// Eigene Zeichnungen im Azulejo-Stil: eine Kachel mit Rahmen und einem einfachen Motiv.
// Die Farben kommen aus css/tiles.css (Klassen c1 Kobalt, c2 Ocker, c3 Terrakotta, p Papier), sie folgen also Hell und Dunkel.
// Alles ist selbst gezeichnet, ohne Bilddatei und ohne Verweis nach außen; die Zeichnungen sind Schmuck (aria-hidden).

const r1 = (n) => Math.round(n * 10) / 10;
const pts = (n, cx, cy, radius) => Array.from({ length: n }, (_, i) => {
  const a = (i * 2 * Math.PI) / n - Math.PI / 2;
  const r = radius(i);
  return `${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))}`;
}).join(" ");

const frame = (name, inner) =>
  `<svg class="art art-${name}" viewBox="0 0 96 96" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">` +
  '<rect class="c1" x="2" y="2" width="92" height="92" rx="4"/><rect class="p" x="6" y="6" width="84" height="84" rx="2"/>' +
  '<rect class="l" x="9" y="9" width="78" height="78" rx="1"/>' + inner + "</svg>";

const corners = [[17, 17], [79, 17], [17, 79], [79, 79]].map(([x, y]) => `<circle class="c3" cx="${x}" cy="${y}" r="3"/>`).join("");

export const ART = {
  // Achtzackiger Stern: Runde geschafft
  star: frame("star",
    `<polygon class="c2" stroke-width="0" points="${pts(16, 48, 48, (i) => (i % 2 ? 15 : 33))}"/>` +
    `<polygon class="l" points="${pts(16, 48, 48, (i) => (i % 2 ? 15 : 33))}"/>` +
    '<circle class="c1" cx="48" cy="48" r="9"/><circle class="c3" cx="48" cy="48" r="4"/>' + corners),
  // Sonne: heute ist nichts mehr fällig
  sun: frame("sun",
    Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return `<line class="la" x1="${r1(48 + 21 * Math.cos(a))}" y1="${r1(48 + 21 * Math.sin(a))}" x2="${r1(48 + 31 * Math.cos(a))}" y2="${r1(48 + 31 * Math.sin(a))}"/>`;
    }).join("") + '<circle class="c2" cx="48" cy="48" r="15"/><circle class="l" cx="48" cy="48" r="15"/><circle class="c3" cx="48" cy="48" r="5"/>'),
  // Aufgeschlagenes Buch: noch keine Karten
  book: frame("book",
    '<polygon class="c2" points="48,30 20,36 20,68 48,62"/><polygon class="c1" points="48,30 76,36 76,68 48,62"/>' +
    '<polyline class="l" points="20,36 48,30 76,36 76,68 48,62 20,68 20,36"/><line class="l" x1="48" y1="30" x2="48" y2="62"/>' +
    '<line class="la" x1="27" y1="44" x2="41" y2="41"/><line class="la" x1="27" y1="52" x2="41" y2="49"/>' +
    '<line class="lp" x1="55" y1="41" x2="69" y2="44"/><line class="lp" x1="55" y1="49" x2="69" y2="52"/>' + corners)
};
