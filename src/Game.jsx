import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Logo, Stamp } from "./brand.jsx";
import { isCorrect } from "./match.js";
import { PTS_CARRE, PTS_CASH, SECONDS, distractors, flagUrl, shuffle } from "./quiz.js";

const DELAY_OK = 1000;
const DELAY_KO = 2400;
const LOW = 3; // secondes restantes à partir desquelles le chrono passe en alerte
const spring = { type: "spring", stiffness: 320, damping: 24 };

// Éclats d'encre autour de la carte sur une bonne réponse.
function Burst() {
  return Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    return (
      <motion.span
        key={k}
        aria-hidden
        className={`absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 size-3 rounded-full ${k % 2 ? "bg-fluo" : "bg-ink"}`}
        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        animate={{ x: Math.cos(a) * 190, y: Math.sin(a) * 140, scale: 0, opacity: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.9, 0.25, 1] }}
      />
    );
  });
}

// L'indice à deviner. Prévient quand il est visible (drapeau chargé) pour lancer le chrono :
// une connexion lente ne doit pas coûter de secondes.
function Prompt({ q, onReady }) {
  useEffect(() => {
    if (q.type === "tld") onReady();
  }, []);
  if (q.type === "flag")
    return <img src={flagUrl(q.country)} alt="Drapeau à identifier" onLoad={onReady} onError={onReady} className="max-h-full max-w-full rounded-md object-contain ring-2 ring-night/15" />;
  return (
    <div className="relative isolate font-display text-[clamp(5rem,24vw,10rem)] leading-none text-ink">
      <span aria-hidden className="absolute inset-0 -z-10 translate-x-[5px] translate-y-[6px] text-fluo">{q.country.tld}</span>
      {q.country.tld}
    </div>
  );
}

export default function Game({ all, quiz, onFinish, onQuit }) {
  const { questions, scope } = quiz;
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const [msLeft, setMsLeft] = useState(SECONDS * 1000);
  const [choices, setChoices] = useState(null);
  const [result, setResult] = useState(null);
  const [guess, setGuess] = useState("");
  const answers = useRef([]);
  const pending = useRef(null);
  const deadline = useRef(0);
  const inputRef = useRef(null);
  const q = questions[i];
  const score = answers.current.reduce((s, a) => s + (a?.points ?? 0), 0);

  const next = () => {
    clearTimeout(pending.current);
    pending.current = null;
    if (i + 1 >= questions.length) return onFinish(questions.map((q, k) => ({ ...q, ...answers.current[k] })));
    deadline.current = 0;
    setI(i + 1);
    setReady(false);
    setMsLeft(SECONDS * 1000);
    setChoices(null);
    setResult(null);
    setGuess("");
  };

  const answer = (given, correct, picked = null, timeout = false) => {
    if (answers.current[i]) return; // déjà répondu (double clic, chrono à zéro au même moment…)
    const r = { given, correct, picked, timeout, points: correct ? (choices ? PTS_CARRE : PTS_CASH) : 0 };
    answers.current[i] = r;
    setResult(r);
    pending.current = setTimeout(next, correct ? DELAY_OK : DELAY_KO);
  };

  const openCarre = () => {
    if (result || choices) return;
    setChoices(shuffle([q.country, ...distractors(q.country, scope)]));
  };

  // Chrono de la question : démarre quand l'indice est visible, s'arrête à la réponse.
  // Le carré ne le relance pas, sinon ce serait 10 s gratuites.
  const onTimeout = useRef();
  onTimeout.current = () => answer("", false, null, true);
  useEffect(() => {
    if (!ready || result) return;
    deadline.current ||= Date.now() + SECONDS * 1000;
    const t = setInterval(() => {
      const ms = Math.max(0, deadline.current - Date.now());
      setMsLeft(ms);
      if (!ms) onTimeout.current();
    }, 100);
    return () => clearInterval(t);
  }, [ready, result]);
  useEffect(() => () => clearTimeout(pending.current), []);

  // Précharge les prochains drapeaux, sans tout télécharger d'un coup en mode « Tous ».
  useEffect(() => {
    questions.slice(i + 1, i + 4).forEach((x) => x.type === "flag" && (new Image().src = flagUrl(x.country)));
  }, [i]);

  useEffect(() => {
    if (!choices) inputRef.current?.focus();
  }, [i, choices]);

  // Clavier : Entrée pour enchaîner, 1-4 en carré. Ref pour lire l'état courant sans réabonner.
  const keys = useRef();
  keys.current = (e) => {
    if (result && pending.current && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      next();
    } else if (choices && !result && /^[1-4]$/.test(e.key)) {
      const c = choices[e.key - 1];
      answer(c.nom, c === q.country, c.code);
    }
  };
  useEffect(() => {
    const h = (e) => keys.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!guess.trim() || result) return;
    answer(guess, isCorrect(guess, q.country, all));
  };

  const secs = Math.ceil(msLeft / 1000);
  const low = secs <= LOW;
  const dense = questions.length > 30;

  return (
    <div className="flex flex-col gap-5">
      {/* HUD */}
      <div className="flex items-center gap-3">
        <button onClick={onQuit} aria-label="Quitter la partie" className="cursor-pointer rounded-full p-1 transition-transform hover:-rotate-12 focus-visible:outline-3 focus-visible:outline-fluo">
          <Logo size={30} />
        </button>
        <div className="font-display text-2xl text-ink tabular-nums">
          {String(i + 1).padStart(String(questions.length).length, "0")}
          <span className="text-muted">/{questions.length}</span>
        </div>
        <motion.div
          role="timer"
          aria-label={`${secs} secondes restantes`}
          className={`mx-auto flex items-baseline gap-0.5 font-display tabular-nums ${low ? "text-fluo" : "text-night"}`}
          animate={low && !result ? { scale: [1, 1.18, 1] } : { scale: 1 }}
          transition={low && !result ? { duration: 0.5, repeat: Infinity } : {}}
        >
          <span className="text-4xl">{secs}</span>
          <span className="text-base text-muted">s</span>
        </motion.div>
        <div className="flex items-baseline gap-1 font-display text-2xl text-ink" aria-live="polite">
          <motion.span key={score} initial={{ scale: 1.8, color: "#ff5a1e" }} animate={{ scale: 1, color: "#2340c4" }} transition={spring} className="inline-block tabular-nums">
            {score}
          </motion.span>
          <span className="text-base text-muted">pts</span>
        </div>
      </div>

      {/* Chrono de la question + suivi de la partie */}
      <div className="h-3 overflow-hidden rounded-full border-[2.5px] border-night bg-paper-deep">
        <div className={`h-full transition-[width] duration-100 ease-linear ${low ? "bg-fluo" : "bg-ink"}`} style={{ width: `${(msLeft / (SECONDS * 1000)) * 100}%` }} />
      </div>
      <div className={`flex ${dense ? "overflow-hidden rounded-full border border-night/40" : "gap-1"}`} aria-hidden>
        {questions.map((_, k) => {
          const a = answers.current[k];
          const color = k === i && !a ? "bg-ink" : !a ? "bg-paper-deep" : a.points === PTS_CASH ? "bg-leaf" : a.points ? "bg-ink/60" : "bg-fluo";
          // span simple : le chrono re-rend 10×/s, inutile d'animer 240 segments via framer-motion.
          return <span key={k} className={`h-1.5 flex-1 transition-transform ${dense ? "" : "rounded-full border border-night/40"} ${k === i && !dense ? "scale-y-160" : ""} ${color}`} />;
        })}
      </div>

      {/* Carte */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 90, rotate: 5, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, x: -90, rotate: -5, scale: 0.94, transition: { duration: 0.18 } }}
            transition={spring}
          >
            <motion.div
              animate={result ? (result.correct ? { scale: [1, 1.035, 1] } : { x: [0, -14, 12, -8, 5, 0] }) : {}}
              transition={{ duration: 0.4 }}
              className={`relative grid aspect-[3/2] place-items-center rounded-[22px] border-[2.5px] border-night bg-paper p-6 transition-shadow duration-300 sm:p-8 ${result ? (result.correct ? "shadow-[6px_7px_0_var(--color-leaf)]" : "shadow-print-fluo") : "shadow-print-lg"}`}
            >
              <Prompt q={q} onReady={() => setReady(true)} />
              <span className="absolute left-4 top-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
                {q.type === "flag" ? "Drapeau" : "Extension"}
              </span>
              <AnimatePresence>
                {result && (
                  <motion.div
                    key="stamp"
                    initial={{ scale: 2.6, rotate: -32, opacity: 0 }}
                    animate={{ scale: 1, rotate: -12, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 17 }}
                    className={`absolute right-4 top-4 rounded-xl border-4 bg-paper/85 px-4 py-1 font-display text-3xl uppercase tracking-wider ${result.correct ? "border-leaf text-leaf" : "border-fluo text-fluo"}`}
                  >
                    {result.correct ? `+${result.points}` : result.timeout ? "Trop tard" : "Raté"}
                  </motion.div>
                )}
              </AnimatePresence>
              {result?.correct && <Burst />}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Réponse */}
      <div className="min-h-9 text-center" aria-live="polite">
        <AnimatePresence>
          {result && (
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-2xl uppercase text-night">
              {result.correct ? (result.given.trim().toLowerCase() === q.country.nom.toLowerCase() ? "Flagrant !" : `Oui : ${q.country.nom}`) : <>C'était <span className="text-fluo">{q.country.nom}</span></>}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Saisie / carré */}
      <AnimatePresence mode="wait" initial={false}>
        {choices ? (
          <motion.div key="carre" className="grid gap-3 sm:grid-cols-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
            {choices.map((c, k) => {
              // Pas d'opacity ici : framer-motion la fixe en style inline via les variants.
              const state = !result ? "bg-paper" : c === q.country ? "bg-leaf text-white" : c.code === result.picked ? "bg-fluo text-white" : "bg-paper text-muted/60 shadow-none";
              return (
                <motion.button
                  key={c.code}
                  variants={{ hidden: { opacity: 0, y: 16, rotate: -2 }, show: { opacity: 1, y: 0, rotate: 0, transition: spring } }}
                  whileHover={!result ? { y: -2, x: -1 } : {}}
                  whileTap={!result ? { scale: 0.97 } : {}}
                  disabled={!!result}
                  autoFocus={k === 0}
                  onClick={() => answer(c.nom, c === q.country, c.code)}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border-[2.5px] border-night px-4 py-3 text-left text-lg font-semibold shadow-print transition-[background-color,color,box-shadow] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-fluo disabled:cursor-default ${state}`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-current font-display text-sm">{k + 1}</span>
                  {c.nom}
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.form key="cash" onSubmit={submit} className="flex gap-3" exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} autoComplete="off">
            <input
              ref={inputRef}
              autoFocus
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={!!result}
              placeholder="Quel pays ?"
              aria-label="Nom du pays"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-2xl border-[2.5px] border-night bg-paper px-5 py-3.5 text-xl font-semibold text-night shadow-print outline-none placeholder:text-muted/60 focus:shadow-[4px_4.5px_0_var(--color-fluo)] disabled:opacity-60"
            />
            <Stamp type="submit" disabled={!!result || !guess.trim()}>Valider</Stamp>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        {result ? (
          <button onClick={next} className="flex cursor-pointer items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-ink">
            <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-paper-deep">
              <motion.span className="absolute inset-y-0 left-0 bg-ink" initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: (result.correct ? DELAY_OK : DELAY_KO) / 1000, ease: "linear" }} />
            </span>
            Entrée pour continuer
          </button>
        ) : (
          <>
            <Stamp variant="ghost" onClick={openCarre} disabled={!!choices} className="py-2.5">
              Carré · 4 choix
            </Stamp>
            <Stamp variant="link" onClick={() => answer("", false)} className="px-2">
              Passer
            </Stamp>
          </>
        )}
      </div>
    </div>
  );
}
