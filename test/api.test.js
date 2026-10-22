// Test d'intégration de l'API contre un vrai MongoDB (base jetable, supprimée à la fin).
// Usage : MONGODB_URI=mongodb://127.0.0.1:27017 pnpm test:api
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017";
process.env.MONGODB_DB = `flagrant_test_${Date.now()}`;
process.env.APP_URL = "http://localhost:4173/";
process.env.ALLOWED_ORIGINS = "https://valentinhajek.github.io";
delete process.env.SMTP_URL;
delete process.env.VERCEL;

const { db, devOutbox } = await import("../api/_lib.js");
const api = {
  login: await import("../api/login.js"),
  session: await import("../api/session.js"),
  me: await import("../api/me.js"),
  games: await import("../api/games.js"),
  friends: await import("../api/friends.js"),
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

const game = (over = {}) => ({ id: randomUUID(), at: Date.now(), mode: "flag", territories: false, n: 3, score: 4, max: 9, top: 1, mid: 1, hit: ["FR", "BE"], missed: ["NE"], ...over });

try {
  // Connexion par lien : e-mail invalide refusé, lien à usage unique, pseudo tiré de l'e-mail.
  assert.equal((await call("login", "POST", { body: { email: "pas-un-mail" } })).status, 400);
  const a = await signIn("Val.Hajek@Example.com", "1.1.1.1");
  assert.equal(a.me.email, "val.hajek@example.com");
  assert.equal(a.me.pseudo, "Val Hajek");
  assert.match(a.me.friendCode, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal((await call("session", "POST", { body: { token: a.token } })).status, 400, "lien déjà utilisé");
  assert.equal((await call("login", "POST", { body: { email: "val.hajek@example.com" }, headers: { "x-forwarded-for": "1.1.1.1" } })).status, 429, "1 lien par minute");

  // Profil
  assert.equal((await call("me", "GET")).status, 401, "sans session");
  assert.equal((await call("me", "GET", { token: "faux" })).status, 401, "session inconnue");
  assert.equal((await call("me", "PATCH", { token: a.session, body: { pseudo: "x" } })).status, 400);
  assert.equal((await call("me", "PATCH", { token: a.session, body: { pseudo: "  Val   le Pro " } })).data.me.pseudo, "Val le Pro");

  // Parties : les invalides sont ignorées, l'envoi est idempotent.
  const g1 = game();
  const bad = [game({ score: 9 }), game({ mode: "pirate" }), game({ hit: ["fr", "BE"] }), game({ id: "x" }), { id: 1 }];
  const sent = await call("games", "POST", { token: a.session, body: { games: [g1, ...bad] } });
  assert.deepEqual([sent.status, sent.data.accepted], [200, 1]);
  await call("games", "POST", { token: a.session, body: { games: [g1] } });
  const mine = await call("games", "GET", { token: a.session });
  assert.equal(mine.data.games.length, 1);
  assert.deepEqual(mine.data.games[0], { ...g1 }, "partie relue à l'identique");

  // Amis : pas d'accès aux parties d'un inconnu, accès réciproque après ajout par code.
  const b = await signIn("lea@example.com", "2.2.2.2");
  await call("games", "POST", { token: b.session, body: { games: [game({ mode: "map", score: 3, top: 1, mid: 0, hit: ["IT"], missed: ["MT", "SM"] })] } });
  assert.equal((await call("games", "GET", { token: a.session, query: `?user=${b.me.id}` })).status, 403);
  assert.equal((await call("friends", "POST", { token: a.session, body: { code: "ZZZZZZ" } })).status, 404);
  assert.equal((await call("friends", "POST", { token: a.session, body: { code: a.me.friendCode } })).status, 400);
  const added = await call("friends", "POST", { token: a.session, body: { code: b.me.friendCode.toLowerCase() } });
  assert.deepEqual(added.data.friend, { id: b.me.id, pseudo: "Lea" });
  assert.equal((await call("games", "GET", { token: a.session, query: `?user=${b.me.id}` })).data.games[0].mode, "map");
  assert.deepEqual((await call("me", "GET", { token: b.session })).data.friends, [{ id: a.me.id, pseudo: "Val le Pro" }], "amitié réciproque");

  // Une partie d'un autre joueur ne peut pas être écrasée en réutilisant son id.
  await call("games", "POST", { token: b.session, body: { games: [{ ...g1, score: 0, top: 0, mid: 0, hit: [], missed: ["FR", "BE", "NE"] }] } });
  assert.equal((await call("games", "GET", { token: a.session })).data.games[0].score, 4);

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
