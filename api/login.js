import { EMAIL, HttpError, body, db, hash, json, limit, newToken, preflight, route, sendLoginLink } from "./_lib.js";

export const OPTIONS = preflight;

// Demande d'un lien de connexion (usage unique, 15 min). Réponse identique que le compte existe ou non.
export const POST = route(async (request) => {
  const email = String((await body(request)).email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, "Adresse e-mail invalide");
  const d = await db();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  await limit(d, `ip:${ip}`, 10, 3600);
  await limit(d, `mail:${email}`, 1, 60);
  const token = newToken();
  await d.collection("logins").insertOne({ _id: hash(token), email, expiresAt: new Date(Date.now() + 15 * 60e3) });
  await sendLoginLink(email, `${process.env.APP_URL}?login=${token}`);
  return json(request, { ok: true });
});
