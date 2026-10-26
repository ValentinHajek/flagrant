// Test d'intégration de l'API contre un vrai MongoDB (base jetable, supprimée à la fin).
// Usage : MONGODB_URI=mongodb://127.0.0.1:27017 pnpm test:api
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DEFAULT_LOOK, ITEMS } from "../src/items.js";
import { computeProgress, questStatus } from "../src/progress.js";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017";
process.env.MONGODB_DB = `flagrant_test_${Date.now()}`;
process.env.APP_URL = "http://localhost:4173/";
process.env.ALLOWED_ORIGINS = "https://valentinhajek.github.io";
delete process.env.SMTP_URL;
delete process.env.NODE_ENV;

const { db, devOutbox } = await import("../api/_lib.js");
const api = {
  login: await import("../api/login.js"),
  session: await import("../api/session.js"),
  me: await import("../api/me.js"),
  games: await import("../api/games.js"),
  friends: await import("../api/friends.js"),
  shop: await import("../api/shop.js"),
  duels: await import("../api/duels.js"),
};

async function call(name, method, { query = "", body, token, headers = {} } = {}) {
  const request = new Request(`http://localhost/api/${name}${query}`, {
    method,
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }), ...headers },
    body: body && JSON.stringify(body),
  });
  const res = await api[name][method](request);
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
}

async function signIn(email, ip) {
  const r = await call("login", "POST", { body: { email }, headers: { "x-forwarded-for": ip } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const token = new URL(devOutbox.at(-1).link).searchParams.get("login");
  const s = await call("session", "POST", { body: { token } });
  assert.equal(s.status, 200, JSON.stringify(s.data));
  return { session: s.data.session, me: s.data.me, token };
}

const game = (over = {}) => ({ id: randomUUID(), at: Date.now(), mode: "flag", territories: false, n: 3, score: 4, max: 9, top: 1, mid: 1, hit: ["FR", "BE"], missed: ["NE"], streak: 2, ...over });

try {
  // Connexion par lien : e-mail invalide refusé, lien à usage unique, pseudo tiré de l'e-mail.
  assert.equal((await call("login", "POST", { body: { email: "pas-un-mail" } })).status, 400);
  const a = await signIn("Val.Hajek@Example.com", "1.1.1.1");
  assert.equal(a.me.email, "val.hajek@example.com");
  assert.equal(a.me.pseudo, "Val Hajek");
  assert.equal(a.me.pseudoSet, false, "pseudo pas encore choisi");
  assert.match(a.me.friendCode, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal((await call("session", "POST", { body: { token: a.token } })).status, 400, "lien déjà utilisé");
  assert.equal((await call("login", "POST", { body: { email: "val.hajek@example.com" }, headers: { "x-forwarded-for": "1.1.1.1" } })).status, 429, "1 lien par minute");

  // Profil
  assert.equal((await call("me", "GET")).status, 401, "sans session");
  assert.equal((await call("me", "GET", { token: "faux" })).status, 401, "session inconnue");
  assert.equal((await call("me", "PATCH", { token: a.session, body: { pseudo: "x" } })).status, 400);
  const renamed = (await call("me", "PATCH", { token: a.session, body: { pseudo: "  Val   le Pro " } })).data.me;
  assert.deepEqual([renamed.pseudo, renamed.pseudoSet], ["Val le Pro", true]);
  assert.equal((await call("me", "GET", { token: a.session })).data.me.pseudoSet, true, "choix du pseudo enregistré");

  // Parties : les invalides sont ignorées, l'envoi est idempotent.
  const g1 = game();
  const bad = [game({ score: 9 }), game({ mode: "pirate" }), game({ hit: ["fr", "BE"] }), game({ id: "x" }), { id: 1 }];
  const sent = await call("games", "POST", { token: a.session, body: { games: [g1, ...bad] } });
  assert.deepEqual([sent.status, sent.data.accepted], [200, 1]);
  await call("games", "POST", { token: a.session, body: { games: [g1] } });
  const mine = await call("games", "GET", { token: a.session });
  assert.equal(mine.data.games.length, 1);
  assert.deepEqual(mine.data.games[0], { ...g1 }, "partie relue à l'identique");
  // Révision finie après coup (quête du jour) : la date rejoint la partie déjà enregistrée, la première est gardée.
  await call("games", "POST", { token: a.session, body: { games: [{ ...g1, revisedAt: g1.at + 2000 }] } });
  await call("games", "POST", { token: a.session, body: { games: [{ ...g1, revisedAt: g1.at + 5000 }] } });
  assert.equal((await call("games", "GET", { token: a.session })).data.games[0].revisedAt, g1.at + 2000);
  assert.equal((await call("games", "POST", { token: a.session, body: { games: [game({ revisedAt: Date.now() - 864e5 })] } })).data.accepted, 0, "révision avant la partie");

  // Amis : pas d'accès aux parties d'un inconnu, accès réciproque après ajout par code.
  const b = await signIn("lea@example.com", "2.2.2.2");
  await call("games", "POST", { token: b.session, body: { games: [game({ mode: "map", score: 3, top: 1, mid: 0, hit: ["IT"], missed: ["MT", "SM"], streak: 1 })] } });
  assert.equal((await call("games", "GET", { token: a.session, query: `?user=${b.me.id}` })).status, 403);
  assert.equal((await call("friends", "POST", { token: a.session, body: { code: "ZZZZZZ" } })).status, 404);
  assert.equal((await call("friends", "POST", { token: a.session, body: { code: a.me.friendCode } })).status, 400);
  const added = await call("friends", "POST", { token: a.session, body: { code: b.me.friendCode.toLowerCase() } });
  assert.deepEqual(added.data.friend, { id: b.me.id, pseudo: "Lea", look: DEFAULT_LOOK });
  assert.equal((await call("games", "GET", { token: a.session, query: `?user=${b.me.id}` })).data.games[0].mode, "map");
  assert.deepEqual((await call("me", "GET", { token: b.session })).data.friends.map(({ id, pseudo }) => ({ id, pseudo })), [{ id: a.me.id, pseudo: "Val le Pro" }], "amitié réciproque");

  // Invitation par e-mail : compte créé, amitié immédiate, lien de connexion de 7 jours envoyé à l'invité.
  assert.equal((await call("friends", "POST", { token: a.session, body: { email: "pas-un-mail" } })).status, 400);
  assert.equal((await call("friends", "POST", { token: a.session, body: { email: a.me.email } })).status, 400);
  const inv = await call("friends", "POST", { token: a.session, body: { email: "Nina@Example.com" } });
  assert.equal(inv.status, 200, JSON.stringify(inv.data));
  assert.equal(inv.data.friend.pseudo, "Nina");
  assert.deepEqual([devOutbox.at(-1).email, devOutbox.at(-1).inviter], ["nina@example.com", "Val le Pro"]);
  const nina = await call("session", "POST", { body: { token: new URL(devOutbox.at(-1).link).searchParams.get("login") } });
  assert.equal(nina.data.me.id, inv.data.friend.id, "l'invitée se connecte sur le compte créé");
  assert.ok((await call("me", "GET", { token: nina.data.session })).data.friends.some((f) => f.id === a.me.id), "amitié réciproque dès l'invitation");
  assert.equal((await call("friends", "POST", { token: a.session, body: { email: "nina@example.com" } })).status, 429, "1 e-mail par minute");

  // Une partie d'un autre joueur ne peut pas être écrasée en réutilisant son id.
  await call("games", "POST", { token: b.session, body: { games: [{ ...g1, score: 0, top: 0, mid: 0, hit: [], missed: ["FR", "BE", "NE"] }] } });
  assert.equal((await call("games", "GET", { token: a.session })).data.games[0].score, 4);

  // Vestiaire : le solde vient des parties enregistrées côté serveur.
  const c = await signIn("chloe@example.com", "3.3.3.3");
  assert.deepEqual([c.me.owned, c.me.look.hat], [[], null]);
  assert.equal((await call("shop", "POST", { token: c.session, body: { item: "cap" } })).data.error, "Pas assez de tampons");
  const big = (k) => game({ n: 10, score: 50, max: 50, top: 10, mid: 0, hit: Array(10).fill("FR"), missed: [], streak: 10, at: Date.now() - k * 1000 });
  const posted = await call("games", "POST", { token: c.session, body: { games: [big(1), big(2), big(3)] } }); // barème à 5 points par flash
  assert.equal(posted.data.accepted, 3);
  // Combo : borné par le nombre de flash (10 flash d'affilée = 8 au plus)
  const combo = await call("games", "POST", { token: c.session, body: { games: [big(4), { ...big(5), bonus: 8 }, { ...big(6), bonus: 9 }] } });
  assert.equal(combo.data.accepted, 2, "bonus 9 impossible avec 10 flash");
  const bought = await call("shop", "POST", { token: c.session, body: { item: "cap" } });
  assert.deepEqual([bought.status, bought.data.owned], [200, ["cap"]]);
  assert.equal((await call("shop", "POST", { token: c.session, body: { item: "cap" } })).data.error, "Déjà dans ton vestiaire");
  assert.equal((await call("shop", "POST", { token: c.session, body: { item: "crown" } })).data.error, "Niveau 10 requis");
  assert.match((await call("shop", "POST", { token: c.session, body: { item: "astronaut" } })).data.error, /Marathon/);
  assert.equal((await call("shop", "POST", { token: c.session, body: { item: "laurel" } })).data.error, "Pas assez de tampons", "exclusif du badge sans-faute : débloqué mais payant");
  assert.equal((await call("me", "PATCH", { token: c.session, body: { look: { hat: "crown" } } })).status, 400, "article non possédé");
  const dressed = await call("me", "PATCH", { token: c.session, body: { look: { hat: "cap", hair: "boucles" } } });
  assert.deepEqual([dressed.data.me.look.hat, dressed.data.me.look.hair], ["cap", "boucles"]);
  await call("friends", "POST", { token: c.session, body: { code: b.me.friendCode } });
  assert.equal((await call("me", "GET", { token: b.session })).data.friends.find((f) => f.pseudo === "Chloe").look.hat, "cap", "tenue visible des amis");

  // Roue de la quête du jour : une case article gagnée donne un article de sa rareté sans payer, même verrouillé, une seule fois.
  const v = await signIn("vic@example.com", "4.4.4.4");
  const now = Date.now() - 1000;
  const tasks = questStatus(computeProgress([]), now).modes;
  let quest, spin;
  for (let k = 0; !spin?.item; k++) {
    quest = tasks.map((t, i) => game({ id: `quete-${k}-${i}`, at: now + i, ...(t === "revision" ? { revisedAt: now + 500 } : { mode: t }) }));
    spin = [...computeProgress(quest).perGame.values()].find((x) => x.spin)?.spin;
  }
  assert.equal((await call("games", "POST", { token: v.session, body: { games: quest } })).data.accepted, 2);
  const [it, other] = ITEMS.filter((i) => i.rarity === spin.item && !i.badge).sort((a, b) => b.level - a.level);
  assert.equal((await call("shop", "POST", { token: v.session, body: { item: it.id } })).status, 400, "à l'achat : niveau ou tampons manquants");
  const claimed = await call("shop", "POST", { token: v.session, body: { item: it.id, voucher: true } });
  assert.deepEqual([claimed.status, claimed.data.owned, claimed.data.vouchered], [200, [it.id], [it.id]]);
  assert.match((await call("shop", "POST", { token: v.session, body: { item: other.id, voucher: true } })).data.error, /gagné à la roue/, "une case gagnée, un article");
  assert.deepEqual((await call("me", "GET", { token: v.session })).data.me.vouchered, [it.id]);

  // Défis : seulement entre amis, même série pour les deux, score = première partie liée au défi.
  const series = ["FR", "BE", "DE", "IT", "ES"].map((code) => ({ code, type: "flag", choices: ["PT", "NL", "LU"].map((x) => (x === code ? "CH" : x)) }));
  const challenge = (token, friend, over = {}) => call("duels", "POST", { token, body: { friend, mode: "flag", territories: false, questions: series, ...over } });
  assert.equal((await challenge(a.session, c.me.id)).status, 403, "pas un ami");
  assert.equal((await challenge(a.session, b.me.id, { questions: series.slice(0, 4) })).status, 400, "série trop courte");
  assert.equal((await challenge(a.session, b.me.id, { questions: [...series.slice(1), series[1]] })).status, 400, "pays en double");
  assert.equal((await challenge(a.session, b.me.id, { mode: "map" })).status, 400, "pas de carré sur la carte");
  const duelId = (await challenge(a.session, b.me.id)).data.id;
  const toB = (await call("duels", "GET", { token: b.session })).data.duels[0];
  assert.deepEqual([toB.id, toB.mine, toB.rival.pseudo, toB.me, toB.them, toB.questions.length], [duelId, false, "Val le Pro", null, null, 5], "B reçoit l'invitation");
  const duelGame = (score, top, over = {}) =>
    game({ duel: duelId, n: 5, score, max: 25, top, mid: 0, hit: ["FR", "BE", "DE", "IT", "ES"].slice(0, top), missed: ["FR", "BE", "DE", "IT", "ES"].slice(top), streak: top, ...over });
  await call("games", "POST", { token: a.session, body: { games: [duelGame(20, 4)] } });
  await call("games", "POST", { token: b.session, body: { games: [duelGame(25, 5, { hit: ["FR", "BE", "DE", "IT", "PT"] }), duelGame(15, 3)] } }); // la 1re ne porte pas sur la série
  await call("games", "POST", { token: b.session, body: { games: [duelGame(25, 5, { at: Date.now() + 1000 })] } }); // rejouer ne compte pas
  const fromA = (await call("duels", "GET", { token: a.session })).data.duels[0];
  assert.deepEqual([fromA.mine, fromA.me.score, fromA.them.score, fromA.questions], [true, 20, 15, undefined], "scores des deux côtés, série plus envoyée");
  assert.equal((await call("duels", "DELETE", { token: b.session, query: `?id=${duelId}` })).status, 400, "déjà joué : plus refusable");
  const refused = (await challenge(a.session, b.me.id)).data.id;
  assert.equal((await call("duels", "DELETE", { token: a.session, query: `?id=${refused}` })).status, 404, "seul l'invité refuse");
  assert.equal((await call("duels", "DELETE", { token: b.session, query: `?id=${refused}` })).status, 200);
  assert.equal((await call("duels", "GET", { token: a.session })).data.duels[0].declined, true);
  // Capitales, et mix de tous les types : une question carte n'a jamais de leurres.
  const mixed = [...series.slice(0, 3).map((q) => ({ ...q, type: "capital" })), series[3], { code: "JP", type: "map" }];
  assert.equal((await challenge(a.session, b.me.id, { mode: "mix", questions: mixed })).status, 200, "mix : capitales, drapeau, carte");
  assert.equal((await challenge(a.session, b.me.id, { mode: "mix", questions: [...mixed.slice(0, 4), { ...mixed[4], choices: ["FR", "BE", "DE"] }] })).status, 400, "carte avec leurres");
  assert.equal((await challenge(a.session, b.me.id, { mode: "capital", questions: series.map((q) => ({ ...q, type: "capital" })) })).status, 200);
  assert.equal((await challenge(a.session, b.me.id, { mode: "capital", questions: series })).status, 400, "type hors du mode");
  assert.equal((await call("games", "POST", { token: b.session, body: { games: [game({ mode: "capital" })] } })).data.accepted, 1, "partie Capitales acceptée");

  // CORS : en-têtes seulement pour l'origine autorisée.
  const ok = await call("me", "GET", { token: a.session, headers: { origin: "https://valentinhajek.github.io" } });
  assert.equal(ok.headers.get("access-control-allow-origin"), "https://valentinhajek.github.io");
  const ko = await call("me", "GET", { token: a.session, headers: { origin: "https://evil.example" } });
  assert.equal(ko.headers.get("access-control-allow-origin"), null);

  // Déconnexion : la session ne marche plus.
  assert.equal((await call("session", "DELETE", { token: a.session })).status, 200);
  assert.equal((await call("me", "GET", { token: a.session })).status, 401);
  console.log("api OK");
} finally {
  const d = await db();
  await d.dropDatabase();
  await d.client.close();
}
