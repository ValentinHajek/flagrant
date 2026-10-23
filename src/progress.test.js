import assert from "node:assert/strict";
import { BASE, ITEM, ITEMS, cleanLook, DEFAULT_LOOK } from "./items.js";
import { BADGE, DAILY_BONUS, RESCALE_AT, cannotBuy, computeProgress, gameReward, levelOf, titleOf } from "./progress.js";
import { PTS_CARRE, PTS_CASH } from "./quiz.js";

// Niveaux : 50, 150, 300, 500…
assert.deepEqual([0, 49, 50, 149, 150, 299, 300, 500].map(levelOf), [1, 1, 2, 2, 3, 3, 4, 5]);
assert.deepEqual([1, 3, 5, 8, 12, 16, 30].map(titleOf), ["Touriste", "Routard", "Globe-trotter", "Cartographe", "Explorateur", "Légende du GeoGuessr", "Légende du GeoGuessr"]);

// Récompense d'une partie : barème actuel (÷ 3)…
assert.deepEqual(gameReward({ n: 10, top: 10, score: 30, streak: 10 }), { score: 10, perfect: 5, streak: 1 });
assert.deepEqual(gameReward({ n: 9, top: 9, score: 27 }), { score: 9, perfect: 0, streak: 0 }, "sans-faute dès 10 questions");
// …et ancien barème pour les parties jouées avant la bascule
assert.deepEqual(gameReward({ at: RESCALE_AT - 1, n: 10, top: 10, score: 30, streak: 10 }), { score: 30, perfect: 15, streak: 5 });

let id = 0;
const g = (at, over = {}) => ({ id: `g${id++}`, at, mode: "flag", n: 3, score: 4, max: 9, top: 1, mid: 1, hit: ["FR", "BE"], missed: ["NE"], streak: 2, ...over });
const T = (iso) => Date.parse(iso);

// Tampon du jour : une fois par jour, jour compté à l'heure de Paris.
{
  const games = [g(T("2026-10-22T09:00Z")), g(T("2026-10-22T21:00Z")), g(T("2026-10-22T23:30Z"))]; // 23 h30 UTC = 1 h30 à Paris le 23
  const p = computeProgress(games);
  // 11 h (ancien barème : 4 + 20), 23 h le même jour (nouveau : 1), 1 h 30 le lendemain (nouveau : 1 + tampon du jour)
  assert.deepEqual(games.map((x) => p.perGame.get(x.id).daily), [20, 0, DAILY_BONUS]);
  assert.equal(p.xp, 4 + 20 + 1 + 1 + DAILY_BONUS + BADGE.get("premier-pas").reward);
  assert.deepEqual(p.badges, ["premier-pas"]);
  assert.equal(p.balance, p.xp);
}

// Repère du barème : avec des parties de 20 questions honnêtes (15 flash, 3 carrés), la casquette
// s'obtient en 5 à 9 parties
{
  const cheapest = ITEM.get("cap").price;
  const at = (h) => RESCALE_AT + 864e5 + h * 36e5;
  const honest = (h) => g(at(h), { n: 20, score: 15 * PTS_CASH + 3 * PTS_CARRE, max: 20 * PTS_CASH, top: 15, mid: 3, hit: Array(18).fill("FR"), missed: ["NE", "TD"], streak: 6 });
  let played = 0;
  for (const games = []; computeProgress(games).xp < cheapest; ) games.push(honest(++played));
  assert.ok(played >= 5 && played <= 9, `${played} parties pour un article à ${cheapest}`);
}

// Badges et solde
{
  const perfect = g(T("2026-10-20T10:00Z"), { n: 10, top: 10, mid: 0, score: 30, max: 30, hit: Array(10).fill("FR"), missed: [], streak: 15 });
  const week = Array.from({ length: 7 }, (_, k) => g(T(`2026-10-0${k + 1}T12:00Z`)));
  const p = computeProgress([perfect, ...week], ["cap", "bob"]);
  for (const b of ["premier-pas", "sans-faute", "serie-de-feu", "assidu"]) assert.ok(p.badges.includes(b), b);
  assert.ok(!p.badges.includes("marathon"));
  assert.equal(p.stats.dayStreak, 7);
  assert.equal(p.balance, p.xp - ITEM.get("cap").price - ITEM.get("bob").price);
  assert.equal(p.level, levelOf(p.xp));

  // Achats : raisons de refus, dans l'ordre où le joueur les comprend
  assert.equal(cannotBuy(ITEM.get("nope"), p, []), "Article inconnu");
  assert.equal(cannotBuy(ITEM.get("cap"), p, ["cap"]), "Déjà dans ton vestiaire");
  assert.match(cannotBuy(ITEM.get("astronaut"), p, []), /Marathon/);
  assert.equal(cannotBuy(ITEM.get("laurel"), { ...p, balance: 1200 }, []), null, "exclusif débloqué par le badge sans-faute");
  assert.equal(cannotBuy(ITEM.get("laurel"), { ...p, balance: 1199 }, []), "Pas assez de tampons", "un exclusif se paie");
  assert.equal(cannotBuy(ITEM.get("crown"), p, []), "Niveau 10 requis");
  assert.equal(cannotBuy(ITEM.get("cap"), { ...p, balance: 10 }, []), "Pas assez de tampons");
}

// Catalogue : ids uniques, exclusifs reliés à un badge existant et payants
assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
for (const i of ITEMS.filter((i) => i.badge)) assert.ok(BADGE.has(i.badge) && i.price > 0, i.id);

// Tenue : valeurs inconnues et articles non possédés écartés
assert.deepEqual(cleanLook({ skin: "<script>", hat: "crown", glasses: "round", top: "cap" }, ["round", "cap"]), { ...DEFAULT_LOOK, glasses: "round" });
// 8 coupes et 4 expressions, acceptées telles quelles (le serveur valide avec la même fonction)
assert.equal(BASE.hair.length, 8);
assert.equal(BASE.eyes.length, 4);
assert.deepEqual(cleanLook({ hair: "chauve", eyes: "clin" }, []), { ...DEFAULT_LOOK, hair: "chauve", eyes: "clin" });
assert.equal(cleanLook({ hair: "rase" }, []).hair, DEFAULT_LOOK.hair, "l'ancienne coupe Rasé (remplacée par le mulet) revient à la coupe par défaut");
console.log("progress OK");
