import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { closest, isCorrect } from "./match.js";
import { COUNTS, TYPES, buildQuiz, comboBonus, distractors, eligible, fromSeries, maxCombo, questionCount, toSeries, total } from "./quiz.js";

const all = JSON.parse(readFileSync(new URL("../public/data/countries.json", import.meta.url)));
const get = (code) => all.find((c) => c.code === code);
const ok = (input, code) => assert.ok(isCorrect(input, get(code), all), `${input} → ${code}`);
const ko = (input, code) => assert.ok(!isCorrect(input, get(code), all), `${input} ≠ ${code}`);

// Fautes tolérées
ok("france", "FR");
ok("nepla", "NP");
ok("peru", "PE");
ok("Iarn", "IR");
ko("irak", "IR");
ok("Allemagen", "DE");
ok("etats unis", "US");
ok("usa", "US");
ok("angleterre", "GB");
ok("cote divoire", "CI");
ok("Kazakstan", "KZ");
ok("nouvelle zelande", "NZ");
// Le pays le plus proche gagne
ko("niger", "NG");
ok("nigeria", "NG");
ko("guinee", "GW");
ok("guinee bissau", "GW");
ko("autriche", "AU");
ko("", "FR");
ko("iran", "IQ");
// "Îles" facultatif
ok("salomon", "SB");
ok("iles salomon", "SB");
ok("marshall", "MH");
ok("maurice", "MU");
// Début de nom unique accepté, ambigu refusé
ok("saint vincent", "VC");
ok("papouasie", "PG");
ok("trinite", "TT");
ok("sao tome", "ST");
ok("antigua", "AG");
ko("saint", "VC");
ko("nouvelle", "NZ");
ko("guinee", "PG");
ko("samoa", "AS");
ko("congo", "CD");
console.log("match OK");

// Tirage du quiz et leurres du carré
for (const mode of ["flag", "tld", "capital", "mix"]) {
  for (const territories of [false, true]) {
    for (const count of COUNTS) {
      const { scope, questions } = buildQuiz(all, mode, territories, count);
      const n = count === "all" ? eligible(all, mode, territories).length : count;
      assert.equal(questions.length, n, `${mode} ${territories} ${count}`);
      assert.equal(questionCount(all, mode, territories, count), n);
      assert.equal(new Set(questions.map((q) => q.country.code)).size, n, "pas de doublon");
      for (const q of questions) {
        if (!territories) assert.ok(q.country.souverain, "territoire exclu");
        if (q.type === "flag") assert.ok(q.country.drapeau, `${q.country.code} a un drapeau propre`);
        else if (q.type === "tld") assert.ok(q.country.tld, `${q.country.code} a une extension`);
        else if (q.type === "capital") assert.ok(q.country.capitale && q.country.capitale !== q.country.nom, `${q.country.code} : capitale qui ne donne pas la réponse`);
        else assert.ok(q.type === "map" && q.country.carte, `${q.country.code} est sur la carte`);
        if (mode !== "mix") assert.equal(q.type, mode);
        const d = distractors(q.country, scope);
        assert.equal(d.length, 3);
        assert.ok(!d.includes(q.country) && new Set(d).size === 3, "leurres distincts de la réponse");
      }
    }
  }
}

// Le mix pioche dans tous les modes, carte comprise.
assert.deepEqual(new Set(buildQuiz(all, "mix", false, "all").questions.map((q) => q.type)), new Set(TYPES));
// Capitales : tous les pays souverains en ont une, et deux pays n'ont jamais la même (Victoria, Kingston…).
assert.ok(all.every((c) => !c.souverain || c.capitale), "capitale de chaque pays souverain");
const capitals = all.map((c) => c.capitale).filter(Boolean);
assert.equal(new Set(capitals).size, capitals.length, "capitales sans doublon");

// Défi : la série envoyée au serveur redonne exactement les mêmes questions et les mêmes leurres.
for (const mode of ["mix", "map"]) {
  const quiz = buildQuiz(all, mode, true, 50);
  const series = toSeries(quiz);
  assert.ok(series.every((q) => (q.type === "map" ? !q.choices : q.choices.length === 3)), `${mode} : leurres seulement hors carte`);
  const again = fromSeries(all, true, JSON.parse(JSON.stringify(series))); // aller-retour par le serveur
  assert.deepEqual(again.questions.map((q) => [q.country, q.type]), quiz.questions.map((q) => [q.country, q.type]));
  assert.deepEqual(again.questions.map((q) => q.choices?.map((c) => c.code)), series.map((q) => q.choices));
}
assert.equal(fromSeries(all, false, [{ code: "QQ", type: "flag", choices: ["FR", "BE", "DE"] }]), null, "pays inconnu de cette version");
assert.equal(fromSeries(all, false, [{ code: "MC", type: "capital", choices: ["FR", "IT", "ES"] }]), null, "Monaco n'a pas de question capitale");
assert.equal(fromSeries(all, false, [{ code: "HK", type: "capital", choices: ["CN", "TW", "MO"] }]), null, "pas de capitale dans les données");
// Combo : +1 au 3e flash d'affilée, +2 au 5e, puis +5 tous les 5
assert.deepEqual([1, 2, 3, 4, 5, 9, 10, 14, 15].map(comboBonus), [0, 0, 1, 0, 2, 0, 5, 0, 5]);
assert.deepEqual([0, 2, 3, 5, 10, 20].map(maxCombo), [0, 0, 1, 3, 8, 18]);
assert.equal(total({ score: 40, bonus: 3 }), 43);
assert.equal(total({ score: 40 }), 40, "anciennes parties sans bonus");
console.log("quiz OK");

// Pays désigné par une mauvaise réponse (drapeau du récap)
assert.equal(closest("Niger", all)?.code, "NE");
assert.equal(closest("allemagen", all)?.code, "DE");
assert.equal(closest("papouasie", all)?.code, "PG");
assert.equal(closest("zzzzzz", all), null);
assert.equal(closest("", all), null);
