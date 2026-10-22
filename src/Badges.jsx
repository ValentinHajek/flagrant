import { motion } from "framer-motion";
import Avatar from "./Avatar.jsx";
import { InkTitle, Kicker, Logo, Stamp, Tampon } from "./brand.jsx";
import { ITEMS } from "./items.js";
import { BADGES, DAILY_BONUS } from "./progress.js";
import { PTS_CARRE, PTS_CASH } from "./quiz.js";
import { XpBar } from "./Wardrobe.jsx";

const card = "rounded-[20px] border-[2.5px] border-night bg-paper";
const MODE_NAMES = { flag: "Drapeaux", tld: "Extensions", mix: "Mix", map: "Carte" };

// Les règles de gameReward (progress.js), en clair.
const EARN = [
  ["Ton score", `1 tampon pour ${PTS_CASH} points : une réponse en flash ou pile = 1 tampon, ${PTS_CASH / PTS_CARRE} en carré ou proche = 1 tampon.`],
  ["Sans-faute", "+50 % du score pour une partie d'au moins 10 questions sans aucune erreur."],
  ["Série", "+1 toutes les 3 bonnes réponses d'affilée au-delà de 5, sur ta meilleure série de la partie."],
  ["Tampon du jour", `+${DAILY_BONUS} pour ta première partie de la journée.`],
  ["Badges", "Un bonus unique pour chaque badge débloqué."],
];

// Le tampon du badge : encré quand il est débloqué, en pointillés sinon.
const Seal = ({ text, got }) => (
  <span
    aria-hidden
    className={`grid size-14 shrink-0 -rotate-8 place-items-center rounded-full border-[3px] font-display text-base leading-none ${got ? "border-fluo text-fluo shadow-[inset_0_0_0_3px_var(--color-paper),inset_0_0_0_4.5px_var(--color-fluo)]" : "border-dashed border-night/25 text-night/35"}`}
  >
    {text}
  </span>
);

function BadgeCard({ b, k, progress, look, owned, onWardrobe }) {
  const got = progress.badges.includes(b.id);
  const [cur, max] = (!got && b.goal?.(progress.stats)) || [];
  const gift = ITEMS.find((i) => i.badge === b.id);
  const missing = !got && b.id === "polyvalent" && Object.keys(MODE_NAMES).filter((m) => !progress.stats.modes.has(m));
  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * k, type: "spring", stiffness: 260, damping: 22 }}
      className={`${card} flex flex-col gap-3 p-4 ${got ? "shadow-print" : "shadow-print-sm"}`}
    >
      <div className="flex items-start gap-3">
        <Seal text={b.seal} got={got} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-xl uppercase leading-tight text-ink">{b.name}</h3>
            <span className="flex shrink-0 items-center gap-1 font-display text-lg text-ink">
              +{b.reward}
              <Tampon size={14} className="text-fluo" />
              <span className="sr-only">tampons</span>
            </span>
          </div>
          {got && <span className="text-xs font-semibold uppercase tracking-[0.16em] text-leaf">Débloqué ✓</span>}
          <p className="text-sm font-medium text-night/80">{b.desc}</p>
        </div>
      </div>

      {max && (
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label={`${b.name} : ${Math.min(cur, max)} ${b.unit} sur ${max}`}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Math.min(cur, max)}
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-deep"
          >
            <div className="h-full rounded-full bg-ink" style={{ width: `${(Math.min(cur, max) / max) * 100}%` }} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">
            {Math.min(cur, max)} / {max} {b.unit}
          </span>
        </div>
      )}
      {missing?.length > 0 && <p className="text-xs font-semibold text-fluo">Il te manque : {missing.map((m) => MODE_NAMES[m]).join(", ")}</p>}

      {gift && (
        <div className="flex items-center gap-3 border-t-2 border-dashed border-night/15 pt-3">
          <Avatar look={{ ...look, [gift.slot]: gift.id }} size={48} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-night">{gift.name}</div>
            <div className="text-xs font-semibold text-muted">
              {owned.includes(gift.id) ? "Dans ton vestiaire" : got ? "Offert : à récupérer au vestiaire" : "Article exclusif, offert avec ce badge"}
            </div>
          </div>
          {got && !owned.includes(gift.id) && (
            <Stamp variant="ghost" onClick={() => onWardrobe(gift.id)} className="px-3 py-1 text-xs">
              Récupérer →
            </Stamp>
          )}
        </div>
      )}
    </motion.li>
  );
}

export default function Badges({ progress, look, owned, onBack, onWardrobe }) {
  const nextItems = ITEMS.filter((i) => !i.badge && i.level === progress.level + 1);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Retour"
          className="cursor-pointer rounded-full p-1 transition-transform hover:-rotate-12 focus-visible:outline-3 focus-visible:outline-fluo"
        >
          <Logo size={30} />
        </button>
        <Kicker>
          {progress.badges.length} / {BADGES.length} débloqués
        </Kicker>
      </header>
      <InkTitle className="text-[clamp(3.5rem,15vw,6.5rem)]">Badges.</InkTitle>

      <section className={`${card} flex items-center gap-4 p-4 shadow-print sm:p-5`}>
        <Avatar look={look} size={88} className="size-20 sm:size-[88px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-display text-2xl uppercase text-ink">
              Niveau {progress.level} · {progress.title}
            </span>
            <span className="flex items-center gap-1 font-display text-lg text-ink tabular-nums">
              {progress.balance}
              <Tampon size={15} className="text-fluo" />
              <span className="sr-only">tampons</span>
            </span>
          </div>
          <XpBar progress={progress} />
          <span className="text-xs font-semibold text-muted">
            {progress.xp} / {progress.next} XP
            {nextItems.length > 0 && ` · niveau ${progress.level + 1} : ${nextItems.map((i) => i.name).join(", ")}`}
          </span>
        </div>
      </section>

      <ul className="grid gap-4 sm:grid-cols-2">
        {BADGES.map((b, k) => (
          <BadgeCard key={b.id} b={b} k={k} progress={progress} look={look} owned={owned} onWardrobe={onWardrobe} />
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h3 className="font-display text-xl uppercase text-night">Comment gagner des tampons</h3>
        <dl className={`${card} grid gap-x-5 gap-y-2.5 p-4 sm:grid-cols-[auto_1fr] sm:p-5`}>
          {EARN.map(([term, def]) => (
            <div key={term} className="contents">
              <dt className="font-display uppercase text-ink">{term}</dt>
              <dd className="-mt-2 text-sm font-medium text-muted sm:mt-0">{def}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm font-medium text-muted">
          Tous les tampons gagnés comptent comme expérience : ton niveau monte et débloque de nouveaux articles au vestiaire. Dépenser des tampons ne fait jamais
          baisser ton niveau.
        </p>
      </section>
    </div>
  );
}
