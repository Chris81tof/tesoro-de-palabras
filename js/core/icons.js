// Eigene Piktogramme: Linien in currentColor auf einem 24er-Raster, alle selbst gezeichnet.

const P = {
  // Reiter
  today: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  practice: '<path d="M20 4C13.5 4.5 8.5 9 7 16l3.5-.5C16 14 19.5 9.5 20 4Z"/><path d="M4 20 15.5 8.5"/>',
  transfer: '<path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3"/>',
  stats: '<path d="M3.5 20.5h17"/><rect x="5.5" y="13" width="3.2" height="7.5"/><rect x="10.4" y="7" width="3.2" height="13.5"/><rect x="15.3" y="10" width="3.2" height="10.5"/>',
  library: '<path d="M3 20.5h18"/><rect x="5" y="6" width="3.2" height="14.5"/><rect x="9.2" y="4" width="3.2" height="16.5"/><path d="M13.6 7.6l3-.9 3.8 13-3 .9Z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6"/>',
  // Bereiche
  allgemein: '<rect x="3.5" y="3.5" width="17" height="17"/><path d="M12 3.5 20.5 12 12 20.5 3.5 12Z"/><circle cx="12" cy="12" r="2.2"/>',
  schule: '<path d="M3 10.5 12 4l9 6.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
  gesamt: '<rect x="3.5" y="3.5" width="7.5" height="7.5"/><rect x="13" y="3.5" width="7.5" height="7.5"/><rect x="3.5" y="13" width="7.5" height="7.5"/><rect x="13" y="13" width="7.5" height="7.5"/>',
  // Übungen
  meaning: '<circle cx="10.5" cy="10.5" r="5.8"/><path d="M14.7 14.7 20.5 20.5" stroke-width="2"/>',
  cards: '<path d="M7.5 8.5V4h13v10h-3"/><rect x="3.5" y="8.5" width="14" height="11.5" rx=".5"/>',
  explain: '<path d="M4 4.5h16v11.5h-8l-4.5 3.5V16H4Z"/><path d="M7.5 8.5h9M7.5 11h9"/>',
  choice: '<circle cx="5.8" cy="6.5" r="1.7"/><circle cx="5.8" cy="12" r="1.7"/><circle cx="5.8" cy="17.5" r="1.7"/><path d="M10 6.5h10M10 12h10M10 17.5h10"/>',
  gap: '<path d="M3 12h4.5M17 12h4"/><rect x="9" y="9" width="6.5" height="6" stroke-dasharray="2 1.4"/><path d="M3 6.5h18M3 17.5h12"/>',
  translate: '<path d="M3 4h10v7.5H8L5 14v-2.5H3Z"/><path d="M11 13.5h10V20h-2v2.5L16 20h-5Z"/>',
  error: '<path d="M3 6.5h18M3 12h5.5M15.5 12h5.5M3 19h11"/><path d="M9 14.8l1.1-1 1.2 1 1.2-1 1.2 1 1.1-1"/>',
  rewrite: '<path d="M4 6h9M4 10h6M4 14h4M4 18h7"/><path d="M19.8 14.5A5 5 0 1 1 18 9"/><path d="M15.5 8.2 18.2 9l.4-2.8"/>',
  produce: '<path d="M5 19.5 6 15 17 4a2.1 2.1 0 0 1 3 3L9 18Z"/><path d="M4 21h16"/>',
  cloze: '<rect x="4" y="3.5" width="16" height="17" rx=".5"/><path d="M7.5 8h9M7.5 12h3M14 12h2.5M7.5 16h9"/><rect x="11" y="10.3" width="2.4" height="3.4" stroke-dasharray="1.5 1"/>',
  tile: '<rect x="4" y="4" width="16" height="16"/><path d="M12 4v16M4 12h16"/>',
  edit: '<path d="M4.5 19.5l.9-4L16.2 4.7a2.1 2.1 0 0 1 3 3L8.4 18.6Z"/><path d="M14.5 6.5l3 3"/>',
  ok: '<path d="M4.5 12.5l5 5 10-11"/>',
  warn: '<path d="M12 3.5 21.5 20h-19Z"/><path d="M12 10v5M12 17.3v.4"/>'
};

export function icon(name) {
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.tile}</svg>`;
}

export const ICON_NAMES = Object.keys(P);
