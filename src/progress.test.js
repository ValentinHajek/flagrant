import assert from "node:assert/strict";
import { BASE, ITEM, ITEMS, cleanLook, DEFAULT_LOOK } from "./items.js";
import { BADGE, DAILY_BONUS, QUEST_BONUS, RESCALE_AT, WHEELS, cannotBuy, cannotClaim, computeProgress, gameReward, levelOf, questOf, questStatus, titleOf } from "./progress.js";
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
  const retired = ["chapka", "ski", "aviator", "binary"]; // retirés le 23/10/2026 (changement de prix ou de dessin)
  assert.equal(computeProgress([perfect, ...week], retired, ["ski"]).balance, p.xp, "articles retirés du catalogue : remboursés");
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

// Quête du jour : les 2 objectifs du jour (une partie dans un mode, ou une révision finie) → bonus + tour de roue,
// meilleure roue avec la série
{
  const at = (k, h = 10) => Date.UTC(2026, 9, 23 + k, h); // vers midi à Paris, k jours après le lancement
  const play = (task, t) => (task === "revision" ? g(t, { revisedAt: t + 6e4 }) : g(t, { mode: task })); // révision : d'une partie Drapeaux
  const quest = (k) => questOf(new Date(at(k)).toISOString().slice(0, 10)).map((task, i) => play(task, at(k, 10 + i)));
  const spins = (games) => {
    const { perGame } = computeProgress(games);
    return games.flatMap((x) => [perGame.get(x.id).spin, perGame.get(`${x.id}:revision`)?.spin]).filter(Boolean);
  };

  assert.equal(computeProgress(questOf("2026-10-22").map((task) => play(task, T("2026-10-22T10:00Z")))).quests.size, 0, "rien avant le lancement");
  const [first, second] = quest(0);
  assert.equal(spins([first]).length, 0, "un seul des deux modes");
  const p = computeProgress([first, second]);
  const gain = p.perGame.get(second.id);
  assert.deepEqual([gain.quest, gain.spin.streak, gain.spin.wheel], [QUEST_BONUS, 1, 0]);
  assert.equal(gain.spin.prize, WHEELS[0].slices[gain.spin.slot].tampons ?? 0);
  assert.equal(gain.total, gain.score + QUEST_BONUS + gain.spin.prize);
  assert.equal(spins([first, second, ...quest(0)]).length, 1, "une seule quête par jour");
  // Même tirage côté serveur, où les parties ont un _id
  assert.equal(computeProgress([first, second].map(({ id, ...x }) => ({ _id: id, ...x }))).xp, p.xp);

  // Roue argent au 3e jour d'affilée, or au 7e ; un jour sauté remet la série à 1
  const week = [0, 1, 2, 3, 4, 5, 6, 7, 9].flatMap(quest);
  assert.deepEqual(spins(week).map((s) => [s.streak, s.wheel]), [[1, 0], [2, 0], [3, 1], [4, 1], [5, 1], [6, 1], [7, 2], [8, 2], [1, 0]]);

  // Accueil : la série d'hier tient jusqu'à ce soir, la roue promise suit
  const two = [0, 1].flatMap(quest);
  assert.deepEqual(questStatus(computeProgress(two), at(2, 6)), {
    day: "2026-10-25",
    modes: questOf("2026-10-25"),
    played: new Set(),
    done: null,
    streak: 2,
    wheel: 1,
    week: [false, false, false, false, true, true, false], // les 2 jours de quête avant aujourd'hui
  });
  const s = questStatus(computeProgress([...two, quest(2)[0]]), at(2, 20));
  assert.deepEqual([s.played.size, s.done, s.streak], [1, null, 2]);
  assert.equal(questStatus(computeProgress([...two, ...quest(2)]), at(2, 20)).done.streak, 3);
  assert.deepEqual([questStatus(computeProgress(two), at(3)).streak, questStatus(computeProgress(two), at(3)).wheel], [0, 0], "série perdue");

  // Révision : comptée le jour où elle est finie (ici le lendemain de la partie), gain sur « id:revision »
  assert.deepEqual(questOf("2026-10-24"), ["capital", "revision"]);
  const late = g(at(0, 21), { revisedAt: at(1, 9) }); // partie à 23 h, révision finie le lendemain
  const day1 = [late, play("capital", at(1, 10))];
  const rev = computeProgress(day1).perGame.get(`${late.id}:revision`);
  assert.equal(spins(day1).length, 1);
  assert.equal(rev, undefined, "la partie Capitales boucle la quête, pas la révision");
  const revFirst = computeProgress([play("capital", at(1, 8)), late]).perGame.get(`${late.id}:revision`);
  assert.deepEqual([revFirst.quest, revFirst.total], [QUEST_BONUS, QUEST_BONUS + revFirst.spin.prize], "révision qui boucle la quête : bonus + roue");
  assert.equal(spins([play("tld", at(0)), play("revision", at(0, 12))]).length, 0, "pas de révision au programme ce jour-là");
  assert.equal(computeProgress(day1.map(({ id, ...x }) => ({ _id: id, ...x }))).xp, computeProgress(day1).xp, "même calcul côté serveur");

  // Roue : chances sur 100. Une case article donne un article de sa rareté, sans payer, même pas encore débloqué ;
  // jamais un exclusif de badge, et une case gagnée = un seul article.
  for (const w of WHEELS) assert.equal(w.slices.reduce((t, x) => t + x.p, 0), 100, w.name);
  let won;
  for (let k = 0; !won?.spin.item; k++) {
    const games = quest(0).map((x, i) => ({ ...x, id: `bon${k}-${i}` }));
    won = { games, spin: spins(games)[0] };
  }
  const rarity = won.spin.item;
  const pv = computeProgress(won.games);
  assert.deepEqual([won.spin.prize, pv.vouchers[rarity]], [0, 1]);
  const [it, other] = ITEMS.filter((i) => i.rarity === rarity && !i.badge).sort((a, b) => b.level - a.level);
  assert.equal(cannotClaim(it, pv, []), null, "même verrouillé, même sans les tampons");
  const claimed = computeProgress(won.games, [it.id], [it.id]);
  assert.deepEqual([claimed.balance, claimed.vouchers[rarity]], [pv.balance, 0], "gratuit, et le bon est utilisé");
  assert.match(cannotClaim(other, claimed, [it.id]), /gagné à la roue/);
  assert.match(cannotClaim(ITEMS.find((i) => i.badge), pv, []), /exclusif/);
}

// Catalogue : ids uniques, exclusifs reliés à un badge existant et payants
assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
for (const i of ITEMS.filter((i) => i.badge)) assert.ok(BADGE.has(i.badge) && i.price > 0, i.id);
const exclusive = ITEMS.filter((i) => i.badge).map((i) => i.badge);
assert.equal(new Set(exclusive).size, exclusive.length, "un exclusif par badge : la page Badges et la fin de partie n'en montrent qu'un");

// Tenue : valeurs inconnues et articles non possédés écartés
assert.deepEqual(cleanLook({ skin: "<script>", hat: "crown", glasses: "round", top: "cap" }, ["round", "cap"]), { ...DEFAULT_LOOK, glasses: "round" });
// 8 coupes et 5 regards, acceptés tels quels (le serveur valide avec la même fonction)
assert.equal(BASE.hair.length, 8);
assert.equal(BASE.eyes.length, 5);
assert.deepEqual(cleanLook({ hair: "chauve", eyes: "pas-content", hairColor: "#f27ab0" }, []), { ...DEFAULT_LOOK, hair: "chauve", eyes: "pas-content", hairColor: "#f27ab0" });
assert.equal(cleanLook({ hair: "rase" }, []).hair, DEFAULT_LOOK.hair, "l'ancienne coupe Rasé (remplacée par le mulet) revient à la coupe par défaut");
console.log("progress OK");
