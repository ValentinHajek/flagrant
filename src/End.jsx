import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { InkTitle, Kicker, Stamp } from "./brand.jsx";
import { fmtKm } from "./geo.js";
import { PTS_CASH, flagUrl } from "./quiz.js";

const VERDICTS = [
  [0.9, "Flagrant délit de génie."],
  [0.6, "Solide. Le Kirghizistan tremble."],
  [0.3, "Ça vient. Encore un tour ?"],
  [0, "Le monde est grand. On y retourne ?"],
];

function status(r) {
  if (r.km != null) return r.points === PTS_CASH ? ["Dans le mille", "text-leaf"] : [`À ${fmtKm(r.km)}`, r.points ? "text-ink" : "text-fluo"];
  if (r.points === PTS_CASH) return ["Cash", "text-leaf"];
  if (r.points) return ["Carré", "text-ink"];
  if (r.timeout) return ["Temps écoulé", "text-fluo"];
  return [r.given ? `Tu as dit « ${r.given} »` : "Passé", "text-fluo"];
}

export default function End({ results, all = [], best, isRecord, onAgain, onMenu, onStats }) {
  const score = results.reduce((s, r) => s + r.points, 0);
  const max = results.length * PTS_CASH;
  const verdict = VERDICTS.find(([min]) => score / max >= min)[1];
  const count = useMotionValue(0);
  const shown = useTransform(count, (v) => Math.round(v));
  const againRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    againRef.current?.focus({ preventScroll: true });
    const a = animate(count, score, { duration: 1.1, ease: [0.2, 0.9, 0.25, 1] });
    return () => a.stop();
  }, []);

  const [top, mid] = results[0].type === "map" ? ["Pile", "Proche"] : ["Cash", "Carré"];
  const stats = [
    [top, results.filter((r) => r.points === PTS_CASH).length, "text-leaf"],
    [mid, results.filter((r) => r.points && r.points < PTS_CASH).length, "text-ink"],
    ["Ratés", results.filter((r) => !r.points).length, "text-fluo"],
  ];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-3">
        <Kicker>Résultat</Kicker>
        <div className="flex items-end gap-3">
          <InkTitle as="h2" className="text-[clamp(5rem,22vw,10rem)] tabular-nums">
            <motion.span>{shown}</motion.span>
          </InkTitle>
          <span className="pb-3 font-display text-4xl text-muted">/ {max}</span>
          {isRecord && (
            <motion.span
              initial={{ scale: 2.6, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: -10, opacity: 1 }}
              transition={{ delay: 1.1, type: "spring", stiffness: 480, damping: 16 }}
              className="mb-6 ml-auto rounded-xl border-4 border-fluo px-3 py-1 font-display text-xl uppercase tracking-wider text-fluo"
            >
              Record !
            </motion.span>
          )}
        </div>
        <p className="text-xl font-medium text-muted">{verdict}</p>
        {!isRecord && best > 0 && <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Record : {best} / {max}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stats.map(([label, n, color], k) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: k === 1 ? 1 : -1 }}
            transition={{ delay: 0.3 + k * 0.08, type: "spring", stiffness: 260, damping: 20 }}
            className="rounded-[18px] border-[2.5px] border-night bg-paper p-3 text-center shadow-print"
          >
            <div className={`font-display text-4xl ${color}`}>{n}</div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</div>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Stamp ref={againRef} onClick={onAgain} className="flex-1 py-4 text-xl">Rejouer</Stamp>
        <Stamp variant="ghost" onClick={onMenu} className="py-4">Changer de mode</Stamp>
        <Stamp variant="link" onClick={onStats} className="py-4">Mes stats</Stamp>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-2xl uppercase text-night">Le récap</h3>
        <ul className="flex flex-col gap-2.5">
          {results.map((r, k) => {
            const [label, color] = status(r);
            // Le pays répondu par erreur, montré dans le même format que la question.
            const wrong = !r.points && r.picked && r.type !== "map" && all.find((c) => c.code === r.picked);
            return (
              <motion.li
                key={k}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + Math.min(k, 15) * 0.04, type: "spring", stiffness: 300, damping: 26 }}
                className={`flex items-center gap-4 rounded-2xl border-[2.5px] border-night bg-paper px-4 py-3 ${r.points ? "" : "shadow-[3px_3.5px_0_var(--color-fluo)]"}`}
              >
                {r.type !== "tld" ? (
                  <img src={flagUrl(r.country)} alt="" className="h-9 w-14 shrink-0 rounded-[3px] object-contain" />
                ) : (
                  <span className="w-14 shrink-0 text-center font-display text-2xl text-ink">{r.country.tld}</span>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold">{r.country.nom}</div>
                  <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
                    <span className="truncate">{label}</span>
                    {wrong &&
                      (r.type === "tld" ? (
                        <span className="shrink-0 font-display text-base">{wrong.tld}</span>
                      ) : (
                        <img src={flagUrl(wrong)} alt={`Drapeau : ${wrong.nom}`} className="h-4 w-6 shrink-0 rounded-[2px] object-cover ring-1 ring-night/20" />
                      ))}
                  </div>
                </div>
                <span className={`ml-auto font-display text-2xl ${r.points ? "text-ink" : "text-fluo"}`}>+{r.points}</span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
