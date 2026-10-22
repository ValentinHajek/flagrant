import { HttpError, body, db, findOrCreateUser, hash, json, newToken, preflight, publicMe, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

// Échange le lien reçu par e-mail contre une session d'un an.
export const POST = route(async (request) => {
  const { token } = await body(request);
  if (typeof token !== "string" || token.length > 100) throw new HttpError(400, "Lien de connexion invalide");
  const d = await db();
  const login = await d.collection("logins").findOneAndDelete({ _id: hash(token), expiresAt: { $gt: new Date() } });
  if (!login) throw new HttpError(400, "Lien expiré ou déjà utilisé, redemande-en un");
  const user = await findOrCreateUser(d, login.email);
  const session = newToken();
  await d.collection("sessions").insertOne({ _id: hash(session), userId: user._id, expiresAt: new Date(Date.now() + 365 * 864e5) });
  return json(request, { session, me: publicMe(user) });
});

// Déconnexion : la session est supprimée côté serveur, le jeton ne sert plus à rien.
export const DELETE = route(async (request) => {
  const { d, sessionId } = await requireUser(request);
  await d.collection("sessions").deleteOne({ _id: sessionId });
  return json(request, { ok: true });
});
