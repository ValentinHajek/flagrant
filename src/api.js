import { loadHistory, saveHistory } from "./stats.js";
import { load, save } from "./storage.js";

// En dev, /api est relayé par Vite ; en ligne, VITE_API_URL pointe vers l'API (sinon pas de comptes).
const BASE = import.meta.env.VITE_API_URL ?? "/api";
export const API_ENABLED = import.meta.env.DEV || Boolean(import.meta.env.VITE_API_URL);

export const getSession = () => load("session", null);
export const setSession = (s) => save("session", s);

export async function api(path, { method = "GET", body } = {}) {
  const session = getSession();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body && { "content-type": "application/json" }), ...(session && { authorization: `Bearer ${session}` }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && session) setSession(null); // session expirée : retour au mode local
  if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
  return data;
}

// Envoie les parties jouées sur cet appareil (une seule fois, puis une autre si elle a été révisée depuis)
// et rapatrie celles jouées ailleurs. Le serveur fait foi pour les parties qu'il a (révision faite sur un autre appareil).
export async function syncHistory() {
  const local = loadHistory();
  const sent = new Set(load("synced", []));
  const key = (g) => (g.revisedAt ? `${g.id}:revision` : g.id);
  const todo = local.filter((g) => !sent.has(key(g)));
  if (todo.length) await api("/games", { method: "POST", body: { games: todo } });
  const { games } = await api("/games");
  const merged = new Map([...local, ...games].map((g) => [g.id, g]));
  saveHistory([...merged.values()].sort((a, b) => a.at - b.at));
  save("synced", [...merged.values()].map(key));
}
