// Darstellung: automatisch (Systemeinstellung), hell oder dunkel.
export const THEMES = { auto: "Automatisch", light: "Hell", dark: "Dunkel" };
export const THEME_COLORS = { light: "#fbf4e6", dark: "#1f1612" };

// Setzt data-theme am html-Element (bei „auto“ entfällt es) und die Farbe der Statusleiste.
export function applyTheme(theme, doc = document, dark = () => matchMedia("(prefers-color-scheme: dark)").matches) {
  const root = doc.documentElement;
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  else delete root.dataset.theme;
  const eff = theme === "light" || theme === "dark" ? theme : dark() ? "dark" : "light";
  doc.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLORS[eff]));
  return eff;
}
