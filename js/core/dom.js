// Kleine Helfer für die Oberfläche.

export const $ = (id) => document.getElementById(id);

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function setMsg(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.className = "msg" + (kind ? " " + kind : "");
}

// Zweimal tippen zum Bestätigen (für Entfernen und Zurücksetzen)
export function armed(btn, label, action) {
  const plain = btn.textContent;
  btn.addEventListener("click", () => {
    if (btn.dataset.armed !== "1") {
      btn.dataset.armed = "1";
      btn.textContent = label;
      setTimeout(() => {
        if (btn.isConnected) { btn.dataset.armed = ""; btn.textContent = plain; }
      }, 4000);
      return;
    }
    action();
  });
}
