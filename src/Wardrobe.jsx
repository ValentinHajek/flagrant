import { motion } from "framer-motion";
import { useState } from "react";
import { useAction } from "./Account.jsx";
import Avatar from "./Avatar.jsx";
import { InkTitle, Kicker, Logo, Medal, Stamp, Tampon } from "./brand.jsx";
import { BASE, ITEM, ITEMS, RARITY, SLOTS } from "./items.js";
import { buyItem, saveLook } from "./profile.js";
import { BADGE, DAILY_BONUS, cannotBuy } from "./progress.js";
import { sound } from "./sound.js";

const card = "rounded-[20px] border-[2.5px] border-night bg-paper";
const TABS = [["base", "Toi"], ...SLOTS];
const HAIR_COLORS = ["Noir", "Châtain", "Roux", "Blond", "Gris", "Bleu"];

// Barre d'expérience du niveau en cours. from : remplissage de départ (0 à 1), pour l'animer après une partie.
export function XpBar({ progress: p, from, delay = 0 }) {
  const frac = (p.xp - p.floor) / (p.next - p.floor);
  return (
    <div
      role="progressbar"
      aria-label="Expérience vers le niveau suivant"
      aria-valuemin={p.floor}
      aria-valuemax={p.next}
      aria-valuenow={p.xp}
      className="h-3 overflow-hidden rounded-full border-2 border-night bg-paper-deep"
    >
      <motion.div
        className="h-full bg-fluo"
        style={{ originX: 0 }}
        initial={{ scaleX: from ?? frac }}
        animate={{ scaleX: frac }}
        transition={{ delay, duration: 0.9, ease: [0.2, 0.9, 0.25, 1] }}
      />
    </div>
  );
}

const Lock = () => (
  <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
    <path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z" />
  </svg>
);

// Ce qui verrouille un article (badge manquant, niveau trop bas), indépendamment du solde.
const lockOf = (it, p) => (it.badge && !p.badges.includes(it.badge) ? `Badge ${BADGE.get(it.badge).name}` : p.level < it.level ? `Niveau ${it.level}` : null);

// Une case du vestiaire : l'avatar avec cette option, son nom, puis son état.
function Choice({ look, label, selected, trying, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`${card} flex cursor-pointer flex-col items-center gap-1 px-1.5 py-2.5 text-center transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo ${selected ? "shadow-[4px_4.5px_0_var(--color-fluo)]" : trying ? "border-dashed shadow-print" : "shadow-print-sm"}`}
    >
      <Avatar look={look} size={80} className="size-[72px] sm:size-20" />
      <span className="text-sm font-semibold leading-tight">{label}</span>
      {children}
    </button>
  );
}

function Swatch({ color, label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      style={{ background: color }}
      className={`size-10 cursor-pointer rounded-full border-[2.5px] border-night transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo ${selected ? "scale-110 shadow-[3px_3.5px_0_var(--color-fluo)]" : ""}`}
    />
  );
}

const Field = ({ label, children }) => (
  <section className="flex flex-col gap-2.5">
    <h3 className="font-display text-lg uppercase text-night">{label}</h3>
    {children}
  </section>
);

const grid = "grid grid-cols-3 gap-3 sm:grid-cols-4";

// focus : article à montrer en arrivant (ex. l'exclusif d'un badge, depuis la page Badges).
export default function Wardrobe({ profile, setProfile, progress, focus, onBack, onBadges }) {
  const [tab, setTab] = useState(ITEM.get(focus)?.slot ?? "hat");
  const [trying, setTrying] = useState(focus && !profile.owned.includes(focus) ? focus : null); // article essayé, pas encore à toi
  const [{ busy, error }, run] = useAction();
  const { owned, look } = profile;
  const tried = ITEM.get(trying);
  const reason = tried && cannotBuy(tried, progress, owned);
  const preview = tried ? { ...look, [tried.slot]: tried.id } : look;

  const wear = (change) => {
    const next = { ...profile, look: { ...look, ...change } };
    setProfile(next);
    setTrying(null);
    run(() => saveLook(next.look));
  };
  const pick = (it) => {
    sound("essayer");
    if (owned.includes(it.id)) wear({ [it.slot]: it.id });
    else setTrying(trying === it.id ? null : it.id);
  };
  // Acheté = porté tout de suite.
  const buy = () =>
    run(async () => {
      const p = await buyItem(profile, tried.id, reason);
      const next = { ...p, look: { ...look, [tried.slot]: tried.id } };
      setProfile(next);
      setTrying(null);
      sound("acheter");
      await saveLook(next.look);
    });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Retour à l'accueil"
          className="cursor-pointer rounded-full p-1 transition-transform hover:-rotate-12 focus-visible:outline-3 focus-visible:outline-fluo"
        >
          <Logo size={30} />
        </button>
        <Kicker>
          {owned.length} / {ITEMS.length} articles
        </Kicker>
        <button
          onClick={onBadges}
          className="ml-auto flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo"
        >
          <Medal />
          Badges {progress.badges.length}/{BADGE.size}
        </button>
      </header>
      <InkTitle className="text-[clamp(3.5rem,15vw,6.5rem)]">Vestiaire.</InkTitle>
      <p className="-mt-2 max-w-xl font-medium text-muted">
        Chaque partie rapporte des tampons : ton score, plus des bonus (sans-faute, série, {DAILY_BONUS} pour la première partie du jour) et les badges. Monter de
        niveau débloque de nouveaux articles.
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Reste visible pendant qu'on fait défiler les articles : c'est là qu'on voit l'essayage */}
        <aside className={`${card} sticky top-2 z-10 flex items-center gap-4 p-3 shadow-print sm:p-4 lg:top-6 lg:flex-col lg:items-stretch lg:p-5`}>
          <Avatar look={preview} size={220} title="Ton avatar" className="size-28 self-center sm:size-32 lg:size-[220px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="flex items-center gap-1.5 font-display text-3xl leading-none text-ink tabular-nums">
              {progress.balance}
              <Tampon size={22} className="text-fluo" />
              <span className="sr-only">tampons</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Niv. {progress.level} · {progress.title}
            </span>
            <XpBar progress={progress} />
            <span className="hidden text-xs font-semibold text-muted tabular-nums lg:block">
              {progress.xp} / {progress.next} XP pour le niveau {progress.level + 1}
            </span>
            {tried ? (
              <div className="flex flex-col gap-2 border-t-2 border-dashed border-night/20 pt-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-tight text-night">{tried.name}</span>
                  <button onClick={() => setTrying(null)} aria-label="Enlever l'essai" className="-mt-1 cursor-pointer text-lg font-bold leading-none text-muted hover:text-night">
                    ×
                  </button>
                </div>
                {reason ? (
                  <p className="text-sm font-semibold text-fluo">
                    {reason}
                    {tried.badge && !progress.badges.includes(tried.badge) && (
                      <button onClick={onBadges} className="ml-1.5 cursor-pointer text-ink underline underline-offset-2">
                        Comment l'obtenir ?
                      </button>
                    )}
                  </p>
                ) : (
                  <Stamp onClick={buy} disabled={busy} className="px-4 py-2 text-sm">
                    {tried.price ? (
                      <>
                        Acheter · {tried.price}
                        <Tampon size={14} />
                        <span className="sr-only">tampons</span>
                      </>
                    ) : (
                      "Récupérer"
                    )}
                  </Stamp>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium text-muted">Touche un article pour l'essayer.</p>
            )}
            {error && <p className="text-sm font-semibold text-fluo">{error}</p>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div role="tablist" aria-label="Rayons" className="flex flex-wrap gap-2">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`cursor-pointer rounded-full border-2 border-ink px-3 py-1 font-display text-sm uppercase transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo ${tab === id ? "bg-ink text-paper" : "text-ink hover:bg-ink/10"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {tab === "base" ? (
              <div className="flex flex-col gap-6">
                <Field label="Peau">
                  <div className="flex flex-wrap gap-3">
                    {BASE.skin.map((c, k) => (
                      <Swatch key={c} color={c} label={`Teinte ${k + 1}`} selected={look.skin === c} onClick={() => wear({ skin: c })} />
                    ))}
                  </div>
                </Field>
                <Field label="Coupe">
                  <div className={grid}>
                    {BASE.hair.map(([id, label]) => (
                      <Choice key={id} look={{ ...look, hair: id, hat: null }} label={label} selected={look.hair === id} onClick={() => wear({ hair: id })} />
                    ))}
                  </div>
                </Field>
                <Field label="Couleur des cheveux">
                  <div className="flex flex-wrap gap-3">
                    {BASE.hairColor.map((c, k) => (
                      <Swatch key={c} color={c} label={HAIR_COLORS[k]} selected={look.hairColor === c} onClick={() => wear({ hairColor: c })} />
                    ))}
                  </div>
                </Field>
                <Field label="Expression">
                  <div className={grid}>
                    {BASE.eyes.map(([id, label]) => (
                      <Choice key={id} look={{ ...look, eyes: id, glasses: null }} label={label} selected={look.eyes === id} onClick={() => wear({ eyes: id })} />
                    ))}
                  </div>
                </Field>
              </div>
            ) : (
              <div className={grid}>
                <Choice look={{ ...look, [tab]: null }} label="Rien" selected={!look[tab]} onClick={() => wear({ [tab]: null })} />
                {ITEMS.filter((i) => i.slot === tab).map((it) => {
                  const has = owned.includes(it.id);
                  const lock = !has && lockOf(it, progress);
                  return (
                    <Choice key={it.id} look={{ ...look, [tab]: it.id }} label={it.name} selected={look[tab] === it.id} trying={trying === it.id} onClick={() => pick(it)}>
                      <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${RARITY[it.rarity].color}`}>{RARITY[it.rarity].label}</span>
                      {look[tab] === it.id ? (
                        <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper">Porté</span>
                      ) : has ? (
                        <span className="text-xs font-semibold text-leaf">À toi</span>
                      ) : lock ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                          <Lock />
                          {lock}
                        </span>
                      ) : (
                        <span className={`flex items-center gap-1 font-display text-base ${progress.balance < it.price ? "text-muted" : "text-ink"}`}>
                          {it.price || "Offert"}
                          {it.price > 0 && (
                            <>
                              <Tampon size={13} className="text-fluo" />
                              <span className="sr-only">tampons</span>
                            </>
                          )}
                        </span>
                      )}
                    </Choice>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
