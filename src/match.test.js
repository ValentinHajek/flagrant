import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isCorrect } from "./match.js";
import { COUNTS, buildQuiz, distractors, eligible, questionCount } from "./quiz.js";

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
for (const mode of ["flag", "tld", "mix"]) {
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
        else assert.ok(q.country.tld, `${q.country.code} a une extension`);
        if (mode !== "mix") assert.equal(q.type, mode);
        const d = distractors(q.country, scope);
        assert.equal(d.length, 3);
        assert.ok(!d.includes(q.country) && new Set(d).size === 3, "leurres distincts de la réponse");
      }
    }
  }
}
console.log("quiz OK");
