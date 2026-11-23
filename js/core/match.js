// Wendungen in freien Texten erkennen und Lösungen vergleichen.
// Stammvergleich ohne Wörterbuch: Endungen regelmäßiger Verben, Stammwechsel, eine Liste unregelmäßiger Verben.
// Im Zweifel wird nicht erkannt statt falsch erkannt. Akzente werden beim Vergleich ignoriert, ñ nicht.
import { stripAccents, clean } from "./accent.js";
import { answersOf } from "./cards.js";

const DET = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas"]);
const CLITIC = new Set(["se", "me", "te", "nos", "os"]);
const PLACEHOLDERS = new Set(["alguien", "algo", "uno"]);

// Unregelmäßige Verben: alle Formen ohne Akzente
const FAMILIES = [
  "ser soy eres es somos sois son era eras eramos eran fui fuiste fue fuimos fueron sea seas seamos sean sido siendo sera seran seria",
  "estar estoy estas esta estamos estais estan estaba estabas estaban estuve estuvo estuvimos estuvieron este estes esten estado estando estara",
  "ir voy vas va vamos vais van iba ibas ibamos iban fui fuiste fue fuimos fueron vaya vayas vayamos vayan ido yendo ira iran",
  "tener tengo tienes tiene tenemos teneis tienen tenia tenias teniamos tenian tuve tuvo tuvimos tuvieron tenga tengas tengamos tengan tenido teniendo tendra tendran",
  "hacer hago haces hace hacemos haceis hacen hacia hacian hice hizo hicimos hicieron haga hagas hagamos hagan hecho haciendo hara haran",
  "poder puedo puedes puede podemos podeis pueden podia podian pude pudo pudimos pudieron pueda puedas podamos puedan podido pudiendo podra",
  "decir digo dices dice decimos decis dicen decia dije dijo dijimos dijeron diga digas digamos digan dicho diciendo dira",
  "venir vengo vienes viene venimos venis vienen venia venian vine vino vinimos vinieron venga vengas vengamos vengan venido viniendo vendra vendran",
  "poner pongo pones pone ponemos poneis ponen ponia puse puso pusimos pusieron ponga pongas pongamos pongan puesto poniendo pondra",
  "ver veo ves ve vemos veis ven veia veian vi vio vimos vieron vea veas veamos vean visto viendo vera",
  "dar doy das da damos dais dan daba daban di dio dimos dieron de des demos den dado dando dara",
  "saber sabes sabe sabemos sabeis saben sabia supe supo supimos supieron sepa sepas sepamos sepan sabido sabra",
  "querer quiero quieres quiere queremos quereis quieren queria quise quiso quisimos quisieron quiera quieras queramos quieran querido querra",
  "haber he has ha hemos han habia habian hubo hubieron haya hayas hayamos hayan habido habra",
  "salir salgo sales sale salimos salen salia sali salio salieron salga salgan salido saldra",
  "traer traigo traes trae traemos traen traia traje trajo trajeron traiga traigan traido traera",
  "caer caigo caes cae caemos caen cayo cayeron caiga caigan caido"
].map((s) => s.split(" "));
const FORM_OF = new Map();
for (const fam of FAMILIES) for (const f of fam) FORM_OF.set(f, new Set([...(FORM_OF.get(f) || []), ...fam]));

const END_AR = ["o", "as", "a", "amos", "ais", "an", "e", "es", "emos", "eis", "en", "aba", "abas", "abamos", "aban", "abais", "aste", "asteis", "aron", "ara", "aras", "aramos", "aran", "ase", "ases", "asen", "ando", "ado", "ada", "ados", "adas"];
const END_ER_IR = ["o", "es", "e", "emos", "eis", "en", "imos", "is", "ia", "ias", "iamos", "ian", "iais", "i", "iste", "io", "isteis", "ieron", "iera", "ieras", "ieramos", "ieran", "iese", "ieses", "iesen", "iendo", "yendo", "ido", "ida", "idos", "idas", "a", "as", "amos", "ais", "an"];
const END_FUT = ["e", "as", "a", "emos", "eis", "an", "ia", "ias", "iamos", "ian"];

const isVerbInf = (w) => /^[a-zñ]{2,}(ar|er|ir)(se)?$/.test(w) && w.length >= 4;

// Stammvarianten eines regelmäßigen Verbs (Stammwechsel und Schreibänderungen)
function stemsOf(inf) {
  const base = inf.replace(/se$/, "").slice(0, -2);
  const cls = inf.replace(/se$/, "").slice(-2);
  const set = new Set([base]);
  const idx = Math.max(base.lastIndexOf("o"), base.lastIndexOf("e"), base.lastIndexOf("u"));
  if (idx >= 0) {
    const v = base[idx];
    const head = base.slice(0, idx), tail = base.slice(idx + 1);
    if (v === "o") { set.add(head + "ue" + tail); set.add(head + "u" + tail); }
    if (v === "e") { set.add(head + "ie" + tail); set.add(head + "i" + tail); }
    if (v === "u") set.add(head + "ue" + tail);
  }
  for (const s of [...set]) {
    if (cls === "ar") {
      if (/c$/.test(s)) set.add(s.slice(0, -1) + "qu");
      if (/g$/.test(s)) set.add(s + "u");
      if (/z$/.test(s)) set.add(s.slice(0, -1) + "c");
    } else {
      if (/g$/.test(s)) set.add(s.slice(0, -1) + "j");
      if (/gu$/.test(s)) set.add(s.slice(0, -1));
      if (/c$/.test(s)) set.add(s.slice(0, -1) + "z");
    }
  }
  return [...set];
}

// Passt token (ohne Akzente, klein) zur Grundform oder Wortform word?
export function formMatches(word, token) {
  if (word === token) return true;
  const fam = FORM_OF.get(word);
  if (fam && fam.has(token)) return true;
  // Nomen und Adjektive: Plural und Geschlecht
  const nouns = [word + "s", word + "es"];
  if (/o$/.test(word)) nouns.push(word.slice(0, -1) + "a", word.slice(0, -1) + "os", word.slice(0, -1) + "as");
  if (/z$/.test(word)) nouns.push(word.slice(0, -1) + "ces");
  if (nouns.includes(token)) return true;
  if (isVerbInf(word)) {
    const inf = word.replace(/se$/, "");
    const ends = inf.endsWith("ar") ? END_AR : END_ER_IR;
    for (const s of stemsOf(word)) for (const e of ends) if (token === s + e) return true;
    for (const e of END_FUT) if (token === inf + e) return true;
  }
  return false;
}

export function tokens(t) {
  // Infinitiv mit angehängtem se (quejarse, darse) zählt wie der Infinitiv
  return stripAccents(String(t).toLowerCase()).split(/[^a-zñ]+/).filter(Boolean).map((w) => (/(ar|er|ir)se$/.test(w) ? w.slice(0, -2) : w));
}

// Vergleichsform einer Wendung: ohne Artikel, alguien/algo, (se) und Klammern
export function key(s) {
  const t = stripAccents(clean(s)).replace(/\([^)]*\)/g, " ").replace(/[/,-]/g, " ").split(" ").filter((w) => w && !PLACEHOLDERS.has(w) && !CLITIC.has(w));
  // darse → dar, quejarse → quejar: die Rückbezugsform steckt im Verb
  for (let i = 0; i < t.length; i++) if (/(ar|er|ir)se$/.test(t[i])) t[i] = t[i].slice(0, -2);
  const noDet = t.filter((w) => !DET.has(w));
  return (noDet.length ? noDet : t).join(" ");
}

// Alle Schreibweisen: Hauptform, alt und die Fassungen anderer Regionen (ohne vulgäre)
export function variantsOf(card) {
  return [card.term, ...(card.alt || []), ...(card.variants || []).filter((v) => !v.vulgar).map((v) => v.term)];
}

// Die Wörter von w müssen in dieser Reihenfolge vorkommen, höchstens 4 Wörter dazwischen.
function matchWords(tk, w) {
  for (let i = 0; i < tk.length; i++) {
    if (!formMatches(w[0], tk[i])) continue;
    let pos = i;
    let ok = true;
    for (let k = 1; k < w.length; k++) {
      let found = -1;
      for (let j = pos + 1; j <= pos + 5 && j < tk.length; j++) {
        if (formMatches(w[k], tk[j])) { found = j; break; }
      }
      if (found < 0) { ok = false; break; }
      pos = found;
    }
    if (ok) return true;
  }
  return false;
}

// Ausdrückliche Markierung der Fundstelle: [[id:Text]]. Sie hat Vorrang vor dem automatischen Erkennen.
const MARK = /\[\[\s*([^\]:|]+?)\s*[:|]\s*([^\]]+?)\s*\]\]/g;
export const marks = (text) => [...String(text).matchAll(MARK)].map((m) => ({ id: m[1], text: m[2] }));
export const stripMarks = (text) => String(text).replace(MARK, (_, _id, t) => t);

// { found, via: "mark" | "auto" | null }
export function findExpr(text, card) {
  if (marks(text).some((m) => m.id === card.id)) return { found: true, via: "mark" };
  const tk = tokens(stripMarks(text));
  if (!tk.length) return { found: false, via: null };
  const hit = variantsOf(card).some((v) => {
    const w = key(v).split(" ").filter(Boolean);
    return w.length > 0 && matchWords(tk, w);
  });
  return { found: hit, via: hit ? "auto" : null };
}

export const usesExpr = (text, card) => findExpr(text, card).found;

// Ist die Eingabe eine der richtigen Lösungen (ohne Akzent-Nachsicht)? Mit Nachsicht: accent.judge.
export function answerOk(card, given) {
  return answersOf(card).some((a) => clean(a) === clean(given));
}
