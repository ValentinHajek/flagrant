import { PTS_CASH } from "./quiz.js";
import { load, save } from "./storage.js";

const KEY = "history";
const MAX_GAMES = 500; // historique borné : ~1 Ko par partie « Tous » au pire, loin des limites du navigateur

// Une partie terminée, réduite à ce dont les stats ont besoin (codes pays, pas les objets).
export function toEntry(settings, results) {
  return {
    id: crypto.randomUUID(), // pour dédoublonner le jour où l'historique sera synchronisé
    at: Date.now(),
    mode: settings.mode,
    territories: settings.territories,
    n: results.length,
    score: results.reduce((s, r) => s + r.points, 0),
    max: results.length * PTS_CASH,
    top: results.filter((r) => r.points === PTS_CASH).length,
    mid: results.filter((r) => r.points && r.points < PTS_CASH).length,
    hit: results.filter((r) => r.points).map((r) => r.country.code),
    missed: results.filter((r) => !r.points).map((r) => r.country.code),
  };
}

export const loadHistory = () => {
  const h = load(KEY, []);
  return Array.isArray(h) ? h.filter((g) => g && g.max > 0 && Number.isFinite(g.score)) : [];
};

export const saveHistory = (games) => save(KEY, games.slice(-MAX_GAMES));
export const recordGame = (entry) => saveHistory([...loadHistory(), entry]);

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (g) => g.score / g.max;

// Pour chaque pays : combien de fois il est tombé et combien de fois il a été raté.
function tallyCountries(games) {
  const tally = new Map();
  const bump = (code, miss) => {
    const t = tally.get(code) ?? { code, miss: 0, seen: 0 };
    t.seen += 1;
    t.miss += miss;
    tally.set(code, t);
  };
  for (const g of games) {
    g.missed.forEach((c) => bump(c, 1));
    g.hit.forEach((c) => bump(c, 0));
  }
  return tally;
}

// Duel pays par pays, sur les pays tombés chez les deux joueurs dans ce mode.
// Un pays raté au moins une fois sur deux est « séché ».
export function compareCountries(mine, theirs, mode) {
  const a = tallyCountries(mine.filter((g) => g.mode === mode));
  const b = tallyCountries(theirs.filter((g) => g.mode === mode));
  const dry = (t) => t.miss / t.seen >= 0.5;
  const rows = [...a.values()].filter((t) => b.has(t.code)).map((t) => ({ code: t.code, mine: t, theirs: b.get(t.code) }));
  const top = (list, score) => list.sort((p, q) => score(q) - score(p)).slice(0, 6);
  return {
    both: top(rows.filter((r) => dry(r.mine) && dry(r.theirs)), (r) => r.mine.miss + r.theirs.miss),
    mine: top(rows.filter((r) => !dry(r.mine) && dry(r.theirs)), (r) => r.theirs.miss), // ton avantage
    theirs: top(rows.filter((r) => dry(r.mine) && !dry(r.theirs)), (r) => r.mine.miss), // son avantage
  };
}

// Stats d'un mode : les scores sont ramenés en % pour comparer des parties de 10 et de 50 questions.
export function summarize(history, mode) {
  const games = history.filter((g) => g.mode === mode);
  if (!games.length) return null;
  const recent = games.slice(-10);
  const before = games.slice(-20, -10);
  const best = games.reduce((a, g) => (pct(g) > pct(a) ? g : a));
  const asked = games.reduce((s, g) => s + g.n, 0);

  // Pays à revoir : les plus souvent ratés, puis ceux ratés le plus systématiquement.
  const toReview = [...tallyCountries(games).values()]
    .filter((t) => t.miss)
    .sort((a, b) => b.miss - a.miss || b.miss / b.seen - a.miss / a.seen)
    .slice(0, 8);

  return {
    games: games.length,
    avg: mean(games.map(pct)),
    recentAvg: mean(recent.map(pct)),
    trend: before.length ? mean(recent.map(pct)) - mean(before.map(pct)) : null,
    best,
    accuracy: games.reduce((s, g) => s + g.top + g.mid, 0) / asked,
    topRate: games.reduce((s, g) => s + g.top, 0) / asked,
    last: games.slice(-20),
    toReview,
  };
}
