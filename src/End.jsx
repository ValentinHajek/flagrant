import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import { Seal } from "./Badges.jsx";
import { InkTitle, Kicker, Stamp, Tampon } from "./brand.jsx";
import { fmtKm } from "./geo.js";
import { ITEMS } from "./items.js";
import { BADGE } from "./progress.js";
import { PTS_CASH, flagUrl } from "./quiz.js";
import { XpBar } from "./Wardrobe.jsx";

const VERDICTS = [
  [0.9, "Éclair de génie."],
  [0.6, "Solide. Le Kirghizistan tremble."],
  [0.3, "Ça vient. Encore un tour ?"],
  [0, "Le monde est grand. On y retourne ?"],
];

function status(r) {
  if (r.km != null) return r.points === PTS_CASH ? ["Dans le mille", "text-leaf"] : [`À ${fmtKm(r.km)}`, r.points ? "text-ink" : "text-fluo"];
  if (r.points === PTS_CASH) return ["Flash", "text-leaf"];
  if (r.points) return ["Carré", "text-ink"];
  if (r.timeout) return ["Temps écoulé", "text-fluo"];
  return [r.given ? `Tu as dit « ${r.given} »` : "Passé", "text-fluo"];
}

function CountUp({ to, delay = 0 }) {
  const count = useMotionValue(0);
  const shown = useTransform(count, (v) => Math.round(v));
  useEffect(() => {
    const a = animate(count, to, { duration: 1.1, delay, ease: [0.2, 0.9, 0.25, 1] });
    return () => a.stop();
  }, []);
  return <motion.span>{shown}</motion.span>;
}

// Confettis du badge débloqué : des petits carrés aux encres de la DA, en étoile autour du tampon.
const BITS = Array.from({ length: 14 }, (_, k) => {
  const a = (k / 14) * Math.PI * 2;
  const d = 95 + (k % 3) * 25;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, rotate: (k % 2 ? 1 : -1) * (90 + k * 20), color: ["bg-fluo", "bg-ink", "bg-leaf", "bg-[#f2b632]"][k % 4] };
});

// Badge débloqué par la partie : en grand au milieu de l'écran, un coup de tampon et des confettis.
// Plusieurs badges d'un coup : ils défilent l'un après l'autre.
function BadgeUnlocked({ badges, look }) {
  const ref = useRef(null);
  const [k, setK] = useState(0);
  const b = badges[k];
  useEffect(() => {
    if (!b) return;
    const t = setTimeout(() => ref.current?.showModal(), k === 0 ? 1300 : 150); // après le décompte du score
    return () => clearTimeout(t);
  }, [k]);
  if (!b) return null;
  const gift = ITEMS.find((i) => i.badge === b.id);
  return (
    <dialog
      ref={ref}
      onClose={() => setK(k + 1)}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="badge-unlocked"
      className="m-auto w-[min(92vw,420px)] overflow-visible border-0 bg-transparent p-0 backdrop:bg-night/60"
    >
      <motion.div
        key={b.id}
        initial={{ opacity: 0, scale: 0.7, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="flex flex-col items-center gap-3 rounded-[24px] border-[2.5px] border-night bg-paper px-6 py-7 text-center shadow-print-fluo"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink">Badge débloqué !</p>
        <div className="relative my-2 grid place-items-center">
          {BITS.map((p, i) => (
            <motion.span
              key={i}
              aria-hidden
              className={`absolute size-2.5 rounded-[2px] ${p.color}`}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: p.x, y: p.y, scale: [0, 1, 1], opacity: [1, 1, 0], rotate: p.rotate }}
              transition={{ delay: 0.45, duration: 1, ease: "easeOut" }}
            />
          ))}
          <motion.span
            aria-hidden
            className="absolute size-28 rounded-full border-4 border-fluo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [0.8, 1.9], opacity: [0.7, 0] }}
            transition={{ delay: 0.42, duration: 0.7, ease: "easeOut" }}
          />
          <motion.div initial={{ scale: 2.6, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ delay: 0.25, type: "spring", stiffness: 480, damping: 14 }}>
            <Seal text={b.seal} got big />
          </motion.div>
        </div>
        <h2 id="badge-unlocked" className="font-display text-4xl uppercase leading-none text-ink">
          {b.name}
        </h2>
        <p className="text-sm font-medium text-muted">{b.desc}</p>
        <p className="flex items-center gap-1.5 font-display text-2xl text-ink">
          +{b.reward}
          <Tampon size={20} className="text-fluo" />
          <span className="sr-only">tampons</span>
        </p>
        {gift && (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-night/20 px-3 py-2 text-left">
            <Avatar look={{ ...look, [gift.slot]: gift.id }} size={48} />
            <span className="text-sm font-semibold leading-tight">
              Article exclusif offert : {gift.name}
              <span className="block text-xs font-medium text-muted">À récupérer au vestiaire</span>
            </span>
          </div>
        )}
        <Stamp autoFocus onClick={() => ref.current.close()} className="mt-2 px-8">
          {k < badges.length - 1 ? `Suivant (${k + 1}/${badges.length})` : "Trop bien !"}
        </Stamp>
      </motion.div>
    </dialog>
  );
}

// Ce que la partie rapporte : tampons (détail des bonus), expérience, badges et articles débloqués.
function Rewards({ reward: { before, after, gain }, badges, look, mood, onWardrobe, onBadges }) {
  const unlocked = ITEMS.filter((i) => (i.badge ? badges.some((b) => b.id === i.badge) : i.level > before.level && i.level <= after.level));
  const lines = [
    ["Score", gain.score],
    ["Bonus sans-faute", gain.perfect],
    ["Bonus série", gain.streak],
    ["Tampon du jour", gain.daily],
    ...badges.map((b) => [`Badge « ${b.name} »`, b.reward]),
  ].filter(([, n]) => n > 0);
  const total = lines.reduce((t, [, n]) => t + n, 0);
  const levelUp = after.level > before.level;
  const frac = (p) => (p.xp - p.floor) / (p.next - p.floor);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20, rotate: 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: 0.45, type: "spring", stiffness: 240, damping: 22 }}
      className="relative flex flex-col gap-4 rounded-[20px] border-[2.5px] border-night bg-paper p-4 shadow-print sm:p-5"
    >
      {levelUp && (
        <motion.span
          initial={{ scale: 2.6, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: -6, opacity: 1 }}
          transition={{ delay: 1.7, type: "spring", stiffness: 480, damping: 16 }}
          className="absolute -top-4 right-4 rounded-xl border-4 border-leaf bg-paper px-3 py-0.5 font-display text-lg uppercase tracking-wider text-leaf"
        >
          Niveau {after.level} !
        </motion.span>
      )}
      <div className="flex items-center gap-4">
        <Avatar look={look} mood={mood} size={88} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2 font-display text-4xl leading-none text-ink tabular-nums">
            <span>
              +<CountUp to={total} delay={0.6} />
            </span>
            <Tampon size={26} className="text-fluo" />
            <span className="sr-only">tampons</span>
          </div>
          <p className="text-sm font-medium text-muted">
            {lines.length ? lines.map(([label, n]) => `${label} +${n}`).join(" · ") : "Pas de tampon cette fois. La prochaine sera la bonne !"}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3 text-sm font-semibold">
          <span className="text-ink">
            Niveau {after.level} · {after.title}
          </span>
          <span className="text-muted tabular-nums">
            {after.xp} / {after.next} XP
          </span>
        </div>
        <XpBar progress={after} from={levelUp ? 0 : frac(before)} delay={0.9} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-3">
        <p className="mr-auto text-sm font-semibold text-night">
          {unlocked.length ? `Nouveau au vestiaire : ${unlocked.map((i) => i.name).join(", ")}` : `${after.balance} tampons à dépenser`}
        </p>
        {/* Les deux liens restent ensemble quand la ligne passe à la ligne (mobile) */}
        <div className="flex items-center gap-4">
          <Stamp variant="link" onClick={onBadges} className="px-0 py-1.5 text-sm">
            Badges
          </Stamp>
          <Stamp variant="ghost" onClick={onWardrobe} className="px-4 py-1.5 text-sm">
            Vestiaire →
          </Stamp>
        </div>
      </div>
    </motion.section>
  );
}

export default function End({ results, all = [], best, isRecord, reward, look, onAgain, onMenu, onStats, onWardrobe, onBadges }) {
  const score = results.reduce((s, r) => s + r.points, 0);
  const max = results.length * PTS_CASH;
  const verdict = VERDICTS.find(([min]) => score / max >= min)[1];
  const againRef = useRef(null);
  const zoomRef = useRef(null);
  const newBadges = reward ? reward.after.badges.filter((id) => !reward.before.badges.includes(id)).map((id) => BADGE.get(id)) : [];
  const [zoom, setZoom] = useState(null); // { country, type } : la réponse donnée, affichée en grand

  useEffect(() => {
    window.scrollTo(0, 0);
    againRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (zoom) zoomRef.current?.showModal();
  }, [zoom]);

  const [top, mid] = results[0].type === "map" ? ["Pile", "Proche"] : ["Flash", "Carré"];
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
            <CountUp to={score} />
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

      {reward && <Rewards reward={reward} badges={newBadges} look={look} mood={score / max >= 0.6 ? "happy" : score / max >= 0.3 ? "neutral" : "sad"} onWardrobe={onWardrobe} onBadges={onBadges} />}
      {newBadges.length > 0 && <BadgeUnlocked badges={newBadges} look={look} />}

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
                  {wrong ? (
                    <button
                      onClick={() => setZoom({ country: wrong, type: r.type })}
                      aria-label={`${label} : voir en grand`}
                      className={`flex max-w-full cursor-pointer items-center gap-2 text-sm font-medium underline decoration-dotted underline-offset-2 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-fluo ${color}`}
                    >
                      <span className="truncate">{label}</span>
                      {r.type === "tld" ? (
                        <span className="shrink-0 font-display text-base">{wrong.tld}</span>
                      ) : (
                        <img src={flagUrl(wrong)} alt="" className="h-4 w-6 shrink-0 rounded-[2px] object-cover ring-1 ring-night/20" />
                      )}
                    </button>
                  ) : (
                    <div className={`truncate text-sm font-medium ${color}`}>{label}</div>
                  )}
                </div>
                <span className={`ml-auto font-display text-2xl ${r.points ? "text-ink" : "text-fluo"}`}>+{r.points}</span>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Clic sur le fond ou Échap : ferme */}
      <dialog
        ref={zoomRef}
        onClose={() => setZoom(null)}
        onClick={(e) => e.target === zoomRef.current && zoomRef.current.close()}
        className="m-auto w-[min(92vw,640px)] rounded-[20px] border-[2.5px] border-night bg-paper p-6 shadow-print backdrop:bg-night/60"
      >
        {zoom && (
          <div className="flex flex-col items-center gap-4">
            {zoom.type === "tld" ? (
              <span className="font-display text-[clamp(5rem,22vw,9rem)] leading-none text-ink">{zoom.country.tld}</span>
            ) : (
              <img src={flagUrl(zoom.country)} alt={`Drapeau : ${zoom.country.nom}`} className="max-h-[60vh] w-full rounded-md object-contain ring-2 ring-night/15" />
            )}
            <div className="font-display text-2xl uppercase text-night">{zoom.country.nom}</div>
            <Stamp variant="ghost" onClick={() => zoomRef.current.close()}>Fermer</Stamp>
          </div>
        )}
      </dialog>
    </div>
  );
}
