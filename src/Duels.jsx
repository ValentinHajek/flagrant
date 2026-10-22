// Défis 1 contre 1 entre amis : même série pour les deux, chacun la joue quand bon lui semble.
import { useRef, useState } from "react";
import { useAction } from "./Account.jsx";
import { api } from "./api.js";
import Avatar from "./Avatar.jsx";
import { MODE_NAMES } from "./Badges.jsx";
import { Stamp } from "./brand.jsx";
import { duelRecord } from "./stats.js";

const card = "rounded-[20px] border-[2.5px] border-night bg-paper";
const RECENT = 2 * 864e5; // résultats et attentes affichés sur l'accueil pendant 2 jours

const outcome = (me, them) => (me > them ? ["Victoire", "text-leaf"] : me < them ? ["Défaite", "text-fluo"] : ["Égalité", "text-ink"]);
const what = (x) => `${MODE_NAMES[x.mode]} · ${x.n} questions`;
const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function title(x) {
  const { pseudo } = x.rival;
  if (!x.me) return x.mine ? `Ton défi contre ${pseudo}` : `${pseudo} te défie`;
  if (x.them) return `${outcome(x.me.score, x.them.score)[0]} contre ${pseudo}`;
  return x.declined ? `${pseudo} a refusé` : `En attente de ${pseudo}`;
}

// Accueil : les défis à jouer d'abord, puis les résultats et les attentes récents.
export function DuelInbox({ duels, onPlay, onDecline }) {
  const [{ busy, error }, run] = useAction();
  const recent = (x) => Math.max(x.at, x.me?.at ?? 0, x.them?.at ?? 0) > Date.now() - RECENT;
  const rows = [
    ...duels.filter((x) => !x.me && !x.declined && x.questions),
    ...duels.filter((x) => x.me && x.them && recent(x)),
    ...duels.filter((x) => x.mine && x.me && !x.them && recent(x)),
  ].slice(0, 5);
  if (!rows.length) return null;
  return (
    <section className={`${card} flex flex-col gap-3 p-4 shadow-print-fluo sm:p-5`}>
      <h3 className="font-display text-xl uppercase text-night">Défis</h3>
      <ul className="flex flex-col divide-y-2 divide-dashed divide-night/15">
        {rows.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 first:pt-0 last:pb-0">
            <Avatar look={x.rival.look} size={40} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-night">{title(x)}</div>
              <div className="text-sm font-medium text-muted">{what(x)}</div>
            </div>
            {!x.me ? (
              <div className="flex items-center gap-3">
                {!x.mine && (
                  <button onClick={() => run(() => onDecline(x))} disabled={busy} className="cursor-pointer text-sm font-semibold text-muted underline underline-offset-2">
                    Refuser
                  </button>
                )}
                <Stamp onClick={() => run(() => onPlay(x))} disabled={busy} className="px-5 py-2 text-sm">
                  Jouer
                </Stamp>
              </div>
            ) : (
              x.them && <span className={`font-display text-2xl tabular-nums ${outcome(x.me.score, x.them.score)[1]}`}>{x.me.score} – {x.them.score}</span>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm font-semibold text-fluo">{error}</p>}
    </section>
  );
}

// « Défier un ami » : la série part avec le mode et le nombre de questions choisis sur l'accueil.
export function ChallengeButton({ mode, n, disabled, onChallenge, onStats }) {
  const ref = useRef(null);
  const [friends, setFriends] = useState(null);
  const [{ busy, error }, run] = useAction();
  const open = () => {
    ref.current.showModal();
    api("/me")
      .then((r) => setFriends(r.friends))
      .catch(() => setFriends([]));
  };
  const pick = (f) =>
    run(async () => {
      await onChallenge(f);
      ref.current?.close();
    });
  return (
    <>
      <Stamp variant="ghost" onClick={open} disabled={disabled} className="w-full py-3 text-lg">
        Défier un ami
      </Stamp>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current.close()}
        aria-labelledby="duel-pick"
        className="m-auto w-[min(92vw,420px)] rounded-[24px] border-[2.5px] border-night bg-paper p-5 text-night shadow-print-fluo backdrop:bg-night/60"
      >
        <div className="flex flex-col gap-4">
          <div>
            <h2 id="duel-pick" className="font-display text-3xl uppercase text-ink">
              Défier un ami
            </h2>
            <p className="text-sm font-medium text-muted">
              {MODE_NAMES[mode]} · {n} questions. Même série pour vous deux : tu joues tout de suite, ton adversaire quand ça l'arrange.
            </p>
          </div>
          {friends === null ? (
            <p className="font-medium text-muted">Chargement de tes amis…</p>
          ) : friends.length ? (
            <ul className="flex flex-col gap-2">
              {friends.map((f, k) => (
                <li key={f.id}>
                  <button
                    autoFocus={k === 0}
                    onClick={() => pick(f)}
                    disabled={busy}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 border-ink py-1.5 pl-1.5 pr-4 text-left text-lg font-semibold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo disabled:cursor-default disabled:opacity-50"
                  >
                    <Avatar look={f.look} size={40} />
                    {f.pseudo}
                    <span className="ml-auto font-display text-base uppercase">Défier →</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-medium">
              Ajoute d'abord un ami avec son code, dans{" "}
              <button onClick={onStats} className="cursor-pointer font-semibold text-ink underline underline-offset-2">
                Mes stats
              </button>
              .
            </p>
          )}
          {error && <p className="text-sm font-semibold text-fluo">{error}</p>}
          <button onClick={() => ref.current.close()} className="w-fit cursor-pointer text-sm font-semibold text-muted underline underline-offset-2">
            Annuler
          </button>
        </div>
      </dialog>
    </>
  );
}

// Stats, en cliquant sur un ami : le bilan de vos défis et les derniers en date.
export function DuelRecord({ duels, rival, mode, onChallenge, onPlay }) {
  const [{ busy, error }, run] = useAction();
  const { wins, draws, losses } = duelRecord(duels);
  const tally = [
    [wins, "victoire", "text-leaf"],
    [draws, "nul", "text-ink"],
    [losses, "défaite", "text-fluo"],
  ];
  return (
    <section className={`${card} flex flex-col gap-4 p-5 shadow-print`}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-xl uppercase text-night">
          Défis contre <span className="text-fluo">{rival.pseudo}</span>
        </h3>
        <Stamp onClick={() => run(() => onChallenge(rival, mode))} disabled={busy} className="ml-auto px-4 py-2 text-sm">
          Défier · {MODE_NAMES[mode]}
        </Stamp>
      </div>
      <div className="flex gap-8">
        {tally.map(([v, label, color]) => (
          <div key={label} className="flex flex-col">
            <span className={`font-display text-5xl leading-none tabular-nums ${color}`}>{v}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {label}
              {v > 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>
      {duels.length === 0 ? (
        <p className="text-sm font-medium text-muted">Aucun défi entre vous pour l'instant.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-night/10 text-sm">
          {duels.slice(0, 6).map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="w-14 shrink-0 font-semibold text-muted tabular-nums">{day.format(x.at)}</span>
              <span className="min-w-0 flex-1 font-medium">{what(x)}</span>
              {x.me && x.them ? (
                <span className={`font-display text-xl tabular-nums ${outcome(x.me.score, x.them.score)[1]}`}>
                  {x.me.score} – {x.them.score}
                </span>
              ) : !x.me && x.questions && !x.declined ? (
                <Stamp variant="ghost" onClick={() => run(() => onPlay(x))} disabled={busy} className="px-3 py-1 text-xs">
                  Jouer
                </Stamp>
              ) : (
                <span className="font-semibold text-muted">{x.declined ? "Refusé" : x.me ? "En attente" : "À jouer"}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm font-semibold text-fluo">{error}</p>}
    </section>
  );
}

// Fin d'un défi : le face-à-face si l'ami a déjà joué, sinon l'attente.
export function DuelResult({ duel, score, look }) {
  const { rival, them } = duel;
  const [verdict, color] = them ? outcome(score, them.score) : [];
  return (
    <section className={`${card} flex flex-col gap-3 p-4 shadow-print-fluo sm:p-5`}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-ink">Défi contre {rival.pseudo}</p>
      {them ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            <Avatar look={look} size={52} />
            <span className="font-display text-4xl tabular-nums">
              {score} – {them.score}
            </span>
            <Avatar look={rival.look} size={52} mirror />
          </div>
          <span className={`ml-auto font-display text-4xl uppercase ${color}`}>{verdict}</span>
        </div>
      ) : (
        <p className="font-medium">
          {rival.pseudo} n'a pas encore joué. Le défi l'attend sur son accueil, et le résultat s'affichera dans tes défis.
        </p>
      )}
    </section>
  );
}
