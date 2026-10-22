// Comparaison tolérante aux fautes : accents, casse, tirets et apostrophes ignorés.
export const normalize = (s) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Distance de Damerau (OSA) : une inversion de deux lettres ("nepla") compte pour 1 faute.
export function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

const tolerance = (len) => (len <= 3 ? 0 : len <= 7 ? 1 : len <= 12 ? 2 : 3);
// "Îles Salomon" se tape "Salomon" : le "îles" de tête est facultatif.
const names = (c) =>
  [c.nom, ...c.alias].map(normalize).flatMap((n) => (/^iles? /.test(n) ? [n, n.replace(/^iles? /, "")] : [n]));

// Bonne réponse si le pays le plus proche de la saisie est la cible, dans la tolérance.
// Empêche "Niger" de valider "Nigéria" ou "Guinée" de valider "Guinée-Bissau".
// Sinon, un début de nom suffit s'il ne désigne qu'un seul pays ("saint vincent", "papouasie") :
// indispensable pour taper les noms à rallonge avant la fin du chrono.
const distTo = (q) => (c) => Math.min(...names(c).map((n) => distance(q, n)));
const prefixOwners = (q, all) => all.filter((c) => names(c).some((n) => n.startsWith(`${q} `)));

export function isCorrect(input, target, all) {
  const q = normalize(input);
  if (!q) return false;
  const dist = distTo(q);
  const d = dist(target);
  if (d <= tolerance(q.length) && all.every((c) => c === target || dist(c) >= d)) return true;
  if (q.length < 5 || all.some((c) => names(c).includes(q))) return false;
  const owners = prefixOwners(q, all);
  return owners.length === 1 && owners[0] === target;
}

// Le pays que la saisie désigne (pour montrer son drapeau au récap), ou null si rien de clair.
export function closest(input, all) {
  const q = normalize(input);
  if (!q) return null;
  const dist = distTo(q);
  const [best] = all.map((c) => [dist(c), c]).sort((a, b) => a[0] - b[0]);
  if (best && best[0] <= tolerance(q.length)) return best[1];
  const owners = q.length < 5 ? [] : prefixOwners(q, all);
  return owners.length === 1 ? owners[0] : null;
}
