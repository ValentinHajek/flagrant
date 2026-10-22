import { HttpError, body, json, preflight, publicMe, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

export const GET = route(async (request) => {
  const { d, user } = await requireUser(request);
  const friends = await d.collection("users").find({ _id: { $in: user.friends } }, { projection: { pseudo: 1 } }).toArray();
  return json(request, { me: publicMe(user), friends: friends.map((f) => ({ id: f._id, pseudo: f.pseudo })) });
});

export const PATCH = route(async (request) => {
  const { d, user } = await requireUser(request);
  const pseudo = String((await body(request)).pseudo ?? "").replace(/\s+/g, " ").trim();
  if (pseudo.length < 2 || pseudo.length > 24 || /\p{C}/u.test(pseudo)) throw new HttpError(400, "Pseudo : 2 à 24 caractères");
  await d.collection("users").updateOne({ _id: user._id }, { $set: { pseudo } });
  return json(request, { me: publicMe({ ...user, pseudo }) });
});
