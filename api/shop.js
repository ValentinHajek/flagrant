import { ITEM } from "../src/items.js";
import { cannotBuy, cannotClaim, computeProgress } from "../src/progress.js";
import { HttpError, body, json, preflight, requireUser, route } from "./_lib.js";

export const OPTIONS = preflight;

// Achat d'un article, ou gain de la roue de la quête (voucher) : solde et gains sont recalculés à partir des parties
// enregistrées, jamais pris au navigateur. L'écriture n'a lieu que si le compte n'a pas bougé depuis la lecture (rev),
// sinon deux achats simultanés pourraient dépenser les mêmes tampons (ou le même gain).
export const POST = route(async (request) => {
  const { d, user } = await requireUser(request);
  const data = await body(request);
  const item = ITEM.get(String(data.item ?? ""));
  const voucher = data.voucher === true;
  const { owned = [], vouchered = [] } = user;
  const games = await d.collection("games").find({ userId: user._id }).toArray();
  const progress = computeProgress(games, owned, vouchered);
  const reason = voucher ? cannotClaim(item, progress, owned) : cannotBuy(item, progress, owned);
  if (reason) throw new HttpError(400, reason);
  const push = voucher ? { owned: item.id, vouchered: item.id } : { owned: item.id };
  const res = await d.collection("users").updateOne({ _id: user._id, rev: user.rev ?? { $exists: false } }, { $push: push, $inc: { rev: 1 } });
  if (!res.modifiedCount) throw new HttpError(409, "Ton vestiaire vient de changer, réessaie");
  return json(request, { owned: [...owned, item.id], vouchered: voucher ? [...vouchered, item.id] : vouchered });
});
