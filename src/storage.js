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

export const bestKey = (mode, territories, count) => `best:${mode}:${territories ? "all" : "sov"}:${count}`;
