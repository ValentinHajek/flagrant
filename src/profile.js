// Vestiaire du joueur : articles possédés et tenue portée.
// Sans compte : tout est local. Connecté : le serveur fait foi (il revérifie chaque achat).
import { api, getSession, syncHistory } from "./api.js";
import { DEFAULT_LOOK, ITEM, cleanLook } from "./items.js";
import { load, save } from "./storage.js";

// vouchered : articles gagnés à la roue de la quête (sous-ensemble de owned).
export function loadProfile() {
  const owned = (load("owned", []) ?? []).filter((id) => ITEM.has(id));
  const vouchered = (load("vouchered", []) ?? []).filter((id) => owned.includes(id));
  return { owned, vouchered, look: cleanLook(load("look", DEFAULT_LOOK), owned) };
}

export function saveProfile({ owned, vouchered, look }) {
  save("owned", owned);
  save("vouchered", vouchered);
  save("look", look);
}

// Achat, ou gain de la roue (voucher) : connecté, c'est le serveur qui décide, avec un solde et des gains recalculés
// depuis les parties enregistrées (on lui envoie d'abord celles qui ne sont pas encore parties).
export async function buyItem(profile, id, reason, voucher = false) {
  if (getSession()) {
    await syncHistory();
    const { owned, vouchered } = await api("/shop", { method: "POST", body: { item: id, voucher } });
    return { ...profile, owned, vouchered };
  }
  if (reason) throw new Error(reason);
  return { ...profile, owned: [...profile.owned, id], vouchered: voucher ? [...profile.vouchered, id] : profile.vouchered };
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
  let { owned, vouchered = [] } = me;
  for (const id of local.owned.filter((id) => !owned.includes(id))) {
    ({ owned, vouchered } = await api("/shop", { method: "POST", body: { item: id, voucher: local.vouchered.includes(id) } }).catch(() => ({ owned, vouchered })));
  }
  let look = me.look;
  if (same(look, DEFAULT_LOOK) && !same(local.look, DEFAULT_LOOK)) {
    look = cleanLook(local.look, owned); // sans les articles refusés, sinon toute la tenue serait rejetée
    await saveLook(look).catch(() => {});
  }
  return { owned, vouchered, look: cleanLook(look, owned) };
}
