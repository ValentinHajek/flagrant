import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useEffect, useState } from "react";
import End from "./End.jsx";
import Game from "./Game.jsx";
import { parseWorld } from "./geo.js";
import Home from "./Home.jsx";
import Stats from "./Stats.jsx";
import { COUNTS, DEFAULT_COUNT, MODES, buildQuiz } from "./quiz.js";
import { recordGame, toEntry } from "./stats.js";
import { bestKey, load, save } from "./storage.js";

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
  const [quiz, setQuiz] = useState(null);
  const [end, setEnd] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/countries.json`)
      .then((r) => r.json())
      .then(setAll)
      .catch(() => setError("la base des pays"));
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
    recordGame(toEntry(settings, results));
    setEnd({ results, best, isRecord: score > best && score > 0 });
    setScreen("end");
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-10 sm:pt-10">
        {error && <p className="font-semibold text-fluo">Impossible de charger {error}. Recharge la page.</p>}
        {all && (
          <AnimatePresence mode="wait">
            <motion.section key={screen === "game" ? quiz.id : screen} variants={page} initial="initial" animate="animate" exit="exit">
              {screen === "home" && (
                <Home all={all} settings={settings} setSettings={setSettings} onStart={start} loading={needMap && !map} onStats={() => setScreen("stats")} />
              )}
              {screen === "game" && <Game all={all} map={map} quiz={quiz} onFinish={finish} onQuit={() => setScreen("home")} />}
              {screen === "end" && <End {...end} onAgain={start} onMenu={() => setScreen("home")} onStats={() => setScreen("stats")} />}
              {screen === "stats" && (
                <Stats
                  all={all}
                  mode={settings.mode}
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
