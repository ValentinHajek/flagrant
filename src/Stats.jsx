import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccountCard, CountryDuel, Duel } from "./Account.jsx";
import { API_ENABLED, api, getSession, syncHistory } from "./api.js";
import { DuelRecord } from "./Duels.jsx";
import { InkTitle, Kicker, Logo, Stamp } from "./brand.jsx";
import { flagUrl } from "./quiz.js";
import { compareCountries, loadHistory, summarize } from "./stats.js";

const TABS = [
  ["flag", "Drapeaux"],
  ["tld", "Extensions"],
  ["mix", "Mix"],
  ["map", "Carte"],
];
// Période des stats et du duel : toutes les parties ou seulement les dernières.
const PERIODS = [
  [0, "Toutes"],
  [10, "10 dernières"],
  [5, "5 dernières"],
];
const pc = (x) => `${Math.round(x * 100)} %`;
const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const hour = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const when = (at) => `${day.format(at)} · ${hour.format(at)}`;

const card = "rounded-[20px] border-[2.5px] border-night bg-paper shadow-print";

function Tile({ label, value, sub, subClass = "text-muted", k }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * k, type: "spring", stiffness: 260, damping: 22 }}
      className={`${card} flex flex-col gap-1 p-4`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className="font-display text-4xl leading-none text-ink">{value}</div>
      {sub && <div className={`text-xs font-semibold ${subClass}`}>{sub}</div>}
    </motion.div>
  );
}

// Graphiques dessinés à la largeur réelle en pixels : les textes gardent leur taille sur mobile.
function useWidth() {
  const box = useRef(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);
  return [box, W];
}

const SLOTS = 20;
const H = 220,
  L = 40,
  R = 64,
  T = 22,
  B = 10; // marge droite : étiquettes (moyenne, fins de courbes), hors du tracé

function Grid({ W, y }) {
  return [0, 0.5, 1].map((p) => (
    <g key={p}>
      <line x1={L} x2={W - R} y1={y(p)} y2={y(p)} className="stroke-night/12" strokeWidth={1} />
      <text x={L - 8} y={y(p) + 4} textAnchor="end" className="fill-muted text-[11px] font-semibold tabular-nums">
        {p * 100} %
      </text>
    </g>
  ));
}

// Barres des dernières parties (score en %), la plus récente à droite et mise en avant.
// Une seule série : pas de légende, le titre la nomme. La table « Dernières parties » donne toutes les valeurs.
function ScoreChart({ games, avg }) {
  const [hover, setHover] = useState(null);
  const [box, W] = useWidth();
  const slot = (W - L - R) / SLOTS;
  const bw = Math.min(24, slot - 2);
  const y = (p) => T + (H - T - B) * (1 - p);
  const x = (k) => L + (SLOTS - games.length + k) * slot + (slot - bw) / 2;
  const bar = (x0, p) => {
    const top = Math.min(y(p), y(0) - 2); // une partie à 0 % garde un trait visible
    const h = y(0) - top;
    const r = Math.min(4, h, bw / 2);
    return `M${x0},${y(0)}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + bw - r}Q${x0 + bw},${top} ${x0 + bw},${top + r}V${y(0)}Z`;
  };
  const last = games.length - 1;
  const h = hover != null ? games[hover] : null;

  return (
    <div ref={box} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full overflow-visible"
        role="group"
        aria-label={`Score de tes ${games.length} dernières parties, moyenne ${pc(avg)}`}
      >
        <Grid W={W} y={y} />
        {/* Moyenne de toutes les parties du mode */}
        <line x1={L} x2={W - R} y1={y(avg)} y2={y(avg)} className="stroke-night/45" strokeWidth={1.5} />
        <text x={W - R + 8} y={y(avg) + 4} className="fill-night text-[11px] font-semibold">
          moy. {pc(avg)}
        </text>
        {games.map((g, k) => {
          const p = g.score / g.max;
          return (
            <g key={g.id ?? k} className={`transition-opacity ${hover != null && hover !== k ? "opacity-45" : ""}`}>
              {/* originY: 1 → la barre pousse depuis la ligne de base */}
              <motion.path
                d={bar(x(k), p)}
                className={k === last ? "fill-fluo" : "fill-ink"}
                style={{ transformBox: "fill-box", originY: 1 }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.15 + 0.025 * k, type: "spring", stiffness: 220, damping: 24 }}
              />
              {k === last && (
                <text x={x(k) + bw / 2} y={Math.min(y(p), y(0) - 2) - 6} textAnchor="middle" className="fill-night text-[12px] font-bold">
                  {pc(p)}
                </text>
              )}
              {/* Zone de survol/focus : toute la colonne, plus large que la barre */}
              <rect
                x={L + (SLOTS - games.length + k) * slot}
                y={T}
                width={slot}
                height={H - T - B}
                fill="transparent"
                tabIndex={0}
                aria-label={`${when(g.at)} : ${g.score}/${g.max}, ${pc(p)}`}
                onPointerEnter={() => setHover(k)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(k)}
                onBlur={() => setHover(null)}
                className="cursor-default outline-none"
              />
            </g>
          );
        })}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border-2 border-night bg-paper px-3 py-1.5 shadow-print-sm"
          style={{
            left: `${Math.min(88, Math.max(12, ((x(hover) + bw / 2) / W) * 100))}%`,
            top: `${((Math.min(y(h.score / h.max), y(0) - 2) - 8) / H) * 100}%`,
          }}
        >
          <div className="font-display text-xl leading-none text-night">{pc(h.score / h.max)}</div>
          <div className="text-xs font-semibold text-muted">
            {h.score}/{h.max} · {when(h.at)}
          </div>
        </div>
      )}
    </div>
  );
}

// Duel : tes dernières parties et celles de ton ami, en courbes (la plus récente à droite pour les deux).
// Deux séries : légende obligatoire, valeur en bout de courbe, détail au survol ou au clavier (ligne repère).
function DuelChart({ mine, theirs, myName, rivalName }) {
  const [hover, setHover] = useState(null);
  const [box, W] = useWidth();
  const slot = (W - L - R) / SLOTS;
  const y = (p) => T + (H - T - B) * (1 - p);
  const series = [
    { name: myName, games: mine, stroke: "stroke-ink", fill: "fill-ink", key: "bg-ink" },
    { name: rivalName, games: theirs, stroke: "stroke-fluo", fill: "fill-fluo", key: "bg-fluo" },
  ].map((se) => {
    const pts = se.games.map((g, k) => ({ slot: SLOTS - se.games.length + k, p: g.score / g.max }));
    return { ...se, pts, at: (i) => pts.find((q) => q.slot === i) };
  });
  const cx = (i) => L + i * slot + slot / 2;
  // Étiquettes de fin : écartées de quelques pixels seulement si les deux courbes finissent au même niveau.
  const ends = series.map((se) => y(se.pts.at(-1).p));
  const gap = Math.abs(ends[0] - ends[1]) < 14 ? (ends[0] <= ends[1] ? [-7, 7] : [7, -7]) : [0, 0];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-night">
        {series.map((se) => (
          <span key={se.name} className="flex items-center gap-2">
            <span className={`h-0.5 w-5 rounded-full ${se.key}`} />
            {se.name}
          </span>
        ))}
      </div>
      <div ref={box} className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full overflow-visible"
          role="group"
          aria-label={`Scores de ${myName} et ${rivalName} sur leurs dernières parties`}
        >
          <Grid W={W} y={y} />
          {hover != null && <line x1={cx(hover)} x2={cx(hover)} y1={T} y2={H - B} className="stroke-night/30" strokeWidth={1} />}
          {series.map((se, n) => (
            <g key={se.name}>
              <motion.path
                d={se.pts.map((q, k) => `${k ? "L" : "M"}${cx(q.slot)},${y(q.p)}`).join("")}
                className={`fill-none ${se.stroke}`}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: 0.1 + n * 0.15, ease: [0.2, 0.9, 0.25, 1] }}
              />
              {/* Point de fin avec anneau couleur papier, et valeur dans la marge */}
              <circle cx={cx(se.pts.at(-1).slot)} cy={ends[n]} r={4.5} className={`${se.fill} stroke-paper`} strokeWidth={2} />
              <text x={W - R + 8} y={ends[n] + 4 + gap[n]} className="fill-night text-[12px] font-bold">
                {pc(se.pts.at(-1).p)}
              </text>
              {hover != null && se.at(hover) && <circle cx={cx(hover)} cy={y(se.at(hover).p)} r={4} className={`${se.fill} stroke-paper`} strokeWidth={2} />}
            </g>
          ))}
          {Array.from({ length: SLOTS }, (_, i) => {
            const vals = series.filter((se) => se.at(i)).map((se) => `${se.name} ${pc(se.at(i).p)}`);
            if (!vals.length) return null;
            return (
              <rect
                key={i}
                x={L + i * slot}
                y={T}
                width={slot}
                height={H - T - B}
                fill="transparent"
                tabIndex={0}
                aria-label={vals.join(", ")}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="cursor-default outline-none"
              />
            );
          })}
        </svg>
        {hover != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-night bg-paper px-3 py-1.5 shadow-print-sm"
            style={{ left: `${Math.min(85, Math.max(15, (cx(hover) / W) * 100))}%` }}
          >
            {series.map(
              (se) =>
                se.at(hover) && (
                  <div key={se.name} className="flex items-center gap-2">
                    <span className={`h-0.5 w-4 rounded-full ${se.key}`} />
                    <span className="font-display text-lg leading-tight text-night">{pc(se.at(hover).p)}</span>
                    <span className="text-xs font-semibold text-muted">{se.name}</span>
                  </div>
                ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Stats({ all, mode: initialMode, notice, history, setHistory, look, duels, onChallenge, onPlayDuel, onLoggedOut, onBack, onPlay }) {
  const [mode, setMode] = useState(initialMode);
  const [n, setN] = useState(0); // 0 = toutes les parties
  const [account, setAccount] = useState(null); // { me, friends } une fois connecté
  const [rival, setRival] = useState(null); // ami choisi pour le duel, avec ses parties
  const byCode = useMemo(() => new Map(all.map((c) => [c.code, c])), [all]);
  const s = summarize(history, mode, n);
  const rs = rival && summarize(rival.games, mode, n); // stats de l'ami dans ce mode (null s'il n'y a pas joué)
  const myName = account?.me.pseudo ?? "Toi";
  const top = mode === "map" ? "pile" : "flash";
  const trend = s?.trend == null ? null : Math.round(s.trend * 100); // en points ; 0 = stable

  // Connecté : profil + synchro de l'historique (parties jouées sur d'autres appareils).
  useEffect(() => {
    if (!API_ENABLED || !getSession()) return;
    api("/me")
      .then(setAccount)
      .catch(() => setAccount(null));
    syncHistory()
      .then(() => setHistory(loadHistory()))
      .catch(() => {});
  }, []);

  const pickRival = (friend) => {
    if (rival?.id === friend.id) return setRival(null);
    api(`/games?user=${friend.id}`)
      .then(({ games }) => setRival({ ...friend, games }))
      .catch(() => setRival(null));
  };

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
          Sur cet appareil · {history.length} partie{history.length > 1 ? "s" : ""}
        </Kicker>
      </header>
      <InkTitle className="text-[clamp(3.5rem,15vw,6.5rem)]">Mes stats.</InkTitle>

      {/* Ordinateur : stats à gauche, compte & amis à droite (reste visible au défilement) */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div role="tablist" aria-label="Mode" className="flex rounded-full border-[2.5px] border-night bg-paper p-1 shadow-print">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className="relative flex-1 cursor-pointer rounded-full py-1.5 font-display text-base uppercase focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo sm:text-lg"
              >
                {mode === id && (
                  <motion.span
                    layoutId="stats-tab"
                    className="absolute inset-0 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className={`relative transition-colors ${mode === id ? "text-paper" : "text-ink"}`}>{label}</span>
              </button>
            ))}
          </div>

          <div role="radiogroup" aria-label="Période" className="flex flex-wrap gap-2">
            {PERIODS.map(([v, label]) => (
              <button
                key={v}
                role="radio"
                aria-checked={n === v}
                onClick={() => setN(v)}
                className={`cursor-pointer rounded-full border-2 border-night px-3.5 py-1 text-sm font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo ${n === v ? "bg-night text-paper" : "bg-paper text-ink hover:bg-paper-deep"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {rival && <DuelRecord duels={duels.filter((x) => x.rival.id === rival.id)} rival={rival} mode={mode} onChallenge={onChallenge} onPlay={onPlayDuel} />}
          {rival && <Duel mine={s} theirs={rs} myName={myName} myLook={look} rival={rival} onClose={() => setRival(null)} />}

          {!s ? (
            <div className={`${card} flex flex-col items-start gap-4 p-6`}>
              <p className="text-lg font-medium text-muted">Pas encore de partie terminée dans ce mode.</p>
              <Stamp onClick={() => onPlay(mode)}>Jouer →</Stamp>
            </div>
          ) : (
            <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile k={0} label="Parties" value={s.games} />
                <Tile
                  k={1}
                  label="Moyenne"
                  value={pc(s.avg)}
                  sub={trend === null ? (n ? `${n} dernières` : "toutes parties") : trend === 0 ? "stable vs avant" : `${trend > 0 ? "▲ +" : "▼ "}${trend} pts vs avant`}
              subClass={!trend ? "text-muted" : trend > 0 ? "text-leaf" : "text-fluo"}
                />
                <Tile k={2} label="Meilleure" value={pc(s.best.score / s.best.max)} sub={`${s.best.score}/${s.best.max} · ${day.format(s.best.at)}`} />
                <Tile k={3} label="Réussite" value={pc(s.accuracy)} sub={`dont ${pc(s.topRate)} en ${top}`} />
              </div>

              <section className={`${card} flex flex-col gap-3 p-4 sm:p-5`}>
                {rs ? (
                  <>
                    <div>
                      <h3 className="font-display text-xl uppercase text-night">
                        {myName} vs <span className="text-fluo">{rival.pseudo}</span>
                      </h3>
                      <p className="text-sm font-medium text-muted">Score en % de vos dernières parties · la plus récente à droite</p>
                    </div>
                    <DuelChart mine={s.last} theirs={rs.last} myName={myName} rivalName={rival.pseudo} />
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="font-display text-xl uppercase text-night">
                        {s.last.length > 1 ? `Tes ${s.last.length} dernières parties` : "Ta dernière partie"}
                      </h3>
                      <p className="text-sm font-medium text-muted">Score en % · la plus récente en orange</p>
                    </div>
                    <ScoreChart games={s.last} avg={s.avg} />
                  </>
                )}
              </section>

              {rs && <CountryDuel cmp={compareCountries(history, rival.games, mode, n)} rivalName={rival.pseudo} byCode={byCode} mode={mode} />}

              {!rs && s.toReview.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h3 className="font-display text-xl uppercase text-night">À revoir</h3>
                  <ul className="grid gap-2.5 sm:grid-cols-2">
                    {s.toReview.map((t) => {
                      const c = byCode.get(t.code);
                      if (!c) return null;
                      return (
                        <li key={t.code} className={`${card} flex items-center gap-3 px-3 py-2.5 shadow-none`}>
                          {mode === "tld" ? (
                            <span className="w-12 shrink-0 text-center font-display text-2xl text-ink">{c.tld}</span>
                          ) : (
                            <img src={flagUrl(c)} alt="" className="h-8 w-12 shrink-0 rounded-[3px] object-cover ring-1 ring-night/20" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{c.nom}</div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                              <div className="h-full rounded-full bg-fluo" style={{ width: `${(t.miss / t.seen) * 100}%` }} />
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-muted tabular-nums">
                            raté {t.miss}/{t.seen}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className="flex flex-col gap-3">
                <h3 className="font-display text-xl uppercase text-night">Dernières parties</h3>
                <div className={`${card} overflow-hidden`}>
                  <table className="w-full text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.18em] text-muted">
                      <tr className="border-b border-night/15">
                        <th className="px-4 py-2 font-semibold">Date</th>
                        <th className="px-2 py-2 text-right font-semibold">Questions</th>
                        <th className="px-2 py-2 text-right font-semibold">Score</th>
                        <th className="px-4 py-2 text-right font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {s.last
                        .slice(-10)
                        .reverse()
                        .map((g) => (
                          <tr key={g.id} className="border-b border-night/10 last:border-0">
                            <td className="px-4 py-2 font-medium">{when(g.at)}</td>
                            <td className="px-2 py-2 text-right text-muted">{g.n}</td>
                            <td className="px-2 py-2 text-right font-semibold">
                              {g.score}/{g.max}
                            </td>
                            <td className="px-4 py-2 text-right font-semibold">{pc(g.score / g.max)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </motion.div>
          )}
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
          {API_ENABLED && (
            <AccountCard
              account={account}
              setAccount={setAccount}
              look={look}
              notice={notice}
              rivalId={rival?.id}
              onPickRival={pickRival}
              onLoggedOut={() => {
                setAccount(null);
                setRival(null);
                onLoggedOut();
              }}
            />
          )}
          <p className="text-sm font-medium text-muted">
            {account ? "Tes parties sont sauvegardées sur ton compte." : "Tes stats restent sur cet appareil tant que tu n'es pas connecté."}
          </p>
        </aside>
      </div>
    </div>
  );
}
