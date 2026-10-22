import { cleanLook } from "../src/items.js";
import { HttpError, body, json, limit, preflight, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

// Ajout d'un ami par son code (réciproque). Limité pour qu'on ne puisse pas essayer les codes à la chaîne.
export const POST = route(async (request) => {
  const { d, user } = await requireUser(request);
  const code = String((await body(request)).code ?? "").trim().toUpperCase();
  await limit(d, `friend:${user._id}`, 20, 3600);
  const friend = /^[A-Z2-9]{6}$/.test(code) && (await d.collection("users").findOne({ friendCode: code }));
  if (!friend) throw new HttpError(404, "Aucun joueur avec ce code");
  if (friend._id === user._id) throw new HttpError(400, "C'est ton propre code");
  const users = d.collection("users");
  await users.updateOne({ _id: user._id }, { $addToSet: { friends: friend._id } });
  await users.updateOne({ _id: friend._id }, { $addToSet: { friends: user._id } });
  return json(request, { friend: { id: friend._id, pseudo: friend.pseudo, look: cleanLook(friend.look, friend.owned ?? []) } });
});
