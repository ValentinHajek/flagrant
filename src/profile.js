// Vestiaire du joueur : articles possédés et tenue portée.
// Sans compte : tout est local. Connecté : le serveur fait foi (il revérifie chaque achat).
import { api, getSession, syncHistory } from "./api.js";
import { DEFAULT_LOOK, ITEM, cleanLook } from "./items.js";
import { load, save } from "./storage.js";

export function loadProfile() {
  const owned = (load("owned", []) ?? []).filter((id) => ITEM.has(id));
  return { owned, look: cleanLook(load("look", DEFAULT_LOOK), owned) };
}

export function saveProfile({ owned, look }) {
  save("owned", owned);
  save("look", look);
}

// Achat : connecté, c'est le serveur qui décide, avec un solde recalculé depuis les parties enregistrées
// (on lui envoie d'abord celles qui ne sont pas encore parties, comme celle qu'on vient de finir).
export async function buyItem(profile, id, reason) {
  if (getSession()) {
    await syncHistory();
    const { owned } = await api("/shop", { method: "POST", body: { item: id } });
    return { ...profile, owned };
  }
  if (reason) throw new Error(reason);
  return { ...profile, owned: [...profile.owned, id] };
}

// Requêtes enchaînées : après plusieurs clics rapides, la dernière tenue choisie est la dernière enregistrée.
let saving = Promise.resolve();
export function saveLook(look) {
  if (!getSession()) return Promise.resolve();
  const req = saving.then(() => api("/me", { method: "PATCH", body: { look } }));
  saving = req.catch(() => {});
  return req;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// À la connexion : on remonte les achats faits hors ligne (le serveur garde ceux qui sont mérités),
// puis le vestiaire du serveur devient celui de l'appareil. La tenue locale ne sert que si le compte n'en a pas.
export async function syncProfile(local) {
  const { me } = await api("/me");
  let owned = me.owned;
  for (const id of local.owned.filter((id) => !owned.includes(id))) {
    owned = await api("/shop", { method: "POST", body: { item: id } }).then((r) => r.owned, () => owned);
  }
  let look = me.look;
  if (same(look, DEFAULT_LOOK) && !same(local.look, DEFAULT_LOOK)) {
    look = cleanLook(local.look, owned); // sans les articles refusés, sinon toute la tenue serait rejetée
    await saveLook(look).catch(() => {});
  }
  return { owned, look: cleanLook(look, owned) };
}
