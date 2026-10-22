import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import Badges from "./Badges.jsx";
import End from "./End.jsx";
import Game from "./Game.jsx";
import { API_ENABLED, api, getSession, setSession, syncHistory } from "./api.js";
import { parseWorld } from "./geo.js";
import Home from "./Home.jsx";
import { loadProfile, saveProfile, syncProfile } from "./profile.js";
import { computeProgress } from "./progress.js";
import Stats from "./Stats.jsx";
import { COUNTS, DEFAULT_COUNT, MODES, buildQuiz } from "./quiz.js";
import { loadHistory, recordGame, toEntry } from "./stats.js";
import { bestKey, load, save } from "./storage.js";
import Wardrobe from "./Wardrobe.jsx";

// Entrée « impression » : la feuille arrive légèrement de travers puis se recale.
const page = {
  initial: { opacity: 0, y: 56, rotate: -3, scale: 0.94 },
  animate: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: { type: "spring", stiffness: 180, damping: 20 } },
  exit: { opacity: 0, y: -30, rotate: 2, transition: { duration: 0.2 } },
};

// Réglages relus du stockage local : on ne garde que des valeurs connues (vieille version, valeur trafiquée…).
function loadSettings() {
  const s = load("settings", {}) ?? {};
  return {
    mode: MODES.includes(s.mode) ? s.mode : "flag",
    territories: s.territories === true,
    count: COUNTS.includes(s.count) ? s.count : DEFAULT_COUNT,
  };
}

export default function App() {
  const [all, setAll] = useState(null);
  const [map, setMap] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettingsState] = useState(loadSettings);
  const [screen, setScreen] = useState("home");
  const [badgesBack, setBadgesBack] = useState("home"); // la page Badges revient là d'où on l'a ouverte
  const [focus, setFocus] = useState(null); // article à montrer en ouvrant le vestiaire
  const [quiz, setQuiz] = useState(null);
  const [end, setEnd] = useState(null);
  const [notice, setNotice] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [profile, setProfileState] = useState(loadProfile);
  // shortcut: l'XP se recalcule sur les 500 dernières parties gardées en local ; au-delà, stocker le total d'XP.
  const progress = useMemo(() => computeProgress(history, profile.owned), [history, profile.owned]);

  const setProfile = (p) => {
    setProfileState(p);
    saveProfile(p);
  };
  // Connecté : les parties d'abord, puis le vestiaire (le serveur valide les achats faits hors ligne avec toutes les parties).
  const syncAll = () =>
    syncHistory()
      .then(() => setHistory(loadHistory()))
      .then(() => syncProfile(loadProfile()))
      .then(setProfile);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/countries.json`)
      .then((r) => r.json())
      .then(setAll)
      .catch(() => setError("la base des pays"));
  }, []);

  // Retour depuis le lien reçu par e-mail : on échange le jeton contre une session, puis on synchronise.
  // Déjà connecté : on récupère ce qui a été joué ou acheté sur un autre appareil.
  useEffect(() => {
    const token = new URLSearchParams(location.search).get("login");
    if (token && API_ENABLED) {
      window.history.replaceState(null, "", location.pathname); // le jeton ne reste pas dans l'URL ni l'historique
      api("/session", { method: "POST", body: { token } })
        .then(({ session }) => {
          setSession(session);
          setScreen("stats");
          return syncAll();
        })
        .catch((e) => {
          setNotice(e.message);
          if (!getSession()) setScreen("home"); // lien expiré : retour à l'accueil, où se trouve le formulaire e-mail
        });
    } else if (getSession())
      syncAll().catch(() => {
        if (!getSession()) setNotice("Session expirée, remets ton e-mail pour te reconnecter."); // api() a vidé la session sur 401
      });
  }, []);

  // La carte (≈ 240 Ko) n'est chargée que si on choisit le mode carte.
  const needMap = settings.mode === "map";
  useEffect(() => {
    if (!needMap || map) return;
    fetch(`${import.meta.env.BASE_URL}data/world.json`)
      .then((r) => r.json())
      .then((topo) => setMap(parseWorld(topo)))
      .catch(() => setError("la carte"));
  }, [needMap, map]);

  const openWardrobe = (item = null) => {
    setFocus(item);
    setScreen("wardrobe");
  };
  const openBadges = () => {
    setBadgesBack(screen);
    setScreen("badges");
  };

  const setSettings = (s) => {
    setSettingsState(s);
    save("settings", s);
  };

  const start = () => {
    if (needMap && !map) return;
    setQuiz({ ...buildQuiz(all, settings.mode, settings.territories, settings.count), id: Date.now() });
    setScreen("game");
  };

  const finish = (results) => {
    const key = bestKey(settings.mode, settings.territories, settings.count);
    const best = load(key, 0);
    const score = results.reduce((s, r) => s + r.points, 0);
    if (score > best) save(key, score);
    const entry = toEntry(settings, results);
    recordGame(entry);
    const next = loadHistory();
    setHistory(next);
    if (getSession()) syncHistory().catch(() => {}); // sinon, ce sera envoyé à la prochaine synchro
    const after = computeProgress(next, profile.owned);
    setEnd({ results, best, isRecord: score > best && score > 0, reward: { before: progress, after, gain: after.perGame.get(entry.id) } });
    setScreen("end");
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className={`mx-auto px-4 pb-16 pt-6 sm:px-10 sm:pt-10 ${screen === "stats" || screen === "wardrobe" ? "max-w-5xl" : "max-w-2xl"}`}>
        {error && <p className="font-semibold text-fluo">Impossible de charger {error}. Recharge la page.</p>}
        {all && (
          <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
            <motion.section key={screen === "game" ? quiz.id : screen} variants={page} initial="initial" animate="animate" exit="exit">
              {screen === "home" && (
                <Home
                  all={all}
                  settings={settings}
                  setSettings={setSettings}
                  onStart={start}
                  loading={needMap && !map}
                  onStats={() => setScreen("stats")}
                  look={profile.look}
                  progress={progress}
                  onWardrobe={() => openWardrobe()}
                  onBadges={openBadges}
                  notice={notice}
                  history={history}
                />
              )}
              {screen === "game" && <Game all={all} map={map} quiz={quiz} onFinish={finish} onQuit={() => setScreen("home")} />}
              {screen === "end" && (
                <End
                  {...end}
                  all={all}
                  look={profile.look}
                  onAgain={start}
                  onMenu={() => setScreen("home")}
                  onStats={() => setScreen("stats")}
                  onWardrobe={() => openWardrobe()}
                  onBadges={openBadges}
                />
              )}
              {screen === "wardrobe" && (
                <Wardrobe profile={profile} setProfile={setProfile} progress={progress} focus={focus} onBack={() => setScreen("home")} onBadges={openBadges} />
              )}
              {screen === "badges" && (
                <Badges progress={progress} look={profile.look} owned={profile.owned} onBack={() => setScreen(badgesBack)} onWardrobe={openWardrobe} />
              )}
              {screen === "stats" && (
                <Stats
                  all={all}
                  mode={settings.mode}
                  notice={notice}
                  history={history}
                  setHistory={setHistory}
                  look={profile.look}
                  onLoggedOut={() => {
                    setHistory(loadHistory());
                    setProfileState(loadProfile());
                    setScreen("home");
                  }}
                  onBack={() => setScreen("home")}
                  onPlay={(mode) => {
                    setSettings({ ...settings, mode });
                    setScreen("home");
                  }}
                />
              )}
            </motion.section>
          </AnimatePresence>
        )}
      </main>
    </MotionConfig>
  );
}
