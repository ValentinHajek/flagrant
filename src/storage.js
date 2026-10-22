// Confort local (record, derniers réglages) : jamais critique, donc on avale les erreurs (navigation privée…).
export function load(key, fallback) {
  try {
    const v = localStorage.getItem(`flagrant:${key}`);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(`flagrant:${key}`, JSON.stringify(value));
  } catch {}
}

// Records au barème à 5 points par flash : ceux d'avant (3 points) ne sont plus comparables, on repart de zéro.
export const bestKey = (mode, territories, count) => `best5:${mode}:${territories ? "all" : "sov"}:${count}`;
