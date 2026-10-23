// Quête du jour : la carte de l'accueil et la roue de l'écran de fin. Les règles sont dans progress.js.
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import { MODE_NAMES } from "./Badges.jsx";
import { Stamp, Tampon } from "./brand.jsx";
import { ITEMS, RARITY } from "./items.js";
import { QUEST_BONUS, WHEELS, questStatus } from "./progress.js";
import { shuffle } from "./quiz.js";
import { sound } from "./sound.js";

const INK = "#2340c4", FLUO = "#ff5a1e", LEAF = "#00a95c", SUN = "#f2b632", NIGHT = "#17140d", CARD = "#fffaf0";
// [fond, texte] des cases article, aux couleurs des raretés du vestiaire ; les cases tampons alternent jaune et crème.
const ITEM_COLORS = { commune: ["#d9d2c4", NIGHT], rare: [INK, CARD], epique: [FLUO, CARD], legendaire: [LEAF, CARD] };
const ARTICLE = { commune: "commun", rare: "rare", epique: "épique", legendaire: "légendaire" };
const RIMS = ["#c08550", "#b9bec7", SUN]; // bronze, argent, or
const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;
const TASKS = { ...MODE_NAMES, revision: "Révision" };
// Roue suivante et jours qui manquent pour l'avoir, après `streak` jours de quête d'affilée.
const nextWheel = (wheel, streak) => WHEELS[wheel + 1] && { ...WHEELS[wheel + 1], left: WHEELS[wheel + 1].from - streak };

const Flame = ({ lit, className }) => (
  <svg viewBox="0 0 16 16" className={`${className} ${lit ? "text-fluo" : "text-muted/40"}`} fill="currentColor" aria-hidden>
    <path d="M8 1c.5 2.6 4.2 4.4 4.2 8.4a4.2 4.2 0 0 1-8.4 0c0-2 1.2-3.3 2-4.2.2 1.5.9 2.3 1.7 2.6C7.2 5.6 7.3 3.3 8 1z" />
  </svg>
);

export function QuestCard({ progress, onPick }) {
  const q = questStatus(progress);
  const wheel = WHEELS[q.wheel].name.toLowerCase();
  const mode = q.modes.find((m) => m !== "revision");
  const goal = q.modes.includes("revision")
    ? `Une partie en ${TASKS[mode]}, puis « Réviser mes erreurs » jusqu'au « Tout bon ! »`
    : "Une partie dans chacun de ces modes";
  const next = nextWheel(q.wheel, q.done ? q.streak : q.streak + 1);
  const count = q.modes.filter((m) => q.played.has(m)).length;
  // Ombre orange tant que la quête du jour reste à faire : c'est le premier truc à voir en arrivant.
  return (
    <section
      aria-labelledby="quest-title"
      className={`flex gap-4 rounded-[20px] border-[2.5px] border-night bg-paper p-4 sm:gap-5 sm:p-5 ${q.done ? "shadow-print" : "shadow-[6px_7px_0_var(--color-fluo)]"}`}
    >
      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-r-2 border-dashed border-night/15 pr-4 text-center sm:w-20">
        <Flame lit={q.streak > 0} className="size-8" />
        <span className="font-display text-4xl leading-none text-ink tabular-nums">{q.streak}</span>
        <span className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted">{q.streak > 1 ? "jours" : "jour"} de série</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex items-baseline gap-2">
          <h2 id="quest-title" className="font-display text-xl uppercase leading-tight text-night">
            Quête du jour
          </h2>
          <span className={`ml-auto shrink-0 font-display text-lg ${q.done ? "text-leaf" : "text-fluo"}`}>
            {q.done ? "Faite ✓" : `${count}/2`}
            {!q.done && <span className="sr-only"> objectifs faits</span>}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {q.modes.map((m) => {
            const ok = q.played.has(m);
            const chip = `flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 font-display text-base uppercase tracking-wide ${ok ? "border-leaf bg-leaf text-paper" : "border-ink text-ink"}`;
            // La révision se lance depuis la fin d'une partie : pas de bouton ici.
            return m === "revision" ? (
              <span key={m} className={chip}>
                {ok && <span aria-hidden>✓</span>}
                {TASKS[m]}
                <span className="sr-only">{ok ? " : faite" : " : à faire"}</span>
              </span>
            ) : (
              <button
                key={m}
                onClick={() => onPick(m)}
                aria-label={`${TASKS[m]} : ${ok ? "fait" : "choisir ce mode"}`}
                className={`${chip} cursor-pointer transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo ${ok ? "" : "hover:bg-ink hover:text-paper"}`}
              >
                {ok && <span aria-hidden>✓</span>}
                {TASKS[m]}
              </button>
            );
          })}
        </div>
        <p className="text-sm font-medium text-muted">
          {q.done ? (
            <>
              <b className="text-leaf">Bravo&nbsp;!</b> +{QUEST_BONUS} et {wheel} : {q.done.item ? `un article ${ARTICLE[q.done.item]}` : `+${q.done.prize}`}. Reviens demain
              pour continuer ta série.
            </>
          ) : (
            <>
              {goal} aujourd'hui : +{QUEST_BONUS} tampons et un tour de {wheel}.
            </>
          )}
          {next && ` ${next.name} dans ${plural(next.left, "jour")} de quête d'affilée.`}
        </p>
      </div>
    </section>
  );
}

// Cases de la roue avec leurs angles (0° en haut, sens horaire) : chacune occupe sa part des chances.
function layout(slices) {
  let a = 0;
  return slices.map((x, k) => {
    const from = a;
    a += x.p * 3.6;
    return { ...x, from, to: a, mid: (from + a) / 2, color: x.item ? ITEM_COLORS[x.item] : k % 4 ? [CARD, INK] : [SUN, NIGHT] };
  });
}

// rotate : angle de la roue (motion value, en degrés). gifts : l'article en jeu sur chaque case article.
function Wheel({ slices, wheel, rotate, gifts, look }) {
  const pt = (deg, r) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  return (
    <svg viewBox="-122 -126 244 248" className="w-full max-w-[min(240px,60vw)]" aria-hidden>
      <circle r="116" fill={RIMS[wheel]} stroke={NIGHT} strokeWidth="3" />
      {Array.from({ length: 16 }, (_, k) => {
        const [x, y] = pt(k * 22.5 + 11.25, 108);
        return <circle key={k} cx={x} cy={y} r="2.8" fill={CARD} stroke={NIGHT} strokeWidth="1.2" />;
      })}
      <motion.g style={{ rotate }}>
        {slices.map((x, k) => {
          const [x1, y1] = pt(x.from, 100);
          const [x2, y2] = pt(x.to, 100);
          const [tx, ty] = pt(x.mid, 64);
          const wide = x.to - x.from;
          const gift = gifts[k];
          const size = Math.min(34, ((wide * Math.PI) / 180) * 64 * 0.9); // l'article tient dans la largeur de sa case
          return (
            <g key={k}>
              <path d={`M0,0 L${x1},${y1} A100,100 0 0 1 ${x2},${y2} Z`} fill={x.color[0]} stroke={NIGHT} strokeWidth="2.5" strokeLinejoin="round" />
              {/* Droit quand la case s'arrête sous le repère */}
              <g transform={`translate(${tx} ${ty}) rotate(${x.mid})`}>
                {gift && size >= 20 ? (
                  <g transform={`translate(${-size / 2} ${-size / 2})`}>
                    <Avatar look={{ ...look, [gift.slot]: gift.id }} size={size} />
                  </g>
                ) : (
                  wide >= 14 && (
                    <text textAnchor="middle" dominantBaseline="central" fontSize={wide >= 30 ? 24 : 15} fill={x.color[1]} className="font-display">
                      {x.tampons ?? "★"}
                    </text>
                  )
                )}
              </g>
            </g>
          );
        })}
      </motion.g>
      <circle r="18" fill={CARD} stroke={NIGHT} strokeWidth="3" />
      <circle r="9.5" fill="none" stroke={FLUO} strokeWidth="3" />
      <circle r="4.8" fill="none" stroke={FLUO} strokeWidth="2" strokeDasharray="2.2 1.6" />
      <path d="M-12,-124 L12,-124 L0,-95 Z" fill={FLUO} stroke={NIGHT} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

// Fin de la partie (ou de la révision) qui boucle la quête : la roue s'ouvre après le décompte du score.
// La case est déjà tirée (progress.js) ; la roue ne fait que la montrer. Sur chaque case article, un article au hasard
// parmi ceux de cette rareté que le joueur n'a pas, même pas encore débloqués : s'il tombe dessus, il est à lui
// (onWin, dès l'ouverture : fermer ou recharger pendant le tour ne fait rien perdre).
export function WheelSpin({ spin, look, owned, onWin, onClose }) {
  const ref = useRef(null);
  const rotate = useMotionValue(0);
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState("ready"); // ready → spinning → won
  const [error, setError] = useState(null);
  const slices = layout(WHEELS[spin.wheel].slices);
  const [gifts] = useState(() => slices.map((x) => x.item && shuffle(ITEMS.filter((i) => i.rarity === x.item && !i.badge && !owned.includes(i.id)))[0]));
  const gift = gifts[spin.slot];
  const next = nextWheel(spin.wheel, spin.streak);

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.showModal();
      sound("badge");
      if (gift) onWin(gift.id).catch((e) => setError(e.message));
    }, 1300);
    return () => clearTimeout(t);
  }, []);

  const go = () => {
    setPhase("spinning");
    const at = slices[spin.slot];
    let tick = 0;
    const stop = rotate.on("change", (v) => {
      const k = Math.floor(v / 30); // un tic régulier, de plus en plus lent
      if (k !== tick) sound("tic", 1);
      tick = k;
    });
    // 5 tours puis la case tirée sous le repère, pas pile au milieu.
    animate(rotate, 1800 - at.mid + (Math.random() - 0.5) * (at.to - at.from) * 0.6, {
      duration: reduce ? 0.4 : 4.4,
      ease: [0.12, 0.8, 0.22, 1],
      onComplete: () => {
        stop();
        setPhase("won");
        if (ref.current?.open) sound("record");
      },
    });
  };

  return (
    // Défilable sur les petits écrans ; le padding laisse la place à l'ombre décalée de la carte.
    <dialog
      ref={ref}
      onClose={() => onClose(gift)}
      aria-labelledby="wheel-title"
      className="m-auto max-h-[calc(100dvh-1rem)] w-[min(96vw,452px)] overflow-y-auto border-0 bg-transparent p-0 pb-3 pr-3 backdrop:bg-night/60"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="flex flex-col items-center gap-3 rounded-[24px] border-[2.5px] border-night bg-paper px-4 py-6 text-center shadow-print-fluo sm:px-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink">Quête du jour terminée&nbsp;!</p>
        <h2 id="wheel-title" className="font-display text-4xl uppercase leading-none text-ink">
          {WHEELS[spin.wheel].name}
        </h2>
        <p className="text-sm font-medium text-muted">
          +{QUEST_BONUS} tampons pour la quête · série de {plural(spin.streak, "jour")}
        </p>
        <Wheel slices={slices} wheel={spin.wheel} rotate={rotate} gifts={gifts} look={look} />
        <div aria-live="polite" className="flex min-h-14 items-center justify-center">
          {phase === "won" && (
            <motion.div initial={{ scale: 2.2, rotate: -14, opacity: 0 }} animate={{ scale: 1, rotate: -3, opacity: 1 }} transition={{ type: "spring", stiffness: 480, damping: 15 }} className="flex items-center gap-3">
              {gift ? (
                <>
                  <Avatar look={{ ...look, [gift.slot]: gift.id }} size={56} />
                  <span className="text-left">
                    <span className={`block text-xs font-semibold uppercase tracking-[0.16em] ${RARITY[gift.rarity].color}`}>{RARITY[gift.rarity].label} · à toi&nbsp;!</span>
                    <span className="block font-display text-2xl uppercase leading-tight text-ink">{gift.name}</span>
                  </span>
                </>
              ) : spin.item ? (
                <span className="text-sm font-semibold text-ink">Tu as déjà tous les articles {ARTICLE[spin.item]}s&nbsp;!</span>
              ) : (
                <span className="flex items-center gap-2 font-display text-4xl text-ink">
                  +{spin.prize}
                  <Tampon size={28} className="text-fluo" />
                  <span className="sr-only">tampons gagnés</span>
                </span>
              )}
            </motion.div>
          )}
        </div>
        {phase === "won" && error && <p className="text-sm font-semibold text-fluo">{error} : récupère-le au vestiaire.</p>}
        {phase === "won" ? (
          <Stamp autoFocus onClick={() => ref.current.close()} className="px-8">
            Trop bien !
          </Stamp>
        ) : (
          <Stamp autoFocus onClick={go} disabled={phase === "spinning"} className="px-8">
            {phase === "spinning" ? "Ça tourne…" : "Tourner la roue"}
          </Stamp>
        )}
        {/* Tout ce qu'on peut gagner, avec ses chances */}
        <ul className="flex flex-wrap justify-center gap-1.5">
          {slices.map((x, k) => (
            <li key={k} className="flex items-center gap-1 rounded-full border-2 border-night/15 py-0.5 pl-0.5 pr-2 text-xs font-semibold text-night">
              {gifts[k] ? (
                <Avatar look={{ ...look, [gifts[k].slot]: gifts[k].id }} size={22} />
              ) : (
                <span className="size-[22px] shrink-0 rounded-full border-2 border-night" style={{ background: x.color[0] }} />
              )}
              {x.tampons ? `+${x.tampons}` : gifts[k]?.name ?? `Article ${ARTICLE[x.item]}`}
              <span className="text-muted">{x.p}&nbsp;%</span>
            </li>
          ))}
        </ul>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {next ? `${next.name} dans ${plural(next.left, "jour")} de quête d'affilée` : "Meilleure roue : garde ta série !"}
        </p>
      </motion.div>
    </dialog>
  );
}
