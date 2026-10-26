import { cleanLook } from "../src/items.js";
import { EMAIL, HttpError, body, findOrCreateUser, hash, json, limit, newToken, preflight, requireUser, route, sendLoginLink } from "./_lib.js";

export const OPTIONS = preflight;

// Ajout d'un ami par son code (réciproque). Limité pour qu'on ne puisse pas essayer les codes à la chaîne.
// Ou par e-mail : le compte est créé s'il n'existe pas et l'ami reçoit un lien pour venir jouer.
export const POST = route(async (request) => {
  const { d, user } = await requireUser(request);
  const data = await body(request);
  let friend;
  if (data.email !== undefined) {
    const email = String(data.email).trim().toLowerCase();
    if (!EMAIL.test(email)) throw new HttpError(400, "Adresse e-mail invalide");
    if (email === user.email) throw new HttpError(400, "C'est ta propre adresse");
    await limit(d, `invite:${user._id}`, 10, 86400);
    await limit(d, `mail:${email}`, 1, 60);
    friend = await findOrCreateUser(d, email);
    const token = newToken();
    await d.collection("logins").insertOne({ _id: hash(token), email, expiresAt: new Date(Date.now() + 7 * 864e5) });
    await sendLoginLink(email, `${process.env.APP_URL}?login=${token}`, user.pseudo);
  } else {
    const code = String(data.code ?? "").trim().toUpperCase();
    await limit(d, `friend:${user._id}`, 20, 3600);
    friend = /^[A-Z2-9]{6}$/.test(code) && (await d.collection("users").findOne({ friendCode: code }));
    if (!friend) throw new HttpError(404, "Aucun joueur avec ce code");
    if (friend._id === user._id) throw new HttpError(400, "C'est ton propre code");
  }
  const users = d.collection("users");
  await users.updateOne({ _id: user._id }, { $addToSet: { friends: friend._id } });
  await users.updateOne({ _id: friend._id }, { $addToSet: { friends: user._id } });
  return json(request, { friend: { id: friend._id, pseudo: friend.pseudo, look: cleanLook(friend.look, friend.owned ?? []) } });
});
