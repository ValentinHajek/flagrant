import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { distanceToCountry, fmtKm, parseWorld } from "./geo.js";
import { MAP_PILE_KM, MAP_PROCHE_KM, PTS_CARRE, PTS_CASH, buildQuiz, mapPoints } from "./quiz.js";

const read = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url)));
const all = read("countries.json");
const map = parseWorld(read("world.json"));
const km = (code, lonlat) => distanceToCountry(map.byCode.get(code), lonlat).km;
const between = (v, min, max, label) => assert.ok(v >= min && v <= max, `${label} : ${v} km hors de [${min}, ${max}]`);

// Base et carte cohérentes : chaque pays « carte » a un contour, chaque contour un pays.
const codes = new Set(all.map((c) => c.code));
for (const c of all) assert.equal(c.carte, map.byCode.has(c.code), `${c.code} carte`);
for (const code of map.byCode.keys()) assert.ok(codes.has(code), `contour ${code} sans pays`);
assert.ok(!map.byCode.has("AQ"), "Antarctique hors jeu");

// Distances
assert.equal(km("FR", [2.35, 48.86]), 0, "Paris est en France");
assert.equal(km("US", [-98, 38.5]), 0, "le Kansas est aux États-Unis");
between(km("FR", [-3.7, 40.42]), 250, 450, "Madrid → France");
between(km("US", [-100, 49.2]), 15, 30, "juste au nord du 49e parallèle → États-Unis");
between(km("NR", [167.93, -0.53]), 90, 130, "1° à l'est de Nauru");
between(km("FR", [151.2, -33.87]), 9000, 9400, "Sydney → France (via la Réunion, qui compte comme la France)");

// Barème
assert.equal(mapPoints(0), PTS_CASH);
assert.equal(mapPoints(MAP_PILE_KM), PTS_CASH);
assert.equal(mapPoints(MAP_PILE_KM + 1), PTS_CARRE);
assert.equal(mapPoints(MAP_PROCHE_KM), PTS_CARRE);
assert.equal(mapPoints(MAP_PROCHE_KM + 1), 0);
assert.equal(mapPoints(km("VA", [12.4964, 41.9028])), PTS_CASH, "Rome compte pile pour le Vatican");
assert.equal(fmtKm(2340).replace(/\s/g, " "), "2 340 km");

// Tirage du mode carte
for (const territories of [false, true]) {
  const { questions } = buildQuiz(all, "map", territories, "all");
  assert.ok(questions.length > 190);
  for (const q of questions) {
    assert.equal(q.type, "map");
    assert.ok(q.country.carte && (territories || q.country.souverain));
  }
}
console.log("geo OK");
