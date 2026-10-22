import { HttpError, body, cleanGame, json, preflight, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

// Historique d'un joueur : le sien ou celui d'un ami, jamais celui d'un inconnu.
export const GET = route(async (request) => {
  const { d, user } = await requireUser(request);
  const id = new URL(request.url).searchParams.get("user") ?? user._id;
  if (id !== user._id && !user.friends.includes(id)) throw new HttpError(403, "Ce joueur n'est pas dans tes amis");
  const games = await d.collection("games").find({ userId: id }, { projection: { userId: 0 } }).sort({ at: -1 }).limit(500).toArray();
  return json(request, { games: games.reverse().map(({ _id, ...g }) => ({ id: _id, ...g })) });
});

// Envoi de parties jouées sur l'appareil. Idempotent ; une partie invalide est ignorée sans bloquer les autres.
export const POST = route(async (request) => {
  const { d, user } = await requireUser(request);
  const list = (await body(request)).games;
  if (!Array.isArray(list) || list.length > 500) throw new HttpError(400, "Liste de parties invalide");
  const games = list.map(cleanGame).filter(Boolean);
  if (games.length) {
    // Filtre sur userId : une partie d'un autre joueur au même id ne peut pas être écrasée (doublon d'_id refusé).
    const ops = games.map(({ _id, ...g }) => ({ updateOne: { filter: { _id, userId: user._id }, update: { $setOnInsert: { ...g, userId: user._id } }, upsert: true } }));
    await d.collection("games").bulkWrite(ops, { ordered: false }).catch((e) => {
      if (!e.writeErrors?.length || e.writeErrors.some((w) => w.code !== 11000)) throw e;
    });
  }
  return json(request, { ok: true, accepted: games.length });
});
