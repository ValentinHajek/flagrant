import { randomUUID } from "node:crypto";
import { cleanLook } from "../src/items.js";
import { MODES } from "../src/quiz.js";
import { HttpError, body, json, limit, preflight, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

// Défis 1 contre 1 entre amis : le lanceur tire une série, chacun la joue quand il veut.
// Le score de chacun, c'est sa première partie synchronisée avec ce défi (champ duel des parties).

const isCode = (c) => typeof c === "string" && /^[A-Z]{2}$/.test(c);
const TYPES = { flag: ["flag"], tld: ["tld"], mix: ["flag", "tld"], map: ["map"] };

// Mêmes questions et mêmes leurres au carré pour les deux joueurs (pas de carré sur la carte).
function cleanSeries(mode, list) {
  if (!Array.isArray(list) || list.length < 5 || list.length > 50) return null;
  const seen = new Set();
  for (const q of list) {
    if (!q || !isCode(q.code) || seen.has(q.code) || !TYPES[mode].includes(q.type)) return null;
    seen.add(q.code);
    const c = q.choices;
    const ok = mode === "map" ? c === undefined : Array.isArray(c) && c.length === 3 && new Set(c).size === 3 && c.every((x) => isCode(x) && x !== q.code);
    if (!ok) return null;
  }
  return list.map(({ code, type, choices }) => (choices ? { code, type, choices } : { code, type }));
}

// Une partie compte pour le défi si elle porte exactement sur sa série (pas une partie trafiquée ailleurs).
function scores(duel, games) {
  const codes = duel.questions.map((q) => q.code).sort().join();
  const out = {};
  for (const g of games) {
    if (g.duel !== duel._id || out[g.userId] || [...g.hit, ...g.missed].sort().join() !== codes) continue;
    out[g.userId] = { score: g.score + (g.bonus ?? 0), max: g.max, at: g.at }; // bonus combo compris
  }
  return out;
}

// Les défis du joueur, du plus récent au plus ancien, vus de son côté (me / them).
export const GET = route(async (request) => {
  const { d, user } = await requireUser(request);
  const duels = await d
    .collection("duels")
    .find({ $or: [{ from: user._id }, { to: user._id }] })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  const games = await d
    .collection("games")
    .find({ duel: { $in: duels.map((x) => x._id) } }, { projection: { userId: 1, duel: 1, score: 1, max: 1, bonus: 1, at: 1, hit: 1, missed: 1 } })
    .sort({ at: 1 })
    .toArray();
  const ids = [...new Set(duels.map((x) => (x.from === user._id ? x.to : x.from)))];
  const people = await d.collection("users").find({ _id: { $in: ids } }, { projection: { pseudo: 1, look: 1, owned: 1 } }).toArray();
  const who = new Map(people.map((p) => [p._id, { id: p._id, pseudo: p.pseudo, look: cleanLook(p.look, p.owned ?? []) }]));
  return json(request, {
    duels: duels.map((x) => {
      const rival = x.from === user._id ? x.to : x.from;
      const s = scores(x, games);
      const open = !s[user._id] && !x.declinedAt; // la série n'est envoyée qu'à celui qui doit encore jouer
      return {
        id: x._id,
        mode: x.mode,
        territories: x.territories,
        n: x.questions.length,
        at: +x.createdAt,
        mine: x.from === user._id,
        rival: who.get(rival) ?? { id: rival, pseudo: "Ancien joueur", look: null },
        me: s[user._id] ?? null,
        them: s[rival] ?? null,
        declined: Boolean(x.declinedAt),
        ...(open && { questions: x.questions }),
      };
    }),
  });
});

// Lance un défi contre un ami avec la série tirée par le navigateur (même série pour les deux : rien à y gagner).
export const POST = route(async (request) => {
  const { d, user } = await requireUser(request);
  const data = await body(request);
  if (!user.friends.includes(data.friend)) throw new HttpError(403, "Ce joueur n'est pas dans tes amis");
  if (!MODES.includes(data.mode)) throw new HttpError(400, "Mode inconnu");
  const questions = cleanSeries(data.mode, data.questions);
  if (!questions) throw new HttpError(400, "Série de questions invalide");
  await limit(d, `duel:${user._id}`, 30, 3600);
  const duel = { _id: randomUUID(), from: user._id, to: data.friend, mode: data.mode, territories: data.territories === true, questions, createdAt: new Date() };
  await d.collection("duels").insertOne(duel);
  return json(request, { id: duel._id });
});

// Refuser un défi reçu, tant qu'on ne l'a pas joué.
export const DELETE = route(async (request) => {
  const { d, user } = await requireUser(request);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (await d.collection("games").findOne({ duel: id, userId: user._id })) throw new HttpError(400, "Tu as déjà joué ce défi");
  const res = await d.collection("duels").updateOne({ _id: id, to: user._id, declinedAt: { $exists: false } }, { $set: { declinedAt: new Date() } });
  if (!res.matchedCount) throw new HttpError(404, "Défi introuvable");
  return json(request, { ok: true });
});
