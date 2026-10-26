import { cleanLook } from "../src/items.js";
import { HttpError, body, json, preflight, publicMe, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

// Le profil, et tous les autres joueurs (ceux qui ont au moins une partie enregistrée), du dernier actif au plus ancien.
// shortcut: plafonné aux 100 derniers actifs, ajouter une recherche si la liste grossit.
export const GET = route(async (request) => {
  const { d, user } = await requireUser(request);
  const active = await d
    .collection("games")
    .aggregate([
      { $sort: { userId: 1, at: -1 } }, // + $first : un saut d'index (userId, at) par joueur, pas un parcours de toutes les parties
      { $group: { _id: "$userId", last: { $first: "$at" } } },
      { $match: { _id: { $ne: user._id } } },
      { $sort: { last: -1 } },
      { $limit: 100 },
    ])
    .toArray();
  const people = await d.collection("users").find({ _id: { $in: active.map((a) => a._id) } }, { projection: { pseudo: 1, look: 1, owned: 1 } }).toArray();
  const byId = new Map(people.map((p) => [p._id, { id: p._id, pseudo: p.pseudo, look: cleanLook(p.look, p.owned ?? []) }]));
  return json(request, { me: publicMe(user), players: active.map((a) => byId.get(a._id)).filter(Boolean) });
});

// Modifie le pseudo et/ou la tenue (seulement avec des articles possédés).
export const PATCH = route(async (request) => {
  const { d, user } = await requireUser(request);
  const data = await body(request);
  const set = {};
  if (data.pseudo !== undefined) {
    const pseudo = String(data.pseudo).replace(/\s+/g, " ").trim();
    if (pseudo.length < 2 || pseudo.length > 24 || /\p{C}/u.test(pseudo)) throw new HttpError(400, "Pseudo : 2 à 24 caractères");
    Object.assign(set, { pseudo, pseudoSet: true });
  }
  if (data.look !== undefined) {
    const look = cleanLook(data.look, user.owned ?? []);
    const unowned = Object.keys(look).some((slot) => data.look?.[slot] && look[slot] !== data.look[slot]);
    if (unowned) throw new HttpError(400, "Cet article n'est pas dans ton vestiaire");
    set.look = look;
  }
  if (!Object.keys(set).length) throw new HttpError(400, "Rien à modifier");
  await d.collection("users").updateOne({ _id: user._id }, { $set: set });
  return json(request, { me: publicMe({ ...user, ...set }) });
});
