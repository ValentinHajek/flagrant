import { motion } from "framer-motion";
import { useMemo } from "react";
import { LoginForm } from "./Account.jsx";
import { API_ENABLED, getSession } from "./api.js";
import Avatar from "./Avatar.jsx";
import { Glyph, InkTitle, Kicker, Logo, Marquee, Medal, Motif, Stamp, Tampon } from "./brand.jsx";
import { BADGES } from "./progress.js";
import { COUNTS, MAP_PILE_KM, MAP_PROCHE_KM, PTS_CARRE, PTS_CASH, SECONDS, flagUrl, questionCount, shuffle } from "./quiz.js";
import { bestKey, load } from "./storage.js";

const MiniFlag = ({ code, className = "" }) => (
  <img src={`https://flagcdn.com/${code}.svg`} alt="" className={`h-7 w-10 rounded-[3px] object-cover ring-2 ring-night ${className}`} />
);

const MODE_CARDS = [
  {
    id: "flag",
    title: "Drapeaux",
    desc: "Le drapeau → le pays",
    art: (
      <div className="relative h-10 w-20">
        <MiniFlag code="jp" className="absolute left-0 top-1 -rotate-8" />
        <MiniFlag code="br" className="absolute left-5 top-0 rotate-3" />
        <MiniFlag code="se" className="absolute left-10 top-2 rotate-12" />
      </div>
    ),
  },
  {
    id: "tld",
    title: "Extensions",
    desc: "Le .xx → le pays",
    art: <span className="font-display text-4xl leading-10 text-ink">.JP</span>,
  },
  {
    id: "mix",
    title: "Mix",
    desc: "Drapeaux et extensions",
    art: (
      <div className="flex items-center gap-2">
        <MiniFlag code="kr" className="-rotate-6" />
        <span className="font-display text-3xl leading-10 text-fluo">.KR</span>
      </div>
    ),
  },
  {
    id: "map",
    title: "Carte",
    desc: "Le pays → la carte",
    art: (
      <div className="relative h-10 w-20">
        <Glyph name="globe" size={40} />
        <Glyph name="pin" size={30} color="#ff5a1e" className="absolute left-6 -top-1 rotate-12" />
      </div>
    ),
  },
];

const stagger = { animate: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const rise = {
  initial: { opacity: 0, y: 28, rotate: -2 },
  animate: { opacity: 1, y: 0, rotate: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

export default function Home({ all, settings, setSettings, onStart, loading, onStats, look, progress, onWardrobe, onBadges }) {
  const { mode, territories, count } = settings;
  const ribbon = useMemo(() => shuffle(all.filter((c) => c.souverain && c.tld)).slice(0, 18), [all]);

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="relative flex flex-col gap-6 sm:gap-7">
      <Motif name="globe" size={64} className="-right-20 top-40 hidden lg:block" />
      <Motif name="pin" size={48} color="#ff5a1e" className="-left-16 top-72 hidden lg:block" float={1.2} />
      <Motif name="compass" size={52} className="-right-20 top-[30rem] hidden lg:block" float={0.6} />

      <motion.header variants={rise} className="flex items-center gap-2">
        <Logo size={34} />
        <span className="font-display text-xl uppercase tracking-[0.02em] text-ink max-[380px]:hidden">Geoflash</span>
        <button
          onClick={onStats}
          aria-label="Mes stats"
          className="ml-auto flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
            <rect x="1" y="8" width="3.5" height="7" rx="1" />
            <rect x="6.25" y="4" width="3.5" height="11" rx="1" />
            <rect x="11.5" y="1" width="3.5" height="14" rx="1" />
          </svg>
          <span className="hidden sm:inline">Mes stats</span>
        </button>
        <button
          onClick={onBadges}
          aria-label={`Badges : ${progress.badges.length} sur ${BADGES.length}`}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo"
        >
          <Medal />
          <span className="hidden sm:inline">Badges</span>
        </button>
        <button
          onClick={onWardrobe}
          aria-label={`Vestiaire : ${progress.balance} tampons, niveau ${progress.level}`}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink pl-0.5 pr-3 text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo"
        >
          <Avatar look={look} size={30} />
          <span className="font-display text-base tabular-nums">{progress.balance}</span>
          <Tampon size={15} className="text-fluo" />
        </button>
      </motion.header>

      <motion.div variants={rise} className="flex flex-col gap-4 sm:pt-4">
        <Kicker>{questionCount(all, mode, territories, count)} questions · {SECONDS} s par question</Kicker>
        <InkTitle className="text-[clamp(4.5rem,19vw,9.5rem)]">Geoflash.</InkTitle>
      </motion.div>

      <motion.fieldset variants={rise} className="flex flex-col gap-3">
        <legend className="mb-3 font-display text-lg uppercase tracking-[0.04em] text-night">Choisis ton mode</legend>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {MODE_CARDS.map((m) => {
            const active = mode === m.id;
            const best = load(bestKey(m.id, territories, count), 0);
            const max = questionCount(all, m.id, territories, count) * PTS_CASH;
            return (
              <motion.label
                key={m.id}
                whileHover={{ y: -3, rotate: active ? -1 : 0.6 }}
                whileTap={{ scale: 0.97 }}
                animate={{ rotate: active ? -1.5 : 0 }}
                className={`relative flex cursor-pointer items-center gap-4 rounded-[20px] px-4 py-3 sm:flex-col sm:items-start sm:gap-3 sm:p-4 border-[2.5px] border-night bg-paper transition-shadow duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-fluo ${active ? "shadow-print-fluo" : "shadow-print-lg"}`}
              >
                <input type="radio" name="mode" value={m.id} checked={active} onChange={() => setSettings({ ...settings, mode: m.id })} className="sr-only" />
                {active && (
                  <motion.span
                    layoutId="mode-pick"
                    aria-hidden
                    className="absolute -right-2 -top-3 rounded-full bg-ink px-2.5 py-1 font-display text-xs uppercase tracking-wider text-paper"
                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                  >
                    Choisi
                  </motion.span>
                )}
                <div className="flex h-10 w-20 shrink-0 items-center">{m.art}</div>
                <div>
                  <div className="font-display text-2xl uppercase text-ink">{m.title}</div>
                  <div className="text-sm font-medium text-muted">{m.desc}</div>
                </div>
                <div className="ml-auto text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted sm:ml-0 sm:mt-auto sm:text-left">
                  {best ? <>Record<br className="sm:hidden" /> {best}/{max}</> : <span className="hidden sm:inline">Pas encore joué</span>}
                </div>
              </motion.label>
            );
          })}
        </div>
      </motion.fieldset>

      <motion.div variants={rise} className="flex items-center gap-4">
        <span id="count-label" className="font-display text-lg uppercase tracking-[0.04em] text-night">Questions</span>
        <div role="radiogroup" aria-labelledby="count-label" className="flex flex-1 rounded-full border-[2.5px] border-night bg-paper p-1 shadow-print">
          {COUNTS.map((c) => {
            const active = count === c;
            return (
              <label key={c} className="relative flex-1 cursor-pointer rounded-full py-1.5 text-center font-display text-lg has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-fluo">
                <input type="radio" name="count" value={c} checked={active} onChange={() => setSettings({ ...settings, count: c })} className="sr-only" />
                {active && <motion.span layoutId="count-pick" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                <span className={`relative transition-colors ${active ? "text-paper" : "text-ink"}`}>{c === "all" ? "Tous" : c}</span>
              </label>
            );
          })}
        </div>
      </motion.div>

      <motion.label variants={rise} className="flex cursor-pointer items-center gap-3 font-medium">
        <input type="checkbox" checked={territories} onChange={(e) => setSettings({ ...settings, territories: e.target.checked })} className="peer sr-only" />
        <span className="relative h-7 w-12 shrink-0 rounded-full border-[2.5px] border-night bg-paper-deep transition-colors peer-checked:bg-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fluo">
          <motion.span
            className="absolute top-0.5 size-4.5 rounded-full border-2 border-night bg-fluo"
            animate={{ left: territories ? 22 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </span>
        <span>
          Inclure les territoires <span className="text-muted">(Guam, Féroé, Groenland…)</span>
        </span>
      </motion.label>

      <motion.div variants={rise} className="flex flex-col gap-4">
        <Stamp className="w-full py-4 text-2xl" onClick={onStart} disabled={loading}>
          {loading ? "Chargement de la carte…" : "C'est parti →"}
        </Stamp>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted">
          {mode === "map" ? (
            <>
              <span><b className="text-ink">Pile</b> à {MAP_PILE_KM} km près = {PTS_CASH} pts</span>
              <span><b className="text-ink">Proche</b> moins de {MAP_PROCHE_KM} km = {PTS_CARRE} pt</span>
              <span><b className="text-ink">Zoom</b> molette ou pincer</span>
            </>
          ) : (
            <>
              <span><b className="text-ink">Flash</b> saisie libre = {PTS_CASH} pts</span>
              <span><b className="text-ink">Carré</b> 4 choix = {PTS_CARRE} pt</span>
              <span><b className="text-ink">Fautes</b> d'orthographe tolérées</span>
            </>
          )}
        </div>
      </motion.div>

      {API_ENABLED && !getSession() && (
        <motion.section variants={rise} className="flex flex-col gap-3 rounded-[20px] border-[2.5px] border-night bg-paper p-5 shadow-print">
          <h3 className="font-display text-xl uppercase text-night">Sauvegarde & défie tes amis</h3>
          <LoginForm />
        </motion.section>
      )}

      <motion.div variants={rise} className="-mx-4 mt-4 border-y-[2.5px] border-night bg-paper-deep py-3 sm:-mx-10">
        <Marquee>
          {ribbon.map((c) => (
            <span key={c.code} className="flex items-center gap-3">
              <img src={flagUrl(c)} alt="" className="h-6 w-9 rounded-[2px] object-cover ring-2 ring-night" />
              <span className="font-display text-2xl uppercase text-ink">{c.tld}</span>
            </span>
          ))}
        </Marquee>
      </motion.div>
    </motion.div>
  );
}
