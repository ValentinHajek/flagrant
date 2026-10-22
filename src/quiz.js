export const SECONDS = 20; // chrono par question
export const PTS_CASH = 5; // flash (saisie libre) ou pile sur la carte : avant le 22/10/2026, 3 points
export const PTS_CARRE = 1;
export const COUNTS = [10, 20, 30, 50, "all"];
export const DEFAULT_COUNT = 20;
export const MODES = ["flag", "tld", "mix", "map"];

// Mode carte : épingle dans le pays ou presque = 3 pts, proche = 1 pt. En vue monde 1 px ≈ 50 km :
// la marge de 100 km rend les micro-États et les îles cliquables sans zoomer.
export const MAP_PILE_KM = 100;
export const MAP_PROCHE_KM = 500;
export const mapPoints = (km) => (km <= MAP_PILE_KM ? PTS_CASH : km <= MAP_PROCHE_KM ? PTS_CARRE : 0);

export const flagUrl = (c) => `https://flagcdn.com/${c.code.toLowerCase()}.svg`;
export const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

const canFlag = (c) => c.drapeau;
const canTld = (c) => Boolean(c.tld);

const CAN = { flag: canFlag, tld: canTld, mix: (c) => canFlag(c) || canTld(c), map: (c) => c.carte };

// Pays qui peuvent tomber dans ce mode ("flag" | "tld" | "mix" | "map").
export const eligible = (all, mode, territories) => all.filter((c) => (territories || c.souverain) && CAN[mode](c));

export const questionCount = (all, mode, territories, count) => {
  const n = eligible(all, mode, territories).length;
  return count === "all" ? n : Math.min(count, n);
};

// Tire les questions au hasard dans la base selon le mode et le nombre choisis.
export function buildQuiz(all, mode, territories, count) {
  const scope = all.filter((c) => territories || c.souverain);
  const questions = shuffle(eligible(all, mode, territories))
    .slice(0, questionCount(all, mode, territories, count))
    .map((country) => ({
      country,
      type: mode !== "mix" ? mode : !canTld(country) ? "flag" : !canFlag(country) ? "tld" : Math.random() < 0.5 ? "flag" : "tld",
    }));
  return { scope, questions };
}

// 3 leurres, en priorité voisins (même sous-région) pour que le carré reste dur.
export function distractors(target, scope) {
  const others = scope.filter((c) => c !== target);
  const near = shuffle(others.filter((c) => c.sousRegion === target.sousRegion));
  const region = shuffle(others.filter((c) => c.region === target.region && c.sousRegion !== target.sousRegion));
  const far = shuffle(others.filter((c) => c.region !== target.region));
  return [...near, ...region, ...far].slice(0, 3);
}
