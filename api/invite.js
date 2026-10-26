import { EMAIL, HttpError, body, hash, json, limit, newToken, preflight, requireUser, route, sendLoginLink } from "./_lib.js";

export const OPTIONS = preflight;

// Invitation par e-mail (plus besoin d'être amis : tous les joueurs se voient). L'invité reçoit un lien de connexion
// valable 7 jours ; son compte est créé quand il clique.
export const POST = route(async (request) => {
  const { d, user } = await requireUser(request);
  const email = String((await body(request)).email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, "Adresse e-mail invalide");
  if (email === user.email) throw new HttpError(400, "C'est ta propre adresse");
  await limit(d, `invite:${user._id}`, 10, 86400);
  await limit(d, `mail:${email}`, 1, 60);
  const token = newToken();
  await d.collection("logins").insertOne({ _id: hash(token), email, expiresAt: new Date(Date.now() + 7 * 864e5) });
  await sendLoginLink(email, `${process.env.APP_URL}?login=${token}`, user.pseudo);
  return json(request, { ok: true });
});
