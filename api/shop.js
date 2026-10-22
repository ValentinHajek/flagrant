import { ITEM } from "../src/items.js";
import { cannotBuy, computeProgress } from "../src/progress.js";
import { HttpError, body, json, preflight, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

// Achat d'un article : le solde est recalculé à partir des parties enregistrées, jamais pris au navigateur.
// L'écriture n'a lieu que si le compte n'a pas bougé depuis la lecture (rev), sinon deux achats
// simultanés pourraient dépenser les mêmes tampons.
export const POST = route(async (request) => {
  const { d, user } = await requireUser(request);
  const item = ITEM.get(String((await body(request)).item ?? ""));
  const owned = user.owned ?? [];
  const games = await d.collection("games").find({ userId: user._id }).toArray();
  const reason = cannotBuy(item, computeProgress(games, owned), owned);
  if (reason) throw new HttpError(400, reason);
  const res = await d.collection("users").updateOne({ _id: user._id, rev: user.rev ?? { $exists: false } }, { $push: { owned: item.id }, $inc: { rev: 1 } });
  if (!res.modifiedCount) throw new HttpError(409, "Ton vestiaire vient de changer, réessaie");
  return json(request, { owned: [...owned, item.id] });
});
