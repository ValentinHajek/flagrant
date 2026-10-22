import { cleanLook } from "../src/items.js";
import { HttpError, body, json, preflight, publicMe, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

export const GET = route(async (request) => {
  const { d, user } = await requireUser(request);
  const friends = await d.collection("users").find({ _id: { $in: user.friends } }, { projection: { pseudo: 1, look: 1, owned: 1 } }).toArray();
  return json(request, { me: publicMe(user), friends: friends.map((f) => ({ id: f._id, pseudo: f.pseudo, look: cleanLook(f.look, f.owned ?? []) })) });
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
