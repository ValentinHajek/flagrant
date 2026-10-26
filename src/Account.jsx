import { useState } from "react";
import { api, setSession, syncHistory } from "./api.js";
import Avatar from "./Avatar.jsx";
import { Stamp } from "./brand.jsx";
import { flagUrl } from "./quiz.js";
import { saveHistory } from "./stats.js";
import { save } from "./storage.js";

const card = "rounded-[20px] border-[2.5px] border-night bg-paper shadow-print";
// w-0 : sans largeur propre (≈ 20 caractères), le champ élargissait la colonne des stats sur téléphone.
const field =
  "w-0 min-w-0 flex-1 rounded-2xl border-[2.5px] border-night bg-paper px-4 py-2.5 font-semibold text-night outline-none placeholder:text-muted/60 focus:shadow-[3px_3.5px_0_var(--color-fluo)]";
const pc = (x) => `${Math.round(x * 100)} %`;

// Petit formulaire « une action » : gère l'attente et le message d'erreur.
export function useAction() {
  const [state, setState] = useState({ busy: false, error: null });
  const run = async (fn) => {
    setState({ busy: true, error: null });
    try {
      await fn();
      setState({ busy: false, error: null });
    } catch (e) {
      setState({ busy: false, error: e.message });
    }
  };
  return [state, run];
}

// Connexion par lien e-mail. Aussi affichée sur l'accueil quand on n'est pas connecté.
export function LoginForm({ notice }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState(null);
  const [{ busy, error }, run] = useAction();
  const send = (e) => {
    e.preventDefault();
    run(async () => {
      await api("/login", { method: "POST", body: { email } });
      setSentTo(email.trim());
    });
  };
  return (
    <>
      <p className="font-medium text-muted">Connecte-toi par e-mail pour retrouver tes stats sur tous tes appareils et te comparer à tes amis.</p>
      {sentTo ? (
        <p className="font-semibold text-leaf">C'est envoyé ! Ouvre le lien reçu à {sentTo} (valable 15 minutes).</p>
      ) : (
        <form onSubmit={send} className="flex gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.fr" aria-label="Adresse e-mail" autoComplete="email" className={field} />
          <Stamp type="submit" disabled={busy || !email.trim()} className="px-4 py-2 text-sm">
            Recevoir le lien
          </Stamp>
        </form>
      )}
      {(error || notice) && <p className="text-sm font-semibold text-fluo">{error || notice}</p>}
    </>
  );
}

function LoggedIn({ account, setAccount, look, rivalId, onPickRival, onLoggedOut }) {
  const { me, friends } = account;
  const [code, setCode] = useState("");
  // null = pas en cours d'édition. Ouvert d'office tant que le pseudo est celui tiré de l'e-mail.
  const [pseudo, setPseudo] = useState(me.pseudoSet ? null : me.pseudo);
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState(null);
  const [{ busy, error }, run] = useAction();
  const isEmail = code.includes("@");

  // Un code ami, ou un e-mail : l'ami reçoit alors une invitation (son compte est créé au besoin).
  const addFriend = (e) => {
    e.preventDefault();
    run(async () => {
      const value = code.trim();
      const { friend } = await api("/friends", { method: "POST", body: isEmail ? { email: value } : { code: value } });
      setAccount({ ...account, friends: [...friends.filter((f) => f.id !== friend.id), friend] });
      setInvited(isEmail ? value : null);
      setCode("");
    });
  };
  const savePseudo = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api("/me", { method: "PATCH", body: { pseudo } });
      setAccount({ ...account, me: r.me });
      setPseudo(null);
    });
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(me.friendCode).catch(() => {});
    setCopied(true);
  };
  // Déconnexion : on synchronise d'abord, puis on vide l'historique et le vestiaire locaux pour ne pas
  // mélanger deux comptes (seule l'apparence de base de l'avatar reste).
  const logout = () =>
    run(async () => {
      await syncHistory();
      await api("/session", { method: "DELETE" }).catch(() => {});
      setSession(null);
      saveHistory([]);
      save("synced", []);
      save("owned", []);
      onLoggedOut();
    });

  return (
    <>
      {pseudo === null ? (
        <div className="flex flex-wrap items-center gap-3">
          <Avatar look={look} size={44} />
          <span className="font-display text-2xl text-ink">{me.pseudo}</span>
          <Stamp variant="ghost" onClick={() => setPseudo(me.pseudo)} aria-label="Changer de pseudo" className="px-3 py-1 text-xs">
            Changer
          </Stamp>
        </div>
      ) : (
        <form onSubmit={savePseudo} className="flex flex-col gap-2">
          <label htmlFor="pseudo" className="font-semibold text-night">
            {me.pseudoSet ? "Ton nouveau pseudo" : "Choisis ton pseudo : c'est ce que verront tes amis"}
          </label>
          <div className="flex gap-2">
            <input id="pseudo" autoFocus value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={24} className={field} />
            <Stamp type="submit" disabled={busy || pseudo.trim().length < 2} className="px-4 py-2 text-sm">
              OK
            </Stamp>
            {me.pseudoSet && (
              <button type="button" onClick={() => setPseudo(null)} className="cursor-pointer text-sm font-semibold text-muted underline underline-offset-2">
                Annuler
              </button>
            )}
          </div>
        </form>
      )}
      <p className="-mt-2 text-sm font-medium text-muted">Connecté avec {me.email}</p>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Ton code ami</span>
        <span className="rounded-xl border-2 border-dashed border-ink px-3 py-1 font-display text-2xl tracking-[0.12em] text-ink">{me.friendCode}</span>
        <button onClick={copy} className="cursor-pointer text-sm font-semibold text-ink underline underline-offset-2">
          {copied ? "copié ✓" : "copier"}
        </button>
      </div>

      <form onSubmit={addFriend} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={254}
          placeholder="Code ami ou e-mail"
          aria-label="Code ami ou e-mail de l'ami à ajouter"
          className={`${field} ${isEmail ? "" : "uppercase tracking-[0.12em]"}`}
        />
        <Stamp type="submit" disabled={busy || (isEmail ? code.trim().length < 6 : code.trim().length !== 6)} className="px-4 py-2 text-sm">
          {isEmail ? "Inviter" : "Ajouter"}
        </Stamp>
      </form>
      {invited && <p className="-mt-2 text-sm font-semibold text-leaf">Invitation envoyée à {invited} : vous êtes déjà amis !</p>}

      {friends.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Duel avec</span>
          {friends.map((f) => (
            <button
              key={f.id}
              onClick={() => onPickRival(f)}
              aria-pressed={rivalId === f.id}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-ink py-0.5 pl-0.5 pr-3 font-semibold transition-colors ${rivalId === f.id ? "bg-ink text-paper" : "text-ink hover:bg-ink/10"}`}
            >
              <Avatar look={f.look} size={26} />
              {f.pseudo}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm font-semibold text-fluo">{error}</p>}
      <button onClick={logout} disabled={busy} className="w-fit cursor-pointer text-sm font-semibold text-muted underline underline-offset-2">
        Se déconnecter
      </button>
    </>
  );
}

export function AccountCard(props) {
  return (
    <section className={`${card} flex flex-col gap-4 p-5`}>
      <h3 className="font-display text-xl uppercase text-night">Compte & amis</h3>
      {props.account ? <LoggedIn {...props} /> : <LoginForm notice={props.notice} />}
    </section>
  );
}

// Toi contre ton ami sur le mode affiché. Étoile verte sur le meilleur de chaque ligne (sauf le nombre de parties).
export function Duel({ mine, theirs, myName, myLook, rival, onClose }) {
  const rows = [
    ["Moyenne", (s) => s.avg, pc, true],
    ["Meilleure", (s) => s.best.score / s.best.max, pc, true],
    ["Réussite", (s) => s.accuracy, pc, true],
    ["Parties", (s) => s.games, String, false],
  ];
  const cell = (s, other, [, get, fmt, versus]) => {
    if (!s) return <span className="text-muted">—</span>;
    const win = versus && other && get(s) > get(other);
    return (
      <span className={win ? "text-leaf" : "text-ink"}>
        {fmt(get(s))}
        {win && <span aria-label=" meilleur"> ★</span>}
      </span>
    );
  };
  return (
    <section className={`${card} flex flex-col gap-3 p-5 shadow-print-fluo`}>
      <div className="flex items-center gap-3">
        <h3 className="font-display text-xl uppercase text-night">
          Duel · toi vs <span className="text-fluo">{rival.pseudo}</span>
        </h3>
        <button onClick={onClose} aria-label="Fermer le duel" className="ml-auto cursor-pointer text-xl font-bold text-muted hover:text-night">
          ×
        </button>
      </div>
      {!theirs && <p className="text-sm font-medium text-muted">{rival.pseudo} n'a pas encore joué dans ce mode.</p>}
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-6 gap-y-2">
        <span />
        {/* Face-à-face : l'avatar de l'ami est retourné pour regarder vers le tien */}
        {[
          [myName, myLook, false],
          [rival.pseudo, rival.look, true],
        ].map(([name, look, mirror]) => (
          <span key={mirror} className="flex flex-col items-end gap-1 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            <Avatar look={look} size={48} mirror={mirror} />
            {name}
          </span>
        ))}
        {rows.map((row) => (
          <div key={row[0]} className="contents">
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{row[0]}</span>
            <span className="text-right font-display text-2xl">{cell(mine, theirs, row)}</span>
            <span className="text-right font-display text-2xl">{cell(theirs, mine, row)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// Duel pays par pays : qui sèche quoi. Les chiffres « 1/2 » = ratés / fois tombé.
export function CountryDuel({ cmp, rivalName, byCode, mode }) {
  const lists = [
    ["Vous séchez tous les deux", cmp.both],
    ["Ton avantage", cmp.mine],
    [`L'avantage de ${rivalName}`, cmp.theirs],
  ];
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-display text-xl uppercase text-night">Pays par pays</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {lists.map(([title, rows]) => (
          <div key={title} className={`${card} flex flex-col gap-2 p-4 shadow-none`}>
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">{title}</div>
            {rows.length === 0 && <p className="text-sm font-medium text-muted">Rien pour l'instant.</p>}
            {rows.map((r) => {
              const c = byCode.get(r.code);
              if (!c) return null;
              return (
                <div key={r.code} className="flex items-center gap-2">
                  {mode === "tld" ? (
                    <span className="w-10 shrink-0 text-center font-display text-lg text-ink">{c.tld}</span>
                  ) : (
                    <img src={flagUrl(c)} alt="" className="h-6 w-9 shrink-0 rounded-[2px] object-cover ring-1 ring-night/20" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{c.nom}</div>
                    {/* Chiffres d'abord : si la ligne est trop longue, c'est le prénom qui est coupé */}
                    <div className="truncate text-[11px] font-semibold text-muted tabular-nums" title={`ratés : toi ${r.mine.miss}/${r.mine.seen}, ${rivalName} ${r.theirs.miss}/${r.theirs.seen}`}>
                      {r.mine.miss}/{r.mine.seen} toi · {r.theirs.miss}/{r.theirs.seen} {rivalName.split(" ")[0]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-muted">Chiffres : ratés / fois tombé.</p>
    </section>
  );
}
