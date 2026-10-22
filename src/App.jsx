import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import Badges from "./Badges.jsx";
import End from "./End.jsx";
import Game from "./Game.jsx";
import { API_ENABLED, api, getSession, setSession, syncHistory } from "./api.js";
import { parseWorld } from "./geo.js";
import Home from "./Home.jsx";
import { loadProfile, saveProfile, syncProfile } from "./profile.js";
import { computeProgress } from "./progress.js";
import Stats from "./Stats.jsx";
import { COUNTS, DEFAULT_COUNT, DUEL_MAX, MODES, PTS_CASH, buildQuiz, fromSeries, shuffle, toSeries, total } from "./quiz.js";
import { sound } from "./sound.js";
import { loadHistory, recordGame, toEntry, withLocalPlays } from "./stats.js";
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

  // La carte (≈ 240 Ko) n'est chargée que pour les modes Carte et Mix, ou pour jouer un défi qui en a besoin.
  const needMap = settings.mode === "map" || settings.mode === "mix";
  const mapLoad = useRef(null);
  const loadMap = () =>
    (mapLoad.current ??= fetch(`${import.meta.env.BASE_URL}data/world.json`)
      .then((r) => r.json())
      .then((topo) => setMap(parseWorld(topo)))
      .catch((e) => {
        mapLoad.current = null;
        setError("la carte");
        throw e;
      }));
  useEffect(() => {
    if (needMap) loadMap().catch(() => {});
  }, [needMap]);

  // Défis entre amis : relus en arrivant sur l'accueil ou les stats. Une partie pas encore synchronisée compte déjà.
  const [serverDuels, setServerDuels] = useState([]);
  const duels = useMemo(() => withLocalPlays(serverDuels, history), [serverDuels, history]);
  const refreshDuels = () => getSession() && api("/duels").then((r) => setServerDuels(r.duels)).catch(() => {});
  useEffect(() => {
    if (screen === "home" || screen === "stats") refreshDuels();
  }, [screen]);

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
    sound("depart"); // dans le clic même : sur iPhone, c'est ce geste qui autorise le son
    setQuiz({ ...buildQuiz(all, settings.mode, settings.territories, settings.count), id: Date.now() });
    setScreen("game");
  };

  // Défi : la série vient du serveur (ou vient d'y partir) ; mêmes questions et mêmes leurres pour les deux joueurs.
  const playDuel = async (duel) => {
    const quiz = fromSeries(all, duel.territories, duel.questions);
    if (!quiz) throw new Error("Ce défi contient des pays inconnus de cette version : recharge la page");
    if (quiz.questions.some((q) => q.type === "map")) await loadMap();
    sound("depart");
    setQuiz({ ...quiz, id: Date.now(), duel });
    setScreen("game");
  };
  const challenge = async (friend, mode = settings.mode) => {
    const { territories, count } = settings;
    const questions = toSeries(buildQuiz(all, mode, territories, count === "all" ? DUEL_MAX : count));
    const { id } = await api("/duels", { method: "POST", body: { friend: friend.id, mode, territories, questions } });
    await playDuel({ id, mode, territories, n: questions.length, rival: friend, me: null, them: null, questions });
  };
  const declineDuel = async (duel) => {
    await api(`/duels?id=${duel.id}`, { method: "DELETE" });
    setServerDuels((list) => list.map((x) => (x.id === duel.id ? { ...x, declined: true } : x)));
  };

  // Révision : on rejoue les erreurs (et les carrés) en boucle jusqu'à tout trouver du premier coup. Ne compte nulle part.
  const practise = (results, round = 1) => {
    const questions = shuffle(results.filter((r) => r.points < PTS_CASH).map(({ country, type }) => ({ country, type })));
    if (!questions.length) {
      setEnd({ results, practice: round - 1 });
      return setScreen("end");
    }
    sound("depart");
    setQuiz({ scope: quiz.scope, questions, id: Date.now(), practice: round });
    setScreen("game");
  };

  const finish = (results) => {
    if (quiz.practice) return practise(results, quiz.practice + 1);
    const { duel } = quiz;
    // Un défi se range avec les parties de son mode, même s'il diffère des réglages de l'accueil.
    const game = duel ? { mode: duel.mode, territories: duel.territories, count: results.length } : settings;
    const key = bestKey(game.mode, game.territories, game.count);
    const best = load(key, 0);
    const entry = { ...toEntry(game, results), ...(duel && { duel: duel.id }) };
    const score = total(entry);
    if (score > best) save(key, score);
    recordGame(entry);
    const next = loadHistory();
    setHistory(next);
    if (getSession()) syncHistory().then(() => duel && refreshDuels()).catch(() => {}); // sinon, ce sera envoyé à la prochaine synchro
    const after = computeProgress(next, profile.owned);
    setEnd({ results, best, isRecord: score > best && score > 0, reward: { before: progress, after, gain: after.perGame.get(entry.id) }, duel });
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
                  duels={duels}
                  onChallenge={challenge}
                  onPlayDuel={playDuel}
                  onDeclineDuel={declineDuel}
                />
              )}
              {screen === "game" && <Game all={all} map={map} quiz={quiz} onFinish={finish} onQuit={() => setScreen("home")} />}
              {screen === "end" && (
                <End
                  {...end}
                  all={all}
                  look={profile.look}
                  onAgain={start}
                  onPractise={() => practise(end.results)}
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
                  duels={duels}
                  onChallenge={challenge}
                  onPlayDuel={playDuel}
                  onLoggedOut={() => {
                    setServerDuels([]);
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
