// Gamification : tampons gagnés, niveaux, badges et solde. Tout se déduit de l'historique des parties
// (et des articles achetés), donc le serveur refait exactement le même calcul pour valider les achats.
import { ITEM } from "./items.js";

export const DAILY_BONUS = 20;
const PARIS_DAY = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ
const dayNumber = (day) => Date.UTC(...day.split("-").map((v, k) => (k === 1 ? v - 1 : +v))) / 864e5;

// Niveau L atteint à 25·L·(L−1) d'expérience : 50, 150, 300, 500, 750…
export const levelFloor = (level) => 25 * level * (level - 1);
export const levelOf = (xp) => {
  let level = 1;
  while (levelFloor(level + 1) <= xp) level++;
  return level;
};
const TITLES = [
  [16, "Légende du GeoGuessr"],
  [12, "Explorateur"],
  [8, "Cartographe"],
  [5, "Globe-trotter"],
  [3, "Routard"],
  [1, "Touriste"],
];
export const titleOf = (level) => TITLES.find(([min]) => level >= min)[1];

// Récompense d'une partie, hors bonus du jour (qui dépend des autres parties).
export function gameReward(g) {
  return {
    score: g.score,
    perfect: g.n >= 10 && g.top === g.n ? Math.round(g.score / 2) : 0,
    streak: Math.max(0, (g.streak ?? 0) - 5),
  };
}

export const BADGES = [
  { id: "premier-pas", name: "Premier tampon", desc: "Termine ta première partie", reward: 20, test: (s) => s.games >= 1 },
  { id: "polyvalent", name: "Polyvalent", desc: "Joue dans les 4 modes", reward: 50, test: (s) => s.modes.size >= 4, goal: (s) => [s.modes.size, 4] },
  { id: "sans-faute", name: "Sans faute", desc: "Une partie d'au moins 10 questions, tout en cash", reward: 100, test: (s) => s.perfect },
  { id: "serie-de-feu", name: "Série de feu", desc: "15 bonnes réponses d'affilée", reward: 100, test: (s) => s.bestStreak >= 15, goal: (s) => [s.bestStreak, 15] },
  { id: "centurion", name: "Centurion", desc: "100 drapeaux différents trouvés", reward: 150, test: (s) => s.flags.size >= 100, goal: (s) => [s.flags.size, 100] },
  { id: "maitre-xx", name: "Maître des .xx", desc: "50 extensions différentes trouvées", reward: 150, test: (s) => s.tlds.size >= 50, goal: (s) => [s.tlds.size, 50] },
  { id: "pile-poil", name: "Pile poil", desc: "50 « dans le mille » sur la carte", reward: 150, test: (s) => s.mapTop >= 50, goal: (s) => [s.mapTop, 50] },
  { id: "cartographe", name: "Cartographe", desc: "20 parties en mode carte", reward: 100, test: (s) => s.mapGames >= 20, goal: (s) => [s.mapGames, 20] },
  { id: "assidu", name: "Assidu", desc: "Joue 7 jours d'affilée", reward: 200, test: (s) => s.dayStreak >= 7, goal: (s) => [s.dayStreak, 7] },
  { id: "marathon", name: "Marathon", desc: "Termine une partie « Tous »", reward: 300, test: (s) => s.marathon },
];
export const BADGE = new Map(BADGES.map((b) => [b.id, b]));

export function computeProgress(games, owned = []) {
  const s = { games: 0, modes: new Set(), perfect: false, bestStreak: 0, flags: new Set(), tlds: new Set(), mapTop: 0, mapGames: 0, marathon: false };
  const days = new Set();
  const perGame = new Map();
  let fromGames = 0;
  for (const g of [...games].sort((a, b) => a.at - b.at)) {
    const r = gameReward(g);
    const day = PARIS_DAY.format(g.at);
    const daily = days.has(day) ? 0 : DAILY_BONUS;
    days.add(day);
    const total = r.score + r.perfect + r.streak + daily;
    perGame.set(g.id, { ...r, daily, total });
    fromGames += total;

    s.games++;
    s.modes.add(g.mode);
    s.perfect ||= r.perfect > 0;
    s.bestStreak = Math.max(s.bestStreak, g.streak ?? 0);
    if (g.mode === "flag") g.hit.forEach((c) => s.flags.add(c));
    if (g.mode === "tld") g.hit.forEach((c) => s.tlds.add(c));
    if (g.mode === "map") {
      s.mapGames++;
      s.mapTop += g.top;
    }
    s.marathon ||= g.n >= 150;
  }
  // Plus longue suite de jours consécutifs avec au moins une partie.
  const sorted = [...days].map(dayNumber).sort((a, b) => a - b);
  s.dayStreak = sorted.reduce((best, d, k) => {
    const run = k && d === sorted[k - 1] + 1 ? best.run + 1 : 1;
    return { run, max: Math.max(best.max, run) };
  }, { run: 0, max: 0 }).max;

  const badges = BADGES.filter((b) => b.test(s)).map((b) => b.id);
  const xp = fromGames + badges.reduce((t, id) => t + BADGE.get(id).reward, 0);
  const spent = owned.reduce((t, id) => t + (ITEM.get(id)?.price ?? 0), 0);
  const level = levelOf(xp);
  return { xp, level, title: titleOf(level), floor: levelFloor(level), next: levelFloor(level + 1), balance: xp - spent, badges, perGame, stats: s };
}

// Raison qui empêche l'achat, ou null si c'est possible.
export function cannotBuy(item, progress, owned) {
  if (!item) return "Article inconnu";
  if (owned.includes(item.id)) return "Déjà dans ton vestiaire";
  if (item.badge && !progress.badges.includes(item.badge)) return `Badge « ${BADGE.get(item.badge).name} » requis`;
  if (progress.level < item.level) return `Niveau ${item.level} requis`;
  if (progress.balance < item.price) return "Pas assez de tampons";
  return null;
}
