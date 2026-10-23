// Outils partagés par les fonctions de /api (le « _ » exclut ce fichier des routes Vercel).
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";
import { DEFAULT_LOOK, cleanLook } from "../src/items.js";
import { MODES, PTS_CARRE, PTS_CASH, maxCombo } from "../src/quiz.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Client Mongo réutilisé d'un appel à l'autre tant que l'instance de fonction vit.
let dbPromise;
export function db() {
  dbPromise ??= MongoClient.connect(process.env.MONGODB_URI)
    .then(async (client) => {
      const d = client.db(process.env.MONGODB_DB || "flagrant");
      await Promise.all([
        d.collection("users").createIndex({ email: 1 }, { unique: true }),
        d.collection("users").createIndex({ friendCode: 1 }, { unique: true }),
        d.collection("games").createIndex({ userId: 1, at: -1 }),
        d.collection("games").createIndex({ duel: 1 }, { sparse: true }),
        d.collection("duels").createIndex({ from: 1, createdAt: -1 }),
        d.collection("duels").createIndex({ to: 1, createdAt: -1 }),
        ...["logins", "sessions", "limits"].map((c) => d.collection(c).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })),
      ]);
      return d;
    })
    .catch((e) => {
      dbPromise = null; // pas de connexion en échec gardée en cache
      throw e;
    });
  return dbPromise;
}

export const newToken = () => randomBytes(32).toString("base64url");
export const hash = (token) => createHash("sha256").update(token).digest("hex");

// CORS : seulement pour les origines listées (le site sur GitHub Pages si l'API est ailleurs).
function cors(request) {
  const origin = request.headers.get("origin");
  const allowed = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    vary: "origin",
  };
}

export const json = (request, data, status = 200) => Response.json(data, { status, headers: cors(request) });
export const preflight = (request) => new Response(null, { status: 204, headers: cors(request) });

// Enrobe un handler : erreurs prévues → { error }, le reste → 500 sans détail technique.
export const route = (fn) => async (request) => {
  try {
    return await fn(request);
  } catch (e) {
    if (e instanceof HttpError) return json(request, { error: e.message }, e.status);
    console.error(e);
    return json(request, { error: "Erreur serveur, réessaie dans un instant" }, 500);
  }
};

export async function body(request) {
  const text = await request.text();
  if (text.length > 600_000) throw new HttpError(413, "Requête trop lourde");
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new HttpError(400, "JSON invalide");
  }
}

export async function requireUser(request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Non connecté");
  const d = await db();
  const session = await d.collection("sessions").findOne({ _id: hash(token), expiresAt: { $gt: new Date() } });
  const user = session && (await d.collection("users").findOne({ _id: session.userId }));
  if (!user) throw new HttpError(401, "Session expirée, reconnecte-toi");
  return { d, user, sessionId: session._id };
}

// Au plus `max` appels par clé sur une fenêtre de `seconds` (anti-spam des e-mails, anti-devinette des codes).
export async function limit(d, key, max, seconds) {
  const now = new Date();
  const live = { $gt: ["$expiresAt", now] };
  const doc = await d.collection("limits").findOneAndUpdate(
    { _id: key },
    [{ $set: { count: { $cond: [live, { $add: ["$count", 1] }, 1] }, expiresAt: { $cond: [live, "$expiresAt", new Date(+now + seconds * 1000)] } } }],
    { upsert: true, returnDocument: "after" }
  );
  if (doc.count > max) throw new HttpError(429, "Trop de demandes, réessaie un peu plus tard");
}

// Codes ami sans 0/O/1/I : lisibles et dictables. 32 symboles → tirage sans biais sur un octet.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const friendCode = () => Array.from(randomBytes(6), (b) => ALPHABET[b % 32]).join("");

// pseudoSet : le joueur a choisi son pseudo (sinon c'est celui tiré de l'e-mail, et on lui propose de le changer).
export const publicMe = (u) => ({
  id: u._id,
  pseudo: u.pseudo,
  pseudoSet: u.pseudoSet === true,
  friendCode: u.friendCode,
  email: u.email,
  owned: u.owned ?? [],
  vouchered: u.vouchered ?? [], // gagnés à la roue de la quête
  look: cleanLook(u.look, u.owned ?? []),
});

export async function findOrCreateUser(d, email) {
  const users = d.collection("users");
  const pseudo =
    email.split("@")[0].replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 24).replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase()) || "Joueur";
  for (let k = 0; k < 5; k++) {
    const existing = await users.findOne({ email });
    if (existing) return existing;
    const user = { _id: randomUUID(), email, pseudo, pseudoSet: false, friendCode: friendCode(), friends: [], owned: [], look: DEFAULT_LOOK, rev: 0, createdAt: new Date() };
    try {
      await users.insertOne(user);
      return user;
    } catch (e) {
      if (e.code !== 11000) throw e; // code ami déjà pris ou compte créé en parallèle : on recommence
    }
  }
  throw new HttpError(500, "Création du compte impossible");
}

// Une partie envoyée par le navigateur : tout est vérifié, y compris la cohérence score / réponses.
const isCode = (c) => typeof c === "string" && /^[A-Z]{2}$/.test(c);
// Barème actuel, puis l'ancien (3 points par flash) : une partie jouée avant le changement et pas encore
// synchronisée doit rester acceptée.
const SCALES = [[PTS_CASH, PTS_CARRE], [3, 1]];

export function cleanGame(g) {
  const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  const ok =
    g &&
    typeof g.id === "string" &&
    /^[\w-]{8,64}$/.test(g.id) &&
    MODES.includes(g.mode) &&
    int(g.n, 1, 300) &&
    int(g.top, 0, g.n) &&
    int(g.mid, 0, g.n - g.top) &&
    SCALES.some(([cash, carre]) => g.max === g.n * cash && g.score === g.top * cash + g.mid * carre) &&
    Number.isFinite(g.at) &&
    g.at > Date.UTC(2026, 0, 1) &&
    g.at < Date.now() + 864e5 &&
    Array.isArray(g.hit) &&
    Array.isArray(g.missed) &&
    g.hit.length === g.top + g.mid &&
    g.hit.length + g.missed.length === g.n &&
    [...g.hit, ...g.missed].every(isCode) &&
    (g.streak === undefined || int(g.streak, 0, g.hit.length)) &&
    (g.bonus === undefined || int(g.bonus, 0, maxCombo(g.top))) && // combo : pas plus que si tous les flash étaient d'affilée
    (g.duel === undefined || (typeof g.duel === "string" && /^[\w-]{8,64}$/.test(g.duel))) &&
    // Révision des erreurs menée jusqu'au bout (quête du jour) : après la partie, et seulement s'il y avait à réviser.
    (g.revisedAt === undefined || (Number.isFinite(g.revisedAt) && g.revisedAt >= g.at && g.revisedAt < Date.now() + 864e5 && g.top < g.n));
  if (!ok) return null;
  const { id, at, mode, n, score, max, top, mid, hit, missed } = g;
  return { _id: id, at, mode, territories: g.territories === true, n, score, max, top, mid, hit, missed, streak: g.streak ?? 0, ...(g.bonus && { bonus: g.bonus }), ...(g.duel && { duel: g.duel }), ...(g.revisedAt && { revisedAt: g.revisedAt }) };
}

// Lien de connexion par e-mail. Sans SMTP (dev local), le lien s'affiche dans la console du serveur.
export const devOutbox = [];
let transport;
export async function sendLoginLink(email, link) {
  if (!process.env.SMTP_URL) {
    if (process.env.NODE_ENV === "production") throw new HttpError(500, "Envoi d'e-mail pas encore configuré");
    devOutbox.push({ email, link });
    console.log(`[dev] lien de connexion pour ${email} : ${link}`);
    return;
  }
  transport ??= nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Ton lien de connexion Geoflash",
    text: `Clique pour te connecter à Geoflash (lien valable 15 minutes) :\n${link}\n\nSi tu n'as rien demandé, ignore ce message.`,
    html: `<p>Clique pour te connecter à <b>Geoflash</b> (lien valable 15 minutes) :</p><p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#ff5a1e;color:#fff;font-weight:bold;text-decoration:none">Me connecter</a></p><p style="color:#5c5647">Si tu n'as rien demandé, ignore ce message.</p>`,
  });
}
