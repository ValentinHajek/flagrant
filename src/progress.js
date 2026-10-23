// Gamification : tampons gagnés, niveaux, badges et solde. Tout se déduit de l'historique des parties
// (et des articles achetés), donc le serveur refait exactement le même calcul pour valider les achats.
import { ITEM, RARITY } from "./items.js";
import { MAP_PILE_KM, total } from "./quiz.js";

// Barème divisé par 3 pour les parties jouées depuis le 22 oct. 2026 à 17 h 30 (heure de Paris) :
// environ 3 parties pour un article à 60. Les parties d'avant gardent l'ancien barème, personne ne perd ses tampons.
export const RESCALE_AT = Date.UTC(2026, 9, 22, 15, 30);
export const DAILY_BONUS = 10;
const OLD_DAILY_BONUS = 20;
const PARIS_DAY = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }); // AAAA-MM-JJ
const dayNumber = (day) => Date.UTC(...day.split("-").map((v, k) => (k === 1 ? v - 1 : +v))) / 864e5;

// Quête du jour : deux objectifs, les mêmes pour tout le monde, à remplir le même jour (heure de Paris) : une partie
// dans un mode, ou « revision » (une révision menée jusqu'au « Tout bon ! »). Elle rapporte QUEST_BONUS et un tour
// de roue, meilleure quand la série de quêtes (jours d'affilée) s'allonge.
// Les jours passés se recalculent avec ces listes : ne jamais les modifier, seulement en ajouter pour des jours à venir.
export const QUEST_FROM = "2026-10-23"; // lancement : rien de rétroactif
export const QUEST_BONUS = 50;
const QUESTS = [
  ["flag", "tld"], ["capital", "map"], ["mix", "revision"], ["flag", "capital"], ["tld", "map"], ["capital", "revision"], ["map", "mix"], ["flag", "mix"],
  ["tld", "revision"], ["tld", "capital"], ["flag", "map"], ["map", "revision"], ["capital", "mix"], ["tld", "mix"], ["flag", "revision"],
];
export const questOf = (day) => QUESTS[dayNumber(day) % QUESTS.length];
// Cases de la roue, dans l'ordre du cadran. p : chances sur 100 (et part du cadran) ; tampons gagnés, ou item : un article
// de cette rareté que le joueur n'a pas, même pas encore débloqué (lequel : tiré par la roue à l'écran, le serveur vérifie
// seulement la rareté). from : jours de quête d'affilée pour y avoir droit.
export const WHEELS = [
  { from: 1, name: "Roue bronze", slices: [{ p: 34, tampons: 10 }, { p: 17, item: "commune" }, { p: 26, tampons: 20 }, { p: 7, item: "rare" }, { p: 15, tampons: 40 }, { p: 1, item: "epique" }] },
  { from: 3, name: "Roue argent", slices: [{ p: 28, tampons: 20 }, { p: 16, item: "commune" }, { p: 22, tampons: 40 }, { p: 13, item: "rare" }, { p: 14, tampons: 80 }, { p: 5, item: "epique" }, { p: 2, item: "legendaire" }] },
  { from: 7, name: "Roue or", slices: [{ p: 24, tampons: 40 }, { p: 12, item: "commune" }, { p: 20, tampons: 80 }, { p: 15, item: "rare" }, { p: 14, tampons: 150 }, { p: 10, item: "epique" }, { p: 5, item: "legendaire" }] },
];
export const wheelFor = (streak) => WHEELS.findLastIndex((w) => streak >= w.from);
// Case tirée de la partie qui termine la quête (id local, _id côté serveur) : la même partout, impossible à relancer.
const hash = (seed) => [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const slotOf = (slices, seed) => {
  let r = hash(seed) % 100;
  return slices.findIndex((s) => (r -= s.p) < 0);
};

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
  const old = g.at < RESCALE_AT;
  const score = old ? g.score : Math.round(total(g) / 3); // bonus combo compris
  const streak = Math.max(0, (g.streak ?? 0) - 5);
  return {
    score,
    perfect: g.n >= 10 && g.top === g.n ? Math.round(score / 2) : 0,
    streak: old ? streak : Math.floor(streak / 3),
  };
}

// desc : comment le débloquer (affiché sur la page Badges). seal : texte du tampon. unit : unité de la progression.
export const BADGES = [
  { id: "premier-pas", name: "Premier tampon", seal: "1er", reward: 20, test: (s) => s.games >= 1,
    desc: "Termine une partie, peu importe le mode ou le nombre de questions." },
  { id: "polyvalent", name: "Polyvalent", seal: "x4", reward: 50, test: (s) => s.modes.size >= 4, goal: (s) => [s.modes.size, 4], unit: "modes",
    desc: "Termine au moins une partie dans 4 modes différents, au choix parmi Drapeaux, Extensions, Capitales, Carte et Mix." },
  { id: "sans-faute", name: "Sans faute", seal: "100%", reward: 100, test: (s) => s.perfect,
    desc: "Une partie d'au moins 10 questions sans une seule erreur : tout en flash, ou tout « pile » en mode Carte. Un carré casse le sans-faute." },
  { id: "serie-de-feu", name: "Série de feu", seal: "15", reward: 100, test: (s) => s.bestStreak >= 15, goal: (s) => [s.bestStreak, 15], unit: "d'affilée",
    desc: "Enchaîne 15 bonnes réponses d'affilée dans une même partie (le carré et « proche » comptent)." },
  { id: "centurion", name: "Centurion", seal: "100", reward: 150, test: (s) => s.flags.size >= 100, goal: (s) => [s.flags.size, 100], unit: "drapeaux",
    desc: "Trouve 100 pays différents en mode Drapeaux, en cumulant toutes tes parties (le Mix ne compte pas)." },
  { id: "maitre-xx", name: "Maître des .xx", seal: ".xx", reward: 150, test: (s) => s.tlds.size >= 50, goal: (s) => [s.tlds.size, 50], unit: "extensions",
    desc: "Trouve 50 pays différents en mode Extensions, en cumulant toutes tes parties (le Mix ne compte pas)." },
  { id: "pile-poil", name: "Pile poil", seal: "50", reward: 150, test: (s) => s.mapTop >= 50, goal: (s) => [s.mapTop, 50], unit: "épingles",
    desc: `Cumule 50 épingles « pile » en mode Carte : dans le pays ou à moins de ${MAP_PILE_KM} km.` },
  { id: "cartographe", name: "Cartographe", seal: "20", reward: 100, test: (s) => s.mapGames >= 20, goal: (s) => [s.mapGames, 20], unit: "parties",
    desc: "Termine 20 parties en mode Carte." },
  { id: "assidu", name: "Assidu", seal: "7j", reward: 200, test: (s) => s.dayStreak >= 7, goal: (s) => [s.dayStreak, 7], unit: "jours",
    desc: "Joue au moins une partie par jour, 7 jours de suite (le jour change à minuit, heure de Paris)." },
  { id: "marathon", name: "Marathon", seal: "Tous", reward: 300, test: (s) => s.marathon,
    desc: "Termine une partie en choisissant « Tous » dans Questions : toutes les questions du mode, d'une traite." },
];
export const BADGE = new Map(BADGES.map((b) => [b.id, b]));

// vouchered : articles gagnés à la roue (ni payés, ni décomptés du solde).
export function computeProgress(games, owned = [], vouchered = []) {
  const s = { games: 0, modes: new Set(), perfect: false, bestStreak: 0, flags: new Set(), tlds: new Set(), mapTop: 0, mapGames: 0, marathon: false };
  const days = new Set();
  const quests = new Map(); // numéro du jour → { played : objectifs remplis ; streak, wheel, slot, prize une fois la quête finie }
  const perGame = new Map();
  let fromGames = 0;
  for (const g of [...games].sort((a, b) => a.at - b.at)) {
    const r = gameReward(g);
    const day = PARIS_DAY.format(g.at);
    const daily = days.has(day) ? 0 : g.at < RESCALE_AT ? OLD_DAILY_BONUS : DAILY_BONUS;
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
  // Quêtes : chaque partie, et la révision complète d'une partie (revisedAt), dans l'ordre où elles ont eu lieu.
  // Le gain va à ce qui boucle la quête : la partie, ou sa révision (clé « id:revision »).
  const events = games.flatMap((g) => [[g.at, g.mode, g], ...(g.revisedAt ? [[g.revisedAt, "revision", g]] : [])]);
  for (const [at, task, g] of events.sort((a, b) => a[0] - b[0])) {
    const day = PARIS_DAY.format(at);
    if (day < QUEST_FROM || !questOf(day).includes(task)) continue;
    const n = dayNumber(day);
    const q = quests.get(n) ?? { played: new Set() };
    quests.set(n, q);
    q.played.add(task);
    if (q.streak || q.played.size < 2) continue;
    const key = task === "revision" ? `${g.id ?? g._id}:revision` : g.id ?? g._id;
    q.streak = (quests.get(n - 1)?.streak ?? 0) + 1;
    q.wheel = wheelFor(q.streak);
    q.slot = slotOf(WHEELS[q.wheel].slices, `${day}:${key}`);
    const slice = WHEELS[q.wheel].slices[q.slot];
    q.prize = slice.tampons ?? 0;
    q.item = slice.item ?? null;
    const gain = perGame.get(key) ?? { score: 0, perfect: 0, streak: 0, daily: 0, total: 0 };
    perGame.set(key, { ...gain, quest: QUEST_BONUS, spin: q, total: gain.total + QUEST_BONUS + q.prize });
    fromGames += QUEST_BONUS + q.prize;
  }

  // Plus longue suite de jours consécutifs avec au moins une partie.
  const sorted = [...days].map(dayNumber).sort((a, b) => a - b);
  s.dayStreak = sorted.reduce((best, d, k) => {
    const run = k && d === sorted[k - 1] + 1 ? best.run + 1 : 1;
    return { run, max: Math.max(best.max, run) };
  }, { run: 0, max: 0 }).max;

  const badges = BADGES.filter((b) => b.test(s)).map((b) => b.id);
  const xp = fromGames + badges.reduce((t, id) => t + BADGE.get(id).reward, 0);
  const spent = owned.filter((id) => !vouchered.includes(id)).reduce((t, id) => t + (ITEM.get(id)?.price ?? 0), 0);
  // Cases article gagnées à la roue et pas encore récupérées, par rareté.
  const vouchers = Object.fromEntries(Object.keys(RARITY).map((r) => [r, 0]));
  for (const q of quests.values()) if (q.item) vouchers[q.item]++;
  for (const id of vouchered) if (ITEM.has(id)) vouchers[ITEM.get(id).rarity]--;
  const level = levelOf(xp);
  return { xp, level, title: titleOf(level), floor: levelFloor(level), next: levelFloor(level + 1), balance: xp - spent, badges, perGame, quests, vouchers, stats: s };
}

// Quête d'aujourd'hui : modes à jouer, déjà joués, faite ou non, série en cours (celle d'hier tient jusqu'à minuit),
// roue du jour (celle qui a tourné, ou celle promise si la quête est finie avant minuit) et quêtes faites
// ces 7 derniers jours, aujourd'hui en dernier.
export function questStatus(progress, now = Date.now()) {
  const day = PARIS_DAY.format(now);
  const n = dayNumber(day);
  const today = progress.quests.get(n);
  const done = today?.streak ? today : null;
  const streak = done?.streak ?? progress.quests.get(n - 1)?.streak ?? 0;
  const week = [6, 5, 4, 3, 2, 1, 0].map((back) => Boolean(progress.quests.get(n - back)?.streak));
  return { day, modes: questOf(day), played: today?.played ?? new Set(), done, streak, wheel: done?.wheel ?? wheelFor(streak + 1), week };
}

// Raison qui empêche de récupérer cet article comme gain d'une case article de la roue, ou null.
// Niveau et solde ne comptent pas.
export function cannotClaim(item, progress, owned) {
  if (!item) return "Article inconnu";
  if (item.badge) return "Article exclusif : pas à la roue";
  if (owned.includes(item.id)) return "Déjà dans ton vestiaire";
  if (!(progress.vouchers[item.rarity] > 0)) return `Pas d'article « ${RARITY[item.rarity].label} » gagné à la roue`;
  return null;
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
