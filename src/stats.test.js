import assert from "node:assert/strict";
import { compareCountries, summarize, toEntry } from "./stats.js";

const country = (code) => ({ code });
const game = (mode, score, max, missed = [], hit = []) => ({ mode, score, max, n: max / 3, top: 0, mid: 0, missed, hit });

// toEntry : points, compteurs et codes
const e = toEntry({ mode: "flag", territories: false }, [
  { points: 3, country: country("FR") },
  { points: 1, country: country("BE") },
  { points: 0, country: country("NE") },
]);
assert.deepEqual([e.score, e.max, e.top, e.mid, e.n], [4, 9, 1, 1, 3]);
assert.deepEqual([e.hit, e.missed], [["FR", "BE"], ["NE"]]);
assert.ok(e.id && e.at && e.mode === "flag");

// Aucun historique pour ce mode
assert.equal(summarize([game("tld", 3, 30)], "flag"), null);

// Moyenne en %, meilleure partie, tendance (10 dernières vs les 10 d'avant)
const h = [
  ...Array.from({ length: 10 }, () => game("flag", 15, 30)), // 50 %
  ...Array.from({ length: 10 }, () => game("flag", 24, 30)), // 80 %
  game("tld", 30, 30), // autre mode : ignoré
];
const s = summarize(h, "flag");
assert.equal(s.games, 20);
assert.equal(Math.round(s.avg * 100), 65);
assert.equal(Math.round(s.trend * 100), 30);
assert.equal(s.best.score, 24);
assert.equal(s.last.length, 20);

// Pas de tendance tant qu'il n'y a pas de parties « d'avant »
assert.equal(summarize([game("map", 9, 30)], "map").trend, null);

// Pays à revoir : les plus ratés d'abord, à égalité les plus systématiquement ratés
const r = summarize(
  [game("flag", 0, 9, ["NE", "NG"], ["FR"]), game("flag", 0, 9, ["NE", "TD"], ["NG"]), game("flag", 0, 9, ["TD"], ["NE"])],
  "flag"
).toReview;
assert.deepEqual(r.map((t) => t.code), ["TD", "NE", "NG"]);
assert.deepEqual([r[0].miss, r[0].seen, r[1].seen, r[2].miss, r[2].seen], [2, 2, 3, 1, 2]);
// Duel pays par pays : seulement les pays tombés chez les deux, dans le mode demandé.
const moi = [game("flag", 0, 9, ["NE", "TD"], ["FR"]), game("flag", 0, 9, ["TD"], ["NE", "BE"])];
const ami = [game("flag", 0, 9, ["FR", "NE"], ["TD"]), game("flag", 0, 9, ["NE", "JP"], []), game("tld", 0, 3, ["BE"], [])];
const duel = compareCountries(moi, ami, "flag");
assert.deepEqual(duel.both.map((r) => r.code), ["NE"], "séchés des deux côtés");
assert.deepEqual(duel.mine.map((r) => r.code), ["FR"], "je connais, l'ami rate");
assert.deepEqual(duel.theirs.map((r) => r.code), ["TD"], "l'ami connaît, je rate");
assert.deepEqual([duel.both[0].mine.miss, duel.both[0].theirs.miss], [1, 2]);
console.log("stats OK");
